import { calculateHaversineDistanceMeters } from './geoUtils';

export const SIMULATION_GRID_SIZE = 10;
export const SIMULATION_GRID_SPAN_RADIUS = 0.65;
export const SIMULATION_CONFIG = {
  moveHelmetFlags: false,
};

export interface GridNode {
  row: number;
  col: number;
}

export const HELMET_ROUTES: Record<string, GridNode[]> = {
  'H-001': [
    { row: 2, col: 2 }, { row: 3, col: 2 }, { row: 4, col: 2 },
    { row: 4, col: 3 }, { row: 4, col: 4 }, { row: 5, col: 4 },
    { row: 6, col: 4 }, { row: 7, col: 4 }, { row: 8, col: 4 },
    { row: 8, col: 5 }, { row: 8, col: 6 }, { row: 7, col: 6 },
    { row: 6, col: 6 }, { row: 5, col: 6 }, { row: 4, col: 6 },
    { row: 3, col: 6 }, { row: 2, col: 6 }, { row: 2, col: 5 },
    { row: 2, col: 4 }, { row: 2, col: 3 }, { row: 2, col: 2 },
  ],
  'H-002': [
    { row: 8, col: 8 }, { row: 7, col: 8 }, { row: 6, col: 8 },
    { row: 6, col: 7 }, { row: 6, col: 6 }, { row: 6, col: 5 },
    { row: 6, col: 4 }, { row: 6, col: 3 }, { row: 6, col: 2 },
    { row: 5, col: 2 }, { row: 4, col: 2 }, { row: 3, col: 2 },
    { row: 2, col: 2 }, { row: 2, col: 3 }, { row: 2, col: 4 },
    { row: 2, col: 5 }, { row: 2, col: 6 }, { row: 3, col: 6 },
    { row: 4, col: 6 }, { row: 5, col: 6 }, { row: 6, col: 6 },
    { row: 7, col: 6 }, { row: 8, col: 6 }, { row: 8, col: 7 },
    { row: 8, col: 8 },
  ],
};

export function getGridNodeLatLng(
  node: GridNode,
  centerLat: number,
  centerLng: number,
  radiusMeters: number
): [number, number] {
  const intervalMeters = (radiusMeters * SIMULATION_GRID_SPAN_RADIUS * 2) / (SIMULATION_GRID_SIZE - 1);
  const northMeters = ((SIMULATION_GRID_SIZE - 1) / 2 - node.row) * intervalMeters;
  const eastMeters = (node.col - (SIMULATION_GRID_SIZE - 1) / 2) * intervalMeters;
  const latitude = centerLat + northMeters / 111320;
  const longitude = centerLng + eastMeters / (111320 * Math.cos((centerLat * Math.PI) / 180));
  return [latitude, longitude];
}

export function getDroneScanRoute(): GridNode[] {
  const route: GridNode[] = [];
  for (let row = 0; row < SIMULATION_GRID_SIZE; row++) {
    const firstCol = row % 2 === 0 ? 0 : SIMULATION_GRID_SIZE - 1;
    const lastCol = row % 2 === 0 ? SIMULATION_GRID_SIZE - 1 : 0;
    const step = firstCol <= lastCol ? 1 : -1;

    for (let col = firstCol; col !== lastCol + step; col += step) {
      route.push({ row, col });
    }
  }

  return route;
}

export function calculateGridDistanceMeters(
  first: GridNode,
  second: GridNode,
  centerLat: number,
  centerLng: number,
  radiusMeters: number
): number {
  const [lat1, lng1] = getGridNodeLatLng(first, centerLat, centerLng, radiusMeters);
  const [lat2, lng2] = getGridNodeLatLng(second, centerLat, centerLng, radiusMeters);
  return calculateHaversineDistanceMeters(lat1, lng1, lat2, lng2);
}