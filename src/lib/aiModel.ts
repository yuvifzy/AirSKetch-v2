/**
 * astar.ts – A* pathfinding for AirSketch v2.
 *
 * Adapted from Drone-Traffic-Sim.  Key differences:
 *  - World coordinates are 0–100 (percent), not pixels.
 *  - Obstacles are circular no-fly zones, not building rectangles.
 *  - Grid is 40×40 over the 100×100 world space.
 */

import type { NoFlyZone, WorldPoint } from '../store/useAirSketchStore';

const COLS = 40;
const ROWS = 40;
const CELL_W = 100 / COLS;  // 2.5 world-units
const CELL_H = 100 / ROWS;  // 2.5 world-units

// ---------------------------------------------------------------------------
// Grid construction – blocked cell = inside an NFZ (with margin)
// ---------------------------------------------------------------------------

const buildGrid = (zones: NoFlyZone[]): boolean[][] => {
  const grid: boolean[][] = Array.from({ length: ROWS }, () =>
    Array(COLS).fill(false),
  );
  const margin = 1.5; // extra world-unit clearance around each NFZ

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cx = c * CELL_W + CELL_W / 2;
      const cy = r * CELL_H + CELL_H / 2;
      grid[r]![c] = zones.some(
        (z) => Math.hypot(cx - z.x, cy - z.y) < z.radius + margin,
      );
    }
  }
  return grid;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const cellOf = (p: WorldPoint): { r: number; c: number } => ({
  r: Math.max(0, Math.min(ROWS - 1, Math.floor(p.y / CELL_H))),
  c: Math.max(0, Math.min(COLS - 1, Math.floor(p.x / CELL_W))),
});

const cellCenter = (r: number, c: number): WorldPoint => ({
  x: c * CELL_W + CELL_W / 2,
  y: r * CELL_H + CELL_H / 2,
});

const heuristic = (r: number, c: number, gr: number, gc: number): number =>
  Math.sqrt((r - gr) ** 2 + (c - gc) ** 2);

// ---------------------------------------------------------------------------
// A* search
// ---------------------------------------------------------------------------

type Node = { r: number; c: number; g: number; f: number; parent: Node | null };

export const findOptimalPath = (
  start: WorldPoint,
  end: WorldPoint,
  zones: NoFlyZone[],
): WorldPoint[] => {
  const grid = buildGrid(zones);
  const startCell = cellOf(start);
  const goalCell = cellOf(end);

  // Ensure start/goal cells are always passable
  grid[startCell.r]![startCell.c] = false;
  grid[goalCell.r]![goalCell.c] = false;

  const open: Node[] = [];
  const visited = new Set<string>();

  open.push({
    r: startCell.r,
    c: startCell.c,
    g: 0,
    f: heuristic(startCell.r, startCell.c, goalCell.r, goalCell.c),
    parent: null,
  });

  const directions = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
    [-1, -1], [-1, 1], [1, -1], [1, 1],
  ] as const;

  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift()!;
    const key = `${current.r},${current.c}`;
    if (visited.has(key)) continue;
    visited.add(key);

    if (current.r === goalCell.r && current.c === goalCell.c) {
      // Reconstruct path
      const cells: WorldPoint[] = [];
      let n: Node | null = current;
      while (n) {
        cells.push(cellCenter(n.r, n.c));
        n = n.parent;
      }
      cells.reverse();
      const path: WorldPoint[] = [
        { ...start },
        ...cells.slice(1, -1),
        { ...end },
      ];
      return smoothPath(path, grid);
    }

    for (const [dr, dc] of directions) {
      const nr = current.r + dr;
      const nc = current.c + dc;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
      if (grid[nr]![nc]) continue;
      const nkey = `${nr},${nc}`;
      if (visited.has(nkey)) continue;
      const stepCost = dr !== 0 && dc !== 0 ? Math.SQRT2 : 1;
      const g = current.g + stepCost;
      const f = g + heuristic(nr, nc, goalCell.r, goalCell.c);
      open.push({ r: nr, c: nc, g, f, parent: current });
    }
  }

  // Fallback: straight line
  return [{ ...start }, { ...end }];
};

// ---------------------------------------------------------------------------
// Path smoothing (string-pulling)
// ---------------------------------------------------------------------------

const lineClear = (
  a: WorldPoint,
  b: WorldPoint,
  grid: boolean[][],
): boolean => {
  const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (CELL_W / 2));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    const r = Math.floor(y / CELL_H);
    const c = Math.floor(x / CELL_W);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
    if (grid[r]![c]) return false;
  }
  return true;
};

const smoothPath = (path: WorldPoint[], grid: boolean[][]): WorldPoint[] => {
  if (path.length <= 2) return path;
  const smoothed: WorldPoint[] = [path[0]!];
  let i = 0;
  while (i < path.length - 1) {
    let j = path.length - 1;
    while (j > i + 1 && !lineClear(path[i]!, path[j]!, grid)) {
      j--;
    }
    smoothed.push(path[j]!);
    i = j;
  }
  return smoothed;
};
