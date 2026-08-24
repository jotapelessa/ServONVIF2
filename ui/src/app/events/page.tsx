"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { apiClient, MotionEvent, Camera, API_BASE } from "@/lib/api-client";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAlertStore } from "@/store/useCameraStore";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Play,
  Film,
  Download,
  Trash2,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  Repeat,
  FastForward,
  X,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  CalendarDays,
  CalendarRange,
  Car,
  User,
  Video,
  SlidersHorizontal,
} from "lucide-react";

const EVENT_FILTER_MAP: Record<string, "ALL" | "PLATES" | "PERSONS" | "VIDEOS"> = {
  all: "ALL",
  todos: "ALL",
  placas: "PLATES",
  plates: "PLATES",
  veiculos: "PLATES",
  pessoas: "PERSONS",
  persons: "PERSONS",
  movimento: "PERSONS",
  videos: "VIDEOS",
  gravacoes: "VIDEOS",
  mp4: "VIDEOS",
};

const EVENT_FILTER_REVERSE: Record<string, string> = {
  ALL: "todos",
  PLATES: "placas",
  PERSONS: "pessoas",
  VIDEOS: "videos",
};

export default function EventsPage({ initialFilter }: { initialFilter?: string }) {
  useWebSocket();
  const recentEvents = useAlertStore((state) => state.recentEvents);

  const [events, setEvents] = useState<MotionEvent[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("ALL");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<"ALL" | "PLATES" | "PERSONS" | "VIDEOS">(() => {
    if (initialFilter && EVENT_FILTER_MAP[initialFilter.toLowerCase()]) {
      return EVENT_FILTER_MAP[initialFilter.toLowerCase()];
    }
    return "ALL";
  });
  const [selectedEventIndex, setSelectedEventIndex] = useState<number | null>(null);

  const handleSwitchCategory = (cat: "ALL" | "PLATES" | "PERSONS" | "VIDEOS") => {
    setFilterCategory(cat);
    const slug = EVENT_FILTER_REVERSE[cat] || "todos";
    if (typeof window !== "undefined") {
      window.history.pushState(null, "", `/events/${slug}`);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const segments = window.location.pathname.split("/").filter(Boolean);
      const lastSeg = segments[segments.length - 1]?.toLowerCase();
      if (lastSeg && EVENT_FILTER_MAP[lastSeg]) {
        setFilterCategory(EVENT_FILTER_MAP[lastSeg]);
      }
    }

    const onPopState = () => {
      const segments = window.location.pathname.split("/").filter(Boolean);
      const lastSeg = segments[segments.length - 1]?.toLowerCase();
      if (lastSeg && EVENT_FILTER_MAP[lastSeg]) {
        setFilterCategory(EVENT_FILTER_MAP[lastSeg]);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Batch Delete Dropdown & Modal States
  const [isDeleteMenuOpen, setIsDeleteMenuOpen] = useState(false);
  const [confirmDeleteMode, setConfirmDeleteMode] = useState<"day" | "older_than_7_days" | "older_than_30_days" | "all" | null>(null);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);
  const [batchDeleteResult, setBatchDeleteResult] = useState<string | null>(null);

  // Player Settings
  const [autoPlayNext, setAutoPlayNext] = useState<boolean>(true);
  const [loopCurrent, setLoopCurrent] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [eventsData, camerasData] = await Promise.all([
        apiClient.getEvents(200),
        apiClient.getCameras(),
      ]);
      setEvents(eventsData);
      setCameras(camerasData);
    } catch (e) {
      console.error("Failed to load events:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync real-time events from WebSocket store
  useEffect(() => {
    if (recentEvents.length > 0) {
      setEvents((prev) => {
        const existingIds = new Set(prev.map((e) => e.id));
        const newItems = recentEvents.filter((e) => !existingIds.has(e.id));
        return [...newItems, ...prev];
      });
    }
  }, [recentEvents]);

  // Counts for category badges
  const categoryStats = useMemo(() => {
    const plates = events.filter((e) => !!(e as any).plate_number || (e as any).type === "PLATE_DETECTED").length;
    const persons = events.filter((e) => e.score >= 0.03).length;
    const videos = events.filter((e) => !!e.video_path).length;
    return { all: events.length, plates, persons, videos };
  }, [events]);

  // Filtered Events List
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      // Camera filter
      if (selectedCameraId !== "ALL" && evt.camera_id !== Number(selectedCameraId)) {
        return false;
      }
      // Date filter
      if (selectedDate) {
        const evtDate = new Date(evt.timestamp).toISOString().split("T")[0];
        if (evtDate !== selectedDate) return false;
      }
      // Category filter (Placa, Pessoa/Movimento, Vídeo)
      if (filterCategory === "PLATES") {
        const isPlate = !!(evt as any).plate_number || (evt as any).type === "PLATE_DETECTED";
        if (!isPlate) return false;
      } else if (filterCategory === "PERSONS") {
        // High confidence motion/person alert
        if (evt.score < 0.03) return false;
      } else if (filterCategory === "VIDEOS") {
        if (!evt.video_path) return false;
      }

      return true;
    });
  }, [events, selectedCameraId, selectedDate, filterCategory]);

  const activeEvent = selectedEventIndex !== null && filteredEvents[selectedEventIndex]
    ? filteredEvents[selectedEventIndex]
    : null;

  // Navigate Events in Player
  const handlePreviousEvent = () => {
    if (selectedEventIndex !== null && selectedEventIndex > 0) {
      setSelectedEventIndex(selectedEventIndex - 1);
    }
  };

  const handleNextEvent = () => {
    if (selectedEventIndex !== null && selectedEventIndex < filteredEvents.length - 1) {
      setSelectedEventIndex(selectedEventIndex + 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedEventIndex === null) return;
      if (e.key === "ArrowLeft") handlePreviousEvent();
      if (e.key === "ArrowRight") handleNextEvent();
      if (e.key === "Escape") setSelectedEventIndex(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedEventIndex, filteredEvents.length]);

  const handleDeleteSingleEvent = async (event: MotionEvent) => {
    if (!confirm(`Deseja realmente excluir esta gravação de ${event.camera_name}?`)) {
      return;
    }
    try {
      await apiClient.deleteEvent(event.id);
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
      if (activeEvent?.id === event.id) {
        if (filteredEvents.length > 1) {
          handleNextEvent();
        } else {
          setSelectedEventIndex(null);
        }
      }
    } catch (e) {
      console.error("Failed to delete event:", e);
    }
  };

  // Execute Batch Delete Action
  const handleExecuteBatchDelete = async () => {
    if (!confirmDeleteMode) return;
    setIsDeletingBatch(true);
    try {
      const res = await apiClient.batchDeleteEvents({
        mode: confirmDeleteMode,
        date_str: selectedDate || undefined,
        camera_id: selectedCameraId !== "ALL" ? Number(selectedCameraId) : undefined,
      });

      setBatchDeleteResult(res.message);
      setTimeout(() => setBatchDeleteResult(null), 4000);
      setConfirmDeleteMode(null);
      setSelectedEventIndex(null);
      await loadData();
    } catch (e: any) {
      alert("Erro ao excluir gravações: " + (e.message || e));
    } finally {
      setIsDeletingBatch(false);
    }
  };

  // 24h Timeline buckets calculation
  const timelineMarkers = useMemo(() => {
    return filteredEvents.map((evt) => {
      const date = new Date(evt.timestamp);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const percent = ((hours * 60 + minutes) / 1440) * 100;
      return {
        id: evt.id,
        percent,
        timeStr: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        cameraName: evt.camera_name,
        score: evt.score,
      };
    });
  }, [filteredEvents]);

  const getDeleteModeLabel = () => {
    switch (confirmDeleteMode) {
      case "day":
        return selectedDate ? `do dia selecionado (${selectedDate})` : "do dia de hoje";
      case "older_than_7_days":
        return "com mais de 7 dias (Última Semana)";
      case "older_than_30_days":
        return "com mais de 30 dias (Último Mês)";
      case "all":
        return "TODOS os registros e vídeos do sistema";
      default:
        return "";
    }
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-[#0b0f19]">
      {/* App Header */}
      <header className="h-16 w-full app-header px-6 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 h-9 px-3 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
          >
            <ArrowLeft className="w-4 h-4 text-blue-400" />
            <span>Mosaico ao Vivo</span>
          </Link>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              Central de Gravações & Timeline
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {filteredEvents.length} {filteredEvents.length === 1 ? "Evento" : "Eventos"}
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Navegação contínua, histórico MP4 e limpeza em lote</p>
          </div>
        </div>

        {/* Filter & Batch Controls */}
        <div className="flex items-center gap-2.5">
          {/* Camera Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 h-9">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-white">Todas as Câmeras</option>
              {cameras.map((cam) => (
                <option key={cam.id} value={cam.id} className="bg-slate-900 text-white">
                  {cam.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 h-9">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate("")}
                className="text-[10px] text-slate-400 hover:text-white"
                title="Limpar data"
              >
                &times;
              </button>
            )}
          </div>

          {/* Batch Delete Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setIsDeleteMenuOpen((prev) => !prev)}
              className="flex items-center gap-1.5 h-9 px-3 text-xs font-semibold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 rounded-lg transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir por Período</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {isDeleteMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsDeleteMenuOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-60 card-dark border border-white/15 rounded-xl shadow-2xl z-50 p-1.5 space-y-1">
                  <button
                    onClick={() => {
                      setIsDeleteMenuOpen(false);
                      setConfirmDeleteMode("day");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-left transition"
                  >
                    <CalendarDays className="w-4 h-4 text-blue-400" />
                    <div>
                      <div className="font-semibold">Excluir do Dia {selectedDate ? `(${selectedDate})` : "Atual"}</div>
                      <div className="text-[10px] text-slate-500">Apaga gravações desta data</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setIsDeleteMenuOpen(false);
                      setConfirmDeleteMode("older_than_7_days");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-left transition"
                  >
                    <CalendarRange className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="font-semibold">Mais antigos que 7 dias</div>
                      <div className="text-[10px] text-slate-500">Limpa eventos da última semana</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setIsDeleteMenuOpen(false);
                      setConfirmDeleteMode("older_than_30_days");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-left transition"
                  >
                    <Clock className="w-4 h-4 text-orange-400" />
                    <div>
                      <div className="font-semibold">Mais antigos que 30 dias</div>
                      <div className="text-[10px] text-slate-500">Limpa eventos do último mês</div>
                    </div>
                  </button>

                  <div className="border-t border-white/10 my-1" />

                  <button
                    onClick={() => {
                      setIsDeleteMenuOpen(false);
                      setConfirmDeleteMode("all");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-400 hover:text-white hover:bg-rose-600 rounded-lg text-left transition font-semibold"
                  >
                    <Trash2 className="w-4 h-4" />
                    <div>
                      <div>Excluir TODOS os Eventos</div>
                      <div className="text-[10px] opacity-80">Zera todas as gravações</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Reload Button */}
          <button
            onClick={loadData}
            title="Atualizar lista"
            className="flex items-center justify-center w-9 h-9 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-400" : ""}`} />
          </button>
        </div>
      </header>

      {/* Interactive Category & Camera Filter Pills Bar */}
      <div className="w-full px-6 py-2.5 bg-slate-900/90 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0 backdrop-blur-sm z-20">
        {/* Category Filter Pills (Todos, Placas, Pessoas, Vídeos) */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
            <span>Filtros:</span>
          </span>

          <button
            type="button"
            onClick={() => handleSwitchCategory("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              filterCategory === "ALL"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                : "bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60"
            }`}
          >
            <span>Todos os Eventos</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              filterCategory === "ALL" ? "bg-white/20 text-white" : "bg-slate-900 text-slate-400"
            }`}>
              {categoryStats.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchCategory("PLATES")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              filterCategory === "PLATES"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/25"
                : "bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60"
            }`}
          >
            <Car className="w-3.5 h-3.5 text-amber-400" />
            <span>Placas / Veículos</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              filterCategory === "PLATES" ? "bg-white/20 text-white" : "bg-slate-900 text-slate-400"
            }`}>
              {categoryStats.plates}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchCategory("PERSONS")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              filterCategory === "PERSONS"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                : "bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60"
            }`}
          >
            <User className="w-3.5 h-3.5 text-emerald-400" />
            <span>Pessoas / Movimento</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              filterCategory === "PERSONS" ? "bg-white/20 text-white" : "bg-slate-900 text-slate-400"
            }`}>
              {categoryStats.persons}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchCategory("VIDEOS")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              filterCategory === "VIDEOS"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/25"
                : "bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60"
            }`}
          >
            <Video className="w-3.5 h-3.5 text-purple-400" />
            <span>Com Gravação MP4</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              filterCategory === "VIDEOS" ? "bg-white/20 text-white" : "bg-slate-900 text-slate-400"
            }`}>
              {categoryStats.videos}
            </span>
          </button>
        </div>

        {/* Quick Camera Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Câmeras:</span>
          <button
            type="button"
            onClick={() => setSelectedCameraId("ALL")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
              selectedCameraId === "ALL"
                ? "bg-slate-200 text-slate-900 font-bold"
                : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            Todas
          </button>
          {cameras.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCameraId(String(c.id))}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                selectedCameraId === String(c.id)
                  ? "bg-blue-600 text-white font-bold shadow-sm"
                  : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Success Notification Banner */}
      {batchDeleteResult && (
        <div className="w-full px-6 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2 shrink-0 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4" />
          <span>{batchDeleteResult}</span>
        </div>
      )}

      {/* 24-Hour Timeline Bar Component */}
      <div className="w-full px-6 py-3 bg-slate-950/70 border-b border-slate-800 shrink-0">
        <div className="flex items-center justify-between mb-1.5 text-[10px] font-mono text-slate-400">
          <span className="flex items-center gap-1.5 text-blue-400 font-semibold">
            <Clock className="w-3 h-3" /> Linha do Tempo (00:00 - 23:59)
          </span>
          <div className="flex items-center gap-4">
            <span>00:00</span>
            <span>04:00</span>
            <span>08:00</span>
            <span>12:00</span>
            <span>16:00</span>
            <span>20:00</span>
            <span>23:59</span>
          </div>
        </div>

        {/* Timeline Track with Event Points */}
        <div className="relative h-6 w-full rounded-lg bg-slate-900 border border-slate-800 overflow-hidden flex items-center">
          {/* Subtle Grid Hour Lines */}
          {[0, 16.6, 33.3, 50, 66.6, 83.3, 100].map((pos, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-[1px] bg-slate-800 pointer-events-none"
              style={{ left: `${pos}%` }}
            />
          ))}

          {/* Motion Event Highlights */}
          {timelineMarkers.map((m, idx) => (
            <div
              key={idx}
              onClick={() => {
                const targetIdx = filteredEvents.findIndex((e) => e.id === m.id);
                if (targetIdx !== -1) setSelectedEventIndex(targetIdx);
              }}
              title={`${m.cameraName} às ${m.timeStr} (${(m.score * 100).toFixed(1)}% mov)`}
              className="group absolute top-0.5 bottom-0.5 w-2 -ml-1 rounded-sm bg-blue-500 hover:bg-rose-500 cursor-pointer transition-all hover:scale-y-125 z-10"
              style={{ left: `${m.percent}%` }}
            >
              {/* Tooltip on hover */}
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-30">
                <div className="px-2 py-1 rounded bg-black/90 text-[10px] text-white whitespace-nowrap shadow-lg border border-white/10 font-mono">
                  {m.cameraName} &bull; {m.timeStr}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid Gallery */}
      <main className="flex-1 p-6 overflow-y-auto min-w-0">
        {loading && events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-80 gap-3 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <span className="text-xs font-medium">Carregando gravações...</span>
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredEvents.map((evt, idx) => {
              const date = new Date(evt.timestamp);
              const dateStr = isNaN(date.getTime())
                ? evt.timestamp
                : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
              const timeStr = isNaN(date.getTime())
                ? ""
                : date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

              return (
                <div
                  key={evt.id}
                  className="group relative flex flex-col rounded-xl card-dark overflow-hidden transition-all duration-200 hover:border-blue-500/50 shadow-sm"
                >
                  {/* Thumbnail / Video trigger */}
                  <div
                    onClick={() => setSelectedEventIndex(idx)}
                    className="relative aspect-video w-full bg-black cursor-pointer overflow-hidden select-none"
                  >
                    <img
                      src={`${API_BASE}/api/events/${evt.id}/thumbnail`}
                      alt="Miniatura do evento"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = "none";
                        const parent = target.parentElement;
                        if (parent && !parent.querySelector(".fallback-icon")) {
                          const iconDiv = document.createElement("div");
                          iconDiv.className = "fallback-icon flex items-center justify-center w-full h-full text-slate-600";
                          iconDiv.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>';
                          parent.appendChild(iconDiv);
                        }
                      }}
                    />

                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 flex items-center justify-center transition opacity-0 group-hover:opacity-100">
                      <div className="p-3 rounded-full bg-blue-600/90 text-white shadow-xl transform group-hover:scale-110 transition">
                        <Play className="w-4 h-4 fill-white" />
                      </div>
                    </div>

                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[9px] text-emerald-400 font-mono font-bold">
                      {(evt.score * 100).toFixed(1)}% mov
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white truncate max-w-[150px]">
                        {evt.camera_name}
                      </span>
                      <span className="text-[10px] text-blue-400 font-mono font-semibold px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                        MP4 HD
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-white/5 font-mono">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" /> {dateStr}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" /> {timeStr}
                      </span>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                      <button
                        onClick={() => setSelectedEventIndex(idx)}
                        className="flex items-center gap-1 text-[10px] font-medium text-blue-400 hover:text-blue-300"
                      >
                        <Play className="w-3 h-3" /> Assistir
                      </button>

                      <div className="flex items-center gap-1.5">
                        {evt.video_path && (
                          <a
                            href={`${API_BASE}/api/events/video/${evt.camera_id}/${date.toISOString().split("T")[0]}/${evt.video_path.split("/").pop()}`}
                            download
                            title="Baixar Clipe MP4"
                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                          >
                            <Download className="w-3.5 h-3.5 text-blue-400" />
                          </a>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSingleEvent(evt);
                          }}
                          title="Excluir Gravação"
                          className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-16 rounded-2xl border border-dashed border-slate-800 text-center my-12 bg-slate-900/30">
            <Film className="w-10 h-10 text-slate-600 mb-3" />
            <h3 className="text-sm font-semibold text-white">Nenhuma gravação encontrada</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Não existem eventos registrados com os filtros selecionados.
            </p>
          </div>
        )}
      </main>

      {/* Advanced Cinema Video Modal with Playlist & Continuous Playback */}
      {activeEvent && selectedEventIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="card-dark rounded-2xl w-full max-w-5xl h-[85vh] overflow-hidden shadow-2xl border border-white/10 flex flex-col">
            {/* Modal Top Bar */}
            <div className="h-14 px-5 border-b border-white/10 bg-slate-900/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  {activeEvent.camera_name}
                  <span className="text-[11px] font-mono font-normal text-slate-400">
                    &bull; {new Date(activeEvent.timestamp).toLocaleString("pt-BR")}
                  </span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  {(activeEvent.score * 100).toFixed(1)}% INTENSIDADE
                </span>
              </div>

              {/* Top Controls */}
              <div className="flex items-center gap-2">
                {/* Auto Play Next Toggle */}
                <button
                  onClick={() => setAutoPlayNext((prev) => !prev)}
                  title="Reprodução Automática Sequencial"
                  className={`flex items-center gap-1.5 h-8 px-2.5 text-xs rounded-lg border transition ${
                    autoPlayNext
                      ? "bg-blue-600/20 text-blue-400 border-blue-500/30 font-semibold"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}
                >
                  <FastForward className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Auto-Avançar</span>
                </button>

                {/* Loop Toggle */}
                <button
                  onClick={() => setLoopCurrent((prev) => !prev)}
                  title="Repetir Clipe em Loop"
                  className={`flex items-center justify-center w-8 h-8 rounded-lg border transition ${
                    loopCurrent
                      ? "bg-blue-600/20 text-blue-400 border-blue-500/30"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}
                >
                  <Repeat className="w-3.5 h-3.5" />
                </button>

                {/* Download Button */}
                {activeEvent.video_path && (
                  <a
                    href={`${API_BASE}/api/events/${activeEvent.id}/video`}
                    download
                    title="Baixar Arquivo MP4"
                    className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Baixar MP4</span>
                  </a>
                )}

                {/* Delete Button */}
                <button
                  onClick={() => handleDeleteSingleEvent(activeEvent)}
                  title="Excluir Gravação"
                  className="flex items-center justify-center w-8 h-8 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Close Button */}
                <button
                  onClick={() => setSelectedEventIndex(null)}
                  className="flex items-center justify-center w-8 h-8 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body: Video + Playlist Sidebar */}
            <div className="flex-1 flex overflow-hidden">
              {/* Main Video Screen with Previous/Next Controls */}
              <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                {activeEvent.video_path ? (
                  <video
                    ref={videoRef}
                    key={activeEvent.id}
                    controls
                    autoPlay
                    loop={loopCurrent}
                    onEnded={() => {
                      if (autoPlayNext && !loopCurrent) {
                        handleNextEvent();
                      }
                    }}
                    className="w-full h-full object-contain"
                    src={`${API_BASE}/api/events/${activeEvent.id}/video`}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-500 text-xs">
                    <Film className="w-8 h-8 stroke-1" />
                    <span>Vídeo não disponível para este registro.</span>
                  </div>
                )}

                {/* Previous Event Floating Button */}
                <button
                  onClick={handlePreviousEvent}
                  disabled={selectedEventIndex === 0}
                  title="Evento Anterior (Seta Esquerda ←)"
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-slate-900/90 text-white border border-white/10 backdrop-blur-sm transition disabled:opacity-20 disabled:pointer-events-none hover:scale-110 active:scale-95 shadow-xl"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Next Event Floating Button */}
                <button
                  onClick={handleNextEvent}
                  disabled={selectedEventIndex === filteredEvents.length - 1}
                  title="Próximo Evento (Seta Direita →)"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-slate-900/90 text-white border border-white/10 backdrop-blur-sm transition disabled:opacity-20 disabled:pointer-events-none hover:scale-110 active:scale-95 shadow-xl"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Playlist Sidebar */}
              <div className="w-72 border-l border-white/10 bg-slate-900/60 flex flex-col shrink-0 overflow-hidden">
                <div className="p-3 border-b border-white/10 bg-slate-900/80 flex items-center justify-between shrink-0">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-400" /> Playlist do Dia
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 font-semibold">
                    {selectedEventIndex + 1} de {filteredEvents.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {filteredEvents.map((evt, idx) => {
                    const isCurrent = idx === selectedEventIndex;
                    const date = new Date(evt.timestamp);
                    const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

                    return (
                      <div
                        key={evt.id}
                        onClick={() => setSelectedEventIndex(idx)}
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition ${
                          isCurrent
                            ? "bg-blue-600/30 border border-blue-500/50 text-white"
                            : "hover:bg-slate-800/60 text-slate-400 hover:text-white border border-transparent"
                        }`}
                      >
                        {/* Tiny Thumbnail */}
                        <div className="relative w-16 aspect-video bg-black rounded overflow-hidden shrink-0 border border-white/10">
                          {evt.thumbnail_path ? (
                            <img
                              src={`${API_BASE}/api/events/thumbnail/${evt.camera_id}/${date.toISOString().split("T")[0]}/${evt.thumbnail_path.split("/").pop()}`}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Film className="w-4 h-4 m-auto text-slate-600" />
                          )}
                          {isCurrent && (
                            <div className="absolute inset-0 bg-blue-600/30 flex items-center justify-center">
                              <Play className="w-3 h-3 fill-white text-white" />
                            </div>
                          )}
                        </div>

                        {/* Title & Time */}
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-[11px] font-semibold text-white truncate">
                            {evt.camera_name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {timeStr}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Delete Confirmation Safety Modal */}
      {confirmDeleteMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="card-dark rounded-2xl w-full max-w-md p-6 shadow-2xl border border-rose-500/30 space-y-4">
            <div className="flex items-center gap-3 text-rose-400 pb-3 border-b border-white/10">
              <div className="p-2.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Confirmar Exclusão de Gravações</h3>
                <p className="text-[11px] text-slate-400">Esta ação apagará os vídeos permanentemente do disco.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 leading-relaxed">
              Você selecionou excluir os eventos <strong>{getDeleteModeLabel()}</strong>
              {selectedCameraId !== "ALL" && (
                <span> da câmera <strong>{cameras.find((c) => c.id === Number(selectedCameraId))?.name || `#${selectedCameraId}`}</strong></span>
              )}.
              <div className="mt-2 text-[11px] text-rose-400 font-medium">
                ⚠️ Os arquivos MP4 e miniaturas correspondentes serão removidos para liberar espaço no servidor.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteMode(null)}
                disabled={isDeletingBatch}
                className="h-8 px-4 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteBatchDelete}
                disabled={isDeletingBatch}
                className="flex items-center gap-1.5 h-8 px-4 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition shadow-md shadow-rose-600/20 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingBatch ? "Excluindo..." : "Sim, Excluir Gravações"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
