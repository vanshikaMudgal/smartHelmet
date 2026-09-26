/**
 * Grid-Based Mine Corridor Helmet Simulator
 *
 * Implements strict node-to-node worker movement through an orthogonal
 * mine corridor network inside the monitoring radius.
 *
 * Features:
 * - Real tunnel corridors: horizontal and vertical paths only (no diagonal cuts)
 * - Smooth node-to-node interpolation at configurable speeds
 * - Two predefined orthogonal routes that repeatedly converge for proximity testing.
 */

import { RawHelmetData } from '../models/Helmet';
import { getDroneScanRoute, getGridNodeLatLng, GridNode, HELMET_ROUTES, SIMULATION_CONFIG } from '../utils/simulationGrid';
import { calculateHaversineDistanceMeters } from '../utils/geoUtils';

function distanceFromSegmentMeters(
  pointLat: number,
  pointLng: number,
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): number {
  const metersPerLongitudeDegree = 111320 * Math.cos((pointLat * Math.PI) / 180);
  const startX = (startLng - pointLng) * metersPerLongitudeDegree;
  const startY = (startLat - pointLat) * 111320;
  const endX = (endLng - pointLng) * metersPerLongitudeDegree;
  const endY = (endLat - pointLat) * 111320;
  const segmentX = endX - startX;
  const segmentY = endY - startY;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
  const progress = segmentLengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, -(startX * segmentX + startY * segmentY) / segmentLengthSquared));

  return Math.hypot(startX + progress * segmentX, startY + progress * segmentY);
}

interface SimulatedWorker {
  id: string;
  espId: string;
  workerName: string;
  sector: string;
  route: GridNode[];
  currentLegIndex: number;
  progress: number; // 0.0 to 1.0 along current leg
  signalStrength: number;
  baseSignal: number;
  depth: number;
  battery: number;
}

export interface DroneDetection {
  helmetId: string;
  workerName: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  confidence: number;
  signalStrength: number;
  detectedAt: number;
}

export interface DroneTelemetry {
  latitude: number;
  longitude: number;
  heading: number;
  scanIndex: number;
  scanProgress: number;
  scanTotal: number;
  scanNodeRow: number;
  scanNodeCol: number;
  scanComplete: boolean;
  linkedHelmetId: string | null;
  linkDistanceMeters: number | null;
  lastDetection: DroneDetection | null;
  detectedHelmetIds: string[];
}

export class MockSimulator {
  private workers: SimulatedWorker[] = [];
  private centerLat = 28.6139;
  private centerLng = 77.2098;
  private radiusMeters = 500;
  private isRunning = true;
  private speedMode: 'slow' | 'normal' | 'fast' = 'fast';
  private droneProgress = 0;
  private droneLegIndex = 0;
  private tickCount = 0;
  private droneTelemetry: DroneTelemetry = {
    latitude: this.centerLat,
    longitude: this.centerLng,
    heading: 90,
    scanIndex: 0,
    scanProgress: 0,
    scanTotal: getDroneScanRoute().length,
    scanNodeRow: 0,
    scanNodeCol: 0,
    scanComplete: false,
    linkedHelmetId: null,
    linkDistanceMeters: null,
    lastDetection: null,
    detectedHelmetIds: [],
  };

  constructor() {
    this.initWorkers();
  }

  private initWorkers() {
    // Adjust these routes in utils/simulationGrid.ts; every turn is orthogonal.
    this.workers = [
      {
        id: 'H-001',
        espId: 'ESP-001',
        workerName: 'J. Martinez',
        sector: 'Sector A',
        route: HELMET_ROUTES['H-001'].map((node) => ({ ...node })),
        currentLegIndex: 0,
        progress: 0.0,
        signalStrength: -55,
        baseSignal: -55,
        depth: 145,
        battery: 92,
      },
      {
        id: 'H-002',
        espId: 'ESP-002',
        workerName: 'R. Okafor',
        sector: 'Sector B',
        route: HELMET_ROUTES['H-002'].map((node) => ({ ...node })),
        currentLegIndex: 0,
        progress: 0.0,
        signalStrength: -58,
        baseSignal: -58,
        depth: 198,
        battery: 76,
      },
    ];
  }

  public setCenterAndRadius(lat: number, lng: number, radius: number) {
    this.centerLat = lat;
    this.centerLng = lng;
    this.radiusMeters = radius;
    const firstNode = getDroneScanRoute()[0];
    const [droneLat, droneLng] = getGridNodeLatLng(firstNode, lat, lng, radius);
    this.droneTelemetry = { ...this.droneTelemetry, latitude: droneLat, longitude: droneLng };
  }

  public setRunning(running: boolean) {
    this.isRunning = running;
  }

