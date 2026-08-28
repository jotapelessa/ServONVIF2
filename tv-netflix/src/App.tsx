import React, { useState, useEffect, useCallback } from 'react';
import { 
  TabType, 
  Camera, 
  LprDetection, 
  SecurityEvent, 
  SystemHealth, 
  TVSettings 
} from './types';
import { 
  INITIAL_CAMERAS, 
  INITIAL_LPR_DETECTIONS, 
  INITIAL_EVENTS, 
  INITIAL_SYSTEM_HEALTH, 
  INITIAL_SETTINGS 
} from './data/mockData';
import { TopAppBar } from './components/TopAppBar';
import { HomeTab } from './components/HomeTab';
import { MosaicGridTab } from './components/MosaicGridTab';
import { LprCentralTab } from './components/LprCentralTab';
import { PlaybackTimelineTab } from './components/PlaybackTimelineTab';
import { TestLabTab } from './components/TestLabTab';
import { SystemHealthTab } from './components/SystemHealthTab';
import { SettingsTab } from './components/SettingsTab';
import { SpotlightFullscreenModal } from './components/SpotlightFullscreenModal';
import { PictureInPictureFloating } from './components/PictureInPictureFloating';
import { RemoteControlOverlay } from './components/RemoteControlOverlay';
import { AndroidCodeExporter } from './components/AndroidCodeExporter';
import { Camera as CameraIcon, CheckCircle2 } from 'lucide-react';
import { TvApiService } from './services/apiService';

