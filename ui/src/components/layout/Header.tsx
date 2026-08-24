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
  const [appVersion, setAppVersion] = useState<string>("001.006.053");

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        const [metricData, settingsData] = await Promise.all([
          apiClient.getMetrics().catch(() => null),
          apiClient.getSettings().catch(() => null),
        ]);
        if (isMounted) {
          if (metricData) setMetrics(metricData);
          if (settingsData?.version) setAppVersion(settingsData.version);
        }
      } catch (e) {
        // Silently ignore during initial boot
      }
    }

    loadInitialData();
    const interval = setInterval(async () => {
      try {
        const data = await apiClient.getMetrics();
        if (isMounted) setMetrics(data);
      } catch (e) {}
    }, 3500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="h-16 w-full app-header px-4 sm:px-6 flex items-center justify-between z-30 shrink-0 select-none">
      {/* Left: Brand & Title */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white shadow-md shadow-blue-500/20">
          <Shield className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-white tracking-wide">
              ServONVIF <span className="text-blue-400">PRO</span>
            </span>
            <span
              className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20"
              title={`Versão do Software: ${appVersion}`}
            >
              v{appVersion}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 hidden sm:inline">Central de Monitoramento IP</span>
        </div>
      </div>

      {/* Right: Controls, Telemetry & Navigation */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Telemetry (CPU & RAM) Compact Pill */}
        {metrics && (
          <div
            title={`Servidor: CPU ${metrics.cpu_percent}% | RAM ${metrics.ram_used_mb}MB (${metrics.ram_percent}%)`}
            className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-slate-300"
          >
            <div className="flex items-center gap-1">
              <Cpu className="w-3 h-3 text-blue-400" />
              <span className={`font-semibold ${metrics.cpu_percent >= 80 ? "text-rose-400" : metrics.cpu_percent >= 50 ? "text-amber-400" : "text-emerald-400"}`}>
                {metrics.cpu_percent}%
              </span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1">
              <HardDrive className="w-3 h-3 text-purple-400" />
              <span className="font-semibold text-slate-300">
                {metrics.ram_used_mb > 0 ? `${metrics.ram_used_mb}M` : `${metrics.ram_percent}%`}
              </span>
            </div>
          </div>
        )}

        {/* Engine Status Dot */}
        <div
          title={isConnected ? "Engine Conectada via WebSocket" : "Desconectado da Engine"}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px]"
        >
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
          <span className="text-slate-400 hidden xl:inline font-medium">
            {isConnected ? "Online" : "Offline"}
          </span>
        </div>

        <div className="h-4 w-[1px] bg-slate-800 hidden sm:block" />

        {/* Navigation Links */}
        <Link
          href="/settings"
          title="Leitura de Placas (LPR)"
          className="flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg border border-slate-700/50 transition"
        >
          <Car className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden lg:inline">Placas</span>
        </Link>

        <Link
          href="/events"
          title="Gravações de Movimento"
          className="flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg border border-slate-700/50 transition"
        >
          <Film className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden lg:inline">Gravações</span>
        </Link>

        <Link
          href="/settings"
          title="Configurações do Sistema"
          className="flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg border border-slate-700/50 transition"
        >
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden lg:inline">Ajustes</span>
        </Link>

        <div className="h-4 w-[1px] bg-slate-800 hidden sm:block" />

        {/* Action Buttons */}
        <button
          onClick={onScanClick}
          title="Escanear câmeras na rede local"
          className="flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
        >
          <Scan className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Escanear</span>
        </button>

        <button
          onClick={onAddCameraClick}
          className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm shadow-blue-500/20 transition active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Adicionar</span>
        </button>

        {/* Toggle Sidebar */}
        <button
          onClick={onToggleSidebar}
          title={isSidebarOpen ? "Ocultar Eventos" : "Exibir Eventos"}
          className="flex items-center justify-center w-8 h-8 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg border border-slate-700/50 transition"
        >
          {isSidebarOpen ? (
            <PanelRightClose className="w-3.5 h-3.5" />
          ) : (
            <PanelRightOpen className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </header>
  );
}
