/**
 * Geospatial utilities for mining helmet tracking and geofence calculation
 */

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface GridSegment {
  from: [number, number];
  to: [number, number];
}

export interface GridNetwork {
  nodes: { id: string; lat: number; lng: number }[];
  segments: GridSegment[];
}

/**
 * Validates whether GPS coordinates fall within valid geographic bounds
 */
export function isValidCoordinate(latitude?: number | null, longitude?: number | null): boolean {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
  if (isNaN(latitude) || isNaN(longitude)) return false;
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

/**
 * Calculates the Great-Circle distance between two coordinates in meters using the Haversine formula.
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const EARTH_RADIUS_METERS = 6371000; // Mean Earth radius

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Determines whether a coordinate falls strictly inside the configured working radius
 */
export function isInsideWorkingArea(
  point: LatLng,
  center: LatLng,
  radiusMeters: number
): boolean {
  if (!isValidCoordinate(point.latitude, point.longitude)) return false;
  if (!isValidCoordinate(center.latitude, center.longitude)) return false;

  const distance = calculateHaversineDistanceMeters(
    point.latitude,
    point.longitude,
    center.latitude,
    center.longitude
  );

  return distance <= radiusMeters;
}

/**
 * Calculates compass bearing from point A to point B in degrees (0 - 360)
 */
export function calculateBearingDegrees(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const y = Math.sin(toRadians(lon2 - lon1)) * Math.cos(toRadians(lat2));
  const x =
    Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
    Math.sin(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.cos(toRadians(lon2 - lon1));
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

/**
 * Format coordinates for display, e.g. "28.6139° N, 77.2098° E"
 */
export function formatTacticalCoordinate(lat: number, lng: number): string {
  if (!isValidCoordinate(lat, lng)) return 'INVALID GPS';
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}

/**
 * Generates an orthogonal mine corridor grid network inside the monitoring radius
 * Used for visible corridor visualization on the map and node-to-node pathing
 */
export function generateMineCorridors(
  centerLat: number,
  centerLng: number,
  radiusMeters: number
): GridNetwork {
  const latDegreeMeters = 111320;
  const lngDegreeMeters = 111320 * Math.cos(toRadians(centerLat));

  // Spacing between tunnel corridors (~60m to 80m depending on radius)
  const spacingMeters = Math.max(50, Math.min(100, Math.round(radiusMeters / 6)));
  const gridSpan = Math.floor((radiusMeters * 0.75) / spacingMeters);

  const nodes: { id: string; lat: number; lng: number }[] = [];
  const nodeMap = new Map<string, { lat: number; lng: number }>();

  for (let row = -gridSpan; row <= gridSpan; row++) {
    for (let col = -gridSpan; col <= gridSpan; col++) {
      const dLat = (row * spacingMeters) / latDegreeMeters;
      const dLng = (col * spacingMeters) / lngDegreeMeters;
      const lat = centerLat + dLat;
      const lng = centerLng + dLng;

      const dist = calculateHaversineDistanceMeters(centerLat, centerLng, lat, lng);
      if (dist <= radiusMeters * 0.9) {
        const id = `${row}_${col}`;
        const node = { id, lat, lng };
        nodes.push(node);
        nodeMap.set(id, { lat, lng });
      }
    }
  }

  const segments: GridSegment[] = [];

  // Generate horizontal & vertical corridor lines between adjacent nodes
  for (let row = -gridSpan; row <= gridSpan; row++) {
    for (let col = -gridSpan; col <= gridSpan; col++) {
      const curr = nodeMap.get(`${row}_${col}`);
      if (!curr) continue;

      // Horizontal edge to right (col + 1)
      const right = nodeMap.get(`${row}_${col + 1}`);
      if (right) {
        segments.push({
          from: [curr.lat, curr.lng],
          to: [right.lat, right.lng],
        });
      }

      // Vertical edge to bottom (row + 1)
      const down = nodeMap.get(`${row + 1}_${col}`);
      if (down) {
        segments.push({
          from: [curr.lat, curr.lng],
          to: [down.lat, down.lng],
        });
      }
    }
  }

  return { nodes, segments };
}
