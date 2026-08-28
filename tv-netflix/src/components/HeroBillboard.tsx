import React from 'react';
import { Play, Grid, Camera as CameraIcon, Volume2, VolumeX, SkipForward, ShieldAlert, Sparkles, RefreshCw, Radio } from 'lucide-react';
import { Camera } from '../types';
import { CameraCanvasFeed } from './CameraCanvasFeed';

interface HeroBillboardProps {
  camera: Camera | null;
  onWatchFullscreen: () => void;
  onOpenMosaic: () => void;
  onTakeSnapshot: () => void;
  onToggleAudio: () => void;
  onNextCamera: () => void;
  focusedElementId: string | null;
  onElementFocus: (id: string) => void;
  showScanlines?: boolean;
}

export const HeroBillboard: React.FC<HeroBillboardProps> = ({
  camera,
  onWatchFullscreen,
  onOpenMosaic,
  onTakeSnapshot,
  onToggleAudio,
  onNextCamera,
  focusedElementId,
  onElementFocus,
  showScanlines = false,
}) => {
  if (!camera) {
    return (
      <section className="relative w-full h-[45vh] min-h-[360px] max-h-[500px] overflow-hidden select-none bg-gradient-to-b from-[#070B14] via-[#0C1427] to-[#070B14] flex items-center justify-center border-b border-[#1E2D4A]/50">
        <div className="flex flex-col items-center justify-center text-center p-8 max-w-lg z-10">
          <div className="relative flex items-center justify-center w-20 h-20 rounded-3xl bg-[#007AFF]/10 border border-[#00D2FF]/30 text-[#00D2FF] mb-5 shadow-[0_0_30px_rgba(0,210,255,0.2)]">
            <Radio className="w-10 h-10 animate-pulse text-[#00D2FF]" />
            <div className="absolute inset-0 rounded-3xl border border-[#00D2FF]/20 animate-ping" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight mb-2">
            Nenhuma Câmera Conectada
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed mb-6">
            O ServONVIF está aguardando o cadastro ou detecção de câmeras IP/ONVIF na sua rede local.
          </p>
          <div className="flex items-center gap-3">
            <button
              id="btn-empty-mosaic"
              onClick={onOpenMosaic}
              onFocus={() => onElementFocus('btn-empty-mosaic')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold bg-[#007AFF] text-white shadow-[0_0_20px_rgba(0,122,255,0.4)] cursor-pointer tv-focus-target ${
                focusedElementId === 'btn-empty-mosaic' ? 'tv-focused ring-4 ring-white' : ''
              }`}
            >
              <Grid className="w-4 h-4" />
              <span>Ver Mosaico Geral</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative w-full h-[52vh] min-h-[420px] max-h-[580px] overflow-hidden select-none bg-[#070B14]">
      
      {/* 1. Live Video Stream Canvas */}
      <div className="absolute inset-0 w-full h-full">
        <CameraCanvasFeed 
          camera={camera} 
          isHero={true} 
          showScanlines={showScanlines}
          showOsd={true} 
        />
      </div>

      {/* 2. Netflix-style Dark Gradient Vignette Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#070B14] via-[#070B14]/40 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#070B14]/90 via-[#070B14]/30 to-transparent pointer-events-none w-2/3" />

      {/* 3. Hero Content and OSD Info Overlay */}
      <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-12 z-10">
        
        {/* Badges OSD */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {camera.status === 'online' && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-600/90 text-white font-black text-xs uppercase tracking-wider shadow-[0_0_12px_rgba(220,38,38,0.7)] animate-pulse font-mono">
              <span className="w-2 h-2 rounded-full bg-white animate-ping inline-block" />
              AO VIVO
            </span>
          )}

          {camera.status === 'alert' && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500 text-black font-black text-xs uppercase tracking-wider shadow-[0_0_14px_rgba(245,158,11,0.8)] font-mono">
              <ShieldAlert className="w-3.5 h-3.5" />
              DETECÇÃO ATIVA
            </span>
          )}

          {camera.status === 'offline' && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 text-rose-400 font-black text-xs uppercase tracking-wider font-mono">
              🔴 OFFLINE
            </span>
          )}

          <span className="px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-cyan-300 font-bold text-xs font-mono">
            {camera.resolution}
          </span>

          <span className="px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-slate-300 font-medium text-xs font-mono">
            {camera.fps} FPS
          </span>

          <span className="px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-slate-400 text-xs font-mono hidden md:inline-block">
            {camera.ip}
          </span>
        </div>

        {/* Camera Title and Location */}
        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-lg mb-2 font-sans">
          {camera.name}
        </h1>
        <p className="text-base text-slate-300 font-medium drop-shadow mb-6 flex items-center gap-2">
          <span>{camera.location}</span>
          {camera.lastMotionTime && (
            <>
              <span className="text-slate-500">•</span>
              <span className="text-amber-400 font-mono text-xs">Último movimento: {camera.lastMotionTime}</span>
            </>
          )}
        </p>

        {/* Action Buttons (10-Foot Focusable Elements) */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* 1. Watch Fullscreen Button */}
          <button
            id="hero-btn-watch"
            onClick={onWatchFullscreen}
            onFocus={() => onElementFocus('hero-btn-watch')}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-full text-base font-bold transition-all duration-200 cursor-pointer shadow-2xl tv-focus-target ${
              focusedElementId === 'hero-btn-watch'
                ? 'bg-white text-black scale-105 shadow-[0_0_25px_rgba(255,255,255,0.7)] tv-focused ring-4 ring-cyan-400'
                : 'bg-white text-black hover:bg-slate-200'
            }`}
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Tela Cheia</span>
          </button>

          {/* 2. Open Mosaic Button */}
          <button
            id="hero-btn-mosaic"
            onClick={onOpenMosaic}
            onFocus={() => onElementFocus('hero-btn-mosaic')}
            className={`flex items-center gap-2 px-5 py-3 rounded-full text-base font-bold bg-[#131D33]/80 backdrop-blur-xl border border-[#1E2D4A] text-slate-200 transition-all duration-200 cursor-pointer shadow-lg tv-focus-target ${
              focusedElementId === 'hero-btn-mosaic'
                ? 'bg-[#007AFF] text-white border-white scale-105 shadow-[0_0_20px_rgba(0,122,255,0.5)] tv-focused ring-4 ring-cyan-400'
                : 'hover:bg-[#1C2C4E]'
            }`}
          >
            <Grid className="w-5 h-5" />
            <span>Mosaico</span>
          </button>

          {/* 3. Take Snapshot Button */}
          <button
            id="hero-btn-snapshot"
            onClick={onTakeSnapshot}
            onFocus={() => onElementFocus('hero-btn-snapshot')}
            className={`flex items-center gap-2 px-4 py-3 rounded-full text-sm font-semibold bg-[#131D33]/80 backdrop-blur-xl border border-[#1E2D4A] text-slate-300 transition-all duration-200 cursor-pointer tv-focus-target ${
              focusedElementId === 'hero-btn-snapshot'
                ? 'bg-[#007AFF] text-white border-white scale-105 shadow-[0_0_20px_rgba(0,122,255,0.5)] tv-focused ring-4 ring-cyan-400'
                : 'hover:bg-[#1C2C4E]'
            }`}
          >
            <CameraIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Snapshot</span>
          </button>

          {/* 4. Audio Toggle */}
          <button
            id="hero-btn-audio"
            onClick={onToggleAudio}
            onFocus={() => onElementFocus('hero-btn-audio')}
            className={`flex items-center gap-2 px-4 py-3 rounded-full text-sm font-semibold bg-[#131D33]/80 backdrop-blur-xl border border-[#1E2D4A] text-slate-300 transition-all duration-200 cursor-pointer tv-focus-target ${
              focusedElementId === 'hero-btn-audio'
                ? 'bg-[#007AFF] text-white border-white scale-105 shadow-[0_0_20px_rgba(0,122,255,0.5)] tv-focused ring-4 ring-cyan-400'
                : 'hover:bg-[#1C2C4E]'
            }`}
          >
            {camera.audioEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            <span className="hidden sm:inline">{camera.audioEnabled ? 'Áudio ON' : 'Mudo'}</span>
          </button>

          {/* 5. Next Camera Shortcut */}
          <button
            id="hero-btn-next"
            onClick={onNextCamera}
            onFocus={() => onElementFocus('hero-btn-next')}
            className={`flex items-center gap-2 px-4 py-3 rounded-full text-sm font-semibold bg-[#131D33]/80 backdrop-blur-xl border border-[#1E2D4A] text-slate-300 transition-all duration-200 cursor-pointer tv-focus-target ${
              focusedElementId === 'hero-btn-next'
                ? 'bg-[#007AFF] text-white border-white scale-105 shadow-[0_0_20px_rgba(0,122,255,0.5)] tv-focused ring-4 ring-cyan-400'
                : 'hover:bg-[#1C2C4E]'
            }`}
          >
            <SkipForward className="w-4 h-4" />
            <span className="hidden sm:inline">Próxima</span>
          </button>

        </div>

      </div>

    </section>
  );
};
