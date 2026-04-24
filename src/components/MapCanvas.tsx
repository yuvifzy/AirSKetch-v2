import { useEffect, useMemo, useRef, useState } from 'react';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Stage as KonvaStage } from 'konva/lib/Stage';
import { Stage, Layer, Line, Circle, Rect, Group, Text } from 'react-konva';
import {
  intersectsNoFlyZones,
  type HubNode,
  type SketchRoute,
  type WorldPoint,
  useAirSketchStore,
} from '../store/useAirSketchStore';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const distance = (first: WorldPoint, second: WorldPoint) => Math.hypot(first.x - second.x, first.y - second.y);

const nearestHub = (point: WorldPoint, hubs: HubNode[], threshold: number): HubNode | null => {
  let candidate: HubNode | null = null;
  let shortestDistance = Number.POSITIVE_INFINITY;

  hubs.forEach((hub) => {
    const currentDistance = distance(point, hub);
    if (currentDistance < shortestDistance) {
      shortestDistance = currentDistance;
      candidate = hub;
    }
  });

  if (!candidate || shortestDistance > threshold) {
    return null;
  }

  return candidate;
};

const pointAlongRoute = (points: WorldPoint[], progress: number): WorldPoint => {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }
  if (points.length === 1) {
    return points[0];
  }

  const totalLength = points.slice(1).reduce((accumulator, currentPoint, index) => {
    return accumulator + distance(points[index], currentPoint);
  }, 0);

  const targetDistance = totalLength * clamp(progress, 0, 1);
  let accumulated = 0;

  for (let index = 1; index < points.length; index += 1) {
    const segmentStart = points[index - 1];
    const segmentEnd = points[index];
    const segmentLength = distance(segmentStart, segmentEnd);

    if (accumulated + segmentLength >= targetDistance) {
      const localProgress = (targetDistance - accumulated) / segmentLength;
      return {
        x: segmentStart.x + (segmentEnd.x - segmentStart.x) * localProgress,
        y: segmentStart.y + (segmentEnd.y - segmentStart.y) * localProgress,
      };
    }

    accumulated += segmentLength;
  }

  return points.at(-1)!;
};

const flattenRoutePoints = (
  points: WorldPoint[],
  worldToPixel: (value: WorldPoint) => { x: number; y: number }
) =>
  points.flatMap((routePoint) => {
    const pixelPoint = worldToPixel(routePoint);
    return [pixelPoint.x, pixelPoint.y];
  });

