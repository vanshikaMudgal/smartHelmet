/**
 * Mine site and monitoring system parameters
 */

export interface SiteConfig {
  siteName: string;
  latitude: number;
  longitude: number;
  workingRadius: number;           // Radius in meters (e.g. 500)
  proximityThreshold: number;      // Geographic proximity alert threshold in meters
  showTrails: boolean;             // Toggle movement trails visibility
  simulationSpeed: 'slow' | 'normal' | 'fast'; // Simulation movement speed
  isSimulationRunning: boolean;    // Start / Stop simulation state
  pollingInterval: number;         // In milliseconds (e.g. 1000)
  staleTimeout: number;            // In milliseconds before considered OFFLINE (e.g. 10000)
  maxTrailPoints: number;          // Maximum coordinates preserved per helmet (e.g. 500)
  safeSignalThreshold: number;     // dBm threshold (e.g. -65)
  warningSignalThreshold: number;  // dBm threshold (e.g. -75)
  criticalSignalThreshold: number; // dBm threshold (e.g. -85)
  backendBaseUrl: string;          // API base URL
  useMockData: boolean;            // Toggle live backend API vs Simulation Mode
  isConfigured: boolean;           // Set to true after setup
}

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  siteName: 'Gautam Shaft - Sector 4',
  latitude: 28.6139,
  longitude: 77.2098,
  workingRadius: 500,
  proximityThreshold: 20,
  showTrails: true,
  simulationSpeed: 'fast',
  isSimulationRunning: true,
  pollingInterval: 1000,
  staleTimeout: 10000,
  maxTrailPoints: 200,
  safeSignalThreshold: -65,
  warningSignalThreshold: -75,
  criticalSignalThreshold: -85,
  backendBaseUrl: 'http://localhost:5000',
  useMockData: true, // Default to true so user immediately sees the working grid simulation & proximity!
  isConfigured: true
};
