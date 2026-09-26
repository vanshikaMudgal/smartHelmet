import { HelmetStatus, SignalTendency } from '../models/Helmet';

export interface SignalStatusConfig {
  safeSignalThreshold: number;     // e.g. -65 dBm
  warningSignalThreshold: number;  // e.g. -75 dBm
  criticalSignalThreshold: number; // e.g. -85 dBm
  staleTimeout: number;            // e.g. 10000 ms
}

/**
 * Calculates the signal tendency comparing current and previous RSSI readings.
 */
export function calculateSignalTendency(
  currentSignal: number,
  previousSignal: number | null
): SignalTendency {
  if (previousSignal === null || previousSignal === undefined) {
    return 'STABLE';
  }

  const delta = currentSignal - previousSignal;

  if (delta > 1) {
    return 'INCREASING';
  } else if (delta < -1) {
    return 'DECREASING';
  } else {
    return 'STABLE';
  }
}

/**
 * Centralized status calculation function.
 * Evaluates RSSI thresholds against configurable thresholds.
 *
 * GREEN (ACTIVE): Normal / Safe signal (>= safeSignalThreshold)
 * AMBER (WARNING): Moderate or degrading signal (< safeSignalThreshold, >= warningSignalThreshold)
 * RED (CRITICAL): Very weak signal (< warningSignalThreshold)
 * GREY (OFFLINE): Stale packet timeout exceeded
 */
export function calculateHelmetStatus(
  signalStrength: number,
  previousSignalStrength: number | null,
  config: SignalStatusConfig,
  lastSeenMs: number
): HelmetStatus {
  const now = Date.now();

  // Check for stale/offline timeout
  if (now - lastSeenMs > config.staleTimeout) {
    return 'OFFLINE';
  }

  // Critical threshold check
  if (signalStrength <= config.criticalSignalThreshold) {
    return 'CRITICAL';
  }

  // Warning threshold check
  if (signalStrength <= config.warningSignalThreshold) {
    return 'WARNING';
  }

  // If signal is safe, but sharply decreasing near boundary
  const tendency = calculateSignalTendency(signalStrength, previousSignalStrength);
  if (signalStrength <= config.safeSignalThreshold + 2 && tendency === 'DECREASING') {
    return 'WARNING';
  }

  return 'ACTIVE';
}

/**
 * Converts dBm signal reading to percentage (0% to 100%)
 */
export function dBmToPercentage(dBm: number): number {
  if (dBm >= -40) return 100;
  if (dBm <= -100) return 0;
  const percentage = Math.round(((dBm - (-100)) / ((-40) - (-100))) * 100);
  return Math.max(0, Math.min(100, percentage));
}

/**
 * Returns human-readable status label
 */
export function getStatusLabel(status: HelmetStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'SAFE';
    case 'WARNING':
      return 'WARNING';
    case 'CRITICAL':
      return 'CRITICAL';
    case 'OFFLINE':
      return 'OFFLINE';
  }
}

/**
 * Returns professional traffic-light colors (Clean light GIS design)
 */
export function getStatusColor(status: HelmetStatus): {
  hex: string;
  bgHex: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
} {
  switch (status) {
    case 'ACTIVE':
      return {
        hex: '#16A34A', // Clean forest green
        bgHex: '#F0FDF4',
        textClass: 'text-emerald-700',
        bgClass: 'bg-emerald-50',
        borderClass: 'border-emerald-200'
      };
    case 'WARNING':
      return {
        hex: '#D97706', // Clean warm amber
        bgHex: '#FFFBEB',
        textClass: 'text-amber-700',
        bgClass: 'bg-amber-50',
        borderClass: 'border-amber-200'
      };
    case 'CRITICAL':
      return {
        hex: '#DC2626', // Clean warning red
        bgHex: '#FEF2F2',
        textClass: 'text-red-700',
        bgClass: 'bg-red-50',
        borderClass: 'border-red-200'
      };
    case 'OFFLINE':
    default:
      return {
        hex: '#64748B', // Neutral slate grey
        bgHex: '#F8FAFC',
        textClass: 'text-slate-600',
        bgClass: 'bg-slate-100',
        borderClass: 'border-slate-200'
      };
  }
}

/**
 * Returns arrow indicator and text for tendency
 */
export function getTendencyIndicator(tendency: SignalTendency): {
  symbol: string;
  label: string;
  className: string;
} {
  switch (tendency) {
    case 'INCREASING':
      return { symbol: '↑', label: 'Increasing', className: 'text-emerald-600' };
    case 'DECREASING':
      return { symbol: '↓', label: 'Decreasing', className: 'text-amber-600' };
    case 'STABLE':
    default:
      return { symbol: '→', label: 'Stable', className: 'text-slate-500' };
  }
}
