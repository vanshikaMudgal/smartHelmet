import React, { useState } from 'react';
import { SiteConfig } from '../models/SiteConfig';
import { isValidCoordinate } from '../utils/geoUtils';
import { MapPin, Navigation, Check, AlertCircle, X, Shield } from 'lucide-react';

interface LocationSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SiteConfig;
  onSaveConfig: (updated: Partial<SiteConfig>) => void;
}

export const LocationSetupModal: React.FC<LocationSetupModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [siteName, setSiteName] = useState(config.siteName);
  const [lat, setLat] = useState(String(config.latitude));
  const [lng, setLng] = useState(String(config.longitude));
  const [radius, setRadius] = useState(String(config.workingRadius));
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUseBrowserLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(5));
        setLng(pos.coords.longitude.toFixed(5));
        setError(null);
      },
      (err) => {
        setError(`Location access error: ${err.message}`);
      }
    );
  };

  const handlePresetSelect = (name: string, pLat: number, pLng: number, pRadius: number) => {
    setSiteName(name);
    setLat(String(pLat));
    setLng(String(pLng));
    setRadius(String(pRadius));
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numLat = parseFloat(lat);
    const numLng = parseFloat(lng);
    const numRadius = parseInt(radius, 10);

    if (!isValidCoordinate(numLat, numLng)) {
      setError('Please enter valid GPS coordinates (Latitude: -90 to 90, Longitude: -180 to 180).');
      return;
    }

    if (isNaN(numRadius) || numRadius < 50 || numRadius > 50000) {
      setError('Please enter a valid working radius between 50m and 50,000m.');
      return;
    }

    setError(null);
    onSaveConfig({
      siteName: siteName.trim() || 'Central Mining Sector',
      latitude: numLat,
      longitude: numLng,
      workingRadius: numRadius,
      isConfigured: true,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-mine-darkest/80 backdrop-blur-md">
      <div className="w-full max-w-lg bg-mine-dark border border-mine-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 bg-mine-surface/60 border-b border-mine-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-cyan-950/70 border border-cyan-500/40 text-cyan-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-sans">
                Location & Geofence Setup
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Define the central base station and active working perimeter
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-mine-card transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Presets */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
              Quick Mine Site Presets
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handlePresetSelect('Blackrock Mine - Level 3', 28.6139, 77.2098, 500)}
                className="p-2 rounded bg-mine-surface/80 hover:bg-mine-card border border-mine-border/80 text-left text-xs font-mono transition-colors"
              >
                <div className="text-slate-200 font-bold truncate">Blackrock Mine (L3)</div>
                <div className="text-[10px] text-cyan-400">28.6139° N, 77.2098° E (500m)</div>
              </button>

              <button
                type="button"
                onClick={() => handlePresetSelect('Gautam Shaft - Sector 4', 28.6692, 77.4538, 500)}
                className="p-2 rounded bg-mine-surface/80 hover:bg-mine-card border border-mine-border/80 text-left text-xs font-mono transition-colors"
              >
                <div className="text-slate-200 font-bold truncate">Gautam Shaft (Sec 4)</div>
                <div className="text-[10px] text-cyan-400">28.6692° N, 77.4538° E (500m)</div>
              </button>
            </div>
          </div>

          {/* Site Name */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
              Site / Facility Name
            </label>
            <input
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="e.g. Blackrock Mine - Level 3"
              className="w-full px-3 py-2 bg-mine-surface border border-mine-border rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          {/* Latitude & Longitude */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                Latitude (-90 to 90)
              </label>
              <input
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="28.6139"
                className="w-full px-3 py-2 bg-mine-surface border border-mine-border rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                Longitude (-180 to 180)
              </label>
              <input
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="77.2098"
                className="w-full px-3 py-2 bg-mine-surface border border-mine-border rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
          </div>

          {/* Browser Geolocation helper */}
          <div>
            <button
              type="button"
              onClick={handleUseBrowserLocation}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Use Current Device GPS Coordinates</span>
            </button>
          </div>

          {/* Working Radius */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Working Radius / Geofence
              </label>
              <span className="text-xs font-mono font-bold text-cyan-400">
                {radius} meters
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="2500"
              step="50"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              className="w-full accent-cyan-500 bg-mine-surface"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
              <span>100m</span>
              <span>500m (Standard)</span>
              <span>2500m</span>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-3 border-t border-mine-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-mine-surface hover:bg-mine-card border border-mine-border text-slate-300 text-xs font-mono transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-600/20 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Apply & Start Monitoring</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
