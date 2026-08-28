import React, { useState, useEffect } from 'react';
import { 
  X, 
  Pause, 
  Play, 
  Camera as CameraIcon, 
  Grid, 
  Layers, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Sparkles,
  Radio
} from 'lucide-react';
import { Camera } from '../types';
import { CameraCanvasFeed } from './CameraCanvasFeed';

interface SpotlightFullscreenModalProps {
  camera: Camera;
  onClose: () => void;
  onOpenMosaic: () => void;
  onTakeSnapshot: () => void;
  showScanlines?: boolean;
}

export const SpotlightFullscreenModal: React.FC<SpotlightFullscreenModalProps> = ({
  camera,
  onClose,
  onOpenMosaic,
  onTakeSnapshot,
  showScanlines = false,
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [isSubStream, setIsSubStream] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(!camera.audioEnabled);
  const [showControls, setShowControls] = useState(true);

  // 3-second auto-hide timer for OSD controls
  useEffect(() => {
    let timer: NodeJS.Timeout;

    const resetTimer = () => {
      setShowControls(true);
      clearTimeout(timer);
      timer = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    };

    resetTimer();
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none">
      
      {/* 100% Video Surface */}
      <div className="relative w-full h-full">
        <CameraCanvasFeed
          camera={camera}
          isHero={true}
          showScanlines={showScanlines}
          showOsd={true}
        />
      </div>

      {/* Top Floating OSD Badge Bar (Auto-hide) */}
      <div
        className={`absolute top-0 inset-x-0 p-6 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/40 to-transparent transition-opacity duration-300 pointer-events-none ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-red-600 font-mono text-white text-xs font-black uppercase shadow-[0_0_12px_rgba(220,38,38,0.8)] animate-pulse">
            <span className="w-2 h-2 rounded-full bg-white" />
            SPOTLIGHT 60HZ
          </span>
          <h1 className="text-xl font-bold text-white drop-shadow-md">
            {camera.name}
          </h1>
          <span className="text-xs font-mono text-cyan-300 px-2 py-0.5 rounded bg-black/60 border border-white/10">
            {isSubStream ? 'Sub-Stream (720p Fluído)' : camera.resolution}
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-black/60 hover:bg-white/20 text-white transition-colors pointer-events-auto border border-white/20"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Bottom Contextual Controls Bar (Auto-hide after 3s of inactivity) */}
      <div
        className={`absolute bottom-0 inset-x-0 p-8 flex justify-center bg-gradient-to-t from-black/95 via-black/60 to-transparent transition-opacity duration-300 pointer-events-none ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center gap-3 p-2.5 rounded-full bg-[#0D1424]/80 backdrop-blur-2xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.8)] pointer-events-auto">
          
          {/* Button: Pausar / Ao Vivo */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold bg-[#131D33]/80 text-white hover:bg-[#007AFF] hover:text-white transition-all cursor-pointer border border-white/10"
          >
            {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
            <span>{isPaused ? 'Ao Vivo' : 'Pausar'}</span>
          </button>

          {/* Button: Capturar Snapshot */}
          <button
            onClick={onTakeSnapshot}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold bg-[#131D33]/80 text-white hover:bg-[#007AFF] hover:text-white transition-all cursor-pointer border border-white/10"
          >
            <CameraIcon className="w-4 h-4" />
            <span>Capturar Foto</span>
          </button>

          {/* Button: Trocar Stream Principal / Sub */}
          <button
            onClick={() => setIsSubStream(!isSubStream)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold bg-[#131D33]/80 text-[#00D2FF] hover:bg-[#007AFF] hover:text-white transition-all cursor-pointer border border-[#00D2FF]/30"
          >
            <Layers className="w-4 h-4" />
            <span>{isSubStream ? 'Stream: Sub (720p)' : 'Stream: Principal (5MP)'}</span>
          </button>

          {/* Button: Áudio */}
          <button
            onClick={() => setIsAudioMuted(!isAudioMuted)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold bg-[#131D33]/80 text-white hover:bg-[#007AFF] hover:text-white transition-all cursor-pointer border border-white/10"
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            <span>{isAudioMuted ? 'Mudo' : 'Áudio Ativo'}</span>
          </button>

          {/* Button: Voltar para Mosaico */}
          <button
            onClick={onOpenMosaic}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold bg-gradient-to-r from-[#00D2FF] to-[#007AFF] text-white hover:brightness-110 shadow-[0_0_15px_rgba(0,210,255,0.4)] transition-all cursor-pointer"
          >
            <Grid className="w-4 h-4" />
            <span>Voltar para Mosaico</span>
          </button>

        </div>
      </div>

    </div>
  );
};
