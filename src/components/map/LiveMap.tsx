import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Helmet, HelmetTrails, ProximityPair } from '../../models/Helmet';
import { SiteConfig } from '../../models/SiteConfig';
import { DroneTelemetry } from '../../services/mockSimulator';
import { createHelmetFlagIcon, createCenterLocationIcon } from './FlagMarker';
import { formatTacticalCoordinate } from '../../utils/geoUtils';
import { getDroneScanRoute, getGridNodeLatLng, SIMULATION_GRID_SIZE } from '../../utils/simulationGrid';
import { getStatusColor, getStatusLabel } from '../../utils/signalStatus';
import { formatTimeAgo } from '../../utils/formatters';
import { Plus, Minus, Locate, Maximize2, Shield, Plane, Radio } from 'lucide-react';

interface LiveMapProps {
  config: SiteConfig;
  helmets: Record<string, Helmet>;
  drone: DroneTelemetry | null;
  trails: HelmetTrails;
  proximityPairs: ProximityPair[];
  selectedHelmetId: string | null;
  onSelectHelmet: (id: string | null) => void;
  onLocateMe?: () => void;
}

export const LiveMap: React.FC<LiveMapProps> = ({
  config,
  helmets,
  drone,
  trails,
  proximityPairs,
  selectedHelmetId,
  onSelectHelmet,
  onLocateMe,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const trailsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const corridorLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const proximityLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const simulationOverlayRef = useRef<L.LayerGroup | null>(null);
  const droneLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const droneMarkerRef = useRef<L.Marker | null>(null);
  const droneAnimationFrameRef = useRef<number | null>(null);
  const droneHeadingRef = useRef<number | null>(null);
  const geofenceCircleRef = useRef<L.Circle | null>(null);
  const centerMarkerRef = useRef<L.Marker | null>(null);

  // 1. Initialize Leaflet Map with OpenStreetMap Standard Tiles
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [config.latitude, config.longitude],
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
      maxZoom: 19,
      minZoom: 12,
    });

    // Clean OpenStreetMap standard tile layer (100% free, real geographic roads & buildings, NO API KEY)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
    }).addTo(map);

    // Layer groups
    corridorLayerGroupRef.current = L.layerGroup().addTo(map);
    trailsLayerGroupRef.current = L.layerGroup().addTo(map);
    proximityLayerGroupRef.current = L.layerGroup().addTo(map);
    simulationOverlayRef.current = L.layerGroup().addTo(map);
    droneLayerGroupRef.current = L.layerGroup().addTo(map);

    // Subtle blue monitoring area circle (NOT neon)
    const circle = L.circle([config.latitude, config.longitude], {
      radius: config.workingRadius,
      color: config.useMockData ? '#F04438' : '#2563EB',
      weight: config.useMockData ? 2.5 : 1.5,
      dashArray: '5, 5',
      fillColor: config.useMockData ? '#F04438' : '#2563EB',
      fillOpacity: config.useMockData ? 0.025 : 0.05,
    }).addTo(map);
    geofenceCircleRef.current = circle;

    // Center site marker
    const centerIcon = createCenterLocationIcon(config.siteName);
    const centerMarker = L.marker([config.latitude, config.longitude], {
      icon: centerIcon,
      zIndexOffset: 10,
    }).addTo(map);
    centerMarkerRef.current = centerMarker;

    mapInstanceRef.current = map;

    return () => {
      if (droneAnimationFrameRef.current !== null) {
        cancelAnimationFrame(droneAnimationFrameRef.current);
      }
      map.remove();
      mapInstanceRef.current = null;
      droneMarkerRef.current = null;
    };
  }, []);

  // 2. Update Center, Geofence circle, and Corridors when location changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const newCenter: L.LatLngTuple = [config.latitude, config.longitude];

    if (geofenceCircleRef.current) {
      geofenceCircleRef.current.setLatLng(newCenter);
      geofenceCircleRef.current.setRadius(config.workingRadius);
      geofenceCircleRef.current.setStyle({
        color: config.useMockData ? '#F04438' : '#2563EB',
        weight: config.useMockData ? 2.5 : 1.5,
        fillColor: config.useMockData ? '#F04438' : '#2563EB',
        fillOpacity: config.useMockData ? 0.025 : 0.05,
      });
    }

    if (centerMarkerRef.current) {
      centerMarkerRef.current.setLatLng(newCenter);
      centerMarkerRef.current.setIcon(createCenterLocationIcon(config.siteName));
    }

    // Render Corridor Grid Network in simulation mode
    const corridorGroup = corridorLayerGroupRef.current;
    const simulationOverlay = simulationOverlayRef.current;
    simulationOverlay?.clearLayers();

    if (config.useMockData && simulationOverlay) {
      const safeRadius = config.workingRadius * 0.76;
      simulationOverlay.addLayer(L.circle(newCenter, {
        radius: safeRadius,
        color: '#00D084',
        weight: 1.5,
        fillColor: '#00D084',
        fillOpacity: 0.14,
        interactive: false,
      }));

      for (const fraction of [0.2, 0.4, 0.6]) {
        simulationOverlay.addLayer(L.circle(newCenter, {
          radius: safeRadius * fraction,
          color: '#286447',
          weight: 1,
          opacity: 0.62,
          fillOpacity: 0,
          interactive: false,
        }));
      }

      const metersToLatLng = (northMeters: number, eastMeters: number): L.LatLngTuple => [
        config.latitude + northMeters / 111320,
        config.longitude + eastMeters / (111320 * Math.cos((config.latitude * Math.PI) / 180)),
      ];
      const cellWidth = config.workingRadius * 0.19;
      const cellHeight = config.workingRadius * 0.17;
      const cellColors = ['#F04438', '#F97316', '#F59E0B', '#F59E0B', '#F97316', '#F04438'];

      cellColors.forEach((color, index) => {
        const east = (index - 2.5) * cellWidth;
        const north = -config.workingRadius * 0.49;
        const bounds: L.LatLngBoundsExpression = [
          metersToLatLng(north - cellHeight / 2, east - cellWidth / 2),
          metersToLatLng(north + cellHeight / 2, east + cellWidth / 2),
        ];
        simulationOverlay.addLayer(L.rectangle(bounds, {
          color,
          weight: 1,
          opacity: 0.65,
          fillColor: color,
          fillOpacity: 0.42,
          interactive: false,
        }));
      });
    }

    if (corridorGroup) {
      corridorGroup.clearLayers();

      if (config.useMockData) {
        for (let row = 0; row < SIMULATION_GRID_SIZE; row++) {
          const points: L.LatLngTuple[] = [];
          for (let col = 0; col < SIMULATION_GRID_SIZE; col++) {
            const point = getGridNodeLatLng({ row, col }, config.latitude, config.longitude, config.workingRadius);
            points.push(point);
            corridorGroup.addLayer(L.circleMarker(point, {
              radius: 1.5, color: '#475569', weight: 1, fillColor: '#E2E8F0', fillOpacity: 0.75, interactive: false,
            }));
          }
          corridorGroup.addLayer(L.polyline(points, {
            color: '#64748B', weight: 1, opacity: 0.32, dashArray: '3, 6', interactive: false,
          }));
        }

        for (let col = 0; col < SIMULATION_GRID_SIZE; col++) {
          const points: L.LatLngTuple[] = [];
          for (let row = 0; row < SIMULATION_GRID_SIZE; row++) {
            points.push(getGridNodeLatLng({ row, col }, config.latitude, config.longitude, config.workingRadius));
          }
          corridorGroup.addLayer(L.polyline(points, {
            color: '#64748B', weight: 1, opacity: 0.32, dashArray: '3, 6', interactive: false,
          }));
        }
      }
    }
  }, [config.latitude, config.longitude, config.workingRadius, config.siteName, config.useMockData]);

  // 3. Update Helmet Flag Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentMarkerIds = new Set(Object.keys(markersRef.current));
    const helmetList = Object.values(helmets);

    for (const helmet of helmetList) {
      if (!helmet.hasValidGps) continue;

      const isSelected = helmet.id === selectedHelmetId;
      const isDroneDetected = drone?.detectedHelmetIds.includes(helmet.id) ?? false;
      const icon = createHelmetFlagIcon(helmet, isSelected, isDroneDetected);
      const position: L.LatLngTuple = [helmet.latitude, helmet.longitude];
      const colors = getStatusColor(helmet.status);
      const statusLabel = getStatusLabel(helmet.status);

      // Clean GIS popup HTML
      const popupHtml = `
        <div style="padding: 10px 12px; font-family: Inter, system-ui, sans-serif; font-size: 12px; min-width: 170px;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px; margin-bottom: 6px;">
            <div style="font-weight: 700; color: #1F2937; font-size: 13px;">${helmet.id}</div>
            <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; background: ${colors.bgHex}; color: ${colors.hex}; border: 1px solid ${colors.hex}30;">
              ${statusLabel}
            </span>
          </div>
          <div style="color: #64748B; font-size: 11px; margin-bottom: 4px;">
            ESP: <strong style="color: #1F2937;">${helmet.espId || helmet.id}</strong>
          </div>
          <div style="color: #64748B; font-size: 11px; margin-bottom: 4px;">
            Signal: <strong style="color: ${colors.hex}; font-family: monospace;">${helmet.signalStrength} dBm</strong> (${helmet.signalPercentage}%)
          </div>
          <div style="color: #64748B; font-size: 11px; margin-bottom: 4px;">
            Lat: ${helmet.latitude.toFixed(4)}° | Lng: ${helmet.longitude.toFixed(4)}°
          </div>
          <div style="color: #94A3B8; font-size: 10px; margin-top: 6px; border-top: 1px solid #F1F5F9; padding-top: 4px;">
            Last update: ${formatTimeAgo(helmet.lastSeenMs)}
          </div>
        </div>
      `;

      if (markersRef.current[helmet.id]) {
        const marker = markersRef.current[helmet.id];
        marker.setLatLng(position);
        marker.setIcon(icon);
        marker.setZIndexOffset(isSelected ? 1000 : 100);
        marker.setPopupContent(popupHtml);
      } else {
        const marker = L.marker(position, {
          icon,
          zIndexOffset: isSelected ? 1000 : 100,
        }).addTo(map);

        marker.bindPopup(popupHtml, { closeButton: false, offset: [10, -20] });

        marker.on('click', () => {
          onSelectHelmet(helmet.id);
        });

        markersRef.current[helmet.id] = marker;
      }

      currentMarkerIds.delete(helmet.id);
    }

    // Remove obsolete markers
    for (const staleId of currentMarkerIds) {
      markersRef.current[staleId].remove();
      delete markersRef.current[staleId];
    }
  }, [helmets, selectedHelmetId, onSelectHelmet, drone?.detectedHelmetIds]);

  // 4. Update Movement Trails
  useEffect(() => {
    const group = trailsLayerGroupRef.current;
    if (!group) return;

    group.clearLayers();

    if (!config.showTrails) return;

    for (const [helmetId, trail] of Object.entries(trails)) {
      if (!trail || trail.length < 2) continue;

      const latLngs: L.LatLngTuple[] = trail.map((p) => [p.latitude, p.longitude]);
      const helmet = helmets[helmetId];
      const isSelected = helmetId === selectedHelmetId;
      const baseColor = helmet ? getStatusColor(helmet.status).hex : '#2563EB';

      const polyline = L.polyline(latLngs, {
        color: baseColor,
        weight: isSelected ? 3 : 2,
        opacity: isSelected ? 0.85 : 0.55,
      });

      group.addLayer(polyline);
    }
  }, [trails, selectedHelmetId, helmets, config.showTrails]);

  // 5. Update Two-Helmet Proximity Connection Lines & Distance Badges
  useEffect(() => {
    const group = proximityLayerGroupRef.current;
    if (!group) return;

    group.clearLayers();

    for (const pair of proximityPairs) {
      const p1: L.LatLngTuple = [pair.lat1, pair.lng1];
      const p2: L.LatLngTuple = [pair.lat2, pair.lng2];

      // Subtle amber connection line between the two flags
      const line = L.polyline([p1, p2], {
        color: '#D97706', // Traffic-light amber
        weight: 2,
        dashArray: '5, 5',
        opacity: 0.9,
      });
      group.addLayer(line);

      // Midpoint badge showing distance in meters
      const midLat = (pair.lat1 + pair.lat2) / 2;
      const midLng = (pair.lng1 + pair.lng2) / 2;

      const distanceBadgeIcon = L.divIcon({
        className: 'proximity-distance-badge',
        html: `
          <div style="background: #FFFBEB; border: 1px solid #F59E0B; color: #B45309; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; font-family: monospace; white-space: nowrap; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transform: translate(-50%, -50%);">
            ⚠️ ${pair.distanceMeters.toFixed(1)} m
          </div>
        `,
        iconSize: [60, 20],
        iconAnchor: [30, 10],
      });

      const badgeMarker = L.marker([midLat, midLng], {
        icon: distanceBadgeIcon,
        interactive: false,
        zIndexOffset: 500,
      });
      group.addLayer(badgeMarker);
    }
  }, [proximityPairs]);

  // 6. Render the drone's grid scan, live radio link, and last simulated location fix.
  useEffect(() => {
    const group = droneLayerGroupRef.current;
    const map = mapInstanceRef.current;
    if (!group || !map) return;

    group.clearLayers();
    if (!config.useMockData || !drone) {
      if (droneAnimationFrameRef.current !== null) {
        cancelAnimationFrame(droneAnimationFrameRef.current);
        droneAnimationFrameRef.current = null;
      }
      droneMarkerRef.current?.remove();
      droneMarkerRef.current = null;
      droneHeadingRef.current = null;
      return;
    }

    const scanRoute = getDroneScanRoute().map((node) =>
      getGridNodeLatLng(node, config.latitude, config.longitude, config.workingRadius)
    );

    const completedRoute = scanRoute.slice(0, drone.scanIndex + 1);
    completedRoute.push([drone.latitude, drone.longitude]);
    if (completedRoute.length > 1) {
      group.addLayer(L.polyline(completedRoute, {
        color: '#0284C7',
        weight: 3,
        opacity: 0.8,
        dashArray: '6, 6',
        interactive: false,
      }));
    }

    const scanRadius = Math.max(100, Math.min(180, config.workingRadius * 0.32));
    group.addLayer(L.circle([drone.latitude, drone.longitude], {
      radius: scanRadius,
      color: '#38BDF8',
      weight: 1.5,
      opacity: 0.65,
      fillColor: '#38BDF8',
      fillOpacity: 0.08,
      dashArray: '4, 5',
      interactive: false,
    }));

    const linkedHelmet = drone.linkedHelmetId ? helmets[drone.linkedHelmetId] : null;
    if (linkedHelmet) {
      group.addLayer(L.polyline([
        [drone.latitude, drone.longitude],
        [linkedHelmet.latitude, linkedHelmet.longitude],
      ], { color: '#00D084', weight: 2.5, opacity: 0.95, dashArray: '5, 5', interactive: false }));
    }

    if (drone.lastDetection) {
      group.addLayer(L.circleMarker([drone.lastDetection.latitude, drone.lastDetection.longitude], {
        radius: 10,
        color: '#F04438',
        weight: 2,
        fillColor: '#F04438',
        fillOpacity: 0.2,
        interactive: false,
      }));

    }

    const droneIcon = L.divIcon({
      className: 'drone-map-marker',
      html: `<div style="position:relative;width:52px;height:52px;display:flex;align-items:center;justify-content:center"><div style="width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#101923;border:2px solid #38BDF8;box-shadow:0 0 0 5px rgba(56,189,248,.18),0 3px 12px rgba(0,0,0,.45)"><svg width="25" height="25" viewBox="0 0 24 24" fill="#7DD3FC" style="transform:rotate(${drone.heading}deg)"><path d="M12 2.5c.8 0 1.4.7 1.4 1.5v6.4l6.1 3.7v1.7l-6.1-1.8v4.2l2.2 1.4v1.3l-3.6-.8-3.6.8v-1.3l2.2-1.4V14l-6.1 1.8v-1.7l6.1-3.7V4c0-.8.6-1.5 1.4-1.5z"/></svg></div><span style="position:absolute;bottom:-1px;padding:1px 4px;border-radius:3px;background:#082F49;color:#BAE6FD;font:700 8px monospace;letter-spacing:.5px">DRONE</span></div>`,
      iconSize: [52, 52],
      iconAnchor: [26, 26],
    });
    if (!droneMarkerRef.current) {
      droneMarkerRef.current = L.marker([drone.latitude, drone.longitude], {
        icon: droneIcon,
        zIndexOffset: 1200,
        interactive: false,
      }).addTo(map);
      droneHeadingRef.current = drone.heading;
    } else {
      const marker = droneMarkerRef.current;
      if (droneHeadingRef.current !== drone.heading) {
        marker.setIcon(droneIcon);
        droneHeadingRef.current = drone.heading;
      }
      const markerElement = marker.getElement();
      if (markerElement) {
        const duration = Math.max(250, Math.min(config.pollingInterval * 0.9, 900));
        markerElement.style.transition = `transform ${duration}ms linear`;
      }
      marker.setLatLng([drone.latitude, drone.longitude]);
    }
  }, [config.useMockData, config.latitude, config.longitude, config.workingRadius, config.pollingInterval, drone, helmets]);

  // Pan to selected helmet
  useEffect(() => {
    if (!selectedHelmetId || !mapInstanceRef.current) return;
    const target = helmets[selectedHelmetId];
    if (target && target.hasValidGps) {
      mapInstanceRef.current.panTo([target.latitude, target.longitude], {
        animate: true,
        duration: 0.5,
      });
    }
  }, [selectedHelmetId, helmets]);

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  const handleFitArea = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([config.latitude, config.longitude], 16, {
      animate: true,
    });
  };

  return (
    <div className={`relative w-full h-full overflow-hidden select-none ${config.useMockData ? 'bg-[#0D1117]' : 'bg-[#EBF0F5]'}`}>
      {/* Real OpenStreetMap Leaflet Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* LEFT FIELD CONSOLE */}
      <div className="absolute top-4 left-4 z-[400] w-[min(318px,calc(100%-2rem))] pointer-events-auto overflow-hidden rounded-[5px] border border-[#BCC9C5] bg-[#F8FAF8]/[0.97] text-[#1C2B2D] shadow-[0_8px_24px_rgba(22,39,38,0.18)]">
        <div className="flex h-1">
          <span className={`w-2/5 ${config.useMockData ? 'bg-[#32856E]' : 'bg-[#416E9C]'}`} />
          <span className="flex-1 bg-[#D7E0DC]" />
        </div>

        <div className="p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ring-[3px] ${config.useMockData ? 'bg-[#32856E] ring-[#32856E]/15' : 'bg-[#416E9C] ring-[#416E9C]/15'}`} />
              <span className="text-[9px] font-mono font-bold uppercase tracking-[0.12em] text-[#55706A]">
                {config.useMockData ? 'SIMULATION MAP' : 'MONITORING AREA'}
              </span>
            </div>
            {config.useMockData && (
              <span className="border border-[#CBD9D3] bg-white/70 px-1.5 py-0.5 text-[9px] font-mono font-bold text-[#386D5C]">
                {Object.keys(helmets).length} HELMETS
              </span>
            )}
          </div>

          <div className="truncate text-[14px] font-semibold leading-tight text-[#1C2B2D]">
            {config.siteName || 'Mining Sector'}
          </div>
          <div className="mt-1 font-mono text-[10px] text-[#687A77]">
            {formatTacticalCoordinate(config.latitude, config.longitude)}
            <span className="mx-1.5 text-[#A2B0AC]">/</span>
            RADIUS {config.workingRadius}m
          </div>
        </div>

        {config.useMockData && drone && (
          <div className="border-t border-[#C8D3CE] bg-[#EEF3F0]/80 px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center border border-[#C5D5D8] bg-white text-[#347887]">
                  <Plane className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-[10px] font-mono font-bold uppercase tracking-[0.08em] text-[#2C4F52]">Drone grid scan</div>
                  <div className="mt-0.5 text-[9px] font-mono text-[#74847F]">
                    {drone.scanComplete ? `SWEEP COMPLETE · NODE ${drone.scanNodeRow},${drone.scanNodeCol}` : `NODE ${drone.scanNodeRow},${drone.scanNodeCol} · ${Math.round(drone.scanProgress * 100)}%`}
                  </div>
                </div>
              </div>
              <span className="shrink-0 border border-[#CBD5D1] bg-[#FAFCFA] px-1.5 py-1 text-[9px] font-mono font-bold text-[#455A54]">
                {String(drone.scanIndex + 1).padStart(2, '0')} / {drone.scanTotal}
              </span>
            </div>

            <div className="mt-2 h-[3px] overflow-hidden bg-[#D7E0DC]">
              <div
                className="h-full bg-[#4A8C79] transition-[width] duration-300"
                style={{ width: `${Math.min(100, ((drone.scanIndex + drone.scanProgress) / drone.scanTotal) * 100)}%` }}
              />
            </div>

            <div className="mt-2.5 flex items-center gap-2 border-l-2 border-[#6F9D8D] pl-2 text-[10px] font-mono">
              <Radio className={`h-3.5 w-3.5 shrink-0 ${drone.linkedHelmetId ? 'text-[#32856E]' : 'text-[#879590]'}`} />
              <span className={drone.linkedHelmetId ? 'font-bold text-[#286B58]' : 'text-[#65736F]'}>
                {drone.linkedHelmetId ? `LINKED · ${drone.linkedHelmetId} · ${drone.linkDistanceMeters}m` : drone.scanComplete ? 'GRID SWEEP COMPLETE' : 'SCANNING FOR HELMET SIGNAL'}
              </span>
            </div>

            {drone.lastDetection && (
              <div className="mt-2.5 border-t border-dashed border-[#C7D1CD] pt-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase text-[#A8493E]">Flag raised · {drone.lastDetection.helmetId}</span>
                  <span className="text-[9px] font-mono text-[#687A77]">{drone.lastDetection.signalStrength} dBm</span>
                </div>
                <div className="mt-1 font-mono text-[10px] text-[#52645F]">
                  {formatTacticalCoordinate(drone.lastDetection.latitude, drone.lastDetection.longitude)}
                </div>
                <div className="mt-1 text-[9px] text-[#7B8985]">RF estimate {drone.lastDetection.confidence}% · verify on site</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* PROXIMITY ALERT FLOATING BANNER (When two helmets are within threshold) */}
      {proximityPairs.length > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] pointer-events-auto">
          <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-full px-4 py-1.5 shadow-md flex items-center gap-2 text-xs font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span>
              WORKERS NEARBY: {proximityPairs[0].helmetId1} ↔ {proximityPairs[0].helmetId2} · {proximityPairs[0].distanceMeters.toFixed(1)}m
            </span>
          </div>
        </div>
      )}

      {/* TOP-RIGHT MAP ACTION CONTROLS */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col items-center gap-1.5 pointer-events-auto">
        {/* Zoom In */}
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="w-8 h-8 rounded bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center shadow-map-btn transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Zoom Out */}
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="w-8 h-8 rounded bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center shadow-map-btn transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>

        {/* Fit Area */}
        <button
          onClick={handleFitArea}
          title="Fit Monitoring Area"
          className="w-8 h-8 rounded bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-blue-600 flex items-center justify-center shadow-map-btn transition-colors"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        {/* Locate Me */}
        {onLocateMe && (
          <button
            onClick={onLocateMe}
            title="Use My Current Location"
            className="w-8 h-8 rounded bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-blue-600 flex items-center justify-center shadow-map-btn transition-colors"
          >
            <Locate className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* BOTTOM-RIGHT COORDINATE / SCALE BAR */}
      <div className="absolute bottom-4 right-4 z-[400] pointer-events-none">
        <div className="bg-white/95 border border-slate-200 rounded px-2.5 py-1 text-[11px] font-mono text-slate-600 shadow-sm flex items-center gap-2">
          <span>{formatTacticalCoordinate(config.latitude, config.longitude)}</span>
          <span className="text-slate-300">|</span>
          <span>OpenStreetMap GIS</span>
        </div>
      </div>
    </div>
  );
};
