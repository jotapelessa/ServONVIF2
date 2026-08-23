"use client";

import { useState } from "react";
import { API_BASE } from "@/lib/api-client";
import { VideoOff, RefreshCw } from "lucide-react";

interface LiveViewProps {
  cameraId: number;
  cameraName: string;
  roiPolygon?: number[][] | null;
}

export function LiveView({ cameraId, cameraName, roiPolygon }: LiveViewProps) {
  const [hasError, setHasError] = useState(false);
  const [key, setKey] = useState(0);

  const mjpegUrl = `${API_BASE}/api/mjpeg/${cameraId}?t=${key}`;

  const handleRetry = () => {
    setHasError(false);
    setKey((prev) => prev + 1);
  };

  // Convert normalized points [0..1] to SVG polygon points string
  const svgPoints = roiPolygon && roiPolygon.length >= 3
    ? roiPolygon.map(([x, y]) => `${(x * 100).toFixed(2)},${(y * 100).toFixed(2)}`).join(" ")
    : null;

  return (
    <div className="relative w-full h-full bg-black/80 flex items-center justify-center overflow-hidden">
      {!hasError ? (
        <>
          <img
            src={mjpegUrl}
            alt={`Live feed - ${cameraName}`}
            className="w-full h-full object-cover"
            onError={() => setHasError(true)}
          />

          {/* Active ROI Visual Overlay */}
          {svgPoints && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <polygon
                points={svgPoints}
                fill="rgba(56, 189, 248, 0.15)"
                stroke="#38bdf8"
                strokeWidth="0.8"
                strokeDasharray="2,2"
              />
            </svg>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 text-slate-400 p-4 text-center">
          <VideoOff className="w-10 h-10 stroke-1 text-slate-600" />
          <p className="text-xs">Stream indisponível ou desconectado</p>
          <button
            onClick={handleRetry}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
          >
            <RefreshCw className="w-3 h-3" /> Reconectar
          </button>
        </div>
      )}
    </div>
  );
}
