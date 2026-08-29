import React, { useState, useEffect } from 'react';
import { Camera } from '../types';
import { WifiOff, ShieldAlert, RefreshCw } from 'lucide-react';

interface CameraCanvasFeedProps {
  camera: Camera;
  className?: string;
  showScanlines?: boolean;
  showOsd?: boolean;
  isHero?: boolean;
}

export const CameraCanvasFeed: React.FC<CameraCanvasFeedProps> = ({
  camera,
  className = '',
  showScanlines = false,
  showOsd = true,
  isHero = false,
}) => {
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('pt-BR'));

  // Live Clock for OSD
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('pt-BR'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-retry when camera status updates or on failure
  useEffect(() => {
    setHasError(false);
  }, [camera.id, camera.streamUrl, camera.status]);

  const handleImageError = () => {
    setHasError(true);
    // Automatic retry in 3 seconds
    setTimeout(() => {
      setRetryKey((prev) => prev + 1);
      setHasError(false);
    }, 3000);
  };

  const isOffline = camera.status === 'offline' || hasError;

  return (
    <div className={`relative w-full h-full overflow-hidden bg-black select-none ${className}`}>
      
      {/* 1. REAL LIVE MJPEG VIDEO STREAM */}
      {!isOffline && (
        <img
          key={`${camera.id}-${retryKey}`}
          src={`${camera.streamUrl}${camera.streamUrl.includes('?') ? '&' : '?'}retry=${retryKey}`}
          alt={camera.name}
          onError={handleImageError}
          className="w-full h-full object-cover object-center transition-opacity duration-300"
        />
      )}

      {/* 2. OFFLINE / RECONNECTING SCREEN */}
      {isOffline && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070B14] p-4 text-center">
          <div className="relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mb-3 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
            <WifiOff className="w-6 h-6 sm:w-8 sm:h-8 animate-pulse" />
          </div>
          <h4 className="text-sm sm:text-base font-black text-rose-400 tracking-wide uppercase font-mono">
            🔴 SEM SINAL • CÂMERA OFFLINE
          </h4>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            {camera.name} ({camera.ip || '192.168.1.X'})
          </p>
          <div className="flex items-center gap-2 mt-3 text-[11px] text-cyan-400 font-mono">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Sincronizando stream RTSP...</span>
          </div>
        </div>
      )}

      {/* 3. RETRO SCANLINES EFFECT */}
      {showScanlines && (
        <div 
          className="absolute inset-0 pointer-events-none opacity-20 bg-repeat bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] z-10" 
        />
      )}

      {/* 4. ON-SCREEN DISPLAY (OSD) OVERLAY */}
      {showOsd && (
        <div className="absolute inset-0 p-3 sm:p-4 flex flex-col justify-between pointer-events-none z-20">
          
          {/* Top Bar OSD */}
          <div className="flex items-center justify-between gap-2">
            
            {/* Live Indicator / Badge */}
            <div className="flex items-center gap-1.5">
              {!isOffline ? (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-600/90 text-white font-black text-[10px] sm:text-xs uppercase tracking-wider font-mono shadow-[0_0_10px_rgba(220,38,38,0.7)] animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping inline-block" />
                  AO VIVO
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-slate-800 text-rose-400 font-black text-[10px] sm:text-xs uppercase tracking-wider font-mono">
                  OFFLINE
                </span>
              )}

              {camera.status === 'alert' && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500 text-black font-black text-[10px] sm:text-xs uppercase tracking-wider font-mono shadow-[0_0_12px_rgba(245,158,11,0.8)]">
                  <ShieldAlert className="w-3 h-3" />
                  DETECÇÃO
                </span>
              )}
            </div>

            {/* Timestamp OSD */}
            <div className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10 text-white font-mono text-[10px] sm:text-xs font-bold shadow">
              {currentTime}
            </div>

          </div>

          {/* Bottom Bar OSD */}
          <div className="flex items-end justify-between gap-2">
            
            {/* Camera Name & Location */}
            <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-left">
              <div className="text-white font-bold text-xs sm:text-sm leading-none drop-shadow">
                {camera.name}
              </div>
              <div className="text-[10px] text-slate-300 font-mono mt-0.5">
                {camera.location || 'Área Monitorada'} • {camera.resolution || '1080p'}
              </div>
            </div>

            {/* Codec / FPS Badge */}
            <div className="hidden sm:flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded border border-white/10 text-[10px] font-mono text-slate-300">
              <span>{camera.fps || 25} FPS</span>
              <span>•</span>
              <span>{camera.codec || 'H.264/H.265'}</span>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
