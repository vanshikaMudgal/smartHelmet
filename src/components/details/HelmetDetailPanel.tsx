import React from 'react';
import { Helmet } from '../../models/Helmet';
import { getStatusColor, getStatusLabel, getTendencyIndicator } from '../../utils/signalStatus';
import { formatTime, formatTimeAgo, formatDistance } from '../../utils/formatters';
import { SignalSparkline } from './SignalSparkline';
import {
  X,
  Radio,
  MapPin,
  Clock,
  Layers,
  Battery,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Activity,
  AlertTriangle,
  HeartPulse
} from 'lucide-react';

interface HelmetDetailPanelProps {
  helmet: Helmet | null;
  onClose: () => void;
  onFocusHelmet?: (helmetId: string) => void;
}

export const HelmetDetailPanel: React.FC<HelmetDetailPanelProps> = ({
  helmet,
  onClose,
}) => {
  if (!helmet) return null;

  const statusColors = getStatusColor(helmet.status);
  const statusLabel = getStatusLabel(helmet.status);
  const tendencyInfo = getTendencyIndicator(helmet.tendency);

  return (
    <div className="fixed top-14 right-0 bottom-0 w-96 max-w-full bg-white border-l border-slate-200 z-[500] flex flex-col shadow-panel animate-in slide-in-from-right duration-200 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-start justify-between bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: statusColors.hex }}
            />
            <h2 className="text-base font-mono font-bold text-slate-900 tracking-wide">
              {helmet.id}
            </h2>
            <span
              className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border"
              style={{
                backgroundColor: statusColors.bgHex,
                color: statusColors.hex,
                borderColor: `${statusColors.hex}40`,
              }}
            >
              {statusLabel}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            ESP: <strong className="text-slate-800">{helmet.espId || helmet.id}</strong> · {helmet.workerName}
          </p>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title="Close Details"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-4 flex-1">
        {/* Proximity Alert Banner if Active */}
        {helmet.isInProximity && (
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs font-mono text-amber-900 flex items-center gap-2.5 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <div className="font-bold">PROXIMITY WARNING ACTIVE</div>
              <div className="text-[11px] text-amber-800">
                This helmet is within 20 meters of another worker!
              </div>
            </div>
          </div>
        )}

        <div className={`border rounded-lg p-3 flex items-center gap-3 ${
          helmet.workerHealthStatus === 'ALIVE'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : helmet.workerHealthStatus === 'DEAD'
              ? 'bg-red-50 border-red-200 text-red-900'
              : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}>
          <HeartPulse className={`w-5 h-5 shrink-0 ${
            helmet.workerHealthStatus === 'ALIVE'
              ? 'text-emerald-600'
              : helmet.workerHealthStatus === 'DEAD'
                ? 'text-red-600'
                : 'text-slate-500'
          }`} />
          <div className="text-xs">
            <div className="font-mono font-bold uppercase">Worker Health: {helmet.workerHealthStatus}</div>
            {helmet.workerHealthStatus === 'UNKNOWN' && (
              <div className="text-[11px] text-slate-600 mt-0.5">No worker health reading received</div>
            )}
          </div>
        </div>

        {/* Signal Strength & Tendency Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-600 font-bold flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-blue-600" />
              RF Signal Strength
            </span>
            <div className={`flex items-center gap-1 text-xs font-mono font-bold ${tendencyInfo.className}`}>
              <span>{tendencyInfo.symbol}</span>
              <span>{tendencyInfo.label}</span>
            </div>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-mono font-bold text-slate-900">
                {helmet.signalStrength}
              </span>
              <span className="text-xs font-mono text-slate-500">dBm</span>
            </div>
            <span className="text-sm font-mono font-bold text-blue-700">
              {helmet.signalPercentage}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${helmet.signalPercentage}%`,
                backgroundColor: statusColors.hex,
              }}
            />
          </div>

          {/* Sparkline Signal History */}
          <div className="pt-2 border-t border-slate-200">
            <div className="text-[10px] font-mono text-slate-500 uppercase mb-1.5 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-blue-600" />
              Signal History (Last 20 Readings)
            </div>
            <SignalSparkline data={helmet.signalHistory} colorHex={statusColors.hex} />
          </div>
        </div>

        {/* Geofence Status */}
        <div
          className={`border rounded-lg p-3 flex items-center gap-3 ${
            helmet.isInsideWorkingArea
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {helmet.isInsideWorkingArea ? (
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <div className="text-xs">
            <div className="font-mono font-bold uppercase">
              {helmet.isInsideWorkingArea ? 'Inside Monitoring Area' : 'Outside Monitoring Area'}
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5">
              Distance from center: <strong className="font-mono text-slate-900">{formatDistance(helmet.distanceFromBaseMeters)}</strong>
            </div>
          </div>
        </div>

        {/* Telemetry Grid */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2.5">
          <div className="text-xs font-mono uppercase text-slate-600 font-bold flex items-center gap-1.5 mb-1">
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            Location & Telemetry
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-white p-2 rounded border border-slate-200">
              <div className="text-[10px] text-slate-500 uppercase">Latitude</div>
              <div className="text-slate-900 font-bold text-[11px] mt-0.5">
                {helmet.hasValidGps ? `${helmet.latitude.toFixed(5)}°` : 'NO GPS'}
              </div>
            </div>

            <div className="bg-white p-2 rounded border border-slate-200">
              <div className="text-[10px] text-slate-500 uppercase">Longitude</div>
              <div className="text-slate-900 font-bold text-[11px] mt-0.5">
                {helmet.hasValidGps ? `${helmet.longitude.toFixed(5)}°` : 'NO GPS'}
              </div>
            </div>

            <div className="bg-white p-2 rounded border border-slate-200">
              <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                <Layers className="w-3 h-3 text-blue-600" />
                Depth
              </div>
              <div className="text-slate-900 font-bold text-[11px] mt-0.5">
                {helmet.depth ? `${helmet.depth}m` : '0m'}
              </div>
            </div>

            <div className="bg-white p-2 rounded border border-slate-200">
              <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                <Battery className="w-3 h-3 text-blue-600" />
                Battery
              </div>
              <div className="text-slate-900 font-bold text-[11px] mt-0.5">
                {helmet.battery ? `${helmet.battery}%` : '95%'}
              </div>
            </div>
          </div>

          <div className="bg-white p-2 rounded border border-slate-200 flex items-center justify-between text-xs font-mono">
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              Last Update
            </span>
            <div className="text-right">
              <span className="text-slate-800 font-medium">{formatTime(helmet.timestamp)}</span>
              <span className="text-[10px] text-slate-500 ml-1.5">({formatTimeAgo(helmet.lastSeenMs)})</span>
            </div>
          </div>

          <div className="bg-white p-2 rounded border border-slate-200 flex items-center justify-between text-xs font-mono">
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <Activity className="w-3 h-3 text-slate-400" />
              Position Packets
            </span>
            <span className="text-blue-700 font-bold">#{helmet.updateCount}</span>
          </div>
        </div>

        {/* Close button */}
        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2 px-3 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-mono text-xs font-bold transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
