/**
 * Core Monitoring Engine with Real-Time Proximity Detection
 *
 * Coordinates data polling from backend API or grid simulator,
 * computes pairwise Haversine distances for proximity detection,
 * maintains movement trails, evaluates signal status, and fires alerts.
 */

import {
  Helmet,
  HelmetMetrics,
  HelmetStatus,
  HelmetTrails,
  ProximityPair,
  RawHelmetData,
  TrajectoryPoint,
} from '../models/Helmet';
import { AlertItem, AlertType } from '../models/Alert';
import { SiteConfig } from '../models/SiteConfig';
import { getLatestHelmets } from '../api/helmetApi';
import { DroneTelemetry, mockSimulator } from './mockSimulator';
import {
  calculateHelmetStatus,
  calculateSignalTendency,
  dBmToPercentage,
} from '../utils/signalStatus';
import {
  calculateHaversineDistanceMeters,
  isInsideWorkingArea,
  isValidCoordinate,
} from '../utils/geoUtils';
import { formatTime } from '../utils/formatters';

export interface MonitoringState {
  helmets: Record<string, Helmet>;
  drone: DroneTelemetry | null;
  trails: HelmetTrails;
  alerts: AlertItem[];
  proximityPairs: ProximityPair[];
  metrics: HelmetMetrics;
  lastTickMs: number;
  tickCount: number;
  isBackendConnected: boolean;
  backendError: string | null;
  isLoading: boolean;
}

export class MonitoringService {
  private state: MonitoringState;
  private subscribers: ((state: MonitoringState) => void)[] = [];
  private intervalId: number | null = null;
  private config: SiteConfig;
  private prevStatusCache: Record<string, HelmetStatus> = {};
  private prevGeofenceCache: Record<string, boolean> = {};
  private activeProximityKeys = new Set<string>();
  private lastDroneLock: string | null = null;

  constructor(initialConfig: SiteConfig) {
    this.config = initialConfig;
    this.state = {
      helmets: {},
      drone: null,
      trails: {},
      alerts: [],
      proximityPairs: [],
      metrics: {
        total: 0,
        connected: 0,
        active: 0,
        warning: 0,
        critical: 0,
        offline: 0,
      },
      lastTickMs: Date.now(),
      tickCount: 0,
      isBackendConnected: false,
      backendError: null,
      isLoading: true,
    };
  }

  public updateConfig(newConfig: SiteConfig) {
    this.config = newConfig;
    mockSimulator.setCenterAndRadius(newConfig.latitude, newConfig.longitude, newConfig.workingRadius);
    mockSimulator.setRunning(newConfig.isSimulationRunning);
    mockSimulator.setSpeed(newConfig.simulationSpeed);

    if (this.intervalId !== null) {
      this.stop();
      this.start();
    }
  }

  public resetSimulation() {
    if (!this.config.useMockData) return;

    mockSimulator.reset();
    this.prevStatusCache = {};
    this.prevGeofenceCache = {};
    this.activeProximityKeys.clear();
    this.lastDroneLock = null;
    this.state.helmets = {};
    this.state.drone = mockSimulator.getDroneTelemetry();
    this.state.trails = {};
    this.state.alerts = [];
    this.state.proximityPairs = [];
    this.state.tickCount = 0;
    this.state.lastTickMs = Date.now();
    this.state.isLoading = false;
    const rawPackets = mockSimulator.step(
      this.config.latitude,
      this.config.longitude,
      this.config.workingRadius,
      false
    );
    this.processHelmetPackets(rawPackets, this.state.lastTickMs, 0, false);
    this.state.drone = mockSimulator.getDroneTelemetry();
    this.evaluateProximity();
    this.recalculateMetrics();
    this.notify();
  }

