/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_POLLING_INTERVAL?: string;
  readonly VITE_USE_MOCK_DATA?: string;
  readonly VITE_STALE_TIMEOUT?: string;
  readonly VITE_SAFE_SIGNAL_THRESHOLD?: string;
  readonly VITE_WARNING_SIGNAL_THRESHOLD?: string;
  readonly VITE_CRITICAL_SIGNAL_THRESHOLD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
