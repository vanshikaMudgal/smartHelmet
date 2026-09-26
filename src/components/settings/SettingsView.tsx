import React, { useState } from 'react';
import { SiteConfig } from '../../models/SiteConfig';
import {
  Settings,
  Sliders,
  Server,
  Radio,
  MapPin,
  Clock,
  Save,
  CheckCircle2,
  RefreshCw,
  Cpu
} from 'lucide-react';

interface SettingsViewProps {
  config: SiteConfig;
  onSaveConfig: (updated: Partial<SiteConfig>) => void;
  onOpenReconfigureSite: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  onSaveConfig,
  onOpenReconfigureSite,
}) => {
  const [siteName, setSiteName] = useState(config.siteName);
  const [backendBaseUrl, setBackendBaseUrl] = useState(config.backendBaseUrl);
  const [pollingInterval, setPollingInterval] = useState(String(config.pollingInterval));
  const [safeSignal, setSafeSignal] = useState(String(config.safeSignalThreshold));
  const [warningSignal, setWarningSignal] = useState(String(config.warningSignalThreshold));
  const [criticalSignal, setCriticalSignal] = useState(String(config.criticalSignalThreshold));
  const [staleTimeout, setStaleTimeout] = useState(String(config.staleTimeout));
  const [useMockData, setUseMockData] = useState(config.useMockData);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      siteName,
      backendBaseUrl,
      pollingInterval: Math.max(250, Number(pollingInterval) || 1000),
      safeSignalThreshold: Number(safeSignal) || -65,
      warningSignalThreshold: Number(warningSignal) || -75,
      criticalSignalThreshold: Number(criticalSignal) || -85,
      staleTimeout: Math.max(1000, Number(staleTimeout) || 10000),
      useMockData,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-mine-darkest">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Title */}
        <div className="border-b border-mine-border/80 pb-4">
          <h2 className="text-xl font-bold font-sans text-white tracking-wide flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            Settings
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-1">
            System configuration and site parameters
          </p>
        </div>

        {/* Form Container matching Figma Card Style */}
        <form onSubmit={handleSave} className="space-y-6">
          {savedSuccess && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Configuration successfully saved and applied!</span>
            </div>
          )}

          {/* Section 1: Site Parameters (Matching Figma Screen 4) */}
          <div className="bg-mine-dark/80 border border-mine-border/80 rounded-xl p-5 space-y-4">
            <div className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              Site Parameters
            </div>

            <div className="space-y-3 font-mono text-xs">
              {/* Site Name */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-mine-surface/60 border border-mine-border/50 gap-2">
                <span className="text-slate-400">Site Name</span>
                <span className="text-white font-bold">{config.siteName}</span>
              </div>

              {/* Latitude */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-mine-surface/60 border border-mine-border/50 gap-2">
                <span className="text-slate-400">Latitude</span>
                <span className="text-white font-bold">{config.latitude.toFixed(5)}</span>
              </div>

              {/* Longitude */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-mine-surface/60 border border-mine-border/50 gap-2">
                <span className="text-slate-400">Longitude</span>
                <span className="text-white font-bold">{config.longitude.toFixed(5)}</span>
              </div>

              {/* Working Radius */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-mine-surface/60 border border-mine-border/50 gap-2">
                <span className="text-slate-400">Working Radius</span>
                <span className="text-white font-bold">{config.workingRadius} m</span>
              </div>

              {/* Backend API Endpoint format */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-mine-surface/60 border border-mine-border/50 gap-2">
                <span className="text-slate-400">Backend API</span>
                <span className="text-cyan-400 font-bold">/api/v1/helmets (PUT/GET)</span>
              </div>

              {/* Protocol */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-mine-surface/60 border border-mine-border/50 gap-2">
                <span className="text-slate-400">Protocol</span>
                <span className="text-white font-bold">HTTP/REST + Configurable Polling</span>
              </div>
            </div>

            {/* Reconfigure Site Button (from Figma) */}
            <div className="pt-2">
              <button
                type="button"
                onClick={onOpenReconfigureSite}
                className="w-full py-2.5 px-4 rounded-lg bg-mine-surface hover:bg-mine-card border border-mine-border/80 hover:border-cyan-500/50 text-cyan-300 font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reconfigure Site Coordinates & Radius →</span>
              </button>
            </div>
          </div>

          {/* Section 2: Backend & Polling Settings */}
          <div className="bg-mine-dark/80 border border-mine-border/80 rounded-xl p-5 space-y-4">
            <div className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              API Connection & Telemetry Engine
            </div>

            <div className="space-y-4 font-mono text-xs">
              {/* Data Source Mode Toggle */}
              <div className="p-3 rounded-lg bg-mine-surface/60 border border-mine-border/50 flex items-center justify-between">
                <div>
                  <div className="text-white font-bold flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                    Data Source Mode
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 font-sans">
                    {useMockData
                      ? 'Simulated ESP helmet data active for offline testing'
                      : 'Live Mode: Querying your real backend endpoint'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] uppercase font-bold ${!useMockData ? 'text-emerald-400' : 'text-slate-400'}`}>
                    Live Backend
                  </span>
                  <button
                    type="button"
                    onClick={() => setUseMockData(!useMockData)}
                    className={`w-12 h-6 rounded-full p-1 transition-colors ${
                      useMockData ? 'bg-cyan-600' : 'bg-mine-card'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        useMockData ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className={`text-[10px] uppercase font-bold ${useMockData ? 'text-cyan-400' : 'text-slate-400'}`}>
                    Mock Simulator
                  </span>
                </div>
              </div>

              {/* Backend Base URL */}
              <div>
                <label className="block text-slate-400 text-[11px] uppercase tracking-wider mb-1">
                  Backend API Base URL (VITE_API_BASE_URL)
                </label>
                <input
                  type="text"
                  value={backendBaseUrl}
                  onChange={(e) => setBackendBaseUrl(e.target.value)}
                  placeholder="http://localhost:5000"
                  className="w-full px-3 py-2 bg-mine-surface border border-mine-border rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
                <p className="text-[10px] text-slate-400 mt-1 font-sans">
                  The frontend will call: <code className="text-cyan-400">{backendBaseUrl}/api/v1/helmets</code>
                </p>
              </div>

              {/* Polling Interval */}
              <div>
                <label className="block text-slate-400 text-[11px] uppercase tracking-wider mb-1">
                  Polling Interval (milliseconds)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="250"
                    max="10000"
                    step="250"
                    value={pollingInterval}
                    onChange={(e) => setPollingInterval(e.target.value)}
                    className="w-40 px-3 py-2 bg-mine-surface border border-mine-border rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-slate-400">
                    ({(Number(pollingInterval) / 1000).toFixed(1)} seconds)
                  </span>
                </div>
              </div>

              {/* Stale Timeout */}
              <div>
                <label className="block text-slate-400 text-[11px] uppercase tracking-wider mb-1">
                  Stale/Offline Timeout (milliseconds)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="2000"
                    max="60000"
                    step="1000"
                    value={staleTimeout}
                    onChange={(e) => setStaleTimeout(e.target.value)}
                    className="w-40 px-3 py-2 bg-mine-surface border border-mine-border rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-slate-400">
                    Flag helmet as OFFLINE after inactivity
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Signal Thresholds */}
          <div className="bg-mine-dark/80 border border-mine-border/80 rounded-xl p-5 space-y-4">
            <div className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              RF Signal Thresholds (Configurable)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-3 rounded-lg bg-mine-surface/60 border border-emerald-500/20">
                <label className="block text-emerald-400 text-[10px] uppercase font-bold mb-1">
                  Safe Threshold (dBm)
                </label>
                <input
                  type="number"
                  value={safeSignal}
                  onChange={(e) => setSafeSignal(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-mine-darkest border border-mine-border rounded text-white font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Normal / Strong signal</span>
              </div>

              <div className="p-3 rounded-lg bg-mine-surface/60 border border-amber-500/20">
                <label className="block text-amber-400 text-[10px] uppercase font-bold mb-1">
                  Warning Threshold (dBm)
                </label>
                <input
                  type="number"
                  value={warningSignal}
                  onChange={(e) => setWarningSignal(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-mine-darkest border border-mine-border rounded text-white font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Degrading signal alert</span>
              </div>

              <div className="p-3 rounded-lg bg-mine-surface/60 border border-rose-500/20">
                <label className="block text-rose-400 text-[10px] uppercase font-bold mb-1">
                  Critical Threshold (dBm)
                </label>
                <input
                  type="number"
                  value={criticalSignal}
                  onChange={(e) => setCriticalSignal(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-mine-darkest border border-mine-border rounded text-white font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Near disconnect risk</span>
              </div>
            </div>
          </div>

          {/* Save Action */}
          <div className="flex items-center justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-600/20 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Save & Apply Settings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
