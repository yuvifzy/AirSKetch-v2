import {
  ArrowLeft,
  BarChart3,
  Eraser,
  Hand,
  Layers,
  MousePointer2,
  Pause,
  PenLine,
  Play,
  RotateCcw,
  Route,
  Search,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAirSketchStore, type CursorTool, type PlaybackSpeed } from '../store/useAirSketchStore';
import { cn } from '../utils/cn';

const tools: Array<{ id: CursorTool; icon: typeof PenLine; label: string }> = [
  { id: 'PENCIL', icon: PenLine, label: 'Pencil' },
  { id: 'SELECT', icon: MousePointer2, label: 'Select' },
  { id: 'ERASER', icon: Eraser, label: 'Eraser' },
  { id: 'PAN', icon: Hand, label: 'Pan' },
];

const modes = ['SKETCH', 'SIMULATE', 'COMPARE'] as const;
const speeds: PlaybackSpeed[] = [0.5, 1, 2, 4];

export default function TopBar() {
  const {
    mode,
    setMode,
    activeTool,
    setActiveTool,
    simulation,
    setPlaybackSpeed,
    togglePlayback,
    resetSimulation,
    zoomPercent,
    setZoomPercent,
    analyticsEnabled,
    toggleAnalytics,
    aiRoutesVisible,
    toggleAiRoutesVisible,
  } = useAirSketchStore();

  return (
    <motion.div
      initial={{ y: -28, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="absolute top-3 left-3 right-3 z-30 pointer-events-auto"
    >
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="h-10 px-4 bg-white brutal-border shadow-brutal text-sm font-black tracking-wide uppercase hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] transition-all"
          >
            <span className="flex items-center gap-2">
              <ArrowLeft className="w-3.5 h-3.5" />
              BACK
            </span>
          </button>

          <div className="hidden sm:flex items-center gap-2">
            <div className="w-8 h-8 bg-brutal-primary brutal-border shadow-brutal flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div className="text-xl font-black uppercase leading-none tracking-tight">
              AIR <span className="italic bg-black text-white px-1">SKETCH</span>
            </div>
          </div>

          <div className="hidden md:flex items-center p-1 bg-white brutal-border shadow-brutal gap-1">
            {tools.map((tool) => {
              const ToolIcon = tool.icon;
              const isActive = activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  aria-label={tool.label}
                  title={tool.label}
                  className={cn(
                    'w-9 h-9 flex items-center justify-center brutal-border border-[3px] transition-all',
                    isActive
                      ? 'bg-brutal-primary text-white shadow-brutal'
                      : 'bg-white text-black border-transparent hover:border-black'
                  )}
                >
                  <ToolIcon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 top-0 hidden lg:flex items-center p-1 bg-white brutal-border shadow-brutal">
          {modes.map((value) => (
            <button
              key={value}
              onClick={() => setMode(value)}
              className={cn(
                'px-7 py-2 text-xs font-black tracking-wide transition-colors',
                mode === value ? 'bg-black text-white' : 'text-black hover:bg-black/5'
              )}
            >
              {value}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {mode === 'COMPARE' && (
            <button
              onClick={toggleAiRoutesVisible}
              className={cn(
                'h-10 px-4 bg-white brutal-border shadow-brutal text-xs font-black tracking-wide uppercase flex items-center gap-2 transition-all',
                aiRoutesVisible ? 'text-black' : 'text-black/60'
              )}
            >
              <Route className="w-4 h-4" />
              AI ROUTES
            </button>
          )}

          <div className="hidden sm:flex items-center bg-white brutal-border shadow-brutal px-1 py-1 gap-1">
            <button
              onClick={togglePlayback}
              className="w-9 h-8 flex items-center justify-center bg-brutal-yellow brutal-border border-[3px]"
            >
              {simulation.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={resetSimulation}
              className="w-9 h-8 flex items-center justify-center text-black hover:bg-black/5"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <div className="mx-1 h-6 w-px bg-black/30" />
            {speeds.map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={cn(
                  'w-10 h-8 text-[11px] font-black',
                  simulation.speed === speed ? 'bg-black text-white' : 'text-black hover:bg-black/5'
                )}
              >
                {speed}x
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center bg-white brutal-border shadow-brutal p-1 gap-1">
            <button
              onClick={() => setZoomPercent(zoomPercent - 5)}
              className="w-8 h-8 flex items-center justify-center hover:bg-black/5"
              aria-label="Decrease zoom"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
            <div className="w-12 text-center text-xs font-black">{Math.round(zoomPercent)}%</div>
            <button
              onClick={() => setZoomPercent(zoomPercent + 5)}
              className="w-8 h-8 flex items-center justify-center hover:bg-black/5"
              aria-label="Increase zoom"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={toggleAnalytics}
            className={cn(
              'w-10 h-10 brutal-border shadow-brutal flex items-center justify-center',
              analyticsEnabled ? 'bg-black text-white' : 'bg-white text-black'
            )}
            aria-label="Toggle analytics"
          >
            <BarChart3 className="w-4 h-4" />
          </button>

          <button
            onClick={resetSimulation}
            className="w-10 h-10 bg-brutal-red text-white brutal-border shadow-brutal flex items-center justify-center"
            aria-label="Reset simulation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
