"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  ArrowUpCircle,
  Thermometer,
  Zap,
  Globe,
  Send,
  Database,
  Camera as CameraIcon,
  Wifi,
} from "lucide-react";

interface HeaderProps {
  onScanClick?: () => void;
  onAddCameraClick?: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export function Header({
  onScanClick,
  onAddCameraClick,
  isSidebarOpen = false,
  onToggleSidebar,
}: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isConnected } = useWebSocket();
  const [metrics, setMetrics] = useState<{
    cpu_percent: number;
    cpu_temp_c?: number | null;
    gpu_percent?: number | null;
    gpu_temp_c?: number | null;
    ram_percent: number;
    ram_used_mb: number;
    ram_total_mb: number;
    disk_total_gb?: number;
    disk_used_gb?: number;
    disk_free_gb?: number;
    disk_percent?: number;
    net_rx_kbps?: number;
    net_tx_kbps?: number;
    net_speed_mbps?: number;
    net_type?: string;
    telegram_configured?: boolean;
    telegram_enabled?: boolean;
  } | null>(null);
  const [appVersion, setAppVersion] = useState<string>("002.002.182");
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        const [metricData, settingsData, versionData] = await Promise.all([
          apiClient.getMetrics().catch(() => null),
          apiClient.getSettings().catch(() => null),
          apiClient.getSystemVersion().catch(() => null),
        ]);
        if (isMounted) {
          if (metricData) setMetrics(metricData);
          if (settingsData?.version) setAppVersion(settingsData.version);
          if (versionData?.update_available) setUpdateAvailable(true);
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

  const handleScan = () => {
    if (onScanClick) {
      onScanClick();
    } else {
      router.push("/?action=scan");
    }
  };

  const handleAddCamera = () => {
    if (onAddCameraClick) {
      onAddCameraClick();
    } else {
      router.push("/?action=add");
    }
  };

  const isCamerasActive = pathname === "/";
  const isPlacasActive = pathname?.includes("placas");
  const isEventsActive = pathname?.includes("events");
  const isSettingsActive = pathname?.includes("settings") && !isPlacasActive;

  return (
    <header className="sticky top-0 z-50 h-16 w-full app-header px-3 sm:px-5 flex items-center justify-between shrink-0 select-none backdrop-blur-md bg-slate-950/95 border-b border-slate-800/80 shadow-sm">
      {/* Left: Brand & Main Navigation Tabs */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0 min-w-0">
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition">
            <Shield className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-white tracking-wide">
                ServONVIF <span className="text-blue-400">PRO</span>
              </span>
              <span
                className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 hidden sm:inline"
                title={`Versão do Software: ${appVersion}`}
              >
                v{appVersion}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 hidden lg:inline">Central de Monitoramento & IA</span>
          </div>
        </Link>

        {/* Global Persistent Navigation Tabs */}
        <nav className="flex items-center gap-1 ml-1 sm:ml-2">
          <Link
            href="/"
            title="Câmeras e Mosaico ao Vivo"
            className={`flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium rounded-lg transition ${
              isCamerasActive
                ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                : "text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <CameraIcon className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Câmeras</span>
          </Link>

          <Link
            href="/settings?tab=placas"
            title="Leitura de Placas (LPR)"
            className={`flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium rounded-lg transition ${
              isPlacasActive
                ? "bg-amber-600/20 text-amber-300 border border-amber-500/30"
                : "text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <Car className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Placas</span>
          </Link>

          <Link
            href="/events"
            title="Gravações e Histórico de Eventos"
            className={`flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium rounded-lg transition ${
              isEventsActive
                ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                : "text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <Film className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Gravações</span>
          </Link>

          <Link
            href="/settings"
            title="Configurações do Servidor e IA"
            className={`flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium rounded-lg transition ${
              isSettingsActive
                ? "bg-cyan-600/20 text-cyan-300 border border-cyan-500/30"
                : "text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Ajustes</span>
          </Link>
        </nav>
      </div>

      {/* Right: Telemetry Hub & Actions */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Full Telemetry Hub */}
        {metrics && (
          <div
            className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-slate-300 shadow-inner"
          >
            {/* CPU Load */}
            <div className="flex items-center gap-1" title={`Uso do Processador: ${metrics.cpu_percent}%`}>
              <Cpu className="w-3 h-3 text-blue-400" />
              <span className={`font-semibold ${metrics.cpu_percent >= 80 ? "text-rose-400" : metrics.cpu_percent >= 50 ? "text-amber-400" : "text-emerald-400"}`}>
                {metrics.cpu_percent}%
              </span>
            </div>

            {/* CPU Temp */}
            {metrics.cpu_temp_c != null && (
              <>
                <span className="text-slate-700">|</span>
                <div className="flex items-center gap-1" title={`Temperatura CPU: ${metrics.cpu_temp_c}°C`}>
                  <Thermometer className={`w-3 h-3 ${metrics.cpu_temp_c >= 75 ? "text-rose-400 animate-pulse" : metrics.cpu_temp_c >= 60 ? "text-amber-400" : "text-cyan-400"}`} />
                  <span className={`font-semibold ${metrics.cpu_temp_c >= 75 ? "text-rose-400" : metrics.cpu_temp_c >= 60 ? "text-amber-400" : "text-cyan-300"}`}>
                    {metrics.cpu_temp_c}°C
                  </span>
                </div>
              </>
            )}

            {/* RAM Usage */}
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1" title={`Memória RAM: ${metrics.ram_used_mb}MB usados (${metrics.ram_percent}%)`}>
              <HardDrive className="w-3 h-3 text-purple-400" />
              <span className="font-semibold text-slate-300">
                {metrics.ram_used_mb > 0 ? `${metrics.ram_used_mb}M` : `${metrics.ram_percent}%`}
              </span>
            </div>

            {/* SSD Storage Info */}
            {metrics.disk_free_gb !== undefined && (
              <>
                <span className="text-slate-700 hidden md:inline">|</span>
                <div
                  className="items-center gap-1 hidden md:flex"
                  title={`Armazenamento SSD: ${metrics.disk_free_gb}GB Livres de ${metrics.disk_total_gb}GB (${metrics.disk_percent}% ocupado)`}
                >
                  <Database className="w-3 h-3 text-emerald-400" />
                  <span className="font-semibold text-emerald-300">
                    {metrics.disk_free_gb}G
                  </span>
                </div>
              </>
            )}

            {/* Network Speed & Interface */}
            {metrics.net_speed_mbps !== undefined && (
              <>
                <span className="text-slate-700 hidden lg:inline">|</span>
                <div
                  className="items-center gap-1 hidden lg:flex"
                  title={`Rede: ${metrics.net_type || 'Ethernet'} (${metrics.net_speed_mbps} Mbps) | Tráfego: ↓${metrics.net_rx_kbps || 0} KB/s ↑${metrics.net_tx_kbps || 0} KB/s`}
                >
                  {metrics.net_type === "Wi-Fi" ? (
                    <Wifi className="w-3 h-3 text-cyan-400" />
                  ) : (
                    <Globe className="w-3 h-3 text-cyan-400" />
                  )}
                  <span className="font-semibold text-cyan-300">
                    {metrics.net_speed_mbps >= 1000 ? "1G" : `${metrics.net_speed_mbps}M`}
                  </span>
                </div>
              </>
            )}

            {/* Telegram Status */}
            <span className="text-slate-700 hidden sm:inline">|</span>
            <div
              className="items-center gap-1 hidden sm:flex"
              title={
                metrics.telegram_configured
                  ? "Telegram: 🟢 Bot Conectado e Ativo para Alertas"
                  : "Telegram: ⚪ Não Configurado (Acesse Ajustes > Telegram)"
              }
            >
              <Send
                className={`w-3 h-3 ${
                  metrics.telegram_configured ? "text-sky-400" : "text-slate-500"
                }`}
              />
              <span
                className={`font-semibold ${
                  metrics.telegram_configured ? "text-sky-300" : "text-slate-500"
                }`}
              >
                {metrics.telegram_configured ? "TG" : "Off"}
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

        {updateAvailable && (
          <Link
            href="/settings?tab=backup"
            title="Nova versão disponível no GitHub! Clique para atualizar."
            className="flex items-center gap-1.5 h-8 px-2 text-xs font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg border border-amber-500/30 transition animate-pulse"
          >
            <ArrowUpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Update</span>
          </Link>
        )}

        <div className="h-4 w-[1px] bg-slate-800 hidden sm:block" />

        {/* Action Buttons: Escanear & Adicionar */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleScan}
            title="Escanear Câmeras na Rede Local"
            className="flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-900/80 hover:bg-slate-800 rounded-lg border border-slate-700 transition active:scale-95"
          >
            <Scan className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Escanear</span>
          </button>

          <button
            onClick={handleAddCamera}
            title="Adicionar Câmera Manualmente"
            className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm shadow-blue-500/20 transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Adicionar</span>
          </button>

          {/* Toggle Sidebar (when on main page) */}
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              title={isSidebarOpen ? "Ocultar Eventos" : "Exibir Eventos"}
              className="flex items-center justify-center w-8 h-8 text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800 rounded-lg border border-slate-700/50 transition shrink-0"
            >
              {isSidebarOpen ? (
                <PanelRightClose className="w-3.5 h-3.5" />
              ) : (
                <PanelRightOpen className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

