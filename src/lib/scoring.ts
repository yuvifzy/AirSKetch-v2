/**
 * scoring.ts – ML-backed route scoring for AirSketch v2.
 *
 * Adapted from Drone-Traffic-Sim for AirSketch-v2's coordinate system:
 *  - World coordinates are 0–100 (percent of canvas), not pixel values.
 *  - No-fly zones are circles (x, y, radius) rather than polygons.
 *  - There are no building rectangles; proximity is measured to NFZ edges.
 */

import type { NoFlyZone, WorldPoint } from '../store/useAirSketchStore';

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

export const pathLength = (points: WorldPoint[]): number => {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i]!.x - points[i - 1]!.x;
    const dy = points[i]!.y - points[i - 1]!.y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
};

export const straightDistance = (a: WorldPoint, b: WorldPoint): number =>
  Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);

const sharpTurns = (points: WorldPoint[]): number => {
  let count = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const c = points[i + 1]!;
    const v1x = b.x - a.x;
    const v1y = b.y - a.y;
    const v2x = c.x - b.x;
    const v2y = c.y - b.y;
    const m1 = Math.hypot(v1x, v1y);
    const m2 = Math.hypot(v2x, v2y);
    if (m1 === 0 || m2 === 0) continue;
    const dot = (v1x * v2x + v1y * v2y) / (m1 * m2);
    const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
    if (angle > Math.PI / 3) count++;
  }
  return count;
};

/** Distance from point p to line segment ab */
const pointToSegmentDist = (
  p: WorldPoint,
  a: WorldPoint,
  b: WorldPoint,
): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
};

// ---------------------------------------------------------------------------
// NFZ intersection counting (circle vs polyline)
// ---------------------------------------------------------------------------

const nfzIntersectionCount = (
  points: WorldPoint[],
  zones: NoFlyZone[],
): number => {
  if (points.length < 2) return 0;
  let count = 0;
  for (const zone of zones) {
    let hit = false;
    // Check each segment's closest approach to the zone center
    for (let i = 1; i < points.length; i++) {
      const dist = pointToSegmentDist(zone, points[i - 1]!, points[i]!);
      if (dist < zone.radius) {
        hit = true;
        break;
      }
    }
    if (hit) count++;
  }
  return count;
};

// ---------------------------------------------------------------------------
// NFZ proximity score (0 = far, 1 = very close / inside)
// ---------------------------------------------------------------------------

const nfzProximityScore = (
  points: WorldPoint[],
  zones: NoFlyZone[],
): number => {
  if (points.length < 2 || zones.length === 0) return 0;
  const buffer = 4; // world-units buffer beyond radius
  let total = 0;
  let near = 0;
  for (const zone of zones) {
    let minDist = Infinity;
    for (let i = 1; i < points.length; i++) {
      const d = pointToSegmentDist(zone, points[i - 1]!, points[i]!);
      if (d < minDist) minDist = d;
    }
    const clearance = minDist - zone.radius;
    if (clearance < buffer) {
      const closeness = Math.max(0, 1 - Math.max(0, clearance) / buffer);
      total += closeness;
      near++;
    }
  }
  return near === 0 ? 0 : total / zones.length;
};

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ScoringFeatures = {
  normalizedLength: number;
  nfzCount: number;
  sharpTurnCount: number;
  buildingProximityScore: number; // maps to NFZ proximity for compatibility
  rawLength: number;
};

export const computeFeatures = (
  points: WorldPoint[],
  zones: NoFlyZone[],
): ScoringFeatures => {
  const len = pathLength(points);
  const start = points[0] ?? { x: 0, y: 0 };
  const end = points[points.length - 1] ?? { x: 0, y: 0 };
  const straight = straightDistance(start, end);
  const normalizedLength = straight === 0 ? 1 : len / straight;

  return {
    normalizedLength,
    nfzCount: nfzIntersectionCount(points, zones),
    sharpTurnCount: sharpTurns(points),
    buildingProximityScore: nfzProximityScore(points, zones),
    rawLength: len,
  };
};

export type Scores = {
  safety: number;
  efficiency: number;
  energy: number;
  flightScore: number;
  pathLength: number;
};

export const computeScores = (
  points: WorldPoint[],
  zones: NoFlyZone[],
): Scores => {
  if (points.length < 2) {
    return { safety: 100, efficiency: 100, energy: 100, flightScore: 100, pathLength: 0 };
  }

  const f = computeFeatures(points, zones);

  const safety = Math.max(
    0,
    Math.min(
      100,
      100 - f.nfzCount * 35 - f.buildingProximityScore * 100,
    ),
  );

  const efficiency = Math.max(
    0,
    Math.min(100, 100 - (f.normalizedLength - 1) * 80),
  );

  const turnPenalty = f.sharpTurnCount * 8;
  const lengthPenalty = (f.normalizedLength - 1) * 50;
  const energy = Math.max(
    0,
    Math.min(100, 100 - turnPenalty - lengthPenalty),
  );

  const flightScore = Math.round(safety * 0.42 + efficiency * 0.34 + energy * 0.24);

  return {
    safety: Math.round(safety),
    efficiency: Math.round(efficiency),
    energy: Math.round(energy),
    flightScore: Math.max(0, Math.min(100, flightScore)),
    pathLength: Math.round(f.rawLength * 10) / 10,
  };
};
