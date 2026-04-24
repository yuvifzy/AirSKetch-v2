import {
    booleanIntersects,
    booleanPointInPolygon,
    lineString,
    point,
    polygon,
} from '@turf/turf';
import { create } from 'zustand';

export type AppMode = 'SKETCH' | 'SIMULATE' | 'COMPARE';
export type CursorTool = 'PENCIL' | 'SELECT' | 'ERASER' | 'PAN';
export type PlaybackSpeed = 0.5 | 1 | 2 | 4;

export interface WorldPoint {
    x: number;
    y: number;
}

export interface HubNode extends WorldPoint {
    id: string;
    name: string;
    subtitle: string;
    markerColor: string;
}

export interface NoFlyZone extends WorldPoint {
    id: string;
    label: string;
    radius: number;
}

export interface RouteMetrics {
    safety: number;
    efficiency: number;
    energy: number;
    flightScore: number;
    etaSeconds: number;
    length: number;
    hasViolation: boolean;
}

export interface SketchRoute {
    id: string;
    label: string;
    color: string;
    points: WorldPoint[];
    startHubId?: string;
    endHubId?: string;
    kind: 'USER' | 'AI';
    metrics: RouteMetrics;
}

export interface DraftRoute {
    id: string;
    color: string;
    points: WorldPoint[];
    startHubId?: string;
    hasViolation: boolean;
}

export interface SimulationState {
    elapsedSeconds: number;
    collisions: number;
    delivered: number;
    speed: PlaybackSpeed;
    isPlaying: boolean;
}

export interface GlobalMetrics {
    safety: number;
    efficiency: number;
    energy: number;
    flightScore: number;
}

interface AirSketchStore {
    mode: AppMode;
    activeTool: CursorTool;
    hubs: HubNode[];
    noFlyZones: NoFlyZone[];
    activeDraftRoute: DraftRoute | null;
    committedRoutes: SketchRoute[];
    aiOptimizedRoutes: SketchRoute[];
    selectedRouteId: string | null;
    simulation: SimulationState;
    globalMetrics: GlobalMetrics;
    zoomPercent: number;
    analyticsEnabled: boolean;
    aiRoutesVisible: boolean;

    setMode: (mode: AppMode) => void;
    setActiveTool: (tool: CursorTool) => void;
    setPlaybackSpeed: (speed: PlaybackSpeed) => void;
    togglePlayback: () => void;
    resetSimulation: () => void;
    tickSimulation: (deltaSeconds: number) => void;
    setZoomPercent: (zoomPercent: number) => void;
    toggleAnalytics: () => void;
    toggleAiRoutesVisible: () => void;
    selectRoute: (routeId: string | null) => void;
    startDraftRoute: (point: WorldPoint, startHubId?: string) => void;
    appendDraftPoint: (point: WorldPoint) => void;
    markDraftViolation: (hasViolation: boolean) => void;
    cancelDraftRoute: () => void;
    commitDraftRoute: (endHubId?: string) => void;
    clearSelectedRoute: () => void;
}

const HUBS: HubNode[] = [
    { id: 'central-depot', name: 'CENTRAL DEPOT', subtitle: 'DEPOT', markerColor: '#d97706', x: 6, y: 46 },
    { id: 'koramangala', name: 'KORAMANGALA', subtitle: 'DROP', markerColor: '#ef4444', x: 20, y: 21 },
    { id: 'warehouse', name: 'WAREHOUSE', subtitle: 'AIR HUB', markerColor: '#d97706', x: 28, y: 40 },
    { id: 'jayanagar', name: 'JAYANAGAR', subtitle: '', markerColor: '#ef4444', x: 14, y: 69 },
    { id: 'btm-layout', name: 'BTM LAYOUT', subtitle: '', markerColor: '#ef4444', x: 34, y: 74 },
    { id: 'relay-hub', name: 'RELAY HUB', subtitle: '', markerColor: '#60a5fa', x: 42, y: 26 },
    { id: 'east-hub', name: 'EAST HUB', subtitle: '', markerColor: '#60a5fa', x: 62, y: 26 },
    { id: 'indiranagar', name: 'INDIRANAGAR', subtitle: '', markerColor: '#ef4444', x: 53, y: 51 },
    { id: 'city-hospital', name: 'CITY HOSPITAL', subtitle: '', markerColor: '#ef4444', x: 45, y: 64 },
    { id: 'whitefield', name: 'WHITEFIELD', subtitle: '', markerColor: '#ef4444', x: 59, y: 69 },
];

