import { Circle, Dot } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAirSketchStore } from '../store/useAirSketchStore';

export default function ControlPanel() {
  const { mode, committedRoutes, globalMetrics, simulation } = useAirSketchStore();

  const modeLabel = mode === 'SIMULATE' ? 'SIMULATING' : mode;

  return (
    <motion.div
      initial={{ y: 18, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="absolute left-4 bottom-4 z-20 pointer-events-none"
    >
      <div className="h-8 pl-3 pr-2 bg-white brutal-border shadow-brutal rounded-xl flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide">
        <Circle className="w-2.5 h-2.5 text-[#16bb89] fill-current" />
        <span className="opacity-60">{modeLabel}</span>
        <span className="opacity-40">|</span>
        <span className="opacity-60">{committedRoutes.length} routes</span>
        <span className="opacity-40">|</span>
        <span>{globalMetrics.flightScore}%</span>
        {mode === 'SIMULATE' && (
          <>
            <span className="opacity-40">|</span>
            <span>{simulation.elapsedSeconds.toFixed(1)}s</span>
            <Dot className="w-3 h-3" />
            <span>{simulation.speed}x</span>
          </>
        )}
      </div>
    </motion.div>
  );
}
