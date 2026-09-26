import React from 'react';
import { SiteConfig } from '../models/SiteConfig';
import { formatTimeAgo } from '../utils/formatters';
import {
  ShieldAlert,
  Play,
  Pause,
  RotateCcw,
  Wifi,
  WifiOff,
  Route,
  Activity,
  Layers
} from 'lucide-react';

interface HeaderProps {
  config: SiteConfig;
  onUpdateConfig: (updated: Partial<SiteConfig>) => void;
  onResetSimulation: () => void;
  isBackendConnected: boolean;
  backendError: string | null;
  lastTickMs: number;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  onUpdateConfig,
  onResetSimulation,
  isBackendConnected,
  backendError,
  lastTickMs,
}) => {
  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between select-none z-30 shadow-xs">
      {/* 1. LEFT BRANDING & MONITORING AREA */}
      <div className="flex items-center gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <ShieldAlert className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight">
              Rockfall Safety
            </h1>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              Mine Helmet Tracker
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-6 w-[1px] bg-slate-200 hidden md:block" />

        {/* Current Location Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700">
          <span className="text-slate-400">Monitoring Area:</span>
          <strong className="text-slate-900 font-semibold">{config.siteName}</strong>
          <span className="text-blue-600 font-bold">({config.workingRadius}m)</span>
        </div>
      </div>

      {/* 2. CENTER: MODE SWITCH & SIMULATION CONTROLS */}
      <div className="flex items-center gap-3">
        {/* Mode Toggle: Real-Time vs Simulation */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-mono">
          <button
            onClick={() => onUpdateConfig({ useMockData: false })}
            className={`px-3 py-1 rounded-md font-bold transition-all ${
              !config.useMockData
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            LIVE BACKEND
          </button>
          <button
            onClick={() => onUpdateConfig({ useMockData: true })}
            className={`px-3 py-1 rounded-md font-bold transition-all ${
              config.useMockData
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            SIMULATION
          </button>
        </div>

        {/* Simulation Execution Controls (Active in Simulation mode) */}
        {config.useMockData && (
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
            {/* Start / Stop */}
            <button
              onClick={() => onUpdateConfig({ isSimulationRunning: !config.isSimulationRunning })}
              className={`p-1.5 rounded flex items-center gap-1 text-xs font-mono font-bold transition-colors ${
                config.isSimulationRunning
                  ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                  : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
              }`}
              title={config.isSimulationRunning ? 'Stop Simulation' : 'Start Simulation'}
            >
              {config.isSimulationRunning ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span className="text-[11px]">STOP</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span className="text-[11px]">START</span>
                </>
              )}
            </button>

            {/* Reset */}
            <button
              onClick={onResetSimulation}
              className="p-1.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-mono font-bold flex items-center gap-1 transition-colors"
              title="Reset Simulation Positions"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="text-[11px]">RESET</span>
            </button>

            {/* Speed Selector */}
            <div className="flex items-center text-[10px] font-mono border-l border-slate-200 pl-1.5 gap-1">
              <span className="text-slate-400">Speed:</span>
              {(['slow', 'normal', 'fast'] as const).map((spd) => (
                <button
                  key={spd}
                  onClick={() => onUpdateConfig({ simulationSpeed: spd })}
                  className={`px-1.5 py-0.5 rounded capitalize ${
                    config.simulationSpeed === spd
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {spd}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Trails Toggle */}
        <button
          onClick={() => onUpdateConfig({ showTrails: !config.showTrails })}
          className={`hidden md:flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-medium border transition-colors ${
            config.showTrails
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
          }`}
          title="Toggle movement trails"
        >
          <Route className="w-3.5 h-3.5 text-blue-600" />
          <span>{config.showTrails ? 'Trails: ON' : 'Trails: OFF'}</span>
        </button>
      </div>

      {/* 3. RIGHT STATUS INDICATORS */}
      <div className="flex items-center gap-3 font-mono text-xs">
        {/* Backend Status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-50 border border-slate-200">
          {config.useMockData ? (
            <span className="text-[11px] text-blue-700 font-bold">
              GRID SIMULATION
            </span>
          ) : isBackendConnected ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span className="text-[11px] text-emerald-800 font-bold">
                Backend: Connected
              </span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-red-600" />
              <span className="text-[11px] text-red-700 font-bold truncate max-w-[120px]" title={backendError || 'Connection lost'}>
                Backend: Offline
              </span>
            </>
          )}
        </div>

        {/* Last Sync */}
        <div className="hidden sm:flex items-center gap-1 text-slate-500 text-[11px]">
          <span>Sync:</span>
          <strong className="text-slate-700">{formatTimeAgo(lastTickMs)}</strong>
        </div>
      </div>
    </header>
  );
};