const NO_FLY_ZONES: NoFlyZone[] = [
    { id: 'military-base', label: 'MILITARY\nBASE', x: 17, y: 40, radius: 5.5 },
    { id: 'hal-zone', label: 'HAL\nZONE', x: 37, y: 45, radius: 7 },
    { id: 'vip-corridor', label: 'VIP\nCORRIDOR', x: 50, y: 35, radius: 4.3 },
];

const USER_ROUTE_COLORS = ['#20c997', '#22d3ee', '#f59e0b', '#a855f7'];

const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

const roundToSingle = (value: number) => Math.round(value * 10) / 10;

const pathLength = (points: WorldPoint[]) =>
    points.slice(1).reduce((acc, current, index) => {
        const previous = points[index];
        return acc + Math.hypot(current.x - previous.x, current.y - previous.y);
    }, 0);

const distancePointToSegment = (p: WorldPoint, a: WorldPoint, b: WorldPoint) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dx === 0 && dy === 0) {
        return Math.hypot(p.x - a.x, p.y - a.y);
    }

    const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy), 0, 1);
    const projection = { x: a.x + t * dx, y: a.y + t * dy };
    return Math.hypot(p.x - projection.x, p.y - projection.y);
};

const buildZonePolygon = (zone: NoFlyZone) => {
    const ring: number[][] = [];
    const pointCount = 28;
    for (let index = 0; index <= pointCount; index += 1) {
        const angle = (Math.PI * 2 * index) / pointCount;
        ring.push([
            zone.x + Math.cos(angle) * zone.radius,
            zone.y + Math.sin(angle) * zone.radius,
        ]);
    }
    return polygon([ring]);
};

const hasNoFlyIntersection = (points: WorldPoint[], zones: NoFlyZone[]) => {
    if (points.length < 2) {
        return false;
    }

    return zones.some((zone) => {
        const zonePolygon = buildZonePolygon(zone);
        const pointViolation = points.some((routePoint) =>
            booleanPointInPolygon(point([routePoint.x, routePoint.y]), zonePolygon)
        );
        if (pointViolation) {
            return true;
        }

        return points.slice(1).some((current, index) => {
            const previous = points[index];
            const segment = lineString([
                [previous.x, previous.y],
                [current.x, current.y],
            ]);
            return booleanIntersects(segment, zonePolygon);
        });
    });
};

const turnPenalty = (points: WorldPoint[]) => {
    if (points.length < 3) {
        return 0;
    }

    return points.slice(2).reduce((penalty, current, index) => {
        const previous = points[index + 1];
        const beforePrevious = points[index];
        const first = { x: previous.x - beforePrevious.x, y: previous.y - beforePrevious.y };
        const second = { x: current.x - previous.x, y: current.y - previous.y };
        const firstLength = Math.hypot(first.x, first.y);
        const secondLength = Math.hypot(second.x, second.y);
        if (firstLength === 0 || secondLength === 0) {
            return penalty;
        }

        const cosine = clamp(
            (first.x * second.x + first.y * second.y) / (firstLength * secondLength),
            -1,
            1
        );
        const angleDegrees = (Math.acos(cosine) * 180) / Math.PI;
        return penalty + angleDegrees / 45;
    }, 0);
};

const calculateRouteMetrics = (points: WorldPoint[], zones: NoFlyZone[]): RouteMetrics => {
    const length = pathLength(points);
    const direct = points.length > 1 ? Math.hypot(points.at(-1)!.x - points[0].x, points.at(-1)!.y - points[0].y) : 1;
    const efficiencyRatio = direct === 0 ? 1 : length / direct;

    const minClearancePenalty = zones.reduce((penalty, zone) => {
        const segmentClearance = points.slice(1).reduce((minDistance, current, index) => {
            const previous = points[index];
            const distance = distancePointToSegment(zone, previous, current) - zone.radius;
            return Math.min(minDistance, distance);
        }, Number.POSITIVE_INFINITY);

        if (segmentClearance > 6) {
            return penalty;
        }

        return penalty + clamp((6 - segmentClearance) * 2.2, 0, 14);
    }, 0);

    const hasViolation = hasNoFlyIntersection(points, zones);
    const efficiency = clamp(100 - (efficiencyRatio - 1) * 55, 38, 100);
    const safetyBase = hasViolation ? 56 : 100;
    const safety = clamp(safetyBase - minClearancePenalty, 30, 100);
    const energy = clamp(100 - length * 0.72 - turnPenalty(points) * 0.85, 26, 100);
    const flightScore = clamp(
        Math.round(safety * 0.42 + efficiency * 0.34 + energy * 0.24),
        0,
        100
    );

    return {
        safety: roundToSingle(safety),
        efficiency: roundToSingle(efficiency),
        energy: roundToSingle(energy),
        flightScore,
        etaSeconds: Math.max(6, Math.round(length * 2.4)),
        length: roundToSingle(length),
        hasViolation,
    };
};

