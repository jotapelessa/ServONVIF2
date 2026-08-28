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
  CheckCircle2,
  Inbox,
  Tv
} from 'lucide-react';
import { Camera, LprDetection, SecurityEvent, TVSettings } from '../types';
import { HeroBillboard } from './HeroBillboard';
import { CameraCanvasFeed } from './CameraCanvasFeed';

interface HomeTabProps {
  cameras: Camera[];
  selectedCamera: Camera | null;
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
    if (!selectedCamera) return;
    const updated = { ...selectedCamera, audioEnabled: !selectedCamera.audioEnabled };
    onSelectCamera(updated);
  };

  const handleNextCamera = () => {
    if (cameras.length === 0 || !selectedCamera) return;
    const currentIndex = cameras.findIndex((c) => c.id === selectedCamera.id);
    const nextIndex = (currentIndex + 1) % cameras.length;
    onSelectCamera(cameras[nextIndex]);
  };

  const handleTogglePiP = () => {
    if ((window as any).AndroidNative?.triggerPiP && selectedCamera) {
      (window as any).AndroidNative.triggerPiP(selectedCamera.id, selectedCamera.name);
    } else {
      onUpdateSettings({ pipEnabled: !settings.pipEnabled });
    }
  };

  return (
    <div className="flex flex-col w-full min-h-screen pb-24 select-none">
      
      {/* 1. HERO BILLBOARD */}
      <HeroBillboard
        camera={selectedCamera}
        onWatchFullscreen={() => selectedCamera && onOpenFullscreen(selectedCamera)}
        onOpenMosaic={onOpenMosaic}
        onTakeSnapshot={() => selectedCamera && onTakeSnapshot(selectedCamera)}
        onToggleAudio={handleToggleAudio}
        onNextCamera={handleNextCamera}
        focusedElementId={focusedElementId}
        onElementFocus={onElementFocus}
        showScanlines={settings.showScanlines}
      />

      {/* RAILS CONTAINER */}
      <div className="flex flex-col gap-10 px-4 sm:px-8 md:px-12 -mt-4 z-20">
        
        {/* ============================================================
            RAIL 1: "Câmeras Conectadas"
            ============================================================ */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-slate-400">
                Câmeras Conectadas
              </h2>
              <span className="px-2 py-0.5 text-xs font-mono font-bold bg-[#131D33]/80 text-[#00D2FF] border border-[#00D2FF]/30 rounded-full backdrop-blur-md">
                {cameras.length} ATIVAS
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium hidden sm:block">
              Navegue com D-pad para alternar a câmera em destaque
            </p>
          </div>

          {cameras.length === 0 ? (
            <div className="w-full p-6 rounded-2xl bg-[#131D33]/40 border border-[#1E2D4A]/60 flex items-center justify-center gap-3 text-slate-400 text-sm">
              <Tv className="w-5 h-5 text-[#00D2FF]" />
              <span>Nenhuma câmera ativa encontrada no servidor local ou Tailscale.</span>
            </div>
          ) : (
            <div className="flex items-center gap-4 sm:gap-5 overflow-x-auto tv-hide-scrollbar py-3 px-1">
              {cameras.map((cam) => {
                const isSelected = selectedCamera?.id === cam.id;
                const elementId = `rail1-cam-${cam.id}`;
                const isFocused = focusedElementId === elementId;

                return (
                  <div
                    key={cam.id}
                    id={elementId}
                    tabIndex={0}
                    onFocus={() => {
                      onElementFocus(elementId);
                      onSelectCamera(cam);
                    }}
                    onClick={() => onOpenFullscreen(cam)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onOpenFullscreen(cam);
                      }
                    }}
                    className={`group relative flex-shrink-0 w-64 sm:w-72 aspect-video rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 tv-focus-target bg-[#131D33]/60 backdrop-blur-xl border ${
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
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500 text-black font-mono">
                          ALERTA
                        </span>
                      )}
                      {cam.status === 'offline' && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-900/90 text-rose-200 font-mono">
                          OFFLINE
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
          )}
        </section>

        {/* ============================================================
            RAIL 2: "Detecções & LPR (Placas de Veículos)"
            ============================================================ */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Car className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-slate-400">
                Detecções & LPR (Placas de Veículos)
              </h2>
              <span className="px-2 py-0.5 text-xs font-mono font-bold bg-[#131D33]/80 text-emerald-400 border border-emerald-500/30 rounded-full backdrop-blur-md">
                {lprDetections.length} IDENTIFICADAS
              </span>
            </div>
          </div>

          {lprDetections.length === 0 ? (
            <div className="w-full p-6 rounded-2xl bg-[#131D33]/40 border border-[#1E2D4A]/60 flex items-center justify-center gap-3 text-slate-400 text-sm">
              <Car className="w-5 h-5 text-emerald-400" />
              <span>Nenhuma placa de veículo detectada recentemente. O reconhecimento automático está ativo.</span>
            </div>
          ) : (
            <div className="flex items-center gap-4 sm:gap-5 overflow-x-auto tv-hide-scrollbar py-3 px-1">
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
                    className={`group relative flex-shrink-0 w-72 sm:w-80 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 tv-focus-target bg-[#131D33]/60 backdrop-blur-2xl border border-[#1E2D4A] shadow-xl ${
                      isFocused ? 'tv-focused ring-2 ring-emerald-400' : 'hover:border-slate-500'
                    }`}
                  >
                    {/* Photo Header */}
                    <div className="relative h-32 sm:h-36 w-full overflow-hidden bg-slate-900 flex items-center justify-center">
                      {lpr.thumbnailUrl ? (
                        <img
                          src={lpr.thumbnailUrl}
                          alt={lpr.plate}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Car className="w-12 h-12 text-slate-700" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#131D33] via-transparent to-black/30" />

                      {/* Mercosul Plate Tag */}
                      <div className="absolute top-2.5 left-2.5 flex items-center border border-emerald-400/80 bg-black/80 backdrop-blur-md rounded-lg px-2.5 py-1 shadow-[0_0_12px_rgba(52,211,153,0.5)]">
                        <div className="w-1.5 h-3.5 bg-blue-600 rounded-xs mr-1.5" />
                        <span className="font-mono font-black text-sm text-emerald-300 tracking-widest">
                          {lpr.plate}
                        </span>
                      </div>

                      {/* Confidence */}
                      <div className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-500/40 text-[11px] font-mono font-bold text-emerald-400 backdrop-blur-md">
                        {lpr.confidence}%
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-3.5 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white truncate">
                          {lpr.model || lpr.vehicleType || 'Veículo'}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {lpr.color}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>{lpr.cameraName}</span>
                        <span>{new Date(lpr.timestamp).toLocaleTimeString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ============================================================
            RAIL 3: "Eventos & Gravações Recentes"
            ============================================================ */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Video className="w-4 h-4 text-purple-400" />
              <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-slate-400">
                Eventos & Gravações Recentes
              </h2>
              <span className="px-2 py-0.5 text-xs font-mono font-bold bg-[#131D33]/80 text-purple-400 border border-purple-500/30 rounded-full backdrop-blur-md">
                {securityEvents.length} GRAVAÇÕES
              </span>
            </div>
          </div>

          {securityEvents.length === 0 ? (
            <div className="w-full p-6 rounded-2xl bg-[#131D33]/40 border border-[#1E2D4A]/60 flex items-center justify-center gap-3 text-slate-400 text-sm">
              <Inbox className="w-5 h-5 text-purple-400" />
              <span>Nenhuma gravação de evento encontrada. Novos clipes gravados aparecerão automaticamente aqui.</span>
            </div>
          ) : (
            <div className="flex items-center gap-4 sm:gap-5 overflow-x-auto tv-hide-scrollbar py-3 px-1">
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
                    className={`group relative flex-shrink-0 w-72 sm:w-80 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 tv-focus-target bg-[#131D33]/60 backdrop-blur-2xl border border-[#1E2D4A] shadow-xl ${
                      isFocused ? 'tv-focused ring-2 ring-purple-400' : 'hover:border-slate-500'
                    }`}
                  >
                    <div className="relative h-32 sm:h-36 w-full overflow-hidden bg-slate-900 flex items-center justify-center">
                      {evt.thumbnailUrl ? (
                        <img
                          src={evt.thumbnailUrl}
                          alt={evt.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Video className="w-12 h-12 text-slate-700" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#131D33] via-transparent to-black/30" />

                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-xs">
                        <div className="p-3 rounded-full bg-purple-600 text-white shadow-lg shadow-purple-600/50">
                          <Play className="w-5 h-5 fill-current" />
                        </div>
                      </div>

                      <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/80 font-mono text-[10px] text-white border border-white/10">
                        {evt.duration}
                      </div>
                    </div>

                    <div className="p-3.5 flex flex-col gap-1">
                      <p className="text-sm font-bold text-white truncate">
                        {evt.title}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>{evt.cameraName}</span>
                        <span>{new Date(evt.timestamp).toLocaleTimeString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ============================================================
            RAIL 4: "Ações Rápidas do Sistema"
            ============================================================ */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-slate-400">
            Ações Rápidas & Modos Operacionais
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* Action 1: Tour Automático */}
            <div
              id="action-tour"
              tabIndex={0}
              onFocus={() => onElementFocus('action-tour')}
              onClick={() => onUpdateSettings({ autoTourActive: !settings.autoTourActive })}
              className={`p-4 rounded-2xl bg-[#131D33]/60 backdrop-blur-xl border border-[#1E2D4A] cursor-pointer transition-all flex items-center gap-3 tv-focus-target ${
                focusedElementId === 'action-tour' ? 'tv-focused ring-2 ring-cyan-400' : ''
              }`}
            >
              <div className={`p-3 rounded-xl ${settings.autoTourActive ? 'bg-cyan-500 text-black' : 'bg-slate-800 text-cyan-400'}`}>
                <RotateCw className={`w-5 h-5 ${settings.autoTourActive ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Patrulha Automática</p>
                <p className="text-xs text-slate-400">{settings.autoTourActive ? 'Ativo (10s por câmera)' : 'Pausado'}</p>
              </div>
            </div>

            {/* Action 2: PiP Flutuante Nativo */}
            <div
              id="action-pip"
              tabIndex={0}
              onFocus={() => onElementFocus('action-pip')}
              onClick={handleTogglePiP}
              className={`p-4 rounded-2xl bg-[#131D33]/60 backdrop-blur-xl border border-[#1E2D4A] cursor-pointer transition-all flex items-center gap-3 tv-focus-target ${
                focusedElementId === 'action-pip' ? 'tv-focused ring-2 ring-purple-400' : ''
              }`}
            >
              <div className={`p-3 rounded-xl ${settings.pipEnabled ? 'bg-purple-500 text-white' : 'bg-slate-800 text-purple-400'}`}>
                <PictureInPicture2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">PiP Flutuante</p>
                <p className="text-xs text-slate-400">Sobreposição de Alertas</p>
              </div>
            </div>

            {/* Action 3: Modo Alarme Noturno */}
            <div
              id="action-night-mode"
              tabIndex={0}
              onFocus={() => onElementFocus('action-night-mode')}
              onClick={() => onUpdateSettings({ nightAlarmMode: !settings.nightAlarmMode })}
              className={`p-4 rounded-2xl bg-[#131D33]/60 backdrop-blur-xl border border-[#1E2D4A] cursor-pointer transition-all flex items-center gap-3 tv-focus-target ${
                focusedElementId === 'action-night-mode' ? 'tv-focused ring-2 ring-amber-400' : ''
              }`}
            >
              <div className={`p-3 rounded-xl ${settings.nightAlarmMode ? 'bg-amber-500 text-black' : 'bg-slate-800 text-amber-400'}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Alarme Noturno</p>
                <p className="text-xs text-slate-400">{settings.nightAlarmMode ? 'Alerta Sonoro Ativo' : 'Silencioso'}</p>
              </div>
            </div>

            {/* Action 4: Efeito Scanlines */}
            <div
              id="action-scanlines"
              tabIndex={0}
              onFocus={() => onElementFocus('action-scanlines')}
              onClick={() => onUpdateSettings({ showScanlines: !settings.showScanlines })}
              className={`p-4 rounded-2xl bg-[#131D33]/60 backdrop-blur-xl border border-[#1E2D4A] cursor-pointer transition-all flex items-center gap-3 tv-focus-target ${
                focusedElementId === 'action-scanlines' ? 'tv-focused ring-2 ring-emerald-400' : ''
              }`}
            >
              <div className={`p-3 rounded-xl ${settings.showScanlines ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-emerald-400'}`}>
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Linhas de Varredura</p>
                <p className="text-xs text-slate-400">{settings.showScanlines ? 'Efeito CRT Ligado' : 'Desligado'}</p>
              </div>
            </div>

          </div>
        </section>

      </div>
    </div>
  );
};