export default function App() {
  // Navigation & State
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [cameras, setCameras] = useState<Camera[]>(INITIAL_CAMERAS);
  const [selectedCamera, setSelectedCamera] = useState<Camera>(INITIAL_CAMERAS[0]);
  const [lprDetections, setLprDetections] = useState<LprDetection[]>(INITIAL_LPR_DETECTIONS);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>(INITIAL_EVENTS);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>(INITIAL_SYSTEM_HEALTH);
  const [settings, setSettings] = useState<TVSettings>(INITIAL_SETTINGS);

  // Connect to live ServONVIF Backend
  useEffect(() => {
    async function loadLiveData() {
      try {
        const realCams = await TvApiService.fetchCameras();
        if (realCams.length > 0) {
          setCameras(realCams);
          setSelectedCamera((prev) => realCams.find((c) => c.id === prev.id) || realCams[0]);
        }
        const realLpr = await TvApiService.fetchLprDetections();
        if (realLpr.length > 0) setLprDetections(realLpr);
        const realEvts = await TvApiService.fetchEvents();
        if (realEvts.length > 0) setSecurityEvents(realEvts);
        const health = await TvApiService.fetchSystemHealth();
        setSystemHealth((prev) => ({ ...prev, ...health }));
      } catch (e) {
        console.warn('Backend polling notice:', e);
      }
    }
    loadLiveData();
    const interval = setInterval(loadLiveData, 8000);
    return () => clearInterval(interval);
  }, []);

  // Modals & Overlays
  const [fullscreenCamera, setFullscreenCamera] = useState<Camera | null>(null);
  const [pipCamera, setPipCamera] = useState<Camera | null>(null);
  const [showRemote, setShowRemote] = useState(false);
  const [showAndroidCode, setShowAndroidCode] = useState(false);
  const [snapshotToast, setSnapshotToast] = useState<{ visible: boolean; text: string }>({
    visible: false,
    text: '',
  });

  // D-pad Spatial Focus tracking
  const [focusedElementId, setFocusedElementId] = useState<string | null>('hero-btn-fullscreen');

  // Handle D-pad element focus
  const handleElementFocus = useCallback((id: string) => {
    setFocusedElementId(id);
  }, []);

  // Update Settings
  const handleUpdateSettings = (newSettings: Partial<TVSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    if (newSettings.pipEnabled !== undefined) {
      if (newSettings.pipEnabled) {
        setPipCamera(selectedCamera);
      } else {
        setPipCamera(null);
      }
    }
  };

  // Snapshot handler
  const handleTakeSnapshot = (cam: Camera) => {
    setSnapshotToast({
      visible: true,
      text: `Snapshot 5MP salvo: ${cam.name} (${new Date().toLocaleTimeString('pt-BR')})`,
    });
    setTimeout(() => {
      setSnapshotToast({ visible: false, text: '' });
    }, 3500);
  };

  // Add / Update Resident on LPR
  const handleAddOrUpdateOwner = (
    id: string,
    newOwner: string,
    newCategory: 'family' | 'visitor' | 'suspicious'
  ) => {
    setLprDetections((prev) => {
      const exists = prev.some((d) => d.id === id);
      if (exists) {
        return prev.map((d) =>
          d.id === id ? { ...d, ownerName: newOwner, category: newCategory } : d
        );
      }
      // Add new detection
      const newEntry: LprDetection = {
        id,
        plate: newOwner.split(' ')[0] || 'BRA2E19',
        plateType: 'mercosul',
        category: newCategory,
        vehicleType: 'Carro Cadastrado',
        model: newOwner,
        color: 'Prata',
        confidence: 99.1,
        timestamp: 'Recém Cadastrado',
        thumbnailUrl:
          'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
        ownerName: newOwner,
        cameraName: 'Garagem & Portão de Entrada',
        speedKmH: 15,
        accessStatus: newCategory === 'suspicious' ? 'blocked' : 'authorized',
      };
      return [newEntry, ...prev];
    });
  };

  // Auto-tour (Ronda Automática)
  useEffect(() => {
    if (!settings.autoTourActive) return;

    const interval = setInterval(() => {
      setSelectedCamera((prev) => {
        const idx = cameras.findIndex((c) => c.id === prev.id);
        const next = (idx + 1) % cameras.length;
        return cameras[next];
      });
    }, settings.autoTourInterval * 1000);

    return () => clearInterval(interval);
  }, [settings.autoTourActive, settings.autoTourInterval, cameras]);

  // Periodic Telemetry & Network Ping simulation
  const handleRefreshHealth = () => {
    const randomLatency = Math.floor(Math.random() * 6) + 6;
    setSystemHealth((prev) => ({
      ...prev,
      latencyMs: randomLatency,
      cpuUsage: Math.floor(Math.random() * 15) + 20,
    }));
  };

  // Clear cache action
  const handleClearCache = () => {
    setSystemHealth((prev) => ({
      ...prev,
      diskFreeGb: +(prev.diskFreeGb + 1.4).toFixed(1),
    }));
  };

  // D-pad Remote Control Actions (Leanback Navigation)
  const handleDpadUp = () => {
    const focusableElements = Array.from(
      document.querySelectorAll<HTMLElement>(
        'button, [tabindex="0"], a, input'
      )
    ).filter((el) => el.offsetParent !== null && !el.hasAttribute('disabled'));

    if (focusableElements.length === 0) return;
    const currentIndex = focusableElements.findIndex(
      (el) => el.id === focusedElementId || el === document.activeElement
    );
    const prevIndex = (currentIndex - 1 + focusableElements.length) % focusableElements.length;
    const target = focusableElements[prevIndex];
    target.focus();
    if (target.id) setFocusedElementId(target.id);
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleDpadDown = () => {
    const focusableElements = Array.from(
      document.querySelectorAll<HTMLElement>(
        'button, [tabindex="0"], a, input'
      )
    ).filter((el) => el.offsetParent !== null && !el.hasAttribute('disabled'));

    if (focusableElements.length === 0) return;
    const currentIndex = focusableElements.findIndex(
      (el) => el.id === focusedElementId || el === document.activeElement
    );
    const nextIndex = (currentIndex + 1) % focusableElements.length;
    const target = focusableElements[nextIndex];
    target.focus();
    if (target.id) setFocusedElementId(target.id);
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleDpadLeft = () => {
    handleDpadUp();
  };

  const handleDpadRight = () => {
    handleDpadDown();
  };

  const handleDpadOk = () => {
    if (focusedElementId) {
      const el = document.getElementById(focusedElementId);
      if (el) {
        el.click();
      }
    }
  };

  const handleDpadBack = () => {
    if (fullscreenCamera) {
      setFullscreenCamera(null);
    } else if (activeTab !== 'home') {
      setActiveTab('home');
    }
  };

  const handleDpadHome = () => {
    if (fullscreenCamera) setFullscreenCamera(null);
    setActiveTab('home');
  };

  // Keyboard navigation binding (Arrow keys, Enter, Esc, 1-6)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user typing in text input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleDpadUp();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleDpadDown();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleDpadLeft();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleDpadRight();
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        handleDpadBack();
      } else if (e.key === '1') {
        setActiveTab('home');
      } else if (e.key === '2') {
        setActiveTab('mosaic');
      } else if (e.key === '3') {
        setActiveTab('lpr');
      } else if (e.key === '4') {
        setActiveTab('recordings');
      } else if (e.key === '5') {
        setActiveTab('testlab');
      } else if (e.key === '6') {
        setActiveTab('health');
      } else if (e.key === '7') {
        setActiveTab('settings');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedElementId, fullscreenCamera, activeTab]);

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black overflow-x-hidden">
      
      {/* 1. TOP APP BAR (Navigation, Clock, Route Status) */}
      <TopAppBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        systemHealth={systemHealth}
        onToggleRemote={() => setShowRemote(!showRemote)}
        onToggleAndroidCode={() => setShowAndroidCode(true)}
        focusedElementId={focusedElementId}
        onElementFocus={handleElementFocus}
      />

      {/* 2. MAIN ACTIVE TAB CONTENT */}
      <main className="flex-1 flex flex-col">
        {activeTab === 'home' && (
          <HomeTab
            cameras={cameras}
            selectedCamera={selectedCamera}
            onSelectCamera={setSelectedCamera}
            lprDetections={lprDetections}
            securityEvents={securityEvents}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onOpenFullscreen={(cam) => setFullscreenCamera(cam)}
            onOpenMosaic={() => setActiveTab('mosaic')}
            onTakeSnapshot={handleTakeSnapshot}
            onPlayRecording={(evt) => {
              const cam = cameras.find((c) => c.id === evt.cameraId) || selectedCamera;
              setSelectedCamera(cam);
              setActiveTab('recordings');
            }}
            onViewLprEvent={(lpr) => {
              setActiveTab('lpr');
            }}
            focusedElementId={focusedElementId}
            onElementFocus={handleElementFocus}
          />
        )}

        {activeTab === 'mosaic' && (
          <MosaicGridTab
            cameras={cameras}
            onOpenFullscreen={(cam) => setFullscreenCamera(cam)}
            focusedElementId={focusedElementId}
            onElementFocus={handleElementFocus}
            showScanlines={settings.showScanlines}
          />
        )}

        {activeTab === 'lpr' && (
          <LprCentralTab
            detections={lprDetections}
            onAddOrUpdateOwner={handleAddOrUpdateOwner}
            focusedElementId={focusedElementId}
            onElementFocus={handleElementFocus}
            onViewPlayback={(lpr) => {
              const cam = cameras.find((c) => c.name.includes(lpr.cameraName.split(' ')[0])) || selectedCamera;
              setSelectedCamera(cam);
              setActiveTab('recordings');
            }}
          />
        )}

        {activeTab === 'recordings' && (
          <PlaybackTimelineTab
            cameras={cameras}
            events={securityEvents}
            selectedCamera={selectedCamera}
            onSelectCamera={setSelectedCamera}
            focusedElementId={focusedElementId}
            onElementFocus={handleElementFocus}
            onOpenFullscreen={(cam) => setFullscreenCamera(cam)}
          />
        )}

        {activeTab === 'testlab' && (
          <TestLabTab
            cameras={cameras}
            systemHealth={systemHealth}
            onSimulateMotion={(camId) => {
              const cam = cameras.find((c) => c.id === camId) || selectedCamera;
              setSnapshotToast({
                visible: true,
                text: `🚨 Movimento Simulado: ${cam.name}`,
              });
              setTimeout(() => setSnapshotToast({ visible: false, text: '' }), 3500);
            }}
            onTriggerPiP={(cam) => setPipCamera(cam)}
            focusedElementId={focusedElementId}
            onElementFocus={handleElementFocus}
          />
        )}

        {activeTab === 'health' && (
          <SystemHealthTab
            health={systemHealth}
            onRefreshHealth={handleRefreshHealth}
            onClearCache={handleClearCache}
            focusedElementId={focusedElementId}
            onElementFocus={handleElementFocus}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            focusedElementId={focusedElementId}
            onElementFocus={handleElementFocus}
          />
        )}
      </main>

      {/* 3. MODAL: SPOTLIGHT FULLSCREEN 60HZ PLAYER */}
      {fullscreenCamera && (
        <SpotlightFullscreenModal
          camera={fullscreenCamera}
          onClose={() => setFullscreenCamera(null)}
          onOpenMosaic={() => {
            setFullscreenCamera(null);
            setActiveTab('mosaic');
          }}
          onTakeSnapshot={() => handleTakeSnapshot(fullscreenCamera)}
          showScanlines={settings.showScanlines}
        />
      )}

      {/* 4. FLOATING PICTURE-IN-PICTURE (PiP Android TV) */}
      {pipCamera && settings.pipEnabled && !fullscreenCamera && (
        <PictureInPictureFloating
          camera={pipCamera}
          onClose={() => setPipCamera(null)}
          onMaximize={(cam) => setFullscreenCamera(cam)}
        />
      )}

      {/* 5. VIRTUAL TV REMOTE SIMULATOR */}
      {showRemote && (
        <RemoteControlOverlay
          onDpadUp={handleDpadUp}
          onDpadDown={handleDpadDown}
          onDpadLeft={handleDpadLeft}
          onDpadRight={handleDpadRight}
          onDpadOk={handleDpadOk}
          onDpadBack={handleDpadBack}
          onDpadHome={handleDpadHome}
          onClose={() => setShowRemote(false)}
        />
      )}

      {/* 6. ANDROID TV CODE & ARCHITECTURE EXPORTER */}
      {showAndroidCode && (
        <AndroidCodeExporter onClose={() => setShowAndroidCode(false)} />
      )}

      {/* 7. SNAPSHOT TOAST NOTIFICATION */}
      {snapshotToast.visible && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl bg-emerald-950/95 border-2 border-emerald-400 text-emerald-200 font-bold text-sm shadow-[0_0_30px_rgba(52,211,153,0.5)] flex items-center gap-2.5 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{snapshotToast.text}</span>
        </div>
      )}

      {/* 8. FLOATING FROSTED HUD TELEMETRY PILL */}
      {!fullscreenCamera && (
        <div className="fixed bottom-6 right-8 flex items-center gap-4 z-30 pointer-events-none select-none">
          <div className="flex items-center gap-4 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-full px-5 py-2.5 shadow-2xl">
            <div className="flex flex-col text-right">
              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest font-mono">NVR Storage</span>
              <span className="text-xs font-bold text-white font-mono">{systemHealth.diskFreeGb} GB LIVRES</span>
            </div>
            <div className="w-[1px] h-6 bg-white/10" />
            <div className="flex flex-col text-right">
              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest font-mono">Server Uptime</span>
              <span className="text-xs font-bold text-white font-mono">{systemHealth.uptime}</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
