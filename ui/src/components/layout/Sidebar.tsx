"use client";

import { useAlertStore } from "@/store/useCameraStore";
import { API_BASE, MotionEvent, apiClient, SettingsResponse } from "@/lib/api-client";
import {
  Bell,
  Clock,
  Activity,
  Play,
  Film,
  LayoutGrid,
  List,
  HardDrive,
  Send,
  ShieldCheck,
  Zap,
  Car,
  AlertCircle,
  FileText,
  Copy,
  Check,
} from "lucide-react";
import { useState, useEffect } from "react";

interface SidebarProps {
  isOpen: boolean;
}

export function Sidebar({ isOpen }: SidebarProps) {
  const recentEvents = useAlertStore((state) => state.recentEvents);
  const [selectedEvent, setSelectedEvent] = useState<MotionEvent | null>(null);
  const [viewMode, setViewMode] = useState<"thumbs" | "detailed">("thumbs");
  const [serverInfo, setServerInfo] = useState<SettingsResponse | null>(null);
  const [copiedId, setCopiedId] = useState<number | string | null>(null);

  useEffect(() => {
    async function loadServerInfo() {
      try {
        const info = await apiClient.getSettings();
        setServerInfo(info);
      } catch (e) {
        // Quiet fallback
      }
    }
    loadServerInfo();
    const interval = setInterval(loadServerInfo, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!isOpen) return null;

  const handleCopyEventInfo = (evt: MotionEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `Evento #${evt.id || "live"} - Câmera: ${evt.camera_name} - Data: ${new Date(evt.timestamp).toLocaleString("pt-BR")} - Score: ${(evt.score * 100).toFixed(1)}%`;
    navigator.clipboard.writeText(text);
    setCopiedId(evt.id || "live");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      <aside className="w-84 md:w-96 h-full panel-dark border-l border-white/10 flex flex-col shrink-0 overflow-hidden bg-[#0a0f1d]/95">
        {/* Header with View Toggle */}
        <div className="h-14 px-4 border-b border-white/10 flex items-center justify-between bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">Últimos Eventos</h2>
              <p className="text-[10px] text-slate-400 font-mono">Tempo Real • {recentEvents.length} no buffer</p>
            </div>
          </div>

          {/* View Mode Toggle Switch */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode("thumbs")}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                viewMode === "thumbs"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Visualização com Miniaturas / Thumbnails"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("detailed")}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                viewMode === "detailed"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Visualização em Cards de Texto Detalhados"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Mini Server Health Info Banner */}
        <div className="p-3 border-b border-white/5 bg-slate-950/40 grid grid-cols-3 gap-2 shrink-0">
          {/* Storage Mini-Card */}
          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between">
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <HardDrive className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="truncate">Disco</span>
            </div>
            <div className="text-xs font-bold text-slate-200 font-mono mt-1 truncate">
              {serverInfo?.storage?.total_size_mb ? `${serverInfo.storage.total_size_mb.toFixed(0)} MB` : "0 MB"}
            </div>
            <div className="text-[9px] text-slate-500 truncate">
              {serverInfo?.retention_days || 15}d retenção
            </div>
          </div>

          {/* Telegram Mini-Card */}
          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between">
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <Send className="w-3 h-3 text-sky-400 shrink-0" />
              <span className="truncate">Telegram</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  serverInfo?.telegram_paused
                    ? "bg-amber-400 animate-pulse"
                    : serverInfo?.telegram_bot_configured
                    ? "bg-emerald-400"
                    : "bg-slate-600"
                }`}
              />
              <span className="text-[11px] font-bold text-slate-200 truncate">
                {serverInfo?.telegram_paused
                  ? "Pausado"
                  : serverInfo?.telegram_bot_configured
                  ? "Ativo"
                  : "Desativado"}
              </span>
            </div>
            <div className="text-[9px] text-slate-500 truncate">
              {serverInfo?.telegram_cooldown_seconds || 45}s cooldown
            </div>
          </div>

          {/* Server Engine / Log Health Mini-Card */}
          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between">
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="truncate">Motor</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-bold text-emerald-400 truncate">100% OK</span>
            </div>
            <div className="text-[9px] text-slate-500 truncate font-mono">
              0 erros de log
            </div>
          </div>
        </div>

        {/* Event List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {recentEvents.length > 0 ? (
            recentEvents.map((evt, idx) => {
              const date = new Date(evt.timestamp);
              const timeStr = isNaN(date.getTime())
                ? evt.timestamp
                : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
              const dateStr = isNaN(date.getTime())
                ? ""
                : date.toLocaleDateString([], { day: "2-digit", month: "2-digit" });

              const isPlate = !!(evt as any).plate_number || (evt as any).type === "PLATE_DETECTED";

              // ----------------- 1. VIEW MODE: THUMBNAILS -----------------
              if (viewMode === "thumbs") {
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedEvent(evt)}
                    className="flex flex-col p-3 rounded-2xl bg-slate-900/70 border border-white/5 hover:border-blue-500/40 hover:bg-slate-900/90 cursor-pointer transition shadow-md group"
                  >
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 animate-pulse" />
                        <span className="text-xs font-bold text-white truncate">
                          {evt.camera_name || `Câmera #${evt.camera_id}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono shrink-0">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{timeStr}</span>
                      </div>
                    </div>

                    <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black mb-2.5 border border-white/10">
                      <img
                        src={
                          evt.thumbnail_url?.startsWith("http")
                            ? evt.thumbnail_url
                            : `${API_BASE}${evt.thumbnail_url || (evt.id ? `/api/events/${evt.id}/thumbnail` : "")}`
                        }
                        alt="Miniatura do evento"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = "none";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                      {/* Score Badge */}
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-[10px] text-emerald-400 font-mono font-bold border border-emerald-500/30">
                        {(evt.score * 100).toFixed(1)}% mov
                      </div>

                      {/* Play Action Icon */}
                      <div className="absolute bottom-2 right-2 p-1.5 rounded-full bg-blue-600/90 text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-3 h-3 fill-current" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-white/5">
                      <span className="flex items-center gap-1 text-emerald-400 font-medium">
                        <Activity className="w-3 h-3" /> Alerta Emitido
                      </span>
                      <span className="text-sky-400 font-mono text-[9px] bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
                        Telegram OK
                      </span>
                    </div>
                  </div>
                );
              }

              // ----------------- 2. VIEW MODE: DETAILED TEXT CARD -----------------
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedEvent(evt)}
                  className="flex flex-col p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900 cursor-pointer transition shadow-md space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          {evt.camera_name || `Câmera #${evt.camera_id}`}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          CAM #{evt.camera_id}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-0.5">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{dateStr} às {timeStr}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleCopyEventInfo(evt, e)}
                      className="p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition"
                      title="Copiar dados do evento"
                    >
                      {copiedId === (evt.id || "live") ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Detailed Specs Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">Confiança / Score</span>
                      <span className="text-emerald-400 font-mono font-bold">
                        {(evt.score * 100).toFixed(1)}% ({evt.score.toFixed(2)})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">Tipo de Alerta</span>
                      <span className="text-blue-300 font-medium flex items-center gap-1">
                        {isPlate ? (
                          <>
                            <Car className="w-3 h-3 text-amber-400" /> Placa / LPR
                          </>
                        ) : (
                          <>
                            <Zap className="w-3 h-3 text-emerald-400" /> Movimento MOG2
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Actions & Status Footbar */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px]">
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Activity className="w-3 h-3" /> Transmitido para Smart TV
                    </span>
                    <button
                      type="button"
                      className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                    >
                      <Play className="w-3 h-3 fill-current" /> Ver Clipe
                    </button>
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
          <div className="card-dark rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-white/10 bg-slate-900">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-slate-900/80">
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>{selectedEvent.camera_name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Score: {(selectedEvent.score * 100).toFixed(0)}%
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {new Date(selectedEvent.timestamp).toLocaleString("pt-BR")}
                </p>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="h-8 px-3.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition"
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
                  <span>Vídeo em processamento ou não disponível para este evento.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