const aggregateMetrics = (routes: SketchRoute[]): GlobalMetrics => {
    if (routes.length === 0) {
        return { safety: 0, efficiency: 0, energy: 0, flightScore: 0 };
    }

    const totals = routes.reduce(
        (accumulator, route) => ({
            safety: accumulator.safety + route.metrics.safety,
            efficiency: accumulator.efficiency + route.metrics.efficiency,
            energy: accumulator.energy + route.metrics.energy,
            flightScore: accumulator.flightScore + route.metrics.flightScore,
        }),
        { safety: 0, efficiency: 0, energy: 0, flightScore: 0 }
    );

    return {
        safety: roundToSingle(totals.safety / routes.length),
        efficiency: roundToSingle(totals.efficiency / routes.length),
        energy: roundToSingle(totals.energy / routes.length),
        flightScore: Math.round(totals.flightScore / routes.length),
    };
};

const seedRoutePoints: WorldPoint[] = [
    { x: 14, y: 69 },
    { x: 16, y: 67 },
    { x: 20, y: 61 },
    { x: 22, y: 57 },
    { x: 24, y: 52 },
    { x: 26, y: 47 },
    { x: 29, y: 41 },
    { x: 31, y: 36 },
    { x: 33, y: 33 },
    { x: 36, y: 32 },
    { x: 40, y: 32 },
    { x: 42, y: 38 },
    { x: 43, y: 45 },
    { x: 44, y: 54 },
    { x: 45, y: 64 },
];

const aiRoutePoints: WorldPoint[] = [
    { x: 14, y: 69 },
    { x: 18, y: 65 },
    { x: 23, y: 59 },
    { x: 27, y: 52 },
    { x: 30, y: 45 },
    { x: 33, y: 38 },
    { x: 38, y: 34 },
    { x: 43, y: 35 },
    { x: 45, y: 43 },
    { x: 45, y: 64 },
];

const seededUserRoute: SketchRoute = {
    id: 'route-1',
    label: 'Route 1',
    color: USER_ROUTE_COLORS[0],
    points: seedRoutePoints,
    startHubId: 'jayanagar',
    endHubId: 'city-hospital',
    kind: 'USER',
    metrics: calculateRouteMetrics(seedRoutePoints, NO_FLY_ZONES),
};

const seededAiRoute: SketchRoute = {
    id: 'ai-route-1',
    label: 'AI Route 1',
    color: '#2fbf71',
    points: aiRoutePoints,
    startHubId: 'jayanagar',
    endHubId: 'city-hospital',
    kind: 'AI',
    metrics: calculateRouteMetrics(aiRoutePoints, NO_FLY_ZONES),
};

const initialCommittedRoutes = [seededUserRoute];

