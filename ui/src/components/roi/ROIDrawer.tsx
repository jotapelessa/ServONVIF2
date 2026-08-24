"use client";

import { useState, useRef, useEffect, MouseEvent } from "react";
import { Camera, apiClient, API_BASE } from "@/lib/api-client";
import { X, Check, Trash2, Sliders, Info, Undo2, PlusCircle, ShieldAlert, EyeOff } from "lucide-react";

interface ROIDrawerProps {
  camera: Camera;
  onClose: () => void;
  onSaved: (updated: Camera) => void;
}

export function ROIDrawer({ camera, onClose, onSaved }: ROIDrawerProps) {
  // Mode: "detection" (Cyan ROI) vs "ignore" (Purple Exclusion Zones)
  const [activeMode, setActiveMode] = useState<"detection" | "ignore">("detection");

  // Cyan Detection Polygon
  const [roiPoints, setRoiPoints] = useState<number[][]>(camera.roi_polygon || []);

  // Purple Ignore Polygons List
  const [ignorePolygons, setIgnorePolygons] = useState<number[][][]>(camera.ignore_polygons || []);
  const [currentIgnorePoints, setCurrentIgnorePoints] = useState<number[][]>([]);

  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const drawAllZones = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // =========================================================================
    // 1. DRAW CYAN DETECTION POLYGON (ROI)
    // =========================================================================
    if (roiPoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(roiPoints[0][0] * w, roiPoints[0][1] * h);
      for (let i = 1; i < roiPoints.length; i++) {
        ctx.lineTo(roiPoints[i][0] * w, roiPoints[i][1] * h);
      }
      if (roiPoints.length >= 3) {
        ctx.closePath();
        ctx.fillStyle = "rgba(56, 189, 248, 0.25)";
        ctx.fill();
      }

      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = activeMode === "detection" ? 3 : 1.5;
      ctx.setLineDash([]);
      ctx.stroke();

      // Vertices
      roiPoints.forEach((pt, index) => {
        ctx.beginPath();
        ctx.arc(pt[0] * w, pt[1] * h, activeMode === "detection" ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = index === 0 ? "#f43f5e" : "#38bdf8";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();

        if (activeMode === "detection") {
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 10px sans-serif";
          ctx.fillText(String(index + 1), pt[0] * w + 8, pt[1] * h - 4);
        }
      });
    }

    // =========================================================================
    // 2. DRAW COMPLETED PURPLE IGNORE POLYGONS
    // =========================================================================
    ignorePolygons.forEach((poly, pIdx) => {
      if (poly.length === 0) return;
      ctx.beginPath();
      ctx.moveTo(poly[0][0] * w, poly[0][1] * h);
      for (let i = 1; i < poly.length; i++) {
        ctx.lineTo(poly[i][0] * w, poly[i][1] * h);
      }
      if (poly.length >= 3) {
        ctx.closePath();
        ctx.fillStyle = "rgba(168, 85, 247, 0.35)";
        ctx.fill();
      }

      ctx.strokeStyle = "#a855f7";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Vertices
      poly.forEach((pt) => {
        ctx.beginPath();
        ctx.arc(pt[0] * w, pt[1] * h, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#c084fc";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    });

    // =========================================================================
    // 3. DRAW IN-PROGRESS PURPLE IGNORE POLYGON
    // =========================================================================
    if (currentIgnorePoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(currentIgnorePoints[0][0] * w, currentIgnorePoints[0][1] * h);
      for (let i = 1; i < currentIgnorePoints.length; i++) {
        ctx.lineTo(currentIgnorePoints[i][0] * w, currentIgnorePoints[i][1] * h);
      }
      if (currentIgnorePoints.length >= 3) {
        ctx.closePath();
        ctx.fillStyle = "rgba(216, 180, 254, 0.4)";
        ctx.fill();
      }

      ctx.strokeStyle = "#c084fc";
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      currentIgnorePoints.forEach((pt, index) => {
        ctx.beginPath();
        ctx.arc(pt[0] * w, pt[1] * h, 6, 0, Math.PI * 2);
        ctx.fillStyle = index === 0 ? "#f43f5e" : "#a855f7";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 10px sans-serif";
        ctx.fillText(`R${index + 1}`, pt[0] * w + 8, pt[1] * h - 4);
      });
    }
  };

  useEffect(() => {
    drawAllZones();
  }, [roiPoints, ignorePolygons, currentIgnorePoints, activeMode]);

  const handleCanvasClick = (e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const clampedX = Math.max(0, Math.min(1, x));
    const clampedY = Math.max(0, Math.min(1, y));

    if (activeMode === "detection") {
      setRoiPoints((prev) => [...prev, [clampedX, clampedY]]);
    } else {
      setCurrentIgnorePoints((prev) => [...prev, [clampedX, clampedY]]);
    }
  };

  const handleUndo = () => {
    if (activeMode === "detection") {
      setRoiPoints((prev) => prev.slice(0, -1));
    } else {
      if (currentIgnorePoints.length > 0) {
        setCurrentIgnorePoints((prev) => prev.slice(0, -1));
      } else if (ignorePolygons.length > 0) {
        setIgnorePolygons((prev) => prev.slice(0, -1));
      }
    }
  };

  const handleFinishIgnoreZone = () => {
    if (currentIgnorePoints.length >= 3) {
      setIgnorePolygons((prev) => [...prev, currentIgnorePoints]);
      setCurrentIgnorePoints([]);
    } else {
      alert("Desenhe ao menos 3 pontos para fechar uma Zona Ignorada (Roxa).");
    }
  };

  const handleClearCurrent = () => {
    if (activeMode === "detection") {
      setRoiPoints([]);
    } else {
      setCurrentIgnorePoints([]);
      setIgnorePolygons([]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // If there is an unfinished purple polygon with >= 3 points, include it
      const finalIgnoreList = [...ignorePolygons];
      if (currentIgnorePoints.length >= 3) {
        finalIgnoreList.push(currentIgnorePoints);
      }

      const updated = await apiClient.updateROI(camera.id, {
        roi_polygon: roiPoints.length >= 3 ? roiPoints : null,
        ignore_polygons: finalIgnoreList.length > 0 ? finalIgnoreList : null,
      });

      onSaved(updated);
      onClose();
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar zonas de detecção e exclusão.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none">
      <div className="card-dark border border-white/15 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header with Mode Switcher */}
        <div className="h-16 px-6 border-b border-white/10 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white tracking-wide">
                Configuração Geométrica de Zonas ({camera.name})
              </h3>
              <p className="text-[10px] text-slate-400">
                Alterne entre Zona Ativa (Ciano) e Zonas Ignoradas Anti-Falsos Positivos (Roxo)
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveMode("detection")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                activeMode === "detection"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>Zona de Detecção (Ciano)</span>
            </button>

            <button
              onClick={() => setActiveMode("ignore")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                activeMode === "ignore"
                  ? "bg-purple-600 text-white shadow-sm shadow-purple-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-purple-400" />
              <span>Zonas Ignoradas (Roxo)</span>
              {ignorePolygons.length > 0 && (
                <span className="text-[9px] bg-purple-950 text-purple-300 px-1.5 py-0.2 rounded-full border border-purple-400/40">
                  {ignorePolygons.length}
                </span>
              )}
            </button>
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

          {/* Mode Indicator Overlay Badge */}
          <div className="absolute top-3 left-3 z-20 pointer-events-none">
            {activeMode === "detection" ? (
              <div className="flex items-center gap-2 bg-blue-950/90 text-cyan-300 border border-cyan-500/40 px-3 py-1 rounded-lg text-xs font-semibold backdrop-blur shadow-lg">
                <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
                <span>Desenhando: Área Onde o Movimento SERÁ Vigiado ({roiPoints.length} pts)</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-purple-950/90 text-purple-200 border border-purple-500/40 px-3 py-1 rounded-lg text-xs font-semibold backdrop-blur shadow-lg">
                <EyeOff className="w-3.5 h-3.5 text-purple-400" />
                <span>Desenhando: Área que SERÁ 100% IGNORADA (Árvores/Rua/Reflexos)</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Controls */}
        <div className="h-16 px-6 bg-slate-900/90 border-t border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
            {activeMode === "detection" ? (
              roiPoints.length < 3 ? (
                <span className="text-amber-400 font-medium text-[11px]">
                  Adicione ao menos 3 pontos no Ciano ({roiPoints.length} adicionados). Movimento fora será descartado.
                </span>
              ) : (
                <span className="text-emerald-400 font-medium text-[11px]">
                  Zona Ciano ativa com {roiPoints.length} pontos.
                </span>
              )
            ) : (
              <span className="text-purple-300 font-medium text-[11px]">
                {ignorePolygons.length} zona(s) ignorada(s) gravada(s). Clique para adicionar pontos na nova máscara roxa.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeMode === "ignore" && currentIgnorePoints.length >= 3 && (
              <button
                onClick={handleFinishIgnoreZone}
                className="flex items-center gap-1.5 h-8 px-3 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-lg shadow-md shadow-purple-600/20 transition"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Concluir Esta Zona Roxa
              </button>
            )}

            <button
              onClick={handleUndo}
              disabled={activeMode === "detection" ? roiPoints.length === 0 : (currentIgnorePoints.length === 0 && ignorePolygons.length === 0)}
              className="flex items-center gap-1 h-8 px-3 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition disabled:opacity-40"
            >
              <Undo2 className="w-3.5 h-3.5" /> Desfazer
            </button>

            <button
              onClick={handleClearCurrent}
              className="flex items-center gap-1 h-8 px-3 text-xs font-medium text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 rounded-lg transition"
            >
              <Trash2 className="w-3.5 h-3.5" /> Limpar {activeMode === "detection" ? "Ciano" : "Roxas"}
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 h-8 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-md shadow-blue-600/25 transition disabled:opacity-50"
            >
              <Check className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar Todas as Zonas"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
