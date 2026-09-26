import { useState, useEffect, useRef, useMemo } from 'react';
import { MonitoringService, MonitoringState } from '../services/monitoringService';
import { SiteConfig } from '../models/SiteConfig';
import { Helmet } from '../models/Helmet';

export function useMonitoring(config: SiteConfig) {
  const serviceRef = useRef<MonitoringService | null>(null);

  if (!serviceRef.current) {
    serviceRef.current = new MonitoringService(config);
  }

  const service = serviceRef.current;

  const [monitoringState, setMonitoringState] = useState<MonitoringState>({
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
  });

  const [selectedHelmetId, setSelectedHelmetId] = useState<string | null>(null);

  useEffect(() => {
    service.updateConfig(config);
  }, [config, service]);

  useEffect(() => {
    const unsubscribe = service.subscribe((newState) => {
      setMonitoringState({ ...newState });
    });

    service.start();

    return () => {
      service.stop();
      unsubscribe();
    };
  }, [service]);

  const selectedHelmet: Helmet | null = useMemo(() => {
    if (!selectedHelmetId) return null;
    return monitoringState.helmets[selectedHelmetId] || null;
  }, [selectedHelmetId, monitoringState.helmets]);

  const helmetList = useMemo(() => {
    return Object.values(monitoringState.helmets).sort((a, b) => a.id.localeCompare(b.id));
  }, [monitoringState.helmets]);

  return {
    ...monitoringState,
    helmetList,
    selectedHelmetId,
    selectedHelmet,
    setSelectedHelmetId,
    pollNow: () => service.poll(),
    resetSimulation: () => service.resetSimulation(),
    clearAlerts: () => service.clearAlerts(),
  };
}
