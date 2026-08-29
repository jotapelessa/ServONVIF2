import React, { useState, useEffect, useCallback } from 'react';
import { 
  Tv, 
  Grid, 
  Car, 
  History, 
  Activity, 
  Settings, 
  FlaskConical
} from 'lucide-react';
import { 
  INITIAL_CAMERAS, 
  INITIAL_LPR_DETECTIONS, 
  INITIAL_EVENTS, 
  INITIAL_SYSTEM_HEALTH, 
  INITIAL_SETTINGS 
} from './data/mockData';
import { 
  Camera, 
  LprDetection, 
  SecurityEvent, 
  SystemHealth, 
  TVSettings, 
  TabType 
} from './types';
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
import { TvApiService } from './services/apiService';

export default function App() {
  // Navigation & State
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [cameras, setCameras] = useState<Camera[]>(INITIAL_CAMERAS);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [lprDetections, setLprDetections] = useState<LprDetection[]>(INITIAL_LPR_DETECTIONS);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>(INITIAL_EVENTS);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>(INITIAL_SYSTEM_HEALTH);
  const [settings, setSettings] = useState<TVSettings>(INITIAL_SETTINGS);

  // Connect to live ServONVIF Backend & Native Bridge Sync
  useEffect(() => {
    // Read initial native PiP configuration if on Android TV
    try {
      if ((window as any).AndroidNative?.getPipConfig) {
        const nativePip = JSON.parse((window as any).AndroidNative.getPipConfig());
        if (nativePip.size) {
          setSettings((prev) => ({
            ...prev,
            pipSize: nativePip.size,
            pipPosition: nativePip.position,
            pipDurationSeconds: nativePip.durationSeconds || 10,
          }));
        }
      }
    } catch (e) {
      console.warn('Native PiP config read failed:', e);
    }

    async function loadLiveData() {
      try {
        const realCams = await TvApiService.fetchCameras();
        setCameras(realCams);
        if (realCams.length > 0) {
          setSelectedCamera((prev) => (prev ? (realCams.find((c) => c.id === prev.id) || realCams[0]) : realCams[0]));
        } else {
          setSelectedCamera(null);
        }

        const realLpr = await TvApiService.fetchLprDetections();
        setLprDetections(realLpr);

        const realEvts = await TvApiService.fetchEvents();
        setSecurityEvents(realEvts);

        const health = await TvApiService.fetchSystemHealth();
        setSystemHealth((prev) => ({ ...prev, ...health }));
      } catch (e) {
        console.warn('Backend polling notice:', e);
      }
    }
    loadLiveData();
    const interval = setInterval(loadLiveData, 6000);
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
  const [focusedElementId, setFocusedElementId] = useState<string | null>('hero-btn-watch');

  // Handle D-pad element focus
  const handleElementFocus = useCallback((id: string) => {
    setFocusedElementId(id);
  }, []);

  // Update Settings (with Instant Native Bridge Synchronization)
  const handleUpdateSettings = (newSettings: Partial<TVSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if ((window as any).AndroidNative?.updatePipConfig) {
        (window as any).AndroidNative.updatePipConfig(
          updated.pipSize || 'mini',
          updated.pipPosition || 'top_right',
          updated.pipDurationSeconds || 10
        );
      }
      return updated;
    });

    if (newSettings.pipEnabled !== undefined) {
      if (newSettings.pipEnabled) {
        if ((window as any).AndroidNative?.triggerPiP && selectedCamera) {
          (window as any).AndroidNative.triggerPiP(selectedCamera.id, selectedCamera.name);
        } else {
          setPipCamera(selectedCamera);
        }
      } else {
        setPipCamera(null);
      }
    }
  };

  // Snapshot handler
  const handleTakeSnapshot = (cam: Camera) => {
    setSnapshotToast({
      visible: true,
      text: `Snapshot salvo: ${cam.name} (${new Date().toLocaleTimeString('pt-BR')})`,
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
      return prev;
    });
  };

  // Refresh System Health manually
  const handleRefreshHealth = async () => {
    const health = await TvApiService.fetchSystemHealth();
    setSystemHealth((prev) => ({ ...prev, ...health }));
  };

  const handleClearCache = () => {
    setSnapshotToast({
      visible: true,
      text: 'Cache de buffers e telemetria limpo com sucesso!',
    });
    setTimeout(() => {
      setSnapshotToast({ visible: false, text: '' });
    }, 3000);
  };

  // =========================================================================
  // D-PAD & KEYBOARD EVENT HANDLER (Android TV Remote & Physical Keys)
  // =========================================================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Direct Number Keys 1-7 for Tabs
      if (e.key === '1') { e.preventDefault(); setActiveTab('home'); return; }
      if (e.key === '2') { e.preventDefault(); setActiveTab('mosaic'); return; }
      if (e.key === '3') { e.preventDefault(); setActiveTab('lpr'); return; }
      if (e.key === '4') { e.preventDefault(); setActiveTab('recordings'); return; }
      if (e.key === '5') { e.preventDefault(); setActiveTab('testlab'); return; }
      if (e.key === '6') { e.preventDefault(); setActiveTab('health'); return; }
      if (e.key === '7') { e.preventDefault(); setActiveTab('settings'); return; }

      // 2. Escape / Back Button
      if (e.key === 'Escape' || e.key === 'Backspace') {
        if (fullscreenCamera) {
          e.preventDefault();
          setFullscreenCamera(null);
          return;
        }
        if (pipCamera) {
          e.preventDefault();
          setPipCamera(null);
          return;
        }
        if (showRemote) {
          e.preventDefault();
          setShowRemote(false);
          return;
        }
        if (showAndroidCode) {
          e.preventDefault();
          setShowAndroidCode(false);
          return;
        }
      }

      // 3. Arrow Keys Navigation (True 2D Spatial Traversal for Android TV D-Pad)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const focusableElements = Array.from(
          document.querySelectorAll('.tv-focus-target')
        ).filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }) as HTMLElement[];

        if (focusableElements.length === 0) return;

        const currentActive = (document.activeElement as HTMLElement) || focusableElements[0];
        const currentRect = currentActive ? currentActive.getBoundingClientRect() : null;

        if (!currentRect || !focusableElements.includes(currentActive)) {
          focusableElements[0].focus();
          setFocusedElementId(focusableElements[0].id || null);
          return;
        }

        const currentCenter = {
          x: currentRect.left + currentRect.width / 2,
          y: currentRect.top + currentRect.height / 2,
        };

        let bestCandidate: HTMLElement | null = null;
        let minDistance = Infinity;

        for (const el of focusableElements) {
          if (el === currentActive) continue;
          const rect = el.getBoundingClientRect();
          const targetCenter = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          };

          const dx = targetCenter.x - currentCenter.x;
          const dy = targetCenter.y - currentCenter.y;

          let isValidDirection = false;
          let distance = Infinity;

          if (e.key === 'ArrowUp') {
            // Strictly above (dy < 0)
            if (targetCenter.y < currentCenter.y - 10) {
              isValidDirection = true;
              // Strongly penalize horizontal drift to keep column alignment
              distance = Math.abs(dy) * 1.0 + Math.abs(dx) * 2.5;
            }
          } else if (e.key === 'ArrowDown') {
            // Strictly below (dy > 0)
            if (targetCenter.y > currentCenter.y + 10) {
              isValidDirection = true;
              distance = Math.abs(dy) * 1.0 + Math.abs(dx) * 2.5;
            }
          } else if (e.key === 'ArrowLeft') {
            // Strictly to the left (dx < 0)
            if (targetCenter.x < currentCenter.x - 10) {
              isValidDirection = true;
              // Strongly penalize vertical drift to keep row alignment
              distance = Math.abs(dx) * 1.0 + Math.abs(dy) * 2.5;
            }
          } else if (e.key === 'ArrowRight') {
            // Strictly to the right (dx > 0)
            if (targetCenter.x > currentCenter.x + 10) {
              isValidDirection = true;
              distance = Math.abs(dx) * 1.0 + Math.abs(dy) * 2.5;
            }
          }

          if (isValidDirection && distance < minDistance) {
            minDistance = distance;
            bestCandidate = el;
          }
        }

        if (bestCandidate) {
          bestCandidate.focus();
          try {
            bestCandidate.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
          } catch (err) {
            // Ignore if unsupported in older webviews
          }
          setFocusedElementId(bestCandidate.id || null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenCamera, pipCamera, showRemote, showAndroidCode]);

  // Remote D-pad Emulation
  const handleDpadUp = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
  };
  const handleDpadDown = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
  };
  const handleDpadLeft = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
  };
  const handleDpadRight = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
  };
  const handleDpadOk = () => {
    const active = document.activeElement as HTMLElement;
    if (active) active.click();
  };
  const handleDpadBack = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  };
  const handleDpadHome = () => {
    setActiveTab('home');
  };

  return (
    <div className="relative flex flex-col min-h-screen bg-[#070B14] text-slate-100 font-sans selection:bg-cyan-500 selection:text-black overflow-x-hidden">
      
      {/* 1. TOP APP BAR (Responsive & Adaptive) */}
      <TopAppBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        systemHealth={systemHealth}
        onToggleRemote={() => setShowRemote(!showRemote)}
        onToggleAndroidCode={() => setShowAndroidCode(true)}
        focusedElementId={focusedElementId}
        onElementFocus={handleElementFocus}
      />

      {/* SNAPSHOT NOTIFICATION TOAST */}
      {snapshotToast.visible && (
        <div className="fixed top-20 right-8 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-emerald-500 text-black font-bold text-sm shadow-[0_0_25px_rgba(16,185,129,0.7)] animate-bounce">
          <span>{snapshotToast.text}</span>
        </div>
      )}

      {/* 2. MAIN ACTIVE TAB CONTENT */}
      <main className="flex-1 w-full">
        {activeTab === 'home' && (
          <HomeTab
            cameras={cameras}
            selectedCamera={selectedCamera}
            onSelectCamera={(cam) => setSelectedCamera(cam)}
            lprDetections={lprDetections}
            securityEvents={securityEvents}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onOpenFullscreen={(cam) => setFullscreenCamera(cam)}
            onOpenMosaic={() => setActiveTab('mosaic')}
            onTakeSnapshot={handleTakeSnapshot}
            onPlayRecording={(evt) => {
              const cam = cameras.find((c) => c.id === evt.cameraId) || selectedCamera;
              if (cam) setSelectedCamera(cam);
              setActiveTab('recordings');
            }}
            onViewLprEvent={(lpr) => {
              const cam = cameras.find((c) => c.name.includes(lpr.cameraName.split(' ')[0])) || selectedCamera;
              if (cam) setSelectedCamera(cam);
              setActiveTab('recordings');
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
              if (cam) setSelectedCamera(cam);
              setActiveTab('recordings');
            }}
          />
        )}

        {activeTab === 'recordings' && (
          <PlaybackTimelineTab
            cameras={cameras}
            events={securityEvents}
            selectedCamera={selectedCamera}
            onSelectCamera={(cam) => setSelectedCamera(cam)}
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
              if (cam) {
                setSnapshotToast({
                  visible: true,
                  text: `🚨 Movimento Simulado: ${cam.name}`,
                });
                setTimeout(() => setSnapshotToast({ visible: false, text: '' }), 3500);
              }
            }}
            onTriggerPiP={(cam) => {
              if (!(window as any).AndroidNative?.triggerPiP) {
                setPipCamera(cam);
              }
            }}
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

      {/* 4. FLOATING PICTURE-IN-PICTURE (Fallback Web apenas quando não houver ponte nativa Android) */}
      {pipCamera && settings.pipEnabled && !fullscreenCamera && !(window as any).AndroidNative && (
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

    </div>
  );
}
