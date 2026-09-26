/**
 * Alert models and severity classifications
 */

export type AlertType =
  | 'SIGNAL_WARNING'
  | 'SIGNAL_CRITICAL'
  | 'SIGNAL_RESTORED'
  | 'CONNECTION_LOST'
  | 'CONNECTION_RESTORED'
  | 'GEOFENCE_BREACH'
  | 'GEOFENCE_RETURN'
  | 'DRONE_DETECTION'
  | 'PROXIMITY_DETECTED';

export type AlertSeverity = 'warning' | 'critical' | 'info' | 'offline';

export interface AlertItem {
  id: string;
  helmetId: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: string;      // e.g. "14:53:19"
  timestampMs: number;    // timestamp in ms
  value?: string;         // e.g. "-88 dBm" or "620m"
  acknowledged?: boolean;
}
