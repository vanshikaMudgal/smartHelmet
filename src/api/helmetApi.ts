/**
 * ==============================================================================
 * CENTRALIZED API SERVICE & DATA ADAPTER LAYER
 * ==============================================================================
 *
 * This file is the SINGLE PLACE where backend communication and data normalization
 * occur. If your backend schema or endpoints change, you only need to modify this file!
 *
 * HOW ESP DATA FLOWS:
 * 1. Your ESP devices send HTTP PUT requests to your backend (e.g. PUT /api/v1/helmets).
 * 2. Your backend stores the latest state of each ESP / helmet.
 * 3. This frontend calls getLatestHelmets() to fetch the latest state from your backend.
 * 4. The adapter normalizes any raw response into standard RawHelmetData objects.
 */

import { RawHelmetData, WorkerHealthStatus } from '../models/Helmet';
import { ENV_CONFIG } from './apiConfig';

/**
 * Normalizes any backend response object into a consistent RawHelmetData shape.
 * Modify this function if your backend uses different property names.
 */
export function normalizeRawHelmet(raw: Record<string, unknown>): RawHelmetData | null {
  if (!raw || typeof raw !== 'object') return null;

  // 1. Resolve Helmet ID
  const helmetId =
    (raw.helmetId as string) ||
    (raw.id as string) ||
    (raw.device_id as string) ||
    (raw.helmet_id as string) ||
    (raw.deviceId as string) ||
    (raw.espId as string) ||
    (raw.esp_id as string);

  if (!helmetId) return null;

  // 2. Resolve Signal Strength (dBm)
  const signalStrength = Number(
    raw.signalStrength ??
    raw.rssi ??
    raw.signal ??
    raw.signal_strength ??
    raw.dbm ??
    -70
  );

  // 3. Resolve Latitude
  const latitude = Number(
    raw.latitude ??
    raw.lat ??
    raw.Latitude ??
    0
  );

  // 4. Resolve Longitude
  const longitude = Number(
    raw.longitude ??
    raw.lng ??
    raw.lon ??
    raw.Longitude ??
    0
  );

  // 5. Resolve Timestamp
  let timestamp: string;
  const rawTime = raw.timestamp ?? raw.time ?? raw.last_seen ?? raw.updatedAt ?? raw.updated_at;
  if (rawTime) {
    if (typeof rawTime === 'number') {
      timestamp = new Date(rawTime).toISOString();
    } else {
      timestamp = String(rawTime);
    }
  } else {
    timestamp = new Date().toISOString();
  }

  // 6. Optional metadata (worker name, sector, depth, battery)
  const workerName = (raw.workerName || raw.worker_name || raw.worker || raw.name) as string | undefined;
  const sector = (raw.sector || raw.zone || raw.location) as string | undefined;
  const depth = raw.depth !== undefined ? Number(raw.depth) : undefined;
  const battery = raw.battery !== undefined ? Number(raw.battery) : undefined;
  const rawWorkerHealth = raw.workerHealthStatus ?? raw.worker_health_status ?? raw.workerAlive ?? raw.worker_alive ?? raw.isAlive ?? raw.is_alive ?? raw.alive;
  const healthValue = typeof rawWorkerHealth === 'string' ? rawWorkerHealth.trim().toLowerCase() : rawWorkerHealth;
  const workerHealthStatus: WorkerHealthStatus =
    healthValue === true || healthValue === 1 || healthValue === 'true' || healthValue === '1' || healthValue === 'alive'
      ? 'ALIVE'
      : healthValue === false || healthValue === 0 || healthValue === 'false' || healthValue === '0' || healthValue === 'dead'
        ? 'DEAD'
        : 'UNKNOWN';
  const espId = (raw.espId || raw.esp_id || raw.espID || raw.deviceId || raw.device_id || helmetId) as string;

  return {
    helmetId,
    espId,
    signalStrength,
    latitude,
    longitude,
    timestamp,
    workerName,
    workerHealthStatus,
    sector,
    depth,
    battery
  };
}

/**
 * Base URL resolver helper
 */
function resolveBaseUrl(customBaseUrl?: string): string {
  const url = customBaseUrl || ENV_CONFIG.apiBaseUrl;
  return url.replace(/\/+$/, ''); // remove trailing slash
}

/**
 * Fetches the latest helmet states from the backend API.
 * Endpoint expected: GET {BASE_URL}/api/v1/helmets
 *
 * Supported backend response formats:
 * - Array: [ { helmetId: "HELMET-001", ... }, ... ]
 * - Wrapped: { data: [ ... ] } or { helmets: [ ... ] }
 * - Keyed Dictionary: { "HELMET-001": { ... }, "HELMET-002": { ... } }
 */
export async function getLatestHelmets(customBaseUrl?: string): Promise<RawHelmetData[]> {
  const baseUrl = resolveBaseUrl(customBaseUrl);
  const endpoint = `${baseUrl}/api/v1/helmets`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Timeout after 5 seconds to prevent hanging
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json();

    // Extract records based on format
    let rawList: Record<string, unknown>[] = [];

    if (Array.isArray(payload)) {
      rawList = payload;
    } else if (payload && typeof payload === 'object') {
      if (Array.isArray((payload as { data?: unknown }).data)) {
        rawList = (payload as { data: Record<string, unknown>[] }).data;
      } else if (Array.isArray((payload as { helmets?: unknown }).helmets)) {
        rawList = (payload as { helmets: Record<string, unknown>[] }).helmets;
      } else {
        // Assume key-value map: { "HELMET-001": { ... } }
        rawList = Object.entries(payload).map(([key, val]) => {
          if (val && typeof val === 'object') {
            return { id: key, ...(val as Record<string, unknown>) };
          }
          return { id: key };
        });
      }
    }

    // Normalize each record through the adapter
    const normalized: RawHelmetData[] = [];
    for (const raw of rawList) {
      const item = normalizeRawHelmet(raw);
      if (item) {
        normalized.push(item);
      }
    }

    return normalized;
  } catch (error) {
    // Re-throw with descriptive context
    throw error;
  }
}

/**
 * Fetches historical trajectory for a single helmet if provided by the backend.
 * Endpoint: GET {BASE_URL}/api/v1/helmets/{helmetId}/history
 */
export async function getHelmetHistory(
  helmetId: string,
  customBaseUrl?: string
): Promise<RawHelmetData[]> {
  const baseUrl = resolveBaseUrl(customBaseUrl);
  const endpoint = `${baseUrl}/api/v1/helmets/${encodeURIComponent(helmetId)}/history`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    const rawList: Record<string, unknown>[] = Array.isArray(payload)
      ? payload
      : (payload?.data || payload?.history || []);

    return rawList
      .map(raw => normalizeRawHelmet(raw))
      .filter((item): item is RawHelmetData => item !== null);
  } catch {
    // If backend does not support historical endpoint, return empty list
    return [];
  }
}

/**
 * Probes the backend server health
 */
export async function checkBackendHealth(customBaseUrl?: string): Promise<boolean> {
  const baseUrl = resolveBaseUrl(customBaseUrl);
  try {
    const res = await fetch(`${baseUrl}/api/v1/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    try {
      // Fallback check against the main helmets endpoint
      const res = await fetch(`${baseUrl}/api/v1/helmets`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
