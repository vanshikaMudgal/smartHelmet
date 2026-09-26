import React, { useState } from 'react';
import { useSiteConfig } from './hooks/useSiteConfig';
import { useMonitoring } from './hooks/useMonitoring';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { LiveMap } from './components/map/LiveMap';
import { HelmetDetailPanel } from './components/details/HelmetDetailPanel';

export const App: React.FC = () => {
  const { config, updateConfig } = useSiteConfig();

  const {
    helmets,
    drone,
    helmetList,
    trails,
    proximityPairs,
    metrics,
    lastTickMs,
    isBackendConnected,
    backendError,
    selectedHelmetId,
    selectedHelmet,
    setSelectedHelmetId,
    resetSimulation,
  } = useMonitoring(config);

  const handleSelectHelmet = (id: string | null) => {
    setSelectedHelmetId(id);
  };

  const handleUpdateSiteArea = (lat: number, lng: number, radius: number) => {
    updateConfig({
      latitude: lat,
      longitude: lng,
      workingRadius: radius,
    });
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(5));
        const lng = parseFloat(pos.coords.longitude.toFixed(5));
        updateConfig({
          latitude: lat,
          longitude: lng,
        });
      },
      (err) => {
        alert(`Location access error: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#F5F7FA] text-slate-800 font-sans">
      {/* 1. TOP BAR */}
      <Header
        config={config}
        onUpdateConfig={updateConfig}
        onResetSimulation={resetSimulation}
        isBackendConnected={isBackendConnected}
        backendError={backendError}
        lastTickMs={lastTickMs}
      />

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar */}
        <Sidebar
          config={config}
          onUpdateSiteArea={handleUpdateSiteArea}
          onUseCurrentLocation={handleUseCurrentLocation}
          metrics={metrics}
          helmets={helmetList}
          proximityPairs={proximityPairs}
          selectedHelmetId={selectedHelmetId}
          onSelectHelmet={handleSelectHelmet}
        />

        {/* Map Canvas */}
        <main className="flex-1 h-full relative">
          <LiveMap
            config={config}
            helmets={helmets}
            drone={drone}
            trails={trails}
            proximityPairs={proximityPairs}
            selectedHelmetId={selectedHelmetId}
            onSelectHelmet={handleSelectHelmet}
            onLocateMe={handleUseCurrentLocation}
          />

          {/* Slide-over Right Detail Panel */}
          <HelmetDetailPanel
            helmet={selectedHelmet}
            onClose={() => setSelectedHelmetId(null)}
          />
        </main>
      </div>
    </div>
  );
};

export default App;
