"use client";

import { useState, useEffect } from "react";
import { API_BASE } from "@/lib/api-client";
import { VideoOff, RefreshCw } from "lucide-react";

interface LiveViewProps {
  cameraId: number;
  cameraName: string;
  roiPolygon?: number[][] | null;
  ignorePolygons?: number[][][] | null;
  showZones?: boolean;
}

export function LiveView({
  cameraId,
  cameraName,
  roiPolygon,
  ignorePolygons,
  showZones = true,
}: LiveViewProps) {
  const [hasError, setHasError] = useState(false);
  const [key, setKey] = useState(0);

  const mjpegUrl = `${API_BASE}/api/mjpeg/${cameraId}?t=${key}`;

  const handleRetry = () => {
    setHasError(false);
    setKey((prev) => prev + 1);
  };

  // Auto-reconnect after 3s if disconnected
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (hasError) {
      timer = setTimeout(() => {
        setHasError(false);
        setKey((prev) => prev + 1);
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [hasError]);

  // Convert normalized points [0..1] to SVG polygon points string
  const roiSvgPoints = roiPolygon && roiPolygon.length >= 3
    ? roiPolygon.map(([x, y]) => `${(x * 100).toFixed(2)},${(y * 100).toFixed(2)}`).join(" ")
    : null;

  const ignoreSvgPolygons = ignorePolygons && ignorePolygons.length > 0
    ? ignorePolygons
        .filter((poly) => poly && poly.length >= 3)
        .map((poly) => poly.map(([x, y]) => `${(x * 100).toFixed(2)},${(y * 100).toFixed(2)}`).join(" "))
    : [];

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

          {/* Active ROI (Cyan) & Ignore Zones (Purple) Visual Overlay - Ultra Fine Linear Solid Lines */}
          {showZones && (roiSvgPoints || ignoreSvgPolygons.length > 0) && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {/* Cyan Detection Polygon - Fine Solid Linear Boundary */}
              {roiSvgPoints && (
                <polygon
                  points={roiSvgPoints}
                  fill="rgba(56, 189, 248, 0.16)"
                  stroke="#38bdf8"
                  strokeWidth="1.2"
                  vectorEffect="non-scaling-stroke"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}

              {/* Purple Ignore Polygons - Fine Solid Linear Boundary */}
              {ignoreSvgPolygons.map((pointsStr, idx) => (
                <polygon
                  key={idx}
                  points={pointsStr}
                  fill="rgba(168, 85, 247, 0.22)"
                  stroke="#a855f7"
                  strokeWidth="1.2"
                  vectorEffect="non-scaling-stroke"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}
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
