import React from 'react';
import { 
  Play, 
  RotateCw, 
  ShieldCheck, 
  PictureInPicture2, 
  Sparkles, 
  Eye, 
  Video, 
  AlertTriangle, 
  Car, 
  Clock, 
  HardDrive,
  CheckCircle2
} from 'lucide-react';
import { Camera, LprDetection, SecurityEvent, TVSettings } from '../types';
import { HeroBillboard } from './HeroBillboard';
import { CameraCanvasFeed } from './CameraCanvasFeed';

interface HomeTabProps {
  cameras: Camera[];
  selectedCamera: Camera;
  onSelectCamera: (cam: Camera) => void;
  lprDetections: LprDetection[];
  securityEvents: SecurityEvent[];
  settings: TVSettings;
  onUpdateSettings: (newSettings: Partial<TVSettings>) => void;
  onOpenFullscreen: (cam: Camera) => void;
  onOpenMosaic: () => void;
  onTakeSnapshot: (cam: Camera) => void;
  onPlayRecording: (evt: SecurityEvent) => void;
  onViewLprEvent: (lpr: LprDetection) => void;
  focusedElementId: string | null;
  onElementFocus: (id: string) => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  cameras,
  selectedCamera,
  onSelectCamera,
  lprDetections,
  securityEvents,
  settings,
  onUpdateSettings,
  onOpenFullscreen,
  onOpenMosaic,
  onTakeSnapshot,
  onPlayRecording,
  onViewLprEvent,
  focusedElementId,
  onElementFocus,
}) => {
  const handleToggleAudio = () => {
    const updated = { ...selectedCamera, audioEnabled: !selectedCamera.audioEnabled };
    onSelectCamera(updated);
  };

  const handleNextCamera = () => {
    const currentIndex = cameras.findIndex((c) => c.id === selectedCamera.id);
    const nextIndex = (currentIndex + 1) % cameras.length;
    onSelectCamera(cameras[nextIndex]);
  };

  return (
    <div className="flex flex-col w-full min-h-screen pb-24 select-none">
      
      {/* 1. HERO BILLBOARD (Top 55% Height) */}
      <HeroBillboard
        camera={selectedCamera}
        onWatchFullscreen={() => onOpenFullscreen(selectedCamera)}
        onOpenMosaic={onOpenMosaic}
        onTakeSnapshot={() => onTakeSnapshot(selectedCamera)}
        onToggleAudio={handleToggleAudio}
        onNextCamera={handleNextCamera}
        focusedElementId={focusedElementId}
        onElementFocus={onElementFocus}
        showScanlines={settings.showScanlines}
      />

      {/* RAILS CONTAINER */}
      <div className="flex flex-col gap-10 px-8 md:px-12 -mt-4 z-20">
        
        {/* ============================================================
            RAIL 1: "Mosaico Rápido de Câmeras"
            ============================================================ */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-slate-400">
                Mosaico Rápido de Câmeras
              </h2>
              <span className="px-2 py-0.5 text-xs font-mono font-bold bg-[#131D33]/80 text-[#00D2FF] border border-[#00D2FF]/30 rounded-full backdrop-blur-md">
                {cameras.length} ATIVAS
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium hidden sm:block">
              Navegue com D-pad para alternar a câmera em destaque instantaneamente
            </p>
          </div>

          <div className="flex items-center gap-5 overflow-x-auto tv-hide-scrollbar py-4 px-2 -mx-2">
            {cameras.map((cam) => {
              const isSelected = selectedCamera.id === cam.id;
              const elementId = `rail1-cam-${cam.id}`;
              const isFocused = focusedElementId === elementId;

              return (
                <div
                  key={cam.id}
                  id={elementId}
                  tabIndex={0}
                  onFocus={() => {
                    onElementFocus(elementId);
                    onSelectCamera(cam); // Instant hero update on focus per Netflix requirements!
                  }}
                  onClick={() => onOpenFullscreen(cam)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpenFullscreen(cam);
                    }
                  }}
                  className={`group relative flex-shrink-0 w-72 aspect-video rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 tv-focus-target bg-[#131D33]/60 backdrop-blur-xl border ${
                    isSelected
                      ? 'border-[#00D2FF] shadow-[0_0_20px_rgba(0,210,255,0.35)]'
                      : 'border-[#1E2D4A] hover:border-slate-500'
                  } ${isFocused ? 'tv-focused ring-2 ring-[#00D2FF]' : ''}`}
                >
                  {/* Live Feed Miniature */}
                  <div className="absolute inset-0">
                    <CameraCanvasFeed camera={cam} showScanlines={false} showOsd={false} />
                  </div>

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

                  {/* Card Status Badges */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    {cam.status === 'online' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/90 text-black font-mono shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                        AO VIVO
                      </span>
                    )}
                    {cam.status === 'alert' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500 text-black font-mono animate-alarm-pulse">
                        ALERTA
                      </span>
                    )}
                    {cam.status === 'offline' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-900/90 text-rose-200 font-mono">
                        SEM SINAL
                      </span>
                    )}
                  </div>

                  {/* Resolution pill */}
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[9px] font-mono text-slate-300 border border-white/10">
                    {cam.resolution.split(' ')[0]}
                  </div>

                  {/* Bottom details */}
                  <div className="absolute bottom-2.5 left-3 right-3">
                    <p className="text-sm font-bold text-white truncate drop-shadow">
                      {cam.name}
                    </p>
                    <p className="text-[11px] text-slate-300 truncate">
                      {cam.location}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>


        {/* ============================================================
            RAIL 2: "Detecções Recentes & LPR (Placas de Veículos)"
            ============================================================ */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Car className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-slate-400">
                Detecções Recentes & LPR (Placas de Veículos)
              </h2>
              <span className="px-2 py-0.5 text-xs font-mono font-bold bg-[#131D33]/80 text-emerald-400 border border-emerald-500/30 rounded-full backdrop-blur-md">
                IA OCR ATIVO
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium hidden sm:block">
              Pressione OK para ver a gravação do momento da passagem
            </p>
          </div>

          <div className="flex items-center gap-5 overflow-x-auto tv-hide-scrollbar py-4 px-2 -mx-2">
            {lprDetections.map((lpr) => {
              const elementId = `rail2-lpr-${lpr.id}`;
              const isFocused = focusedElementId === elementId;

              return (
                <div
                  key={lpr.id}
                  id={elementId}
                  tabIndex={0}
                  onFocus={() => onElementFocus(elementId)}
                  onClick={() => onViewLprEvent(lpr)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onViewLprEvent(lpr);
                    }
                  }}
                  className={`group relative flex-shrink-0 w-80 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 tv-focus-target bg-[#131D33]/60 backdrop-blur-2xl border border-[#1E2D4A] shadow-xl ${
                    isFocused ? 'tv-focused ring-2 ring-emerald-400' : 'hover:border-slate-500'
                  }`}
                >
                  {/* Photo Header */}
                  <div className="relative h-36 w-full overflow-hidden bg-slate-900">
                    <img
                      src={lpr.thumbnailUrl}
                      alt={lpr.model}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#131D33] via-transparent to-black/30" />

                    {/* Mercosul Neon Plate Tag */}
                    <div className="absolute top-2.5 left-2.5 flex items-center border border-emerald-400/80 bg-black/80 backdrop-blur-md rounded-lg px-2.5 py-1 shadow-[0_0_12px_rgba(52,211,153,0.5)]">
                      <div className="w-1.5 h-3.5 bg-blue-600 rounded-xs mr-1.5" />
                      <span className="font-mono font-black text-sm text-emerald-300 tracking-widest">
                        {lpr.plate}
                      </span>
                    </div>

                    {/* Confidence % */}
                    <div className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-500/40 text-[11px] font-mono font-bold text-emerald-400 backdrop-blur-md">
                      {lpr.confidence}% Precisão
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white truncate">
                        {lpr.model}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {lpr.color}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 truncate font-medium">
                      {lpr.ownerName}
                    </p>

                    <div className="flex items-center justify-between pt-2 mt-1 border-t border-[#1E2D4A]/80 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-[#00D2FF]" />
                        {lpr.timestamp}
                      </span>
                      <span className="text-[#00D2FF] font-medium">
                        {lpr.cameraName.split(' ')[0]}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>


        {/* ============================================================
            RAIL 3: "Eventos de Movimento & Gravações"
            ============================================================ */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Video className="w-4 h-4 text-[#00D2FF]" />
              <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-slate-400">
                Eventos de Movimento & Gravações
              </h2>
              <span className="px-2 py-0.5 text-xs font-mono font-bold bg-[#131D33]/80 text-[#00D2FF] border border-[#00D2FF]/30 rounded-full backdrop-blur-md">
                MP4 H.264
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium hidden sm:block">
              Clique para reproduzir diretamente na Smart TV
            </p>
          </div>

          <div className="flex items-center gap-5 overflow-x-auto tv-hide-scrollbar py-4 px-2 -mx-2">
            {securityEvents.map((evt) => {
              const elementId = `rail3-evt-${evt.id}`;
              const isFocused = focusedElementId === elementId;

              return (
                <div
                  key={evt.id}
                  id={elementId}
                  tabIndex={0}
                  onFocus={() => onElementFocus(elementId)}
                  onClick={() => onPlayRecording(evt)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onPlayRecording(evt);
                    }
                  }}
                  className={`group relative flex-shrink-0 w-72 aspect-video rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 tv-focus-target bg-[#131D33]/60 backdrop-blur-xl border border-[#1E2D4A] ${
                    isFocused ? 'tv-focused ring-2 ring-[#00D2FF]' : 'hover:border-slate-500'
                  }`}
                >
                  <img
                    src={evt.thumbnailUrl}
                    alt={evt.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                  {/* Play Button Indicator */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-xl border border-[#00D2FF]/50 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(0,210,255,0.4)]">
                      <Play className="w-5 h-5 text-[#00D2FF] fill-current ml-0.5" />
                    </div>
                  </div>

                  {/* Clip duration & file size badges */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-mono font-bold text-[#00D2FF] border border-[#00D2FF]/30">
                      {evt.duration}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-mono text-slate-300 border border-white/10">
                      {evt.size}
                    </span>
                  </div>

                  {/* Event Information */}
                  <div className="absolute bottom-2.5 left-3 right-3">
                    <p className="text-xs font-bold text-white truncate drop-shadow">
                      {evt.title}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-300 mt-0.5">
                      <span>{evt.cameraName}</span>
                      <span className="font-mono text-[#00D2FF]">{evt.timestamp.split('•')[0]}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>


        {/* ============================================================
            RAIL 4: "Modos de Vigilância & Ações Rápidas"
            ============================================================ */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-slate-400">
              Modos de Vigilância & Ações Rápidas
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 py-2">
            
            {/* Card 1: Ronda Automática */}
            <div
              id="action-patrol"
              tabIndex={0}
              onFocus={() => onElementFocus('action-patrol')}
              onClick={() => onUpdateSettings({ autoTourActive: !settings.autoTourActive })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onUpdateSettings({ autoTourActive: !settings.autoTourActive });
                }
              }}
              className={`p-5 rounded-2xl bg-glass-card border border-glass cursor-pointer transition-all duration-200 tv-focus-target flex items-start gap-4 shadow-xl ${
                focusedElementId === 'action-patrol' ? 'tv-focused ring-2 ring-[#00D2FF]' : 'hover:border-[#00D2FF]/50'
              }`}
            >
              <div className={`p-3 rounded-2xl ${settings.autoTourActive ? 'bg-[#00D2FF]/20 text-[#00D2FF] border border-[#00D2FF]/50 shadow-[0_0_12px_rgba(0,210,255,0.4)]' : 'bg-slate-800/80 text-slate-400'}`}>
                <RotateCw className={`w-6 h-6 ${settings.autoTourActive ? 'animate-spin' : ''}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-100">Ativar Ronda Automática</h3>
                  {settings.autoTourActive && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00D2FF]/20 text-[#00D2FF] border border-[#00D2FF]/40">
                      ATIVO
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Alterna ciclicamente entre as câmeras a cada 10 segundos no Hero Billboard.
                </p>
              </div>
            </div>

            {/* Card 2: Modo Alarme Noturno */}
            <div
              id="action-night-alarm"
              tabIndex={0}
              onFocus={() => onElementFocus('action-night-alarm')}
              onClick={() => onUpdateSettings({ nightAlarmMode: !settings.nightAlarmMode })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onUpdateSettings({ nightAlarmMode: !settings.nightAlarmMode });
                }
              }}
              className={`p-5 rounded-2xl bg-glass-card border border-glass cursor-pointer transition-all duration-200 tv-focus-target flex items-start gap-4 shadow-xl ${
                focusedElementId === 'action-night-alarm' ? 'tv-focused ring-2 ring-amber-400' : 'hover:border-amber-500/50'
              }`}
            >
              <div className={`p-3 rounded-2xl ${settings.nightAlarmMode ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.4)]' : 'bg-slate-800/80 text-slate-400'}`}>
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-100">Modo Alarme Noturno</h3>
                  {settings.nightAlarmMode && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/30">
                      ATIVO
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Sensibilidade máxima nos sensores perimetrais com alerta sonoro imediato na TV.
                </p>
              </div>
            </div>

            {/* Card 3: Modo Picture-in-Picture */}
            <div
              id="action-pip"
              tabIndex={0}
              onFocus={() => onElementFocus('action-pip')}
              onClick={() => onUpdateSettings({ pipEnabled: !settings.pipEnabled })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onUpdateSettings({ pipEnabled: !settings.pipEnabled });
                }
              }}
              className={`p-5 rounded-2xl bg-glass-card border border-glass cursor-pointer transition-all duration-200 tv-focus-target flex items-start gap-4 shadow-xl ${
                focusedElementId === 'action-pip' ? 'tv-focused ring-2 ring-purple-400' : 'hover:border-purple-500/50'
              }`}
            >
              <div className={`p-3 rounded-2xl ${settings.pipEnabled ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.4)]' : 'bg-slate-800/80 text-slate-400'}`}>
                <PictureInPicture2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-100">Modo Picture-in-Picture</h3>
                  {settings.pipEnabled && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-500/30">
                      ATIVO
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Mantém uma janela flutuante no canto superior enquanto você navega ou usa outros apps.
                </p>
              </div>
            </div>

          </div>
        </section>

      </div>

    </div>
  );
};