  public setSpeed(speed: 'slow' | 'normal' | 'fast') {
    this.speedMode = speed;
  }

  public reset() {
    for (const w of this.workers) {
      w.currentLegIndex = 0;
      w.progress = 0.0;
    }
    this.droneProgress = 0;
    this.droneLegIndex = 0;
    this.tickCount = 0;
    for (const worker of this.workers) worker.signalStrength = worker.baseSignal;
    const firstNode = getDroneScanRoute()[0];
    const [droneLat, droneLng] = getGridNodeLatLng(firstNode, this.centerLat, this.centerLng, this.radiusMeters);
    this.droneTelemetry = {
      ...this.droneTelemetry,
      latitude: droneLat,
      longitude: droneLng,
      heading: 90,
      scanIndex: 0,
      scanProgress: 0,
      scanNodeRow: 0,
      scanNodeCol: 0,
      scanComplete: false,
      linkedHelmetId: null,
      linkDistanceMeters: null,
      lastDetection: null,
      detectedHelmetIds: [],
    };
  }

  public getDroneTelemetry(): DroneTelemetry {
    return {
      ...this.droneTelemetry,
      lastDetection: this.droneTelemetry.lastDetection && { ...this.droneTelemetry.lastDetection },
      detectedHelmetIds: [...this.droneTelemetry.detectedHelmetIds],
    };
  }

  private metersToLatLng(northMeters: number, eastMeters: number) {
    return {
      latitude: this.centerLat + northMeters / 111320,
      longitude: this.centerLng + eastMeters / (111320 * Math.cos((this.centerLat * Math.PI) / 180)),
    };
  }

  private updateDrone(results: RawHelmetData[], advance: boolean) {
    const route = getDroneScanRoute();
    const previousPosition = {
      latitude: this.droneTelemetry.latitude,
      longitude: this.droneTelemetry.longitude,
    };
    const nextIndex = Math.min(this.droneLegIndex + 1, route.length - 1);
    const step = this.speedMode === 'slow' ? 0.08 : this.speedMode === 'fast' ? 0.5 : 0.2;
    let reachedNode = false;
    let scanComplete = this.droneTelemetry.scanComplete;

    if (this.isRunning && advance && !scanComplete) {
      this.droneProgress += step;
      if (this.droneProgress >= 1) {
        this.droneProgress -= 1;
        this.droneLegIndex = nextIndex;
        reachedNode = true;
        scanComplete = this.droneLegIndex === route.length - 1;
      }
    }

    const from = route[this.droneLegIndex];
    const to = route[Math.min(this.droneLegIndex + 1, route.length - 1)];
    const fromPosition = getGridNodeLatLng(from, this.centerLat, this.centerLng, this.radiusMeters);
    const toPosition = getGridNodeLatLng(to, this.centerLat, this.centerLng, this.radiusMeters);
    const position = {
      latitude: fromPosition[0] + this.droneProgress * (toPosition[0] - fromPosition[0]),
      longitude: fromPosition[1] + this.droneProgress * (toPosition[1] - fromPosition[1]),
    };
    const heading = (Math.atan2(to.col - from.col, from.row - to.row) * 180 / Math.PI + 360) % 360;
    const scanRangeMeters = Math.max(80, Math.min(150, this.radiusMeters * 0.3));

    for (const [index, packet] of results.entries()) {
      const distanceToDrone = calculateHaversineDistanceMeters(
        position.latitude,
        position.longitude,
        packet.latitude ?? position.latitude,
        packet.longitude ?? position.longitude
      );
      const baseSignal = this.workers[index]?.baseSignal ?? -58;
      const attenuation = Math.min(36, distanceToDrone * 0.07);
      const signalVariation = this.isRunning && advance
        ? Math.sin(this.tickCount * 0.45 + index * 1.7) * 1.5
        : 0;
      const signalStrength = this.isRunning && advance
        ? Math.round(baseSignal - attenuation + signalVariation)
        : this.workers[index]?.signalStrength ?? baseSignal;
      packet.signalStrength = signalStrength;
      if (this.workers[index]) this.workers[index].signalStrength = signalStrength;
    }

    const nearest = results
      .filter((packet) => typeof packet.latitude === 'number' && typeof packet.longitude === 'number')
      .map((packet) => ({
        packet,
        distanceMeters: calculateHaversineDistanceMeters(
          position.latitude,
          position.longitude,
          packet.latitude!,
          packet.longitude!
        ),
      }))
      .sort((a, b) => a.distanceMeters - b.distanceMeters)[0];

    const linked = nearest
      && nearest.distanceMeters <= scanRangeMeters
      ? nearest
      : null;
    const passOverRangeMeters = 12;
    const nearestPass = results
      .filter((packet) => typeof packet.latitude === 'number' && typeof packet.longitude === 'number')
      .map((packet) => ({
        packet,
        distanceMeters: distanceFromSegmentMeters(
          packet.latitude!,
          packet.longitude!,
          previousPosition.latitude,
          previousPosition.longitude,
          position.latitude,
          position.longitude
        ),
      }))
      .sort((a, b) => a.distanceMeters - b.distanceMeters)[0];
    const droneMovementMeters = calculateHaversineDistanceMeters(
      previousPosition.latitude,
      previousPosition.longitude,
      position.latitude,
      position.longitude
    );
    let lastDetection = this.droneTelemetry.lastDetection;

    if (
      this.isRunning
      && advance
      && droneMovementMeters > 0.1
      && nearestPass
      && nearestPass.distanceMeters <= passOverRangeMeters
    ) {
      const helmetId = nearestPass.packet.helmetId || nearestPass.packet.id || 'UNKNOWN';
      const isNewDetection = !this.droneTelemetry.detectedHelmetIds.includes(helmetId);
      if (isNewDetection) {
        const confidence = Math.round(98 - (nearestPass.distanceMeters / passOverRangeMeters) * 30);
        lastDetection = {
          helmetId,
          workerName: nearestPass.packet.workerName || 'Unknown worker',
          latitude: nearestPass.packet.latitude!,
          longitude: nearestPass.packet.longitude!,
          distanceMeters: Math.round(nearestPass.distanceMeters),
          confidence,
          signalStrength: nearestPass.packet.signalStrength ?? -70,
          detectedAt: Date.now(),
        };
        this.droneTelemetry.detectedHelmetIds = [...this.droneTelemetry.detectedHelmetIds, helmetId];
      }
    }

    if (reachedNode) {
      this.droneTelemetry.linkedHelmetId = linked?.packet.helmetId || linked?.packet.id || null;
      this.droneTelemetry.linkDistanceMeters = linked ? Math.round(linked.distanceMeters) : null;
    }

    const currentNode = route[this.droneLegIndex];

    this.droneTelemetry = {
      ...position,
      heading,
      scanIndex: this.droneLegIndex,
      scanProgress: this.droneProgress,
      scanTotal: route.length,
      scanNodeRow: currentNode.row,
      scanNodeCol: currentNode.col,
      scanComplete,
      linkedHelmetId: this.droneTelemetry.linkedHelmetId,
      linkDistanceMeters: this.droneTelemetry.linkDistanceMeters,
      lastDetection,
      detectedHelmetIds: [...this.droneTelemetry.detectedHelmetIds],
    };
  }

