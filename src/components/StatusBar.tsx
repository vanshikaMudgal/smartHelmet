import React from 'react';
import { HelmetMetrics } from '../models/Helmet';
import { SiteConfig } from '../models/SiteConfig';

interface StatusBarProps {
  metrics: HelmetMetrics;
  config: SiteConfig;
  tickCount: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  metrics,
  config,
  tickCount,
}) => {
  return (
    <footer className="h-8 bg-mine-darkest border-t border-mine-border px-4 flex items-center justify-between text-[11px] font-mono text-slate-400 select-none z-30 shrink-0">
      {/* Live counts breakdown */}
      <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap">
        <span className="text-slate-300 font-bold">
          HELMETS: <span className="text-white">{metrics.connected}/{metrics.total}</span>
        </span>
        <span className="text-slate-600">|</span>
        <span className="text-emerald-400">
          SAFE: {metrics.active}
        </span>
        <span className="text-slate-600">|</span>
        <span className="text-amber-400">
          WARN: {metrics.warning}
        </span>
        <span className="text-slate-600">|</span>
        <span className="text-rose-400">
          CRIT: {metrics.critical}
        </span>
        <span className="text-slate-600">|</span>
        <span className="text-slate-400">
          OFFLINE: {metrics.offline}
        </span>
        <span className="text-slate-600">|</span>
        <span className="text-cyan-400">
          RADIUS: {config.workingRadius}m
        </span>
        <span className="text-slate-600">|</span>
        <span className="text-slate-400">
          TICK: #{String(tickCount).padStart(4, '0')}
        </span>
      </div>

      {/* System version */}
      <div className="hidden sm:flex items-center gap-2 text-slate-400 shrink-0">
        <span>Rockfall Safety System</span>
        <span>·</span>
        <span className="text-cyan-500 font-semibold">v5.1</span>
      </div>
    </footer>
  );
};
