"use client";

import { useState } from "react";
import { Camera, apiClient } from "@/lib/api-client";
import { LiveView } from "./LiveView";
import { useAlertStore } from "@/store/useCameraStore";
import { Sliders, ShieldAlert, Maximize2, Settings, Camera as CameraIcon, Check, Loader2, Eye, EyeOff } from "lucide-react";

interface CameraCardProps {
  camera: Camera;
  onOpenROI: (camera: Camera) => void;
  onSpotlight: (camera: Camera) => void;
  onOpenConfig?: (camera: Camera) => void;
  onDeleteCamera?: (camera: Camera) => void;
}

export function CameraCard({ camera, onOpenROI, onSpotlight, onOpenConfig, onDeleteCamera }: CameraCardProps) {
  const activeAlarms = useAlertStore((state) => state.activeAlarms);
  const isAlarming = Boolean(activeAlarms[camera.id] && Date.now() - activeAlarms[camera.id] < 8000);
  const [snapping, setSnapping] = useState(false);
  const [snapFeedback, setSnapFeedback] = useState<string | null>(null);
  const [showZones, setShowZones] = useState(true);

  const handleCaptureSnapshot = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSnapping(true);
    try {
      await apiClient.captureSnapshot(camera.id, true);
      setSnapFeedback("Foto Salva!");
      setTimeout(() => setSnapFeedback(null), 2500);
    } catch (err: any) {
      setSnapFeedback("Erro");
      setTimeout(() => setSnapFeedback(null), 2500);
    } finally {
      setSnapping(false);
    }
  };

  return (
    <div
      onDoubleClick={() => onSpotlight(camera)}
      className={`group relative flex flex-col rounded-xl overflow-hidden card-dark transition-all duration-200 ${
        isAlarming ? "alarm-active" : "hover:border-blue-500/50"
      }`}
    >
      {/* Top HUD Header */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/90 via-black/50 to-transparent gap-2">
        {/* Name & Dot */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2 w-2 shrink-0">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isAlarming ? "bg-rose-400" : "bg-emerald-400"
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isAlarming ? "bg-rose-500" : "bg-emerald-500"
              }`}
            />
          </span>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-white truncate drop-shadow">
              {camera.name}
            </span>
            <span className="text-[10px] text-slate-300 font-mono drop-shadow truncate">
              {camera.ip_address || "RTSP"} &bull; {((camera.sensitivity || 0.03) * 100).toFixed(0)}% MOG2
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {snapFeedback && (
            <span className="text-[9px] bg-emerald-500/90 text-white font-bold px-1.5 py-0.5 rounded shadow animate-in fade-in">
              {snapFeedback}
            </span>
          )}
          <button
            onClick={handleCaptureSnapshot}
            disabled={snapping}
            title="Tirar Foto / Snapshot em Alta Resolução (Salva & Envia ao Telegram)"
            className="flex items-center justify-center w-7 h-7 rounded-lg bg-black/70 hover:bg-amber-600 text-slate-200 hover:text-white border border-white/20 shadow transition disabled:opacity-50"
          >
            {snapping ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" /> : <CameraIcon className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowZones((prev) => !prev);
            }}
            title={showZones ? "Ocultar Zonas de Marcação (ROI & Zonas Roxas)" : "Mostrar Zonas de Marcação (ROI & Zonas Roxas)"}
            className={`flex items-center justify-center w-7 h-7 rounded-lg border shadow transition ${
              showZones
                ? "bg-cyan-600/30 hover:bg-cyan-600 text-cyan-300 hover:text-white border-cyan-500/40"
                : "bg-black/70 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-white/20"
            }`}
          >
            {showZones ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => onSpotlight(camera)}
            title="Expandir / Modo Destaque"
            className="flex items-center justify-center w-7 h-7 rounded-lg bg-black/70 hover:bg-slate-800 text-slate-200 hover:text-white border border-white/20 shadow transition"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          {onOpenConfig && (
            <button
              onClick={() => onOpenConfig(camera)}
              title="Configurações da Câmera (Sensibilidade & Dispositivos)"
              className="flex items-center justify-center w-7 h-7 rounded-lg bg-black/70 hover:bg-blue-600 text-slate-200 hover:text-white border border-white/20 shadow transition"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => onOpenROI(camera)}
            title="Configurar Zona de Detecção (ROI)"
            className="flex items-center justify-center w-7 h-7 rounded-lg bg-black/70 hover:bg-cyan-600 text-slate-200 hover:text-white border border-white/20 shadow transition"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
          {onDeleteCamera && (
            <button
              onClick={() => onDeleteCamera(camera)}
              title="Excluir Câmera"
              className="flex items-center justify-center w-7 h-7 rounded-lg bg-black/70 hover:bg-rose-600 text-slate-200 hover:text-white border border-white/20 shadow transition"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Video Live Stream */}
      <div className="relative aspect-video w-full bg-black">
        <LiveView
          cameraId={camera.id}
          cameraName={camera.name}
          roiPolygon={camera.roi_polygon}
          ignorePolygons={camera.ignore_polygons}
          showZones={showZones}
        />
      </div>

      {/* Alarm Warning Badge */}
      {isAlarming && (
        <div className="absolute bottom-2.5 left-2.5 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-600 text-white text-[10px] font-bold tracking-wider shadow-lg">
          <ShieldAlert className="w-3 h-3" />
          <span>MOVIMENTO DETECTADO</span>
        </div>
      )}
    </div>
  );
}
