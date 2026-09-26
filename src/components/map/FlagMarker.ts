import L from 'leaflet';
import { Helmet } from '../../models/Helmet';
import { getStatusColor } from '../../utils/signalStatus';

/**
 * Creates a clean, professional SVG Map Flag Marker for Leaflet
 *
 * Structure:
 *      🚩
 *      │
 *      │
 *      ●
 *
 * Features:
 * - Proper SVG flag pennant with pole
 * - Traffic light colors (Green, Amber, Red, Grey)
 * - Sharp helmet ID label badge
 * - Proximity indicator ring if in proximity
 * - Selection highlight
 */
export function createHelmetFlagIcon(helmet: Helmet, isSelected: boolean, isDroneDetected = false): L.DivIcon {
  const colors = getStatusColor(helmet.status);
  const isInProximity = helmet.isInProximity;

  const proximityRingHtml = isInProximity
    ? `<div class="absolute -bottom-1 -left-2 w-6 h-6 rounded-full border border-amber-500 bg-amber-500/20 proximity-beacon-ring pointer-events-none"></div>`
    : '';

  const selectionRingHtml = isSelected
    ? `<div class="absolute -inset-1.5 rounded border border-blue-500 bg-blue-500/10 pointer-events-none"></div>`
    : '';

  const detectionRingHtml = isDroneDetected
    ? `<div class="absolute -inset-2 rounded-full border-2 border-red-600 bg-red-600/10 pointer-events-none"></div>`
    : '';

  const flagSvg = `
    <svg width="22" height="15" viewBox="0 0 22 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Pennant flag body -->
      <polygon points="1,1 20,1 15,7.5 20,14 1,14" fill="${colors.hex}" stroke="#1E293B" stroke-width="0.8"/>
      <!-- Inner subtle fold line -->
      <line x1="4" y1="3" x2="16" y2="3" stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="0.8"/>
    </svg>
  `;

  const html = `
    <div class="relative group cursor-pointer select-none transition-transform duration-150 ${isSelected ? 'scale-110 z-50' : 'hover:scale-105'}">
      ${selectionRingHtml}
      ${proximityRingHtml}
      ${detectionRingHtml}

      <!-- Top ID Label Badge -->
      <div class="absolute -top-5 -left-3 whitespace-nowrap px-1.5 py-0.2 rounded bg-white border ${isDroneDetected ? 'border-red-600 text-red-700 shadow-sm' : isSelected ? 'border-blue-600 text-blue-700 shadow-sm' : 'border-slate-300 text-slate-800 shadow-sm'} text-[10px] font-mono font-bold tracking-tight pointer-events-none">
        ${isDroneDetected ? `FLAG RAISED · ${helmet.id}` : helmet.id}
      </div>

      <!-- Flag Assembly -->
      <div class="relative flex items-start">
        <!-- Flagpole + Base Anchor Dot -->
        <div class="relative flex flex-col items-center">
          <!-- Pole -->
          <div class="w-[2px] h-[22px] bg-slate-700 rounded-t-sm shadow-xs"></div>
          <!-- Base Dot (Exact GPS Anchor) -->
          <div class="w-2 h-2 rounded-full bg-slate-800 border border-white shadow-xs -mt-1"></div>
        </div>

        <!-- Pennant Flag connected to top of pole -->
        ${isDroneDetected ? `<div class="relative -ml-[1px] -mt-[1px]">${flagSvg}</div>` : ''}
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'gis-helmet-flag-marker',
    html,
    iconSize: [36, 36],
    iconAnchor: [1, 23], // Pinned right at the center of the base anchor dot
    popupAnchor: [10, -26],
  });
}

/**
 * Creates Center Mine Marker Icon
 */
export function createCenterLocationIcon(siteName: string): L.DivIcon {
  const html = `
    <div class="relative flex flex-col items-center group cursor-default select-none">
      <!-- Outer target ring -->
      <div class="w-6 h-6 rounded-full border-2 border-blue-600 bg-blue-600/10 flex items-center justify-center shadow-sm">
        <div class="w-2 h-2 rounded-full bg-blue-600"></div>
      </div>
      <!-- Center Label -->
      <div class="mt-0.5 px-1.5 py-0.2 rounded bg-white/95 border border-slate-300 text-[9px] font-mono font-bold text-slate-700 uppercase tracking-tight whitespace-nowrap shadow-sm">
        ${siteName || 'CENTER'}
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'gis-center-marker',
    html,
    iconSize: [50, 36],
    iconAnchor: [25, 12],
  });
}