  public subscribe(callback: (state: MonitoringState) => void): () => void {
    this.subscribers.push(callback);
    callback(this.state);
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  private notify() {
    for (const callback of this.subscribers) {
      callback(this.state);
    }
  }

  public start() {
    if (this.intervalId !== null) return;

    this.poll();

    this.intervalId = window.setInterval(() => {
      this.poll();
    }, Math.max(400, this.config.pollingInterval));
  }

  public stop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public async poll() {
    const tick = this.state.tickCount + 1;
    const nowMs = Date.now();

    try {
      let rawData: RawHelmetData[] = [];

      if (this.config.useMockData) {
        rawData = mockSimulator.step(
          this.config.latitude,
          this.config.longitude,
          this.config.workingRadius
        );
        this.state.drone = mockSimulator.getDroneTelemetry();
        const detectedHelmetId = this.state.drone.lastDetection?.helmetId ?? null;
        if (detectedHelmetId && detectedHelmetId !== this.lastDroneLock) {
          const detectedHelmet = this.state.helmets[detectedHelmetId];
          this.state.alerts = [
            this.createAlert(
              detectedHelmetId,
              'DRONE_DETECTION',
              'info',
              'DRONE FLAG RAISED',
              `Drone detected ${detectedHelmet?.workerName || detectedHelmetId} at ${this.state.drone.lastDetection?.latitude.toFixed(5)}, ${this.state.drone.lastDetection?.longitude.toFixed(5)}`,
              `${this.state.drone.lastDetection?.signalStrength ?? 'N/A'} dBm`
            ),
            ...this.state.alerts,
          ].slice(0, 100);
        }
        this.lastDroneLock = detectedHelmetId;
        this.state.isBackendConnected = true;
        this.state.backendError = null;
      } else {
        this.lastDroneLock = null;
        rawData = await getLatestHelmets(this.config.backendBaseUrl);
        this.state.drone = null;
        this.state.isBackendConnected = true;
        this.state.backendError = null;
      }

      this.processHelmetPackets(rawData, nowMs, tick);
      this.evaluateProximity();
    } catch (error) {
      this.state.isBackendConnected = false;
      this.state.backendError = error instanceof Error ? error.message : 'Connection failed';
      this.evaluateStaleHelmets(nowMs);
      this.evaluateProximity();
    } finally {
      this.state.isLoading = false;
      this.state.tickCount = tick;
      this.state.lastTickMs = nowMs;
      this.recalculateMetrics();
      this.notify();
    }
  }

  private processHelmetPackets(rawPackets: RawHelmetData[], nowMs: number, _tick: number, trackTrails = true) {
    const updatedHelmets: Record<string, Helmet> = { ...this.state.helmets };
    const updatedTrails: HelmetTrails = { ...this.state.trails };
    const newAlerts: AlertItem[] = [];
    const uniquePackets = new Map<string, RawHelmetData>();

    for (const packet of rawPackets) {
      const id = packet.helmetId || packet.id;
      if (!id) continue;
      const espId = packet.espId || packet.esp_id || packet.device_id || id;
      const previousPacket = uniquePackets.get(espId);
      const packetTime = Date.parse(String(packet.timestamp ?? 0)) || Number(packet.timestamp) || 0;
      const previousTime = previousPacket
        ? Date.parse(String(previousPacket.timestamp ?? 0)) || Number(previousPacket.timestamp) || 0
        : -1;
      if (!previousPacket || packetTime >= previousTime) uniquePackets.set(espId, packet);
    }

    const baseCoords = {
      latitude: this.config.latitude,
      longitude: this.config.longitude,
    };

    for (const packet of uniquePackets.values()) {
      const packetId = packet.helmetId || packet.id;
      if (!packetId) continue;

      const espId = packet.espId || packet.esp_id || packet.device_id || `ESP-${packetId.replace(/^H-?/, '')}`;
      const existingEntry = Object.entries(updatedHelmets).find(([, helmet]) => helmet.espId === espId);
      const matchingId = existingEntry?.[0] || packetId;
      const id = updatedHelmets[matchingId] && updatedHelmets[matchingId].espId !== espId
        ? `${packetId}-${espId}`
        : matchingId;
      const rawLat = packet.latitude ?? 0;
      const rawLng = packet.longitude ?? 0;
      const signalStrength = typeof packet.signalStrength === 'number' ? packet.signalStrength : -65;
      const timestampStr = packet.timestamp ? String(packet.timestamp) : new Date().toISOString();

      const hasValidGps = isValidCoordinate(rawLat, rawLng);
      const prevHelmet = updatedHelmets[id];
      const prevSignal = prevHelmet ? prevHelmet.signalStrength : null;

      const statusConfig = {
        safeSignalThreshold: this.config.safeSignalThreshold,
        warningSignalThreshold: this.config.warningSignalThreshold,
        criticalSignalThreshold: this.config.criticalSignalThreshold,
        staleTimeout: this.config.staleTimeout,
      };

      const tendency = calculateSignalTendency(signalStrength, prevSignal);
      const status = calculateHelmetStatus(
        signalStrength,
        prevSignal,
        statusConfig,
        nowMs
      );

      const lat: number = hasValidGps ? rawLat : (prevHelmet?.latitude ?? this.config.latitude);
      const lng: number = hasValidGps ? rawLng : (prevHelmet?.longitude ?? this.config.longitude);

      const distance = calculateHaversineDistanceMeters(
        lat,
        lng,
        baseCoords.latitude,
        baseCoords.longitude
      );

      const insideWorkingArea = isInsideWorkingArea(
        { latitude: lat, longitude: lng },
        baseCoords,
        this.config.workingRadius
      );

      const prevHistory = prevHelmet?.signalHistory || [];
      const signalHistory: number[] = [...prevHistory, signalStrength].slice(-20);

      // Maintain trails
      if (trackTrails && hasValidGps) {
        const currentTrail = updatedTrails[id] || [];
        const lastPoint = currentTrail[currentTrail.length - 1];

        const hasMoved =
          !lastPoint ||
          Math.abs(lastPoint.latitude - lat) > 0.000003 ||
          Math.abs(lastPoint.longitude - lng) > 0.000003;

        if (hasMoved) {
          const newPoint: TrajectoryPoint = {
            latitude: lat,
            longitude: lng,
            timestamp: timestampStr,
            signalStrength,
          };
          const newTrail: TrajectoryPoint[] = [...currentTrail, newPoint];

          if (newTrail.length > this.config.maxTrailPoints) {
            newTrail.shift();
          }
          updatedTrails[id] = newTrail;
        }
      }

      // Check for state transitions and alert triggers
      const prevStatus = this.prevStatusCache[id] || 'ACTIVE';
      const prevGeofence = this.prevGeofenceCache[id] ?? true;

      if (status !== prevStatus) {
        if (status === 'WARNING') {
          newAlerts.push(
            this.createAlert(
              id,
              'SIGNAL_WARNING',
              'warning',
              'WARNING',
              'Signal strength decreasing',
              `${signalStrength} dBm`
            )
          );
        } else if (status === 'CRITICAL') {
          newAlerts.push(
            this.createAlert(
              id,
              'SIGNAL_CRITICAL',
              'critical',
              'CRITICAL',
              'Critical low signal detected',
              `${signalStrength} dBm`
            )
          );
        } else if (status === 'ACTIVE' && (prevStatus === 'WARNING' || prevStatus === 'CRITICAL')) {
          newAlerts.push(
            this.createAlert(
              id,
              'SIGNAL_RESTORED',
              'info',
              'RESTORED',
              'Signal restored',
              `${signalStrength} dBm`
            )
          );
        }
        this.prevStatusCache[id] = status;
      }

      if (insideWorkingArea !== prevGeofence) {
        if (!insideWorkingArea) {
          newAlerts.push(
            this.createAlert(
              id,
              'GEOFENCE_BREACH',
              'critical',
              'GEOFENCE BREACH',
              'Helmet moved outside monitoring area',
              `${Math.round(distance)}m from base`
            )
          );
        }
        this.prevGeofenceCache[id] = insideWorkingArea;
      }

      updatedHelmets[id] = {
        id,
        espId,
        workerName: packet.workerName || prevHelmet?.workerName || `Worker ${id}`,
        workerHealthStatus: packet.workerHealthStatus && packet.workerHealthStatus !== 'UNKNOWN'
          ? packet.workerHealthStatus
          : prevHelmet?.workerHealthStatus ?? 'UNKNOWN',
        sector: packet.sector || prevHelmet?.sector || 'Main Shaft',
        latitude: lat,
        longitude: lng,
        previousPosition: prevHelmet && hasValidGps
          ? { latitude: prevHelmet.latitude, longitude: prevHelmet.longitude }
          : null,
        signalStrength,
        previousSignalStrength: prevSignal,
        signalPercentage: dBmToPercentage(signalStrength),
        status,
        tendency,
        timestamp: timestampStr,
        lastSeenMs: nowMs,
        depth: packet.depth ?? prevHelmet?.depth ?? 45,
        isInsideWorkingArea: insideWorkingArea,
        distanceFromBaseMeters: Math.round(distance),
        updateCount: (prevHelmet?.updateCount || 0) + 1,
        signalHistory,
        battery: packet.battery ?? prevHelmet?.battery ?? 90,
        hasValidGps,
        isInProximity: false, // will be evaluated in evaluateProximity()
      };
    }

    this.state.helmets = updatedHelmets;
    this.state.trails = updatedTrails;

    if (newAlerts.length > 0) {
      this.state.alerts = [...newAlerts, ...this.state.alerts].slice(0, 100);
    }
  }

  /**
   * Evaluates pairwise distance between all active helmets to detect proximity (<= threshold)
   */
  private evaluateProximity() {
    const helmetList = Object.values(this.state.helmets).filter(
      (h) => h.status !== 'OFFLINE' && h.hasValidGps
    );

    const threshold = this.config.proximityThreshold || 20;
    const currentProximityPairs: ProximityPair[] = [];
    const currentProximityKeys = new Set<string>();
    const helmetsInProximity = new Set<string>();
    const newAlerts: AlertItem[] = [];

    for (let i = 0; i < helmetList.length; i++) {
      for (let j = i + 1; j < helmetList.length; j++) {
        const h1 = helmetList[i];
        const h2 = helmetList[j];

        const dist = calculateHaversineDistanceMeters(
          h1.latitude,
          h1.longitude,
          h2.latitude,
          h2.longitude
        );

        if (dist <= threshold) {
          const pairKey = [h1.id, h2.id].sort().join('<->');
          currentProximityKeys.add(pairKey);
          helmetsInProximity.add(h1.id);
          helmetsInProximity.add(h2.id);

          currentProximityPairs.push({
            helmetId1: h1.id,
            helmetId2: h2.id,
            distanceMeters: Math.round(dist * 10) / 10,
            lat1: h1.latitude,
            lng1: h1.longitude,
            lat2: h2.latitude,
            lng2: h2.longitude,
          });

          // Trigger warning alert if entering proximity
          if (!this.activeProximityKeys.has(pairKey)) {
            newAlerts.push(
              this.createAlert(
                h1.id,
                'PROXIMITY_DETECTED',
                'warning',
                'PROXIMITY ALERT',
                `Two helmets within ${threshold}m: ${h1.id} ↔ ${h2.id}`,
                `${dist.toFixed(1)}m`
              )
            );
          }
        }
      }
    }

    this.activeProximityKeys = currentProximityKeys;
    this.state.proximityPairs = currentProximityPairs;

    // Update isInProximity flag on helmet records
    for (const id of Object.keys(this.state.helmets)) {
      this.state.helmets[id].isInProximity = helmetsInProximity.has(id);
    }

    if (newAlerts.length > 0) {
      this.state.alerts = [...newAlerts, ...this.state.alerts].slice(0, 100);
    }
  }

  private evaluateStaleHelmets(nowMs: number) {
    const updated = { ...this.state.helmets };
    const newAlerts: AlertItem[] = [];

    for (const [id, helmet] of Object.entries(updated)) {
      if (nowMs - helmet.lastSeenMs > this.config.staleTimeout) {
        const prevStatus = this.prevStatusCache[id];
        if (helmet.status !== 'OFFLINE') {
          updated[id] = {
            ...helmet,
            status: 'OFFLINE',
            tendency: 'STABLE',
            isInProximity: false,
          };
          if (prevStatus !== 'OFFLINE') {
            newAlerts.push(
              this.createAlert(
                id,
                'CONNECTION_LOST',
                'offline',
                'OFFLINE',
                'Connection lost',
                'Timed out'
              )
            );
            this.prevStatusCache[id] = 'OFFLINE';
          }
        }
      }
    }

    this.state.helmets = updated;
    if (newAlerts.length > 0) {
      this.state.alerts = [...newAlerts, ...this.state.alerts].slice(0, 100);
    }
  }

  private recalculateMetrics() {
    const helmetList = Object.values(this.state.helmets);
    const total = helmetList.length;

    let active = 0;
    let warning = 0;
    let critical = 0;
    let offline = 0;

    for (const h of helmetList) {
      switch (h.status) {
        case 'ACTIVE':
          active++;
          break;
        case 'WARNING':
          warning++;
          break;
        case 'CRITICAL':
          critical++;
          break;
        case 'OFFLINE':
          offline++;
          break;
      }
    }

    this.state.metrics = {
      total,
      connected: active + warning + critical,
      active,
      warning,
      critical,
      offline,
    };
  }

  private createAlert(
    helmetId: string,
    type: AlertType,
    severity: AlertItem['severity'],
    title: string,
    message: string,
    value?: string
  ): AlertItem {
    return {
      id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      helmetId,
      type,
      severity,
      title,
      message,
      timestamp: formatTime(Date.now()),
      timestampMs: Date.now(),
      value,
    };
  }

  public clearAlerts() {
    this.state.alerts = [];
    this.notify();
  }
}
