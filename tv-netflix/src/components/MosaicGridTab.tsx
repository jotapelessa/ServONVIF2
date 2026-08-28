import React, { useState, useEffect } from 'react';
import { LayoutGrid, Grid, Square, RotateCw, Maximize2, ShieldAlert, WifiOff, Volume2, Sparkles, Tv } from 'lucide-react';
import { Camera } from '../types';
import { CameraCanvasFeed } from './CameraCanvasFeed';

interface MosaicGridTabProps {
  cameras: Camera[];
  onOpenFullscreen: (cam: Camera) => void;
  focusedElementId: string | null;
  onElementFocus: (id: string) => void;
  showScanlines?: boolean;
}

type GridLayout = '1x1' | '2x2' | '3x3';

export const MosaicGridTab: React.FC<MosaicGridTabProps> = ({
  cameras,
  onOpenFullscreen,
  focusedElementId,
  onElementFocus,
  showScanlines = false,
}) => {
  const [layout, setLayout] = useState<GridLayout>('2x2');
  const [isPatrolCycleActive, setIsPatrolCycleActive] = useState(false);
  const [activePageIndex, setActivePageIndex] = useState(0);

  // Auto-tour cycle for mosaic
  useEffect(() => {
    if (!isPatrolCycleActive || cameras.length === 0) return;
    const interval = setInterval(() => {
      setActivePageIndex((prev) => (prev + 1) % Math.max(1, Math.ceil(cameras.length / (layout === '2x2' ? 4 : 9))));
    }, 8000);
    return () => clearInterval(interval);
  }, [isPatrolCycleActive, cameras.length, layout]);

  // Determine cameras to show based on layout
  const getDisplayedCameras = (): (Camera | null)[] => {
    if (cameras.length === 0) return [];
    if (layout === '1x1') {
      return [cameras[activePageIndex % cameras.length]];
    }
    if (layout === '2x2') {
      const targetCount = 4;
      const start = (activePageIndex * targetCount) % Math.max(1, cameras.length);
      const slice = cameras.slice(start, start + targetCount);
      const result: (Camera | null)[] = [...slice];
      while (result.length < targetCount && result.length < cameras.length) {
        result.push(cameras[result.length % cameras.length]);
      }
      return result;
    }
    // 3x3 layout
    return cameras.slice(0, 9);
  };

  const displayedCameras = getDisplayedCameras();

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-80px)] p-4 sm:p-6 md:p-10 select-none pb-24">
      
      {/* Grid Toolbar Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-glass-card p-3 sm:p-4 rounded-2xl border border-glass">
        
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,210,255,0.3)]">
            <Grid className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-bold text-slate-100">Mosaico Multitelas</h1>
            <p className="text-xs text-slate-400 hidden sm:block">Visualização simultânea com decodificação contínua</p>
          </div>
        </div>

        {/* Layout Buttons (1x1, 2x2, 3x3) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          
          {/* Button 1x1 */}
          <button
            id="mosaic-btn-1x1"
            onClick={() => setLayout('1x1')}
            onFocus={() => onElementFocus('mosaic-btn-1x1')}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer tv-focus-target ${
              layout === '1x1'
                ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(0,210,255,0.5)]'
                : 'bg-[#0D1424] text-slate-300 border border-[#1E2D4A] hover:bg-[#131D33]'
            } ${focusedElementId === 'mosaic-btn-1x1' ? 'tv-focused' : ''}`}
          >
            <Square className="w-3.5 h-3.5" />
            <span>1x1</span>
          </button>

          {/* Button 2x2 */}
          <button
            id="mosaic-btn-2x2"
            onClick={() => setLayout('2x2')}
            onFocus={() => onElementFocus('mosaic-btn-2x2')}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer tv-focus-target ${
              layout === '2x2'
                ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(0,210,255,0.5)]'
                : 'bg-[#0D1424] text-slate-300 border border-[#1E2D4A] hover:bg-[#131D33]'
            } ${focusedElementId === 'mosaic-btn-2x2' ? 'tv-focused' : ''}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>2x2 Mosaico</span>
          </button>

          {/* Button 3x3 */}
          <button
            id="mosaic-btn-3x3"
            onClick={() => setLayout('3x3')}
            onFocus={() => onElementFocus('mosaic-btn-3x3')}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer tv-focus-target ${
              layout === '3x3'
                ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(0,210,255,0.5)]'
                : 'bg-[#0D1424] text-slate-300 border border-[#1E2D4A] hover:bg-[#131D33]'
            } ${focusedElementId === 'mosaic-btn-3x3' ? 'tv-focused' : ''}`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>3x3 Painel</span>
          </button>

        </div>

      </div>

      {/* Cameras Grid or Empty State */}
      {cameras.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 rounded-3xl bg-[#131D33]/40 border border-[#1E2D4A]/60 text-center gap-3">
          <div className="p-4 rounded-2xl bg-[#007AFF]/10 border border-[#00D2FF]/30 text-[#00D2FF]">
            <Tv className="w-8 h-8 animate-pulse" />
          </div>
          <h3 className="text-xl font-bold text-white">Nenhuma Câmera Disponível no Mosaico</h3>
          <p className="text-sm text-slate-400 max-w-md">
            Conecte câmeras ONVIF ou RTSP no painel de administração do ServONVIF para visualizá-las simultaneamente aqui.
          </p>
        </div>
      ) : (
        <div className={`grid gap-4 flex-1 ${
          layout === '1x1' ? 'grid-cols-1' : layout === '2x2' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        }`}>
          {displayedCameras.map((cam, idx) => {
            if (!cam) return null;
            const elementId = `mosaic-card-${cam.id}-${idx}`;
            const isFocused = focusedElementId === elementId;

            return (
              <div
                key={`${cam.id}-${idx}`}
                id={elementId}
                tabIndex={0}
                onFocus={() => onElementFocus(elementId)}
                onClick={() => onOpenFullscreen(cam)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenFullscreen(cam);
                  }
                }}
                className={`relative aspect-video rounded-2xl overflow-hidden bg-black border cursor-pointer transition-all duration-200 tv-focus-target ${
                  isFocused ? 'tv-focused ring-4 ring-cyan-400 z-20' : 'border-[#1E2D4A] hover:border-slate-500'
                }`}
              >
                <CameraCanvasFeed camera={cam} showScanlines={showScanlines} showOsd={true} />
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
