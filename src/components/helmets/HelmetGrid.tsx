import React from 'react';
import { Helmet, HelmetMetrics } from '../../models/Helmet';
import { getStatusColor, getStatusLabel, getTendencyIndicator } from '../../utils/signalStatus';
import { formatTime } from '../../utils/formatters';
import { Signal, MapPin, Layers, Clock, ArrowRight, ShieldAlert, HardHat, HeartPulse } from 'lucide-react';

interface HelmetGridProps {
  helmets: Helmet[];
  metrics: HelmetMetrics;
  onSelectHelmet: (id: string) => void;
}

export const HelmetGrid: React.FC<HelmetGridProps> = ({
  helmets,
  metrics,
  onSelectHelmet,
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-6 bg-mine-darkest">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Title & summary */}
        <div className="flex items-center justify-between border-b border-mine-border/80 pb-4">
          <div>
            <h2 className="text-xl font-bold font-sans text-white tracking-wide flex items-center gap-2">
              <HardHat className="w-5 h-5 text-cyan-400" />
              All Helmets
            </h2>
            <p className="text-xs font-mono text-slate-400 mt-1">
              {metrics.total} devices registered · {metrics.connected} connected
            </p>
          </div>
        </div>

        {/* Grid of Helmet Cards */}
        {helmets.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-mono text-sm bg-mine-dark/40 rounded-xl border border-mine-border">
            No helmets detected. Connect ESP devices to backend or toggle simulator.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {helmets.map((helmet) => {
              const colors = getStatusColor(helmet.status);
              const label = getStatusLabel(helmet.status);
              const tendency = getTendencyIndicator(helmet.tendency);

              return (
                <div
                  key={helmet.id}
                  onClick={() => onSelectHelmet(helmet.id)}
                  className="bg-mine-dark/80 hover:bg-mine-dark border border-mine-border/80 hover:border-cyan-500/50 rounded-xl p-4 transition-all duration-200 cursor-pointer shadow-lg group hover:shadow-cyan-900/10 flex flex-col justify-between"
                >
                  {/* Top Bar: ID, Worker, Status Badge */}
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-base font-mono font-bold text-white tracking-wider">
                          {helmet.id}
                        </div>
                        <div className="text-xs text-slate-400 font-sans mt-0.5">
                          {helmet.workerName} · <span className="text-slate-300 font-medium">{helmet.sector}</span>
                        </div>
                        <div className={`mt-1 flex items-center gap-1 text-[10px] font-mono font-bold ${helmet.workerHealthStatus === 'ALIVE' ? 'text-emerald-400' : helmet.workerHealthStatus === 'DEAD' ? 'text-red-400' : 'text-slate-400'}`}>
                          <HeartPulse className="w-3 h-3" />
                          WORKER {helmet.workerHealthStatus}
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${colors.bgClass} ${colors.textClass} ${colors.borderClass}`}
                      >
                        • {label}
                      </span>
                    </div>

                    {/* Signal Strength & Tendency Bar */}
                    <div className="mt-4 pt-3 border-t border-mine-border/50">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-mono" style={{ color: colors.hex }}>
                          <Signal className="w-4 h-4" />
                          <span className="font-bold">{helmet.signalPercentage}%</span>
                          <span className="text-slate-400 text-[11px]">({helmet.signalStrength} dBm)</span>
                        </div>
                        <span className={`text-xs font-mono font-bold ${tendency.className}`}>
                          {tendency.symbol} {tendency.label}
                        </span>
                      </div>

                      <div className="w-full bg-mine-darkest rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${helmet.signalPercentage}%`,
                            backgroundColor: colors.hex,
                          }}
                        />
                      </div>
                    </div>

                    {/* Coordinate & Depth Telemetry */}
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-mine-border/50 text-[11px] font-mono text-slate-400">
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-slate-400">LAT</div>
                        <div className="text-slate-200 font-bold mt-0.5 truncate">
                          {helmet.hasValidGps ? `${helmet.latitude.toFixed(4)}°` : 'N/A'}
                        </div>
                      </div>

                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-slate-400">LNG</div>
                        <div className="text-slate-200 font-bold mt-0.5 truncate">
                          {helmet.hasValidGps ? `${helmet.longitude.toFixed(4)}°` : 'N/A'}
                        </div>
                      </div>

                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-slate-400">DEPTH</div>
                        <div className="text-slate-200 font-bold mt-0.5 truncate">
                          {helmet.depth ? `${helmet.depth}m` : '0m'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer & Focus action */}
                  <div className="mt-4 pt-3 border-t border-mine-border/40 flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Updated {formatTime(helmet.timestamp)}
                    </span>
                    <span className="text-cyan-400 group-hover:translate-x-1 transition-transform flex items-center gap-1 font-bold">
                      View on Map <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
