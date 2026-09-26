/**
 * Centralized API & Environment Configuration
 * Reads from Vite environment variables (prefixed with VITE_)
 */

export interface AppEnvConfig {
  apiBaseUrl: string;
  pollingInterval: number;
  useMockData: boolean;
  staleTimeout: number;
  safeSignalThreshold: number;
  warningSignalThreshold: number;
  criticalSignalThreshold: number;
}

export const ENV_CONFIG: AppEnvConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  pollingInterval: Number(import.meta.env.VITE_POLLING_INTERVAL) || 1000,
  useMockData: import.meta.env.VITE_USE_MOCK_DATA === 'true',
  staleTimeout: Number(import.meta.env.VITE_STALE_TIMEOUT) || 10000,
  safeSignalThreshold: Number(import.meta.env.VITE_SAFE_SIGNAL_THRESHOLD) || -65,
  warningSignalThreshold: Number(import.meta.env.VITE_WARNING_SIGNAL_THRESHOLD) || -75,
  criticalSignalThreshold: Number(import.meta.env.VITE_CRITICAL_SIGNAL_THRESHOLD) || -85,
};
