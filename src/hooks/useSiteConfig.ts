import { useState, useEffect } from 'react';
import { SiteConfig, DEFAULT_SITE_CONFIG } from '../models/SiteConfig';
import { ENV_CONFIG } from '../api/apiConfig';

const STORAGE_KEY = 'mine_helmet_tracker_site_config';
const SPEED_DEFAULT_MIGRATION_KEY = `${STORAGE_KEY}_fast_default_applied`;

export function useSiteConfig() {
  const [config, setConfig] = useState<SiteConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const savedConfig = JSON.parse(saved) as Partial<SiteConfig>;
        const shouldApplyFastDefault = localStorage.getItem(SPEED_DEFAULT_MIGRATION_KEY) !== 'true';
        if (shouldApplyFastDefault) {
          localStorage.setItem(SPEED_DEFAULT_MIGRATION_KEY, 'true');
        }
        return {
          ...DEFAULT_SITE_CONFIG,
          ...savedConfig,
          ...(shouldApplyFastDefault ? { simulationSpeed: 'fast' as const } : {}),
        };
      }
    } catch {
      // ignore JSON parse error
    }

    return {
      ...DEFAULT_SITE_CONFIG,
      backendBaseUrl: ENV_CONFIG.apiBaseUrl,
      pollingInterval: ENV_CONFIG.pollingInterval,
      useMockData: ENV_CONFIG.useMockData,
      staleTimeout: ENV_CONFIG.staleTimeout,
      safeSignalThreshold: ENV_CONFIG.safeSignalThreshold,
      warningSignalThreshold: ENV_CONFIG.warningSignalThreshold,
      criticalSignalThreshold: ENV_CONFIG.criticalSignalThreshold,
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      // ignore storage full/blocked
    }
  }, [config]);

  const updateConfig = (newValues: Partial<SiteConfig>) => {
    setConfig((prev) => ({
      ...prev,
      ...newValues,
    }));
  };

  const resetConfig = () => {
    setConfig(DEFAULT_SITE_CONFIG);
  };

  return {
    config,
    updateConfig,
    resetConfig,
  };
}
