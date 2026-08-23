"use client";

import { useAlertStore } from "@/store/useCameraStore";
import { API_BASE, MotionEvent } from "@/lib/api-client";
import { Bell, Clock, Activity, Play, Film } from "lucide-react";
import { useState } from "react";

interface SidebarProps {
  isOpen: boolean;
}

export function Sidebar({ isOpen }: SidebarProps) {
  const recentEvents = useAlertStore((state) => state.recentEvents);
  const [selectedEvent, setSelectedEvent] = useState<MotionEvent | null>(null);

  if (!isOpen) return null;

  return (
    <>
      <aside className="w-80 h-full panel-dark border-l border-white/10 flex flex-col shrink-0 overflow-hidden">
        {/* Header */}
        <div className="h-12 px-4 border-b border-white/10 flex items-center justify-between bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wide">Últimos Eventos</h2>
          </div>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {recentEvents.length}
          </span>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {recentEvents.length > 0 ? (
            recentEvents.map((evt, idx) => {
              const date = new Date(evt.timestamp);
              const timeStr = isNaN(date.getTime())
                ? evt.timestamp
                : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedEvent(evt)}
                  className="flex flex-col p-2.5 rounded-lg card-dark hover:border-blue-500/40 cursor-pointer transition shadow-sm"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-white truncate max-w-[140px]">
                      {evt.camera_name || `Câmera #${evt.camera_id}`}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{timeStr}</span>
                    </div>
                  </div>

                  {evt.thumbnail_url && (
                    <div className="relative aspect-video w-full rounded overflow-hidden bg-black mb-2 border border-white/5">
                      <img
                        src={`${API_BASE}${evt.thumbnail_url}`}
                        alt="Miniatura do evento"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] text-emerald-400 font-mono font-bold">
                        {(evt.score * 100).toFixed(1)}% mov
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] pt-1 border-t border-white/5">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Activity className="w-3 h-3" /> Alerta emitido
                    </span>
                    <span className="text-blue-400 font-mono">Telegram OK</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center p-4">
              <Bell className="w-8 h-8 stroke-1 text-slate-600 mb-2" />
              <p className="text-xs font-medium text-slate-300">Sem detecções recentes</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Alertas de movimento aparecerão aqui em tempo real.
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* Video Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="card-dark rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl border border-white/10">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-slate-900/50">
              <div>
                <h3 className="text-xs font-bold text-white">
                  {selectedEvent.camera_name} &bull; Gravação do Evento
                </h3>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {new Date(selectedEvent.timestamp).toLocaleString("pt-BR")}
                </p>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="h-7 px-3 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition"
              >
                Fechar
              </button>
            </div>

            <div className="aspect-video w-full bg-black flex items-center justify-center">
              {selectedEvent.video_path ? (
                <video
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                  src={`${API_BASE}/api/events/video/${selectedEvent.camera_id}/${new Date(selectedEvent.timestamp).toISOString().split("T")[0]}/${selectedEvent.video_path.split("/").pop()}`}
                />
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-slate-500 text-xs">
                  <Film className="w-6 h-6 stroke-1" />
                  <span>Vídeo não disponível para este evento.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