export const useAirSketchStore = create<AirSketchStore>((set, get) => ({
    mode: 'SKETCH',
    activeTool: 'PENCIL',
    hubs: HUBS,
    noFlyZones: NO_FLY_ZONES,
    activeDraftRoute: null,
    committedRoutes: initialCommittedRoutes,
    aiOptimizedRoutes: [seededAiRoute],
    selectedRouteId: seededUserRoute.id,
    simulation: {
        elapsedSeconds: 455.5,
        collisions: 0,
        delivered: 0,
        speed: 1,
        isPlaying: false,
    },
    globalMetrics: aggregateMetrics(initialCommittedRoutes),
    zoomPercent: 93,
    analyticsEnabled: false,
    aiRoutesVisible: true,

    setMode: (mode) =>
        set((state) => ({
            mode,
            simulation:
                mode === 'SIMULATE'
                    ? state.simulation
                    : { ...state.simulation, isPlaying: false },
        })),

    setActiveTool: (tool) => set({ activeTool: tool }),

    setPlaybackSpeed: (speed) =>
        set((state) => ({
            simulation: { ...state.simulation, speed },
        })),

    togglePlayback: () =>
        set((state) => ({
            simulation: {
                ...state.simulation,
                isPlaying: !state.simulation.isPlaying,
            },
        })),

    resetSimulation: () =>
        set((state) => ({
            simulation: {
                ...state.simulation,
                elapsedSeconds: 0,
                collisions: 0,
                delivered: 0,
                isPlaying: false,
            },
        })),

    tickSimulation: (deltaSeconds) =>
        set((state) => {
            if (!state.simulation.isPlaying) {
                return state;
            }

            const elapsedSeconds = roundToSingle(
                state.simulation.elapsedSeconds + deltaSeconds * state.simulation.speed
            );
            const delivered = Math.min(
                state.committedRoutes.length,
                Math.floor(elapsedSeconds / 120)
            );
            const collisions = state.committedRoutes.filter(
                (route) => route.metrics.hasViolation
            ).length;

            return {
                simulation: {
                    ...state.simulation,
                    elapsedSeconds,
                    delivered,
                    collisions,
                },
            };
        }),

    setZoomPercent: (zoomPercent) => set({ zoomPercent: clamp(zoomPercent, 40, 180) }),

    toggleAnalytics: () =>
        set((state) => ({
            analyticsEnabled: !state.analyticsEnabled,
        })),

    toggleAiRoutesVisible: () =>
        set((state) => ({
            aiRoutesVisible: !state.aiRoutesVisible,
        })),

    selectRoute: (routeId) => set({ selectedRouteId: routeId }),

    startDraftRoute: (pointValue, startHubId) =>
        set(() => ({
            activeDraftRoute: {
                id: `draft-${Date.now()}`,
                color: USER_ROUTE_COLORS[get().committedRoutes.length % USER_ROUTE_COLORS.length],
                points: [pointValue],
                startHubId,
                hasViolation: false,
            },
        })),

    appendDraftPoint: (pointValue) =>
        set((state) => {
            if (!state.activeDraftRoute) {
                return state;
            }

            const draftPoints = state.activeDraftRoute.points;
            const previous = draftPoints.at(-1);
            if (previous) {
                const distance = Math.hypot(pointValue.x - previous.x, pointValue.y - previous.y);
                if (distance < 0.5) {
                    return state;
                }
            }

            return {
                activeDraftRoute: {
                    ...state.activeDraftRoute,
                    points: [...draftPoints, pointValue],
                },
            };
        }),

    markDraftViolation: (hasViolation) =>
        set((state) => {
            if (!state.activeDraftRoute) {
                return state;
            }

            return {
                activeDraftRoute: {
                    ...state.activeDraftRoute,
                    hasViolation,
                },
            };
        }),

    cancelDraftRoute: () => set({ activeDraftRoute: null }),

    commitDraftRoute: (endHubId) =>
        set((state) => {
            if (!state.activeDraftRoute || state.activeDraftRoute.points.length < 2) {
                return { activeDraftRoute: null };
            }

            const routeId = `route-${Date.now()}`;
            const label = `Route ${state.committedRoutes.length + 1}`;
            const metrics = calculateRouteMetrics(state.activeDraftRoute.points, state.noFlyZones);
            const nextRoute: SketchRoute = {
                id: routeId,
                label,
                color: state.activeDraftRoute.color,
                points: state.activeDraftRoute.points,
                startHubId: state.activeDraftRoute.startHubId,
                endHubId,
                kind: 'USER',
                metrics,
            };

            const committedRoutes = [...state.committedRoutes, nextRoute];
            return {
                activeDraftRoute: null,
                committedRoutes,
                selectedRouteId: routeId,
                globalMetrics: aggregateMetrics(committedRoutes),
            };
        }),

    clearSelectedRoute: () =>
        set((state) => {
            if (!state.selectedRouteId) {
                return state;
            }

            const committedRoutes = state.committedRoutes.filter(
                (route) => route.id !== state.selectedRouteId
            );

            return {
                committedRoutes,
                selectedRouteId: committedRoutes.at(-1)?.id ?? null,
                globalMetrics: aggregateMetrics(committedRoutes),
            };
        }),
}));

export const intersectsNoFlyZones = (points: WorldPoint[], zones: NoFlyZone[]) =>
    hasNoFlyIntersection(points, zones);
