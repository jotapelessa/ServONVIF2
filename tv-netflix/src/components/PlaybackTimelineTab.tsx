import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  FastForward, 
  Calendar, 
  Clock, 
  Film, 
  Sparkles, 
  Layers, 
  Volume2, 
  VolumeX, 
  Maximize2,
  Inbox
} from 'lucide-react';
import { Camera, SecurityEvent } from '../types';
import { CameraCanvasFeed } from './CameraCanvasFeed';

interface PlaybackTimelineTabProps {
  cameras: Camera[];
  events: SecurityEvent[];
  selectedCamera: Camera | null;
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
  const [currentHour, setCurrentHour] = useState(12.0);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

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

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-80px)] p-4 sm:p-6 md:p-10 gap-6 select-none pb-24">
      
      {/* Top Header & Camera / Date Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-glass-card p-4 rounded-2xl border border-glass">
        
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-[0_0_12px_rgba(59,130,246,0.3)]">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-bold text-slate-100">Central de Gravações & Playback</h1>
            <p className="text-xs text-slate-400 hidden sm:block">Linha do tempo contínua e eventos de movimento gravados</p>
          </div>
        </div>

        {/* Camera Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full py-1">
          {cameras.map((cam) => {
            const isSelected = selectedCamera?.id === cam.id;
            const elementId = `playback-cam-select-${cam.id}`;
            const isFocused = focusedElementId === elementId;

            return (
              <button
                key={cam.id}
                id={elementId}
                onClick={() => onSelectCamera(cam)}
                onFocus={() => onElementFocus(elementId)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap tv-focus-target ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.5)]'
                    : 'bg-[#0D1424] text-slate-400 border border-[#1E2D4A] hover:bg-[#131D33]'
                } ${isFocused ? 'tv-focused ring-2 ring-blue-400' : ''}`}
              >
                {cam.name}
              </button>
            );
          })}
        </div>

      </div>

      {/* Main Video Player / Canvas Feed */}
      {selectedCamera ? (
        <div className="relative w-full aspect-video max-h-[55vh] rounded-3xl overflow-hidden bg-black border border-[#1E2D4A] shadow-2xl">
          <CameraCanvasFeed camera={selectedCamera} showScanlines={false} showOsd={true} />

          {/* Timeline OSD Bar */}
          <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-xl border border-white/10 p-3 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <div className="font-mono text-sm font-bold text-white">
                {formatTime(currentHour)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={cycleSpeed}
                className="px-3 py-1 rounded-lg bg-white/10 text-xs font-mono font-bold text-slate-200"
              >
                {speedMultiplier}x Velocidade
              </button>
              <button
                onClick={() => onOpenFullscreen(selectedCamera)}
                className="p-2 rounded-xl bg-white/10 text-slate-200 hover:bg-white/20"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full aspect-video max-h-[45vh] rounded-3xl bg-[#131D33]/40 border border-[#1E2D4A]/60 flex flex-col items-center justify-center gap-3 text-slate-400 text-center p-8">
          <Inbox className="w-8 h-8 text-blue-400" />
          <h3 className="text-lg font-bold text-white">Nenhuma Câmera Selecionada</h3>
          <p className="text-sm text-slate-400">Selecione uma câmera conectada para navegar pela linha do tempo.</p>
        </div>
      )}

      {/* Events / Clips Grid */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <span>Clipes de Eventos Gravados</span>
          <span className="text-xs font-mono text-slate-400">({events.length})</span>
        </h2>

        {events.length === 0 ? (
          <div className="w-full p-8 rounded-2xl bg-[#131D33]/40 border border-[#1E2D4A]/60 flex items-center justify-center gap-3 text-slate-400 text-sm">
            <Inbox className="w-5 h-5 text-purple-400" />
            <span>Nenhum clipe gravado no disco para esta data.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="p-3 rounded-2xl bg-glass-card border border-[#1E2D4A] flex flex-col gap-2 cursor-pointer hover:border-blue-400 transition-all"
              >
                <div className="relative aspect-video rounded-xl bg-slate-900 overflow-hidden flex items-center justify-center">
                  {evt.thumbnailUrl ? (
                    <img src={evt.thumbnailUrl} alt={evt.title} className="w-full h-full object-cover" />
                  ) : (
                    <Film className="w-8 h-8 text-slate-700" />
                  )}
                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
                    {evt.duration}
                  </span>
                </div>
                <p className="text-xs font-bold text-white truncate">{evt.title}</p>
                <p className="text-[10px] text-slate-400 font-mono">{new Date(evt.timestamp).toLocaleTimeString('pt-BR')}</p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
