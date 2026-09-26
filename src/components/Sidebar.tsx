import React, { useState } from 'react';
import { Helmet, HelmetMetrics, ProximityPair } from '../models/Helmet';
import { SiteConfig } from '../models/SiteConfig';
import { getStatusColor, getStatusLabel } from '../utils/signalStatus';
import { isValidCoordinate } from '../utils/geoUtils';
import {
  MapPin,
  Crosshair,
  Check,
  AlertTriangle,
  HardHat,
  ChevronRight,
  Shield,
  Signal
} from 'lucide-react';

interface SidebarProps {
  config: SiteConfig;
  onUpdateSiteArea: (lat: number, lng: number, radius: number) => void;
  onUseCurrentLocation: () => void;
  metrics: HelmetMetrics;
  helmets: Helmet[];
  proximityPairs: ProximityPair[];
  selectedHelmetId: string | null;
  onSelectHelmet: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  config,
  onUpdateSiteArea,
  onUseCurrentLocation,
  metrics,
  helmets,
  proximityPairs,
  selectedHelmetId,
  onSelectHelmet,
}) => {
  const [latInput, setLatInput] = useState(String(config.latitude));
  const [lngInput, setLngInput] = useState(String(config.longitude));
  const [radiusInput, setRadiusInput] = useState(String(config.workingRadius));
  const [applySuccess, setApplySuccess] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  // Sync inputs if config updates from location helper
  React.useEffect(() => {
    setLatInput(String(config.latitude));
    setLngInput(String(config.longitude));
    setRadiusInput(String(config.workingRadius));
  }, [config.latitude, config.longitude, config.workingRadius]);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    const rad = parseInt(radiusInput, 10);

    if (!isValidCoordinate(lat, lng)) {
      setInputError('Invalid GPS coordinates');
      return;
    }

    if (isNaN(rad) || rad < 50 || rad > 50000) {
      setInputError('Radius must be between 50m and 50,000m');
      return;
    }

    setInputError(null);
    onUpdateSiteArea(lat, lng, rad);
    setApplySuccess(true);
    setTimeout(() => setApplySuccess(false), 2000);
  };

  return (
    <aside className="w-80 h-full bg-white border-r border-slate-200 flex flex-col select-none overflow-hidden shrink-0 z-20 shadow-xs">
      {/* 1. MONITORING AREA SECTION */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50">
        <div className="text-[11px] font-mono tracking-wider text-slate-700 font-bold uppercase flex items-center gap-1.5 mb-2.5">
          <MapPin className="w-3.5 h-3.5 text-blue-600" />
          MONITORING AREA
        </div>

        <form onSubmit={handleApply} className="space-y-2">
          {inputError && (
            <div className="text-[10px] text-red-600 font-mono bg-red-50 p-1.5 rounded border border-red-200">
              {inputError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase mb-0.5">Latitude</label>
              <input
                type="number"
                step="any"
                value={latInput}
                onChange={(e) => setLatInput(e.target.value)}
                className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono text-slate-800 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase mb-0.5">Longitude</label>
              <input
                type="number"
                step="any"
                value={lngInput}
                onChange={(e) => setLngInput(e.target.value)}
                className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono text-slate-800 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-slate-500 uppercase mb-0.5">
              Radius: <span className="font-bold text-blue-700">{radiusInput} m</span>
            </label>
            <input
              type="number"
              step="50"
              min="50"
              max="5000"
              value={radiusInput}
              onChange={(e) => setRadiusInput(e.target.value)}
              className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono text-slate-800 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="pt-1 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={onUseCurrentLocation}
              className="w-full py-1.5 px-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-slate-700 font-mono text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <Crosshair className="w-3.5 h-3.5 text-blue-600" />
              <span>Use Current Location</span>
            </button>

            <button
              type="submit"
              className="w-full py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-mono text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{applySuccess ? 'Applied!' : 'Apply Monitoring Area'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. CONNECTED HELMETS BREAKDOWN */}
      <div className="p-3.5 border-b border-slate-200 bg-white">
        <div className="flex items-baseline justify-between mb-2">
          <div className="text-[11px] font-mono font-bold text-slate-700 uppercase tracking-wider">
            CONNECTED HELMETS
          </div>
          <div className="text-xs font-mono font-bold text-slate-900">
            {String(metrics.total).padStart(2, '0')} Total
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1 text-center font-mono">
          <div className="bg-emerald-50 border border-emerald-200 rounded p-1.5">
            <div className="text-sm font-bold text-emerald-700">{metrics.active}</div>
            <div className="text-[9px] text-emerald-800 font-semibold uppercase">Active</div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded p-1.5">
            <div className="text-sm font-bold text-amber-700">{metrics.warning}</div>
            <div className="text-[9px] text-amber-800 font-semibold uppercase">Warning</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded p-1.5">
            <div className="text-sm font-bold text-red-700">{metrics.critical}</div>
            <div className="text-[9px] text-red-800 font-semibold uppercase">Critical</div>
          </div>
          <div className="bg-slate-100 border border-slate-200 rounded p-1.5">
            <div className="text-sm font-bold text-slate-600">{metrics.offline}</div>
            <div className="text-[9px] text-slate-600 font-semibold uppercase">Offline</div>
          </div>
        </div>
      </div>

      {/* 3. PROXIMITY WARNINGS (when helmets <= 20m) */}
      {proximityPairs.length > 0 && (
        <div className="p-3 border-b border-amber-200 bg-amber-50">
          <div className="text-[10px] font-mono font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            WORKERS NEARBY ({proximityPairs.length}) · {config.proximityThreshold}m
          </div>
          <div className="space-y-1.5">
            {proximityPairs.map((pair, idx) => (
              <div
                key={idx}
                className="bg-white border border-amber-300 rounded p-2 text-xs font-mono shadow-xs"
              >
                <div className="flex items-center justify-between text-slate-800 font-bold">
                  <span>{pair.helmetId1} ↔ {pair.helmetId2}</span>
                  <span className="text-amber-700 font-bold">{pair.distanceMeters.toFixed(1)} m</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Proximity alert · {pair.distanceMeters.toFixed(1)} m apart
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. HELMET LIST */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-2 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between text-[11px] font-mono font-bold text-slate-600 uppercase">
          <span className="flex items-center gap-1.5">
            <HardHat className="w-3.5 h-3.5 text-blue-600" />
            HELMET LIST
          </span>
          <span className="text-[10px] text-slate-500">{helmets.length} DETECTED</span>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {helmets.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-slate-400">
              No active helmets detected.
            </div>
          ) : (
            helmets.map((helmet) => {
              const colors = getStatusColor(helmet.status);
              const label = getStatusLabel(helmet.status);
              const isSelected = helmet.id === selectedHelmetId;

              return (
                <button
                  key={helmet.id}
                  onClick={() => onSelectHelmet(helmet.id)}
                  className={`w-full px-3.5 py-2.5 flex items-center justify-between text-left transition-colors ${
                    isSelected
                      ? 'bg-blue-50 border-l-4 border-blue-600'
                      : 'hover:bg-slate-50 border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Flag Icon */}
                    <div
                      className="w-3.5 h-3.5 shrink-0 flex items-center justify-center font-bold text-xs"
                      style={{ color: colors.hex }}
                    >
                      🚩
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-mono font-bold text-slate-900 tracking-wide flex items-center gap-1.5">
                        <span>{helmet.id}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({helmet.espId || helmet.id})
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>Signal: <strong className="text-slate-700">{helmet.signalStrength} dBm</strong></span>
                        <span className={`font-bold ${helmet.workerHealthStatus === 'ALIVE' ? 'text-emerald-700' : helmet.workerHealthStatus === 'DEAD' ? 'text-red-700' : 'text-slate-500'}`}>
                          Worker: {helmet.workerHealthStatus}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border"
                      style={{
                        backgroundColor: colors.bgHex,
                        color: colors.hex,
                        borderColor: `${colors.hex}40`,
                      }}
                    >
                      {label}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
};
