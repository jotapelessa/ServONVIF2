import React, { useEffect, useState } from 'react';
import { ActiveAlertPip, Camera } from '../types';
import { CameraCanvasFeed } from './CameraCanvasFeed';
import { Maximize2, X, ShieldAlert, Car, User, Activity, BellRing } from 'lucide-react';

interface MultiCameraPipDockProps {
  alerts: ActiveAlertPip[];
  onDismissAlert: (alertId: string) => void;
  onDismissAll: () => void;
  onMaximize: (camera: Camera) => void;
  focusedElementId: string | null;
  onElementFocus: (id: string) => void;
  position?: 'bottom_right' | 'top_right' | 'bottom_left' | 'top_left';
}

export const MultiCameraPipDock: React.FC<MultiCameraPipDockProps> = ({
  alerts,
  onDismissAlert,
  onDismissAll,
  onMaximize,
  focusedElementId,
  onElementFocus,
  position = 'bottom_right',
}) => {
  const [, setClock] = useState(0);

  // Re-render every 200ms to update the smooth countdown timer bars
  useEffect(() => {
    if (alerts.length === 0) return;
    const interval = setInterval(() => {
      setClock((prev) => prev + 1);
    }, 200);
    return () => clearInterval(interval);
  }, [alerts.length]);

  if (alerts.length === 0) return null;

  // Maximum 3 simultaneous alert previews visible side-by-side
  const visibleAlerts = alerts.slice(0, 3);
  const hiddenCount = Math.max(0, alerts.length - 3);

  // Dynamic width scaling based on alert count (prevents taking up whole screen)
  // 1 alert -> w-72 (288px)
  // 2 alerts -> w-60 (240px)
  // 3 alerts -> w-52 (208px)
  const getCardWidthClass = (count: number) => {
    if (count === 1) return 'w-72 sm:w-80';
    if (count === 2) return 'w-56 sm:w-64';
    return 'w-48 sm:w-56';
  };

  const cardWidthClass = getCardWidthClass(visibleAlerts.length);

  // Position classes
  const getPositionClass = () => {
    switch (position) {
      case 'top_right':
        return 'top-20 right-4 sm:right-8';
      case 'top_left':
        return 'top-20 left-4 sm:left-8';
      case 'bottom_left':
        return 'bottom-6 left-4 sm:left-8';
      case 'bottom_right':
      default:
        return 'bottom-6 right-4 sm:right-8';
    }
  };

  return (
    <div
      className={`fixed ${getPositionClass()} z-50 flex flex-col items-end gap-2 pointer-events-auto select-none transition-all duration-300 max-w-[95vw]`}
    >
      {/* Top Header Bar if multiple alerts are active */}
      {alerts.length > 1 && (
        <div className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-full bg-[#070B14]/90 backdrop-blur-xl border border-white/10 shadow-2xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
            <BellRing className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="font-mono text-cyan-400">{alerts.length}</span>
            <span>Detecções Ativas</span>
            {hiddenCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-mono">
                +{hiddenCount} na fila
              </span>
            )}
          </div>
          <button
            onClick={onDismissAll}
            className="px-2 py-0.5 rounded-full bg-white/10 hover:bg-rose-500/80 text-[10px] font-semibold text-slate-300 hover:text-white transition-colors"
          >
            Fechar Todos
          </button>
        </div>
      )}

      {/* Horizontal Side-by-Side PiP Tiles Container */}
      <div className="flex flex-row items-end gap-3 sm:gap-4 overflow-x-auto max-w-full pb-1">
        {visibleAlerts.map((alert) => {
          const elementId = `pip-card-${alert.id}`;
          const isFocused = focusedElementId === elementId;
          const now = Date.now();
          const totalDuration = Math.max(1000, alert.expiresAt - alert.timestamp);
          const remaining = Math.max(0, alert.expiresAt - now);
          const progressPercent = Math.min(100, Math.max(0, (remaining / totalDuration) * 100));
          const secondsLeft = Math.ceil(remaining / 1000);

          // Neon Border & Icon style according to alert type
          const isPerson = alert.type === 'person';
          const isLpr = alert.type === 'lpr' || alert.type === 'vehicle';
          
          const borderStyle = isPerson
            ? 'border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.4)]'
            : isLpr
            ? 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.4)]'
            : 'border-cyan-400 shadow-[0_0_20px_rgba(0,210,255,0.4)]';

          const badgeBg = isPerson
            ? 'bg-rose-500 text-white'
            : isLpr
            ? 'bg-emerald-500 text-black'
            : 'bg-amber-500 text-black';

          return (
            <div
              key={alert.id}
              id={elementId}
              tabIndex={0}
              onFocus={() => onElementFocus(elementId)}
              onClick={() => onMaximize(alert.camera)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onMaximize(alert.camera);
                } else if (e.key === 'x' || e.key === 'X' || e.key === 'Delete') {
                  e.preventDefault();
                  onDismissAlert(alert.id);
                }
              }}
              className={`group relative ${cardWidthClass} aspect-video rounded-2xl overflow-hidden bg-black/90 border-2 cursor-pointer transition-all duration-200 tv-focus-target ${borderStyle} ${
                isFocused ? 'tv-focused ring-4 ring-white scale-105 z-30' : 'hover:scale-[1.02]'
              }`}
            >
              {/* Real Live Camera Stream */}
              <div className="absolute inset-0 w-full h-full">
                <CameraCanvasFeed camera={alert.camera} showScanlines={false} showOsd={false} />
              </div>

              {/* Gradient Vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/70 pointer-events-none" />

              {/* Top Bar: Live Badge & Actions */}
              <div className="absolute top-2 inset-x-2 flex items-center justify-between z-10 gap-1">
                <div className="flex items-center gap-1 min-w-0">
                  <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase font-mono tracking-wider shadow ${badgeBg}`}>
                    {isPerson ? <User className="w-2.5 h-2.5" /> : isLpr ? <Car className="w-2.5 h-2.5" /> : <Activity className="w-2.5 h-2.5" />}
                    <span className="truncate">{alert.label || 'MOVIMENTO'}</span>
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMaximize(alert.camera);
                    }}
                    title="Maximizar Tela Cheia (OK)"
                    className="p-1 rounded-md bg-black/70 hover:bg-white/30 text-white transition-colors"
                  >
                    <Maximize2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDismissAlert(alert.id);
                    }}
                    title="Fechar PiP"
                    className="p-1 rounded-md bg-black/70 hover:bg-rose-500 text-slate-300 hover:text-white transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Bottom Bar: Camera Name & Countdown Progress Bar */}
              <div className="absolute bottom-0 inset-x-0 p-2 z-10 flex flex-col gap-1">
                <div className="flex items-center justify-between text-white drop-shadow">
                  <span className="text-[11px] font-bold truncate max-w-[120px]">
                    {alert.camera.name}
                  </span>
                  <span className="text-[9px] font-mono text-slate-300 font-semibold">
                    {secondsLeft}s
                  </span>
                </div>

                {/* Animated Countdown Progress Bar */}
                <div className="w-full h-1 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-200 ${
                      isPerson ? 'bg-rose-500' : isLpr ? 'bg-emerald-400' : 'bg-cyan-400'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
