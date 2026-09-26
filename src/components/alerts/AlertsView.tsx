import React, { useState } from 'react';
import { AlertItem, AlertSeverity } from '../../models/Alert';
import {
  Bell,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  Info,
  Trash2,
  Filter,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

interface AlertsViewProps {
  alerts: AlertItem[];
  onClearAlerts: () => void;
  onSelectHelmet: (helmetId: string) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  onClearAlerts,
  onSelectHelmet,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  const filteredAlerts = alerts.filter((item) => {
    if (filterSeverity === 'ALL') return true;
    if (filterSeverity === 'CRITICAL') return item.severity === 'critical';
    if (filterSeverity === 'WARNING') return item.severity === 'warning';
    if (filterSeverity === 'OFFLINE') return item.severity === 'offline';
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-mine-darkest">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header with Title and Clear Action */}
        <div className="flex items-center justify-between border-b border-mine-border/80 pb-4">
          <div>
            <h2 className="text-xl font-bold font-sans text-white tracking-wide flex items-center gap-2">
              <Bell className="w-5 h-5 text-cyan-400" />
              Alert Log
            </h2>
            <p className="text-xs font-mono text-slate-400 mt-1">
              {alerts.length} events recorded
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter pills */}
            <div className="flex items-center gap-1 bg-mine-dark p-1 rounded-lg border border-mine-border text-xs font-mono">
              {['ALL', 'CRITICAL', 'WARNING', 'OFFLINE'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev)}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    filterSeverity === sev
                      ? 'bg-cyan-600/30 text-cyan-300 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>

            {alerts.length > 0 && (
              <button
                onClick={onClearAlerts}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-mine-surface hover:bg-mine-card border border-mine-border text-xs font-mono text-slate-300 hover:text-rose-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Log</span>
              </button>
            )}
          </div>
        </div>

        {/* Alerts List */}
        {filteredAlerts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-mono text-sm bg-mine-dark/40 rounded-xl border border-mine-border flex flex-col items-center justify-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400/60" />
            <span>No events matching the active filter.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredAlerts.map((alert) => {
              const isCrit = alert.severity === 'critical';
              const isWarn = alert.severity === 'warning';
              const isOffline = alert.severity === 'offline';

              const icon = isCrit ? (
                <AlertOctagon className="w-5 h-5 text-rose-400" />
              ) : isWarn ? (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              ) : (
                <Info className="w-5 h-5 text-slate-400" />
              );

              const badgeColor = isCrit
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                : isWarn
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-slate-500/10 text-slate-400 border-slate-500/30';

              return (
                <div
                  key={alert.id}
                  onClick={() => onSelectHelmet(alert.helmetId)}
                  className="bg-mine-dark/80 hover:bg-mine-dark border border-mine-border/80 hover:border-cyan-500/40 rounded-xl p-3.5 flex items-center justify-between transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="p-2 rounded-lg bg-mine-surface border border-mine-border/60 shrink-0">
                      {icon}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-sm">
                          {alert.helmetId}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${badgeColor}`}>
                          {alert.title}
                        </span>
                        {alert.value && (
                          <span className="text-[11px] font-mono text-slate-400 bg-mine-darkest px-1.5 py-0.5 rounded border border-mine-border/60">
                            {alert.value}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-300 font-sans mt-0.5 truncate">
                        {alert.message}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 font-mono text-xs text-slate-400">
                    <span>{alert.timestamp}</span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
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