export default function MapCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const draftPointsRef = useRef<WorldPoint[]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  const {
    mode,
    activeTool,
    hubs,
    noFlyZones,
    activeDraftRoute,
    committedRoutes,
    aiOptimizedRoutes,
    selectedRouteId,
    simulation,
    zoomPercent,
    aiRoutesVisible,
    startDraftRoute,
    appendDraftPoint,
    markDraftViolation,
    commitDraftRoute,
    cancelDraftRoute,
    selectRoute,
  } = useAirSketchStore();

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const stageScale = useMemo(() => zoomPercent / 100, [zoomPercent]);
  const centeredOffset = useMemo(
    () => ({
      x: (dimensions.width * (1 - stageScale)) / 2,
      y: (dimensions.height * (1 - stageScale)) / 2,
    }),
    [dimensions.height, dimensions.width, stageScale]
  );

  const worldToPixel = (point: WorldPoint) => ({
    x: (point.x / 100) * dimensions.width,
    y: (point.y / 100) * dimensions.height,
  });

  const pointerToWorld = (stage: KonvaStage): WorldPoint | null => {
    const pointerPosition = stage.getRelativePointerPosition();
    if (!pointerPosition || dimensions.width === 0 || dimensions.height === 0) {
      return null;
    }

    return {
      x: clamp((pointerPosition.x / dimensions.width) * 100, 0, 100),
      y: clamp((pointerPosition.y / dimensions.height) * 100, 0, 100),
    };
  };

  const drawingEnabled = mode === 'SKETCH' && activeTool === 'PENCIL';

  const handlePointerDown = (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!drawingEnabled) {
      return;
    }

    const stage = event.target.getStage();
    if (!stage) {
      return;
    }
    const pointer = pointerToWorld(stage);
    if (!pointer) {
      return;
    }

    const snappedHub = nearestHub(pointer, hubs, 3.8);
    const startPoint = snappedHub ? { x: snappedHub.x, y: snappedHub.y } : pointer;

    draftPointsRef.current = [startPoint];
    setIsDrawing(true);
    startDraftRoute(startPoint, snappedHub?.id);
  };

  const handlePointerMove = (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!isDrawing || !drawingEnabled) {
      return;
    }

    const stage = event.target.getStage();
    if (!stage) {
      return;
    }
    const pointer = pointerToWorld(stage);
    if (!pointer) {
      return;
    }

    const snappedHub = nearestHub(pointer, hubs, 3.2);
    const nextPoint = snappedHub ? { x: snappedHub.x, y: snappedHub.y } : pointer;
    const previousPoint = draftPointsRef.current.at(-1);

    if (previousPoint && distance(previousPoint, nextPoint) < 0.55) {
      return;
    }

    const nextDraftPoints = [...draftPointsRef.current, nextPoint];
    draftPointsRef.current = nextDraftPoints;
    appendDraftPoint(nextPoint);
    markDraftViolation(intersectsNoFlyZones(nextDraftPoints, noFlyZones));
  };

  const handlePointerUp = (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!isDrawing) {
      return;
    }

    setIsDrawing(false);
    if (!drawingEnabled) {
      draftPointsRef.current = [];
      cancelDraftRoute();
      return;
    }

    const stage = event.target.getStage();
    if (!stage) {
      return;
    }
    const pointer = pointerToWorld(stage);
    const finalHub = pointer ? nearestHub(pointer, hubs, 3.8) : null;

    if (finalHub) {
      const lastPoint = draftPointsRef.current.at(-1);
      const snappedEnd = { x: finalHub.x, y: finalHub.y };
      if (!lastPoint || distance(lastPoint, snappedEnd) > 0.1) {
        draftPointsRef.current = [...draftPointsRef.current, snappedEnd];
        appendDraftPoint(snappedEnd);
      }
    }

    markDraftViolation(intersectsNoFlyZones(draftPointsRef.current, noFlyZones));
    commitDraftRoute(finalHub?.id);
    draftPointsRef.current = [];
  };

  const selectedRoute = committedRoutes.find((route) => route.id === selectedRouteId);
  const showAiRoutes = mode === 'COMPARE' && aiRoutesVisible;

  const cursor =
    activeTool === 'PAN' ? (isPanning ? 'grabbing' : 'grab') : drawingEnabled ? 'crosshair' : 'default';

  const renderRoute = (
    route: SketchRoute,
    options?: { dashed?: boolean; reducedOpacity?: boolean }
  ) => {
    const points = flattenRoutePoints(route.points, worldToPixel);
    const selected = selectedRouteId === route.id;
    const opacity = options?.reducedOpacity ? 0.45 : selected ? 0.98 : 0.86;

    return (
      <Group
        key={route.id}
        onClick={() => selectRoute(route.id)}
        onTap={() => selectRoute(route.id)}
      >
        <Line
          points={points}
          stroke="#101010"
          strokeWidth={selected ? 10 : 8}
          tension={0.45}
          lineCap="round"
          lineJoin="round"
          opacity={opacity}
          dash={options?.dashed ? [9, 6] : undefined}
        />
        <Line
          points={points}
          stroke={route.color}
          strokeWidth={selected ? 6.5 : 4.6}
          tension={0.45}
          lineCap="round"
          lineJoin="round"
          opacity={opacity}
          dash={options?.dashed ? [9, 6] : undefined}
        />
      </Group>
    );
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 canvas-grid w-full h-full"
      style={{ cursor }}
    >
      <Stage
        width={dimensions.width}
        height={dimensions.height}
        x={centeredOffset.x + panOffset.x}
        y={centeredOffset.y + panOffset.y}
        scaleX={stageScale}
        scaleY={stageScale}
        draggable={activeTool === 'PAN'}
        onDragStart={() => setIsPanning(true)}
        onDragEnd={(event) => {
          setIsPanning(false);
          setPanOffset({
            x: event.target.x() - centeredOffset.x,
            y: event.target.y() - centeredOffset.y,
          });
        }}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
        <Layer>
          {noFlyZones.map((zone) => {
            const center = worldToPixel(zone);
            const radius = (zone.radius / 100) * dimensions.width;

            return (
              <Group key={zone.id} listening={false}>
                <Circle
                  x={center.x}
                  y={center.y}
                  radius={radius}
                  stroke="#ef4444"
                  strokeWidth={3}
                  dash={[10, 8]}
                  fill="rgba(239, 68, 68, 0.20)"
                />
                <Line
                  points={[center.x - radius * 0.72, center.y - radius * 0.72, center.x + radius * 0.72, center.y + radius * 0.72]}
                  stroke="#ef4444"
                  strokeWidth={2}
                  opacity={0.5}
                />
                <Line
                  points={[center.x + radius * 0.72, center.y - radius * 0.72, center.x - radius * 0.72, center.y + radius * 0.72]}
                  stroke="#ef4444"
                  strokeWidth={2}
                  opacity={0.5}
                />
                <Rect
                  x={center.x - 28}
                  y={center.y + radius + 6}
                  width={56}
                  height={16}
                  fill="white"
                  stroke="#101010"
                  strokeWidth={2}
                />
                <Text
                  x={center.x - 26}
                  y={center.y + radius + 9}
                  width={52}
                  align="center"
                  text={zone.label}
                  fill="#ef4444"
                  fontSize={8}
                  fontStyle="bold"
                  lineHeight={1.05}
                />
              </Group>
            );
          })}

          {committedRoutes.map((route) => renderRoute(route, { reducedOpacity: mode === 'COMPARE' }))}
          {showAiRoutes && aiOptimizedRoutes.map((route) => renderRoute(route, { dashed: true }))}

          {activeDraftRoute && activeDraftRoute.points.length > 1 && (
            <>
              <Line
                points={flattenRoutePoints(activeDraftRoute.points, worldToPixel)}
                stroke="#111111"
                strokeWidth={8}
                tension={0.45}
                lineCap="round"
                lineJoin="round"
                opacity={0.95}
              />
              <Line
                points={flattenRoutePoints(activeDraftRoute.points, worldToPixel)}
                stroke={activeDraftRoute.hasViolation ? '#ef4444' : activeDraftRoute.color}
                strokeWidth={5.2}
                tension={0.45}
                lineCap="round"
                lineJoin="round"
                opacity={0.95}
              />
            </>
          )}

          {hubs.map((hub) => {
            const point = worldToPixel(hub);
            const labelWidth = Math.max(66, hub.name.length * 6.7);
            return (
              <Group key={hub.id} listening={false}>
                <Circle x={point.x} y={point.y} radius={14} fill="#f8f8f8" stroke="#111111" strokeWidth={4} />
                <Circle x={point.x} y={point.y} radius={9} fill="#ffffff" stroke="#4b5563" strokeWidth={2} />
                <Circle x={point.x} y={point.y} radius={2.6} fill={hub.markerColor} />
                <Rect
                  x={point.x - labelWidth / 2}
                  y={point.y + 18}
                  width={labelWidth}
                  height={18}
                  fill="white"
                  stroke="#111111"
                  strokeWidth={2}
                />
                <Text
                  x={point.x - labelWidth / 2}
                  y={point.y + 23}
                  width={labelWidth}
                  text={hub.name}
                  fill="#101010"
                  align="center"
                  fontSize={8}
                  fontStyle="bold"
                />
                {hub.subtitle && (
                  <Text
                    x={point.x - labelWidth / 2}
                    y={point.y + 31}
                    width={labelWidth}
                    text={hub.subtitle}
                    fill="#6b7280"
                    align="center"
                    fontSize={6.8}
                    fontStyle="bold"
                  />
                )}
              </Group>
            );
          })}

          {mode === 'SIMULATE' &&
            committedRoutes.map((route) => {
              const progress = clamp(
                simulation.elapsedSeconds / Math.max(route.metrics.etaSeconds, 1),
                0,
                1
              );
              const markerPoint = worldToPixel(pointAlongRoute(route.points, progress));
              return (
                <Group key={`drone-${route.id}`} listening={false}>
                  <Circle
                    x={markerPoint.x}
                    y={markerPoint.y}
                    radius={8}
                    fill="#ffffff"
                    stroke="#111111"
                    strokeWidth={2.5}
                    shadowColor={route.color}
                    shadowBlur={14}
                  />
                  <Circle
                    x={markerPoint.x}
                    y={markerPoint.y}
                    radius={3}
                    fill={route.color}
                  />
                </Group>
              );
            })}

          {selectedRoute && (
            <Text
              x={14}
              y={dimensions.height - 34}
              text={`Selected: ${selectedRoute.label}  ${selectedRoute.metrics.flightScore}/100`}
              fill="#111111"
              fontSize={10}
              fontStyle="bold"
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
}
