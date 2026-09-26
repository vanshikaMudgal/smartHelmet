/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gis: {
          bg: '#F5F7FA',
          card: '#FFFFFF',
          border: '#E2E8F0',
          borderSubtle: '#EDF2F7',
          borderStrong: '#CBD5E1',
          text: '#1F2937',
          secondary: '#64748B',
          muted: '#94A3B8',
          blue: '#2563EB',
          blueLight: '#EFF6FF',
          blueBorder: '#BFDBFE',
        },
        status: {
          safe: '#16A34A',      // Traffic-light Green
          safeBg: '#F0FDF4',
          safeBorder: '#BBF7D0',
          warning: '#D97706',   // Traffic-light Amber
          warningBg: '#FFFBEB',
          warningBorder: '#FDE68A',
          critical: '#DC2626',  // Traffic-light Red
          criticalBg: '#FEF2F2',
          criticalBorder: '#FECACA',
          offline: '#64748B',   // Traffic-light Gray
          offlineBg: '#F8FAFC',
          offlineBorder: '#E2E8F0',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Consolas', 'Courier New', 'monospace']
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'panel': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        'map-btn': '0 2px 4px rgba(0, 0, 0, 0.08)',
      }
    },
  },
  plugins: [],
}
