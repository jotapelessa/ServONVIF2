"use client";

import { Camera } from "@/lib/api-client";
import { CameraCard } from "./CameraCard";
import { Grid2X2, Grid3X3, Square, Video, Plus } from "lucide-react";
import { useState } from "react";

interface CameraGridProps {
  cameras: Camera[];
  onOpenROI: (camera: Camera) => void;
  onSpotlight: (camera: Camera) => void;
  onOpenConfig?: (camera: Camera) => void;
  onDeleteCamera?: (camera: Camera) => void;
  onAddCameraClick: () => void;
}

export function CameraGrid({ cameras, onOpenROI, onSpotlight, onOpenConfig, onDeleteCamera, onAddCameraClick }: CameraGridProps) {
  const [layout, setLayout] = useState<"auto" | "1x1" | "2x2" | "3x3">("auto");

  const getGridClasses = () => {
    switch (layout) {
      case "1x1":
        return "grid-cols-1 max-w-5xl mx-auto";
      case "2x2":
        return "grid-cols-1 md:grid-cols-2";
      case "3x3":
        return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
      default:
        if (cameras.length === 1) return "grid-cols-1 max-w-5xl mx-auto";
        if (cameras.length <= 4) return "grid-cols-1 md:grid-cols-2";
        return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* Control Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Câmeras Conectadas ({cameras.length})
          </h2>
        </div>

        {/* Layout Switcher */}
        <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setLayout("1x1")}
            className={`p-1.5 rounded transition ${
              layout === "1x1" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
            }`}
            title="Exibição Individual (1x1)"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setLayout("2x2")}
            className={`p-1.5 rounded transition ${
              layout === "2x2" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
            }`}
            title="Grade 2x2"
          >
            <Grid2X2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setLayout("3x3")}
            className={`p-1.5 rounded transition ${
              layout === "3x3" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
            }`}
            title="Grade 3x3"
          >
            <Grid3X3 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Camera Grid Content */}
      {cameras.length > 0 ? (
        <div className={`grid gap-4 w-full ${getGridClasses()}`}>
          {cameras.map((cam) => (
            <CameraCard
              key={cam.id}
              camera={cam}
              onOpenROI={onOpenROI}
              onSpotlight={onSpotlight}
              onOpenConfig={onOpenConfig}
              onDeleteCamera={onDeleteCamera}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-slate-800 rounded-xl text-center my-auto bg-slate-900/30">
          <div className="p-4 rounded-full bg-slate-800/80 text-blue-400 mb-3">
            <Video className="w-8 h-8" />
          </div>
          <h3 className="text-sm font-semibold text-white mb-1">Nenhuma câmera ativa</h3>
          <p className="text-xs text-slate-400 max-w-sm mb-5 leading-relaxed">
            Faça uma busca de dispositivos ONVIF na sua rede local ou adicione a URL RTSP manualmente.
          </p>
          <button
            onClick={onAddCameraClick}
            className="flex items-center gap-2 h-9 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow transition active:scale-95"
          >
            <Plus className="w-4 h-4" /> Adicionar Câmera
          </button>
        </div>
      )}
    </div>
  );
}
