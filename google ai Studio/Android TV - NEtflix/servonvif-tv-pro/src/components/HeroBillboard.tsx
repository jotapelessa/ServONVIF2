import React from 'react';
import { Play, Grid, Camera as CameraIcon, Volume2, VolumeX, SkipForward, ShieldAlert, Sparkles } from 'lucide-react';
import { Camera } from '../types';
import { CameraCanvasFeed } from './CameraCanvasFeed';

interface HeroBillboardProps {
  camera: Camera;
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
      <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-12 z-10">
        
        {/* Badges OSD */}
        <div className="flex flex-wrap items-center gap-2.5 mb-3">
          {camera.status === 'online' && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-600/90 text-white font-black text-xs uppercase tracking-wider shadow-[0_0_12px_rgba(220,38,38,0.7)] animate-pulse font-mono">
              <span className="w-2 h-2 rounded-full bg-white animate-ping inline-block" />
              AO VIVO
            </span>
          )}

          {camera.status === 'alert' && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500 text-black font-black text-xs uppercase tracking-wider shadow-[0_0_14px_rgba(245,158,11,0.8)] font-mono animate-alarm-pulse">
              <ShieldAlert className="w-3.5 h-3.5" />
              DETECÇÃO ATIVA
            </span>
          )}

          {camera.status === 'offline' && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 text-rose-400 font-black text-xs uppercase tracking-wider font-mono">
              🔴 SEM SINAL
            </span>
          )}

          <span className="px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-cyan-300 font-bold text-xs font-mono">
            {camera.resolution}
          </span>

          <span className="px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-slate-300 font-medium text-xs font-mono">
            {camera.fps} FPS • {camera.bitrate}
          </span>

          <span className="px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-slate-400 text-xs font-mono hidden md:inline-block">
            {camera.codec}
          </span>
        </div>

        {/* Camera Title & Location */}
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight drop-shadow-md mb-1">
          {camera.name}
        </h1>
        
        <p className="text-sm md:text-base text-slate-300 font-medium mb-6 flex items-center gap-2 drop-shadow">
          <span className="text-cyan-400">📍 {camera.location}</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400 font-mono text-xs">{camera.sensor}</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400 font-mono text-xs">IP: {camera.ip}</span>
        </p>

        {/* Quick Action Button Rail with D-pad Focus Support */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Button: Assistir em Tela Cheia */}
          <button
            id="hero-btn-fullscreen"
            onClick={onWatchFullscreen}
            onFocus={() => onElementFocus('hero-btn-fullscreen')}
            className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold text-sm md:text-base bg-gradient-to-r from-[#00D2FF] to-[#007AFF] text-white hover:brightness-110 shadow-[0_0_24px_rgba(0,210,255,0.4)] transition-all cursor-pointer tv-focus-target ${
              focusedElementId === 'hero-btn-fullscreen' ? 'tv-focused' : ''
            }`}
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Assistir em Tela Cheia</span>
          </button>

          {/* Button: Mosaico 2x2 */}
          <button
            id="hero-btn-mosaic"
            onClick={onOpenMosaic}
            onFocus={() => onElementFocus('hero-btn-mosaic')}
            className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl font-semibold text-sm md:text-base bg-[#131D33]/70 hover:bg-[#1C2B4C] text-slate-100 border border-[#1E2D4A] backdrop-blur-2xl transition-all cursor-pointer tv-focus-target shadow-lg ${
              focusedElementId === 'hero-btn-mosaic' ? 'tv-focused' : ''
            }`}
          >
            <Grid className="w-4 h-4 text-[#00D2FF]" />
            <span>Mosaico 2x2</span>
          </button>

          {/* Button: Capturar Snapshot */}
          <button
            id="hero-btn-snapshot"
            onClick={onTakeSnapshot}
            onFocus={() => onElementFocus('hero-btn-snapshot')}
            className={`flex items-center gap-2 px-4 py-3.5 rounded-2xl font-semibold text-sm bg-[#131D33]/70 hover:bg-[#1C2B4C] text-slate-200 border border-[#1E2D4A] backdrop-blur-2xl transition-all cursor-pointer tv-focus-target shadow-lg ${
              focusedElementId === 'hero-btn-snapshot' ? 'tv-focused' : ''
            }`}
          >
            <CameraIcon className="w-4 h-4 text-slate-300" />
            <span>Capturar Snapshot</span>
          </button>

          {/* Button: Ouvir Áudio */}
          <button
            id="hero-btn-audio"
            onClick={onToggleAudio}
            onFocus={() => onElementFocus('hero-btn-audio')}
            className={`flex items-center gap-2 px-4 py-3.5 rounded-2xl font-semibold text-sm bg-[#131D33]/70 hover:bg-[#1C2B4C] text-slate-200 border border-[#1E2D4A] backdrop-blur-2xl transition-all cursor-pointer tv-focus-target shadow-lg ${
              focusedElementId === 'hero-btn-audio' ? 'tv-focused' : ''
            }`}
          >
            {camera.audioEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span>Áudio Ativo</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-slate-400" />
                <span>Áudio Mudo</span>
              </>
            )}
          </button>

          {/* Button: Próxima Câmera */}
          <button
            id="hero-btn-next"
            onClick={onNextCamera}
            onFocus={() => onElementFocus('hero-btn-next')}
            className={`flex items-center gap-2 px-4 py-3.5 rounded-2xl font-semibold text-sm bg-[#131D33]/70 hover:bg-[#1C2B4C] text-slate-200 border border-[#1E2D4A] backdrop-blur-2xl transition-all cursor-pointer tv-focus-target shadow-lg ${
              focusedElementId === 'hero-btn-next' ? 'tv-focused' : ''
            }`}
          >
            <SkipForward className="w-4 h-4 text-[#00D2FF]" />
            <span>Próxima Câmera</span>
          </button>

        </div>

      </div>

    </section>
  );
};
