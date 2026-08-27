"use client";

import { useState, useRef, useEffect, MouseEvent } from "react";
import { Camera, API_BASE } from "@/lib/api-client";
import {
  X,
  Camera as CameraIcon,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sliders,
  Maximize,
  Minimize,
  Download,
  CheckCircle2,
  Shield,
  Activity,
  Eye,
  EyeOff,
} from "lucide-react";

interface CameraSpotlightModalProps {
  camera: Camera;
  onClose: () => void;
  onOpenROI: (camera: Camera) => void;
  onUpdateSensitivity: (cameraId: number, sensitivity: number) => Promise<void>;
}

export function CameraSpotlightModal({
  camera,
  onClose,
  onOpenROI,
  onUpdateSensitivity,
}: CameraSpotlightModalProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [showZones, setShowZones] = useState(true);
  const [sensitivity, setSensitivity] = useState(camera.sensitivity || 0.03);
  const [savingSensitivity, setSavingSensitivity] = useState(false);
  const [snapshotSuccess, setSnapshotSuccess] = useState(false);

  const imgRef = useRef<HTMLImageElement | null>(null);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Zoom controls
  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.5, 4.0));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const next = Math.max(prev - 0.5, 1.0);
      if (next === 1.0) setPanPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  // Pan dragging
  const handleMouseDown = (e: MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      setPanPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Snapshot Capture
  const handleTakeSnapshot = () => {
    const img = imgRef.current;
    if (!img) return;

    try {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || 1280;
      canvas.height = img.naturalHeight || 720;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.95);

        const a = document.createElement("a");
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        a.download = `snapshot_${camera.name.replace(/\s+/g, "_")}_${timestamp}.jpg`;
        a.href = dataUrl;
        a.click();

        setSnapshotSuccess(true);
        setTimeout(() => setSnapshotSuccess(false), 2500);
      }
    } catch (e) {
      console.error("Failed to capture snapshot:", e);
    }
  };

  // Sensitivity update
  const handleSensitivityChange = async (newVal: number) => {
    setSensitivity(newVal);
    setSavingSensitivity(true);
    try {
      await onUpdateSensitivity(camera.id, newVal);
    } finally {
      setSavingSensitivity(false);
    }
  };

  // Convert normalized points [0..1] to SVG polygon points string
  const roiSvgPoints = camera.roi_polygon && camera.roi_polygon.length >= 3
    ? camera.roi_polygon.map(([x, y]) => `${(x * 100).toFixed(2)},${(y * 100).toFixed(2)}`).join(" ")
    : null;

  const ignoreSvgPolygons = camera.ignore_polygons && camera.ignore_polygons.length > 0
    ? camera.ignore_polygons
        .filter((poly) => poly && poly.length >= 3)
        .map((poly) => poly.map(([x, y]) => `${(x * 100).toFixed(2)},${(y * 100).toFixed(2)}`).join(" "))
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 select-none">
      <div className="card-dark rounded-2xl w-full max-w-6xl h-[90vh] overflow-hidden shadow-2xl border border-white/10 flex flex-col">
        {/* Top Header */}
        <div className="h-14 px-6 border-b border-white/10 bg-slate-900/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <h2 className="text-sm font-bold text-white tracking-wide">
                {camera.name}
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {camera.ip_address || "Stream RTSP"} &bull; {camera.rtsp_url}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowZones((prev) => !prev)}
              title={showZones ? "Ocultar Zonas de Marcação" : "Mostrar Zonas de Marcação"}
              className={`flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg border transition ${
                showZones
                  ? "text-cyan-300 bg-cyan-600/20 border-cyan-500/30 hover:bg-cyan-600/30"
                  : "text-slate-400 bg-slate-800 border-slate-700 hover:text-white"
              }`}
            >
              {showZones ? <Eye className="w-3.5 h-3.5 text-cyan-400" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{showZones ? "Zonas Visíveis" : "Zonas Ocultas"}</span>
            </button>

            <button
              onClick={() => onOpenROI(camera)}
              className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Configurar Zonas</span>
            </button>

            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Canvas Area */}
        <div
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className={`flex-1 relative bg-black flex items-center justify-center overflow-hidden ${
            zoomLevel > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
          }`}
        >
          <div
            style={{
              transform: `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`,
              transition: isDragging ? "none" : "transform 0.15s ease-out",
            }}
            className="relative w-full h-full flex items-center justify-center pointer-events-none"
          >
            <img
              ref={imgRef}
              src={`${API_BASE}/api/mjpeg/${camera.id}`}
              alt={camera.name}
              crossOrigin="anonymous"
              className="w-full h-full object-contain pointer-events-none"
            />

            {/* Visual SVG Overlay - Ultra Fine Solid Linear Zones */}
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
          </div>

          {/* Zoom Level Indicator */}
          {zoomLevel > 1 && (
            <div className="absolute top-4 left-4 px-2.5 py-1 rounded-md bg-black/80 text-xs font-mono font-bold text-blue-400 border border-white/10 shadow-lg">
              Zoom: {zoomLevel.toFixed(1)}x
            </div>
          )}

          {/* Snapshot Confirmation Pill */}
          {snapshotSuccess && (
            <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold shadow-xl animate-bounce">
              <CheckCircle2 className="w-4 h-4" /> Snapshot salvo!
            </div>
          )}
        </div>

        {/* Floating Bottom Control Bar */}
        <div className="h-16 px-6 border-t border-white/10 bg-slate-900/80 flex items-center justify-between shrink-0">
          {/* Left: Snapshot & Recording */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleTakeSnapshot}
              className="flex items-center gap-2 h-9 px-3.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm shadow-blue-500/20 transition active:scale-95"
            >
              <CameraIcon className="w-4 h-4" />
              <span>Capturar Snapshot</span>
            </button>
          </div>

          {/* Center: Digital Zoom Controls */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-xl">
            <button
              onClick={handleZoomOut}
              disabled={zoomLevel <= 1}
              title="Diminuir Zoom"
              className="flex items-center justify-center w-8 h-8 text-slate-400 hover:text-white rounded-lg disabled:opacity-30 transition"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-slate-300 px-2 min-w-[48px] text-center">
              {zoomLevel.toFixed(1)}x
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoomLevel >= 4.0}
              title="Aumentar Zoom"
              className="flex items-center justify-center w-8 h-8 text-slate-400 hover:text-white rounded-lg disabled:opacity-30 transition"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            {zoomLevel > 1 && (
              <button
                onClick={handleResetZoom}
                title="Resetar Zoom"
                className="flex items-center justify-center w-8 h-8 text-slate-400 hover:text-white rounded-lg transition ml-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right: Motion Sensitivity Quick Slider */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Sensibilidade
              </span>
              <span className="text-xs font-mono font-bold text-blue-400">
                {Math.round(sensitivity * 500)} / 50
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="1"
              value={Math.round(sensitivity * 500)}
              onChange={(e) => handleSensitivityChange(parseInt(e.target.value))}
              className="w-28 accent-blue-500 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
