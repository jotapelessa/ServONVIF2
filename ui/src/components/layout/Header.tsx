"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWebSocket } from "@/hooks/useWebSocket";
import { apiClient } from "@/lib/api-client";
import {
  Shield,
  Plus,
  Scan,
  Film,
  Sliders,
  PanelRightOpen,
  PanelRightClose,
  Activity,
  Car,
  Cpu,
  HardDrive,
} from "lucide-react";

interface HeaderProps {
  onScanClick: () => void;
  onAddCameraClick: () => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function Header({
  onScanClick,
  onAddCameraClick,
  isSidebarOpen,
  onToggleSidebar,
}: HeaderProps) {
  const { isConnected } = useWebSocket();
  const [metrics, setMetrics] = useState<{
    cpu_percent: number;
    ram_percent: number;
    ram_used_mb: number;
    ram_total_mb: number;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchMetrics() {
      try {
        const data = await apiClient.getMetrics();
        if (isMounted) setMetrics(data);
      } catch (e) {
        // Silently handle if engine is reconnecting
      }
    }

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 3500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const getCpuColor = (pct: number) => {
    if (pct >= 80) return "text-rose-400 bg-rose-500/10 border-rose-500/20";
    if (pct >= 50) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  };

  const getRamColor = (pct: number) => {
    if (pct >= 85) return "text-rose-400 bg-rose-500/10 border-rose-500/20";
    if (pct >= 65) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    return "text-purple-400 bg-purple-500/10 border-purple-500/20";
  };

  return (
    <header className="h-16 w-full app-header px-6 flex items-center justify-between z-30 shrink-0">
      {/* Brand & Live Indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 text-white shadow-md shadow-blue-500/20">
          <Shield className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white tracking-wide">
              ServONVIF <span className="text-blue-400">PRO</span>
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Core v1.0
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Central de Monitoramento IP</span>
        </div>
      </div>

      {/* Action Controls, Telemetry & Navigation */}
      <div className="flex items-center gap-3">
        {/* Real-time Server Telemetry (CPU & RAM) */}
        {metrics && (
          <div className="hidden lg:flex items-center gap-2">
            {/* CPU Badge */}
            <div
              title={`Uso de CPU do Servidor: ${metrics.cpu_percent}%`}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono transition ${getCpuColor(
                metrics.cpu_percent
              )}`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>CPU</span>
              <span className="font-bold">{metrics.cpu_percent}%</span>
            </div>

            {/* RAM Badge */}
            <div
              title={`Memória RAM do Servidor: ${metrics.ram_used_mb} MB usados pelo processo (${metrics.ram_percent}% do sistema)`}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono transition ${getRamColor(
                metrics.ram_percent
              )}`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>RAM</span>
              <span className="font-bold">{metrics.ram_used_mb > 0 ? `${metrics.ram_used_mb}MB` : `${metrics.ram_percent}%`}</span>
            </div>
          </div>
        )}

        {/* Status Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
          <span className="relative flex h-2 w-2">
            {isConnected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isConnected ? "bg-emerald-500" : "bg-rose-500"
              }`}
            />
          </span>
          <span className="text-slate-300 text-[11px] font-medium">
            {isConnected ? "Engine Conectada" : "Desconectado"}
          </span>
        </div>

        <div className="h-4 w-[1px] bg-slate-800 hidden sm:block" />

        {/* Links */}
        <Link
          href="/settings"
          className="flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg border border-slate-700/50 transition"
        >
          <Car className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">Placas (LPR)</span>
        </Link>

        <Link
          href="/events"
          className="flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg border border-slate-700/50 transition"
        >
          <Film className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden md:inline">Gravações</span>
        </Link>

        <Link
          href="/settings"
          className="flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg border border-slate-700/50 transition"
        >
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden md:inline">Configurações</span>
        </Link>

        {/* Action Buttons */}
        <button
          onClick={onScanClick}
          className="flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
        >
          <Scan className="w-3.5 h-3.5 text-indigo-400" />
          <span>Escanear Rede</span>
        </button>

        <button
          onClick={onAddCameraClick}
          className="flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm shadow-blue-500/20 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Adicionar Câmera</span>
        </button>

        {/* Toggle Sidebar */}
        <button
          onClick={onToggleSidebar}
          title={isSidebarOpen ? "Ocultar Eventos" : "Exibir Eventos"}
          className="flex items-center justify-center w-9 h-9 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg border border-slate-700/50 transition"
        >
          {isSidebarOpen ? (
            <PanelRightClose className="w-4 h-4" />
          ) : (
            <PanelRightOpen className="w-4 h-4" />
          )}
        </button>
      </div>
    </header>
  );
}
