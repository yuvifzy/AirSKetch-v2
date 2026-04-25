import { Gauge, Shield, Zap, Clock3, Cpu, Trash2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';
import { useAirSketchStore } from '../store/useAirSketchStore';

function MetricCard({
  title,
  value,
  suffix,
  icon,
  iconClassName,
}: {
  title: string;
  value: string;
  suffix: string;
  icon: React.ReactNode;
  iconClassName?: string;
}) {
  return (
    <div className="bg-white brutal-border shadow-brutal rounded-xl px-3 py-2.5">
      <div className={cn('flex items-center gap-1.5 text-[10px] font-black tracking-wide uppercase', iconClassName)}>
        {icon}
        {title}
      </div>
      <div className="mt-1 flex items-end gap-1">
        <span className="text-3xl font-black leading-none">{value}</span>
        <span className="text-xs font-bold opacity-70">{suffix}</span>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const {
    mode,
    globalMetrics,
    committedRoutes,
    selectedRouteId,
    selectRoute,
    simulation,
    clearSelectedRoute,
  } = useAirSketchStore();

  const selectedRoute = committedRoutes.find((route) => route.id === selectedRouteId) ?? committedRoutes[0] ?? null;

  return (
    <motion.aside
      initial={{ x: 22, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="absolute top-20 right-3 z-20 w-[205px] md:w-[220px] space-y-2 pointer-events-auto"
    >
      <section className="bg-[#efefef] brutal-border shadow-brutal rounded-xl px-3 py-2">
        <div className="flex items-center justify-between text-xs font-black uppercase tracking-wide">
          <span>FLIGHT SCORE</span>
          <span className="px-2 py-0.5 brutal-border border-[2px] text-[10px] bg-white">{committedRoutes.length} route</span>
        </div>
        <div className="mt-3 flex items-end gap-1">
          <span className="text-[42px] font-black leading-none text-[#19b07a]">{globalMetrics.flightScore}</span>
          <span className="text-sm font-bold pb-1">/100</span>
        </div>
        <div className="mt-2 h-3 bg-white brutal-border border-[2px] relative overflow-hidden">
          <div
            className="absolute left-0 top-0 bottom-0 bg-[#19b07a]"
            style={{ width: `${Math.min(100, Math.max(0, globalMetrics.flightScore))}%` }}
          />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2">
        <MetricCard
          title="SAFETY"
          value={globalMetrics.safety.toFixed(0)}
          suffix="/100"
          icon={<Shield className="w-3 h-3" />}
          iconClassName="text-[#10b981]"
        />
        <MetricCard
          title="EFFICIENCY"
          value={globalMetrics.efficiency.toFixed(0)}
          suffix="/100"
          icon={<Gauge className="w-3 h-3" />}
          iconClassName="text-[#0ea5e9]"
        />
        <MetricCard
          title="ENERGY"
          value={globalMetrics.energy.toFixed(1)}
          suffix="/100"
          icon={<Zap className="w-3 h-3" />}
          iconClassName="text-[#f59e0b]"
        />
        <MetricCard
          title="ETA"
          value={selectedRoute ? String(selectedRoute.metrics.etaSeconds) : '0'}
          suffix="s"
          icon={<Clock3 className="w-3 h-3" />}
          iconClassName="text-[#8b5cf6]"
        />
      </section>

      {selectedRoute && (
        <section className="bg-white brutal-border shadow-brutal rounded-xl px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-black tracking-wide uppercase text-[#ef4444]">
            <AlertTriangle className="w-3 h-3" />
            AI COLLISION RISK
          </div>
          <div className="mt-1 flex items-end gap-1">
            <span className="text-3xl font-black leading-none">
              {Math.round((selectedRoute.metrics.collisionRisk ?? 0) * 100)}
            </span>
            <span className="text-xs font-bold opacity-70">%</span>
          </div>
          <div className="mt-2 h-3 bg-gray-100 brutal-border border-[2px] relative overflow-hidden">
            <div
              className="absolute left-0 top-0 bottom-0 bg-[#ef4444]"
              style={{ width: `${Math.min(100, Math.max(0, (selectedRoute.metrics.collisionRisk ?? 0) * 100))}%` }}
            />
          </div>
          <div className="mt-1 text-[9px] opacity-50 font-mono">
            TF.js · {(selectedRoute.metrics.inferenceMs ?? 0).toFixed(2)}ms · On-Device
          </div>
        </section>
      )}

      <section className="bg-[#efefef] brutal-border shadow-brutal rounded-xl px-3 py-2">
        <div className="text-xs font-black uppercase tracking-wide">ROUTES</div>
        <div className="mt-2 border-t-[3px] border-black/90 pt-2 space-y-1.5">
          {committedRoutes.map((route) => (
            <button
              key={route.id}
              onClick={() => selectRoute(route.id)}
              className={cn(
                'w-full text-left rounded-lg px-1 py-1 transition-colors',
                selectedRouteId === route.id ? 'bg-black/5' : 'hover:bg-black/5'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="w-3 h-3 brutal-border border-[2px]" style={{ backgroundColor: route.color }} />
                  {route.label}
                </div>
                <span className="text-xs font-black text-[#19b07a]">{route.metrics.flightScore}</span>
              </div>
              <div className="text-[10px] opacity-60 pl-5">Score: {route.metrics.flightScore} · {route.metrics.length}px</div>
            </button>
          ))}
        </div>
      </section>

      {mode === 'SIMULATE' && (
        <section className="bg-[#efefef] brutal-border shadow-brutal rounded-xl px-3 py-2">
          <div className="text-xs font-black uppercase tracking-wide">SIMULATION</div>
          <div className="mt-2 border-t-[3px] border-black/90 pt-2 grid grid-cols-2 gap-y-2">
            <div>
              <div className="text-2xl font-black text-[#0ea5e9] leading-none">{simulation.elapsedSeconds.toFixed(1)}s</div>
              <div className="text-[10px] uppercase font-bold opacity-60">Elapsed</div>
            </div>
            <div>
              <div className="text-2xl font-black text-[#10b981] leading-none">{simulation.delivered}</div>
              <div className="text-[10px] uppercase font-bold opacity-60">Delivered</div>
            </div>
            <div>
              <div className="text-2xl font-black text-[#ef4444] leading-none">{simulation.collisions}</div>
              <div className="text-[10px] uppercase font-bold opacity-60">Collisions</div>
            </div>
            <div>
              <div className="text-2xl font-black text-[#f59e0b] leading-none">{simulation.speed}x</div>
              <div className="text-[10px] uppercase font-bold opacity-60">Speed</div>
            </div>
          </div>
        </section>
      )}

      <section className="bg-[#16bb89] text-black brutal-border shadow-brutal rounded-xl px-3 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-white brutal-border border-[2px] flex items-center justify-center">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-black tracking-wide uppercase">EDGE AI SCORING</div>
            <div className="text-[10px] font-bold opacity-80">Device Inference Active</div>
          </div>
        </div>
        <button
          onClick={clearSelectedRoute}
          className="w-7 h-7 brutal-border border-[2px] bg-white flex items-center justify-center hover:bg-black hover:text-white transition-colors"
          aria-label="Clear selected route"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </section>
    </motion.aside>
  );
} 
