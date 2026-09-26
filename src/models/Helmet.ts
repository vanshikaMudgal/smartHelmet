/**
 * Normalized Helmet and telemetry data models for Rockfall Safety GIS Dashboard
 */

export type HelmetStatus = 'ACTIVE' | 'WARNING' | 'CRITICAL' | 'OFFLINE';

export type WorkerHealthStatus = 'ALIVE' | 'DEAD' | 'UNKNOWN';

export type SignalTendency = 'INCREASING' | 'STABLE' | 'DECREASING';

/**
 * Raw data structure as received from backend / ESP devices.
 * The API adapter normalizes this into the standard Helmet model.
 */
export interface RawHelmetData {
  helmetId?: string;
  id?: string;
  espId?: string;
  esp_id?: string;
  device_id?: string;
  signalStrength?: number;
  rssi?: number;
  signal?: number;
  latitude?: number;
  lat?: number;
  longitude?: number;
  lng?: number;
  lon?: number;
  timestamp?: string | number;
  time?: string | number;
  depth?: number;
  workerName?: string;
  worker_name?: string;
  workerHealthStatus?: WorkerHealthStatus;
  sector?: string;
  battery?: number;
}

/**
 * Point in a helmet's movement trajectory history
 */
export interface TrajectoryPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
  signalStrength: number;
}

export interface HelmetPosition {
  latitude: number;
  longitude: number;
}

/**
 * Proximity pair detected between two helmets within threshold
 */
export interface ProximityPair {
  helmetId1: string;
  helmetId2: string;
  distanceMeters: number;
  lat1: number;
  lng1: number;
  lat2: number;
  lng2: number;
}

/**
 * Normalized Helmet model used consistently across the entire frontend application.
 */
export interface Helmet {
  id: string;                    // e.g. "H-001"
  espId: string;                 // e.g. "ESP-001"
  workerName: string;            // Assigned worker name (e.g. "J. Martinez")
  workerHealthStatus: WorkerHealthStatus;
  sector: string;                // Mine sector / zone (e.g. "Sector A")
  latitude: number;              // Current Latitude (-90 to 90)
  longitude: number;             // Current Longitude (-180 to 180)
  previousPosition: HelmetPosition | null;
  signalStrength: number;        // Latest signal strength in dBm (e.g. -62)
  previousSignalStrength: number | null; // Previous reading for tendency calculation
  signalPercentage: number;      // 0 - 100% computed from dBm
  status: HelmetStatus;          // ACTIVE (Green), WARNING (Amber), CRITICAL (Red), OFFLINE (Grey)
  tendency: SignalTendency;      // INCREASING, STABLE, DECREASING
  timestamp: string;             // ISO timestamp of last update
  lastSeenMs: number;            // Local timestamp (Date.now()) when last valid packet was received
  depth?: number;                // Mine depth in meters
  isInsideWorkingArea: boolean;  // Geofence status
  distanceFromBaseMeters: number;// Distance to mine center in meters
  updateCount: number;           // Total position updates received
  signalHistory: number[];       // Recent signal history for sparkline
  battery?: number;              // Battery %
  hasValidGps: boolean;          // Quality flag
  isInProximity?: boolean;       // Set to true if currently within proximity threshold of another helmet
}

/**
 * Trajectory collection keyed by helmet ID
 */
export type HelmetTrails = Record<string, TrajectoryPoint[]>;

/**
 * Summary metrics of all helmets
 */
export interface HelmetMetrics {
  total: number;
  connected: number;
  active: number;
  warning: number;
  critical: number;
  offline: number;
}
