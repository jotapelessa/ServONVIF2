import React, { useState, useEffect } from 'react';
import { LayoutGrid, Grid, Square, RotateCw, Maximize2, ShieldAlert, WifiOff, Volume2, Sparkles } from 'lucide-react';
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
    if (!isPatrolCycleActive) return;
    const interval = setInterval(() => {
      setActivePageIndex((prev) => (prev + 1) % Math.ceil(cameras.length / (layout === '2x2' ? 4 : 9)));
    }, 8000);
    return () => clearInterval(interval);
  }, [isPatrolCycleActive, cameras.length, layout]);

  // Determine cameras to show based on layout
  const getDisplayedCameras = () => {
    if (layout === '1x1') {
      return [cameras[activePageIndex % cameras.length]];
    }
    if (layout === '2x2') {
      const start = (activePageIndex * 4) % cameras.length;
      const slice = cameras.slice(start, start + 4);
      if (slice.length < 4) {
        return [...slice, ...cameras.slice(0, 4 - slice.length)];
      }
      return slice;
    }
    // 3x3 layout
    return cameras;
  };

  const displayedCameras = getDisplayedCameras();

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-80px)] p-6 md:p-10 select-none pb-24">
      
      {/* Grid Toolbar Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-glass-card p-4 rounded-2xl border border-glass">
        
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,210,255,0.3)]">
            <Grid className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Mosaico Multitelas de Alta Resolução</h1>
            <p className="text-xs text-slate-400">Visualização simultânea contínua com telemetria RTSP e detecção de intrusão</p>
          </div>
        </div>

        {/* Layout Buttons (1x1, 2x2, 3x3, Ronda) */}
        <div className="flex items-center gap-2">
          
          {/* Button 1x1 */}
          <button
            id="mosaic-btn-1x1"
            onClick={() => setLayout('1x1')}
            onFocus={() => onElementFocus('mosaic-btn-1x1')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer tv-focus-target ${
              layout === '1x1'
                ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(0,210,255,0.5)]'
                : 'bg-[#0D1424] text-slate-300 border border-[#1E2D4A] hover:bg-[#131D33]'
            } ${focusedElementId === 'mosaic-btn-1x1' ? 'tv-focused' : ''}`}
          >
            <Square className="w-3.5 h-3.5" />
            <span>1x1 Única</span>
          </button>

          {/* Button 2x2 */}
          <button
            id="mosaic-btn-2x2"
            onClick={() => setLayout('2x2')}
            onFocus={() => onElementFocus('mosaic-btn-2x2')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer tv-focus-target ${
              layout === '2x2'
                ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(0,210,255,0.5)]'
                : 'bg-[#0D1424] text-slate-300 border border-[#1E2D4A] hover:bg-[#131D33]'
            } ${focusedElementId === 'mosaic-btn-2x2' ? 'tv-focused' : ''}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>2x2 Padrão</span>
          </button>

          {/* Button 3x3 */}
          <button
            id="mosaic-btn-3x3"
            onClick={() => setLayout('3x3')}
            onFocus={() => onElementFocus('mosaic-btn-3x3')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer tv-focus-target ${
              layout === '3x3'
                ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(0,210,255,0.5)]'
                : 'bg-[#0D1424] text-slate-300 border border-[#1E2D4A] hover:bg-[#131D33]'
            } ${focusedElementId === 'mosaic-btn-3x3' ? 'tv-focused' : ''}`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>3x3 Matriz</span>
          </button>

          {/* Button Ronda / Ciclo */}
          <button
            id="mosaic-btn-cycle"
            onClick={() => setIsPatrolCycleActive(!isPatrolCycleActive)}
            onFocus={() => onElementFocus('mosaic-btn-cycle')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer tv-focus-target ${
              isPatrolCycleActive
                ? 'bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                : 'bg-[#0D1424] text-slate-300 border border-[#1E2D4A] hover:bg-[#131D33]'
            } ${focusedElementId === 'mosaic-btn-cycle' ? 'tv-focused' : ''}`}
          >
            <RotateCw className={`w-3.5 h-3.5 ${isPatrolCycleActive ? 'animate-spin' : ''}`} />
            <span>{isPatrolCycleActive ? 'Ronda Ativa' : 'Ciclo / Ronda'}</span>
          </button>

        </div>

      </div>

      {/* Grid Canvas Layout Container */}
      <div
        className={`grid gap-4 w-full flex-1 ${
          layout === '1x1'
            ? 'grid-cols-1 max-h-[78vh]'
            : layout === '2x2'
            ? 'grid-cols-1 md:grid-cols-2 max-h-[78vh]'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        }`}
      >
        {displayedCameras.map((cam, idx) => {
          const elementId = `mosaic-cell-${cam.id}-${idx}`;
          const isFocused = focusedElementId === elementId;
          const isAlert = cam.status === 'alert';
          const isOffline = cam.status === 'offline';

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
              className={`group relative w-full aspect-video rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 tv-focus-target bg-[#0A0F1D] border ${
                isAlert
                  ? 'border-red-500 ring-2 ring-red-500 animate-alarm-pulse shadow-[0_0_24px_rgba(239,68,68,0.4)]'
                  : isOffline
                  ? 'border-rose-950 opacity-90'
                  : 'border-[#1E2D4A]'
              } ${isFocused ? 'tv-focused ring-2 ring-cyan-400' : ''}`}
            >
              {/* Camera Video Stream */}
              <div className="absolute inset-0 w-full h-full">
                <CameraCanvasFeed
                  camera={cam}
                  showScanlines={showScanlines}
                  showOsd={false}
                />
              </div>

              {/* Top OSD Bar */}
              <div className="absolute top-0 inset-x-0 p-3 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
                <div className="flex items-center gap-2">
                  {cam.status === 'online' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-600/90 text-white font-mono text-[10px] font-black uppercase shadow-[0_0_8px_rgba(220,38,38,0.8)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      CAM 0{idx + 1}
                    </span>
                  )}
                  {cam.status === 'alert' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500 text-black font-mono text-[10px] font-black uppercase animate-alarm-pulse shadow-[0_0_10px_rgba(245,158,11,0.8)]">
                      <ShieldAlert className="w-3 h-3" />
                      INTRUSÃO
                    </span>
                  )}
                  {cam.status === 'offline' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950 text-rose-300 font-mono text-[10px] font-bold">
                      <WifiOff className="w-3 h-3 text-rose-400" />
                      OFFLINE
                    </span>
                  )}
                  <span className="text-xs font-bold text-white drop-shadow truncate max-w-[160px]">
                    {cam.name}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-black/60 text-[10px] font-mono text-cyan-300 border border-white/10">
                    {cam.resolution.split(' ')[0]}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenFullscreen(cam);
                    }}
                    title="Maximizar Tela Cheia"
                    className="p-1 rounded bg-black/60 text-slate-300 hover:text-white pointer-events-auto"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Bottom OSD Bar with Location, FPS and Bitrate */}
              <div className="absolute bottom-0 inset-x-0 p-3 flex items-center justify-between bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none">
                <span className="text-xs text-slate-300 font-medium truncate">
                  📍 {cam.location}
                </span>

                <div className="flex items-center gap-2 font-mono text-[10px] text-slate-300">
                  <span className="text-cyan-400">{cam.fps} FPS</span>
                  <span>•</span>
                  <span>{cam.bitrate}</span>
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
