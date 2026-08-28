import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  FastForward, 
  Download, 
  Calendar, 
  Clock, 
  Film, 
  Sparkles, 
  Layers, 
  Volume2, 
  VolumeX, 
  Maximize2 
} from 'lucide-react';
import { Camera, SecurityEvent } from '../types';
import { CameraCanvasFeed } from './CameraCanvasFeed';

interface PlaybackTimelineTabProps {
  cameras: Camera[];
  events: SecurityEvent[];
  selectedCamera: Camera;
  onSelectCamera: (cam: Camera) => void;
  focusedElementId: string | null;
  onElementFocus: (id: string) => void;
  onOpenFullscreen: (cam: Camera) => void;
}

export const PlaybackTimelineTab: React.FC<PlaybackTimelineTabProps> = ({
  cameras,
  events,
  selectedCamera,
  onSelectCamera,
  focusedElementId,
  onElementFocus,
  onOpenFullscreen,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentHour, setCurrentHour] = useState(14.55); // 14:33 in decimal hours
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [selectedDate, setSelectedDate] = useState('2026-08-28');
  const [savedNotification, setSavedNotification] = useState(false);

  // Playback timer simulation
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentHour((prev) => {
        const next = prev + (0.005 * speedMultiplier);
        return next >= 24 ? 0 : next;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [isPlaying, speedMultiplier]);

  // Convert decimal hours to HH:MM:SS
  const formatTime = (decHours: number) => {
    const totalSeconds = Math.floor(decHours * 3600);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const cycleSpeed = () => {
    const speeds = [1, 2, 4, 8];
    const currentIndex = speeds.indexOf(speedMultiplier);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setSpeedMultiplier(nextSpeed);
  };

  const handleStepBack10s = () => {
    setCurrentHour((prev) => Math.max(0, prev - (10 / 3600)));
  };

  const handleStepForward10s = () => {
    setCurrentHour((prev) => Math.min(24, prev + (10 / 3600)));
  };

  const handleSaveClip = () => {
    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 3000);
  };

  // 24 Hour Blocks segments simulation
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-80px)] p-6 md:p-10 gap-6 select-none pb-24">
      
      {/* Top Header & Camera / Date Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-glass-card p-4 rounded-2xl border border-glass">
        
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-[0_0_12px_rgba(59,130,246,0.3)]">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Gravações & Linha do Tempo 24h</h1>
            <p className="text-xs text-slate-400">Reprodução síncrona NVR com busca rápida de eventos</p>
          </div>
        </div>

        {/* Camera Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto tv-hide-scrollbar">
          {cameras.map((cam) => {
            const isSelected = selectedCamera.id === cam.id;
            const elementId = `timeline-cam-${cam.id}`;
            const isFocused = focusedElementId === elementId;

            return (
              <button
                key={cam.id}
                id={elementId}
                onClick={() => onSelectCamera(cam)}
                onFocus={() => onElementFocus(elementId)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer tv-focus-target ${
                  isSelected
                    ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(0,210,255,0.4)]'
                    : 'bg-[#0D1424] text-slate-300 border border-[#1E2D4A] hover:bg-[#131D33]'
                } ${isFocused ? 'tv-focused' : ''}`}
              >
                {cam.name.split(' ')[0]}
              </button>
            );
          })}
        </div>

      </div>


      {/* Main Video Playback Viewport */}
      <div className="relative w-full h-[46vh] min-h-[340px] rounded-2xl overflow-hidden bg-black border border-[#1E2D4A] shadow-2xl flex items-center justify-center">
        
        <div className="w-full h-full">
          <CameraCanvasFeed camera={selectedCamera} showScanlines={false} showOsd={false} />
        </div>

        {/* Overlay OSD */}
        <div className="absolute top-4 left-4 flex items-center gap-2 pointer-events-none">
          <span className="px-2.5 py-1 rounded bg-blue-600/90 text-white font-mono text-xs font-bold shadow-[0_0_10px_rgba(37,99,235,0.6)]">
            REC REPRODUÇÃO
          </span>
          <span className="px-2.5 py-1 rounded bg-black/70 backdrop-blur-md text-cyan-300 font-mono text-xs font-bold border border-white/10">
            {formatTime(currentHour)}
          </span>
          <span className="px-2.5 py-1 rounded bg-black/70 backdrop-blur-md text-slate-300 font-mono text-xs border border-white/10">
            {selectedCamera.name}
          </span>
        </div>

        {/* Speed multiplier pill */}
        {speedMultiplier > 1 && (
          <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-cyan-500 text-black font-mono font-black text-xs shadow-[0_0_15px_#00D2FF]">
            VELOCIDADE {speedMultiplier}x
          </div>
        )}

        {/* Save Clip Success Alert */}
        {savedNotification && (
          <div className="absolute top-1/2 -translate-y-1/2 px-6 py-3 rounded-2xl bg-emerald-950/90 border border-emerald-400 text-emerald-300 font-bold text-sm shadow-[0_0_30px_rgba(52,211,153,0.5)] flex items-center gap-2 animate-bounce">
            <Download className="w-5 h-5 text-emerald-400" />
            Clipe de vídeo salvo com sucesso no armazenamento da TV!
          </div>
        )}

      </div>


      {/* 24-Hour Timeline Scrubber Bar */}
      <div className="flex flex-col gap-2 p-5 rounded-2xl bg-glass-card border border-glass">
        
        {/* Timeline Header Info */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <span className="font-mono text-slate-200 font-bold text-sm">
              Cursor: <span className="text-cyan-400">{formatTime(currentHour)}</span>
            </span>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded bg-blue-500 shadow-[0_0_4px_#3B82F6]" />
                Gravação Contínua
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded bg-amber-500 shadow-[0_0_4px_#F59E0B]" />
                Movimento
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500 shadow-[0_0_4px_#10B981]" />
                Veículo / LPR
              </span>
            </div>
          </div>
          <span className="text-slate-400 font-mono">Linha do Tempo 00:00 - 24:00</span>
        </div>

        {/* Continuous 24h Visual Track */}
        <div 
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = Math.max(0, Math.min(1, clickX / rect.width));
            setCurrentHour(percentage * 24);
          }}
          className="relative w-full h-12 rounded-xl bg-[#090E1B] border border-[#1E2D4A] overflow-hidden cursor-pointer my-2 flex items-center"
        >
          {/* Continuous Blue Segments */}
          <div className="absolute inset-y-1 left-[0%] w-[100%] bg-blue-600/30 rounded-md" />
          
          {/* Motion Orange Segments (Simulated) */}
          <div className="absolute inset-y-1 left-[15%] w-[8%] bg-amber-500/70 rounded-md" />
          <div className="absolute inset-y-1 left-[35%] w-[6%] bg-amber-500/70 rounded-md" />
          <div className="absolute inset-y-1 left-[58%] w-[12%] bg-amber-500/70 rounded-md" />
          <div className="absolute inset-y-1 left-[78%] w-[9%] bg-amber-500/70 rounded-md" />

          {/* Vehicle Green Segments (Simulated) */}
          <div className="absolute inset-y-1 left-[22%] w-[3%] bg-emerald-400/90 rounded-md shadow-[0_0_8px_#34D399]" />
          <div className="absolute inset-y-1 left-[52%] w-[4%] bg-emerald-400/90 rounded-md shadow-[0_0_8px_#34D399]" />
          <div className="absolute inset-y-1 left-[60.5%] w-[3%] bg-emerald-400/90 rounded-md shadow-[0_0_8px_#34D399]" />

          {/* Hour markers grid */}
          <div className="absolute inset-0 flex justify-between px-2 pointer-events-none">
            {hours.filter((h) => h % 2 === 0).map((h) => (
              <div key={h} className="flex flex-col items-center justify-between h-full py-1 text-[9px] font-mono text-slate-400 border-l border-white/10 pl-1">
                <span>{String(h).padStart(2, '0')}:00</span>
              </div>
            ))}
          </div>

          {/* Time Scrubber Cursor */}
          <div
            style={{ left: `${(currentHour / 24) * 100}%` }}
            className="absolute top-0 bottom-0 w-1 bg-cyan-400 shadow-[0_0_12px_#00D2FF] z-20 transition-all duration-75 flex items-center justify-center pointer-events-none"
          >
            <div className="w-3.5 h-3.5 rounded-full bg-white border-2 border-cyan-400 shadow-[0_0_8px_#00D2FF]" />
          </div>
        </div>

        {/* Leanback TV Player Buttons Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          
          {/* Button: Retroceder 10s */}
          <button
            id="player-btn-rewind"
            onClick={handleStepBack10s}
            onFocus={() => onElementFocus('player-btn-rewind')}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#0D1424] text-slate-200 border border-[#1E2D4A] hover:bg-[#131D33] transition-all cursor-pointer tv-focus-target ${
              focusedElementId === 'player-btn-rewind' ? 'tv-focused' : ''
            }`}
          >
            <RotateCcw className="w-4 h-4 text-cyan-400" />
            <span>⏪ Retroceder 10s</span>
          </button>

          {/* Button: Play / Pause */}
          <button
            id="player-btn-playpause"
            onClick={() => setIsPlaying(!isPlaying)}
            onFocus={() => onElementFocus('player-btn-playpause')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black bg-gradient-to-r from-cyan-500 to-blue-600 text-black hover:brightness-110 shadow-[0_0_15px_rgba(0,210,255,0.4)] transition-all cursor-pointer tv-focus-target ${
              focusedElementId === 'player-btn-playpause' ? 'tv-focused' : ''
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pausar</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Reproduzir</span>
              </>
            )}
          </button>

          {/* Button: Avançar 10s */}
          <button
            id="player-btn-forward"
            onClick={handleStepForward10s}
            onFocus={() => onElementFocus('player-btn-forward')}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#0D1424] text-slate-200 border border-[#1E2D4A] hover:bg-[#131D33] transition-all cursor-pointer tv-focus-target ${
              focusedElementId === 'player-btn-forward' ? 'tv-focused' : ''
            }`}
          >
            <RotateCw className="w-4 h-4 text-cyan-400" />
            <span>⏩ Avançar 10s</span>
          </button>

          {/* Button: Velocidade 1x, 2x, 4x, 8x */}
          <button
            id="player-btn-speed"
            onClick={cycleSpeed}
            onFocus={() => onElementFocus('player-btn-speed')}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#0D1424] text-slate-200 border border-[#1E2D4A] hover:bg-[#131D33] transition-all cursor-pointer tv-focus-target ${
              focusedElementId === 'player-btn-speed' ? 'tv-focused' : ''
            }`}
          >
            <FastForward className="w-4 h-4 text-amber-400" />
            <span>🚀 Velocidade: {speedMultiplier}x</span>
          </button>

          {/* Button: Salvar Clipe */}
          <button
            id="player-btn-save"
            onClick={handleSaveClip}
            onFocus={() => onElementFocus('player-btn-save')}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#0D1424] text-emerald-300 border border-emerald-500/40 hover:bg-[#131D33] transition-all cursor-pointer tv-focus-target ${
              focusedElementId === 'player-btn-save' ? 'tv-focused' : ''
            }`}
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>⬇ Salvar Clipe</span>
          </button>

          {/* Button: Tela Cheia */}
          <button
            id="player-btn-fullscreen"
            onClick={() => onOpenFullscreen(selectedCamera)}
            onFocus={() => onElementFocus('player-btn-fullscreen')}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#0D1424] text-slate-300 border border-[#1E2D4A] hover:bg-[#131D33] transition-all cursor-pointer tv-focus-target ${
              focusedElementId === 'player-btn-fullscreen' ? 'tv-focused' : ''
            }`}
          >
            <Maximize2 className="w-4 h-4 text-slate-400" />
            <span>Tela Cheia</span>
          </button>

        </div>

      </div>

    </div>
  );
};