  /**
   * Advances simulation by one step along corridor segments and returns updated packets
   */
  public step(centerLat?: number, centerLng?: number, radius?: number, advance = true): RawHelmetData[] {
    if (centerLat !== undefined && centerLng !== undefined) {
      this.centerLat = centerLat;
      this.centerLng = centerLng;
      if (radius) {
        this.radiusMeters = radius;
      }
    }

    const speedStep = this.speedMode === 'slow' ? 0.04 : this.speedMode === 'fast' ? 0.16 : 0.08;
    if (this.isRunning && advance) this.tickCount++;
    const now = new Date().toISOString();

    const results: RawHelmetData[] = [];

    for (const worker of this.workers) {
      const fromNode = worker.route[worker.currentLegIndex];
      const nextIndex = (worker.currentLegIndex + 1) % worker.route.length;
      const toNode = worker.route[nextIndex];

      const fromCoord = getGridNodeLatLng(fromNode, this.centerLat, this.centerLng, this.radiusMeters);
      const toCoord = getGridNodeLatLng(toNode, this.centerLat, this.centerLng, this.radiusMeters);

      // Advance progress if simulation is active
      if (this.isRunning && advance && SIMULATION_CONFIG.moveHelmetFlags) {
        worker.progress += speedStep;
        if (worker.progress >= 1.0) {
          worker.progress = 0.0;
          worker.currentLegIndex = nextIndex;
        }
      }

      // Linear interpolation between the two corridor intersection nodes
      const currentLat = fromCoord[0] + worker.progress * (toCoord[0] - fromCoord[0]);
      const currentLng = fromCoord[1] + worker.progress * (toCoord[1] - fromCoord[1]);

      results.push({
        helmetId: worker.id,
        id: worker.id,
        espId: worker.espId,
        device_id: worker.espId,
        workerName: worker.workerName,
        workerHealthStatus: 'ALIVE',
        sector: worker.sector,
        latitude: currentLat,
        longitude: currentLng,
        signalStrength: worker.signalStrength,
        depth: worker.depth,
        battery: worker.battery,
        timestamp: now,
      });
    }

    this.updateDrone(results, advance);

    return results;
  }
}

export const mockSimulator = new MockSimulator();
