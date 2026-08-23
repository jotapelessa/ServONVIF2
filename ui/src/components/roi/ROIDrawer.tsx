"use client";

import { useState, useRef, useEffect, MouseEvent } from "react";
import { Camera, apiClient, API_BASE } from "@/lib/api-client";
import { X, Check, Trash2, Sliders, Info, Undo2 } from "lucide-react";

interface ROIDrawerProps {
  camera: Camera;
  onClose: () => void;
  onSaved: (updated: Camera) => void;
}

export function ROIDrawer({ camera, onClose, onSaved }: ROIDrawerProps) {
  const [points, setPoints] = useState<number[][]>(camera.roi_polygon || []);
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const drawPolygon = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    if (points.length === 0) return;

    // 1. Draw shaded polygon area
    ctx.beginPath();
    ctx.moveTo(points[0][0] * w, points[0][1] * h);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0] * w, points[i][1] * h);
    }
    if (points.length >= 3) {
      ctx.closePath();
      ctx.fillStyle = "rgba(59, 130, 246, 0.4)";
      ctx.fill();
    }

    // 2. Draw border lines
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#0284c7";
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 3. Draw vertices / handles
    points.forEach((pt, index) => {
      ctx.beginPath();
      ctx.arc(pt[0] * w, pt[1] * h, 7, 0, Math.PI * 2);
      ctx.fillStyle = index === 0 ? "#f43f5e" : "#38bdf8";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Number badge
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px sans-serif";
      ctx.fillText(String(index + 1), pt[0] * w + 10, pt[1] * h - 5);
    });
  };

  useEffect(() => {
    drawPolygon();
  }, [points]);

  const handleCanvasClick = (e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const clampedX = Math.max(0, Math.min(1, x));
    const clampedY = Math.max(0, Math.min(1, y));

    setPoints((prev) => [...prev, [clampedX, clampedY]]);
  };

  const handleUndo = () => {
    setPoints((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPoints([]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await apiClient.updateROI(camera.id, points);
      onSaved(updated);
      onClose();
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar zona de detecção.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none">
      <div className="card-dark border border-white/15 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="h-14 px-6 border-b border-white/10 bg-slate-900/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white tracking-wide">
                Zona de Detecção de Movimento (ROI)
              </h3>
              <p className="text-[10px] text-slate-400">
                {camera.name} &bull; Clique no feed para desenhar a área geométrica de interesse
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Video Feed with Precision Canvas Overlay */}
        <div
          ref={containerRef}
          className="relative aspect-video w-full bg-black flex items-center justify-center cursor-crosshair overflow-hidden"
        >
          <img
            src={`${API_BASE}/api/mjpeg/${camera.id}`}
            alt="Feed ao vivo"
            className="w-full h-full object-contain pointer-events-none"
          />
          <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            onClick={handleCanvasClick}
            className="absolute inset-0 w-full h-full z-10"
          />
        </div>

        {/* Footer Controls */}
        <div className="h-16 px-6 bg-slate-900/80 border-t border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
            {points.length < 3 ? (
              <span className="text-amber-400 font-medium text-[11px]">
                Adicione ao menos 3 pontos ({points.length} adicionados). O movimento fora desta zona será descartado.
              </span>
            ) : (
              <span className="text-emerald-400 font-medium text-[11px]">
                Máscara geométrica ativa com {points.length} pontos. Apenas o interior gerará alarmes.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              disabled={points.length === 0}
              className="flex items-center gap-1 h-8 px-3 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition disabled:opacity-40"
            >
              <Undo2 className="w-3.5 h-3.5" /> Desfazer
            </button>
            <button
              onClick={handleClear}
              disabled={points.length === 0}
              className="flex items-center gap-1 h-8 px-3 text-xs font-medium text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 rounded-lg transition disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" /> Limpar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 h-8 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-md shadow-blue-600/25 transition disabled:opacity-50"
            >
              <Check className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar Zona"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
