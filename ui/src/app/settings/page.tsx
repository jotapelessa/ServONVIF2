"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { apiClient, API_BASE, SettingsResponse } from "@/lib/api-client";
import {
  ArrowLeft,
  Bell,
  Tv,
  HardDrive,
  Cpu,
  Save,
  Send,
  Trash2,
  Copy,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Shield,
  Clock,
  Sliders,
  Layers,
  Sparkles,
  RefreshCw,
  FlaskConical,
  Terminal,
  Activity,
  Check,
  Video,
  Volume2,
  Wifi,
  Smartphone,
  Tablet,
  Monitor,
  Edit2,
  Lock,
  PauseCircle,
  PlayCircle,
  CheckCircle,
  HelpCircle,
  Radio,
  Zap,
  Car,
  Plus,
  Search,
  Power,
  RotateCcw,
  Download,
  Upload,
  FileJson,
  FolderArchive,
  AlertTriangle,
  Pause,
  Play,
} from "lucide-react";

const TAB_SLUG_MAP: Record<string, "vehicles" | "devices" | "tests" | "logs" | "tv" | "telegram" | "storage" | "engine" | "backup"> = {
  vehicles: "vehicles",
  placas: "vehicles",
  lpr: "vehicles",
  devices: "devices",
  dispositivos: "devices",
  tests: "tests",
  testes: "tests",
  simulacoes: "tests",
  logs: "logs",
  diagnostico: "logs",
  tv: "tv",
  smarttv: "tv",
  tablet: "tv",
  telegram: "telegram",
  bot: "telegram",
  storage: "storage",
  armazenamento: "storage",
  retencao: "storage",
  engine: "engine",
  motor: "engine",
  buffer: "engine",
  backup: "backup",
  sistema: "backup",
  restauracao: "backup",
};

const TAB_REVERSE_MAP: Record<string, string> = {
  vehicles: "placas",
  devices: "devices",
  tests: "tests",
  logs: "logs",
  tv: "tv",
  telegram: "telegram",
  storage: "storage",
  engine: "engine",
  backup: "backup",
};

export default function SettingsPage({ initialTab }: { initialTab?: string }) {
  const [activeTab, setActiveTab] = useState<"vehicles" | "devices" | "tests" | "logs" | "tv" | "telegram" | "storage" | "engine" | "backup">(() => {
    if (initialTab && TAB_SLUG_MAP[initialTab.toLowerCase()]) {
      return TAB_SLUG_MAP[initialTab.toLowerCase()];
    }
    return "vehicles";
  });

  const handleSwitchTab = (tab: "vehicles" | "devices" | "tests" | "logs" | "tv" | "telegram" | "storage" | "engine" | "backup") => {
    setActiveTab(tab);
    const slug = TAB_REVERSE_MAP[tab] || tab;
    if (typeof window !== "undefined") {
      window.history.pushState(null, "", `/settings/${slug}`);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const segments = window.location.pathname.split("/").filter(Boolean);
      const lastSeg = segments[segments.length - 1]?.toLowerCase();
      if (lastSeg && TAB_SLUG_MAP[lastSeg]) {
        setActiveTab(TAB_SLUG_MAP[lastSeg]);
      }
    }

    const onPopState = () => {
      const segments = window.location.pathname.split("/").filter(Boolean);
      const lastSeg = segments[segments.length - 1]?.toLowerCase();
      if (lastSeg && TAB_SLUG_MAP[lastSeg]) {
        setActiveTab(TAB_SLUG_MAP[lastSeg]);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Devices State
  const [devices, setDevices] = useState<any[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [editingDeviceName, setEditingDeviceName] = useState("");
  const [lastPingedDeviceId, setLastPingedDeviceId] = useState<string | null>(null);
  const [lastPingInfo, setLastPingInfo] = useState<any>(null);

  // LPR / Vehicles State
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [plateLogs, setPlateLogs] = useState<any[]>([]);
  const [plateLogsLoading, setPlateLogsLoading] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [newPlateNumber, setNewPlateNumber] = useState("");
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newVehicleModel, setNewVehicleModel] = useState("");
  const [newCategory, setNewCategory] = useState("MORADOR");
  const [newNotes, setNewNotes] = useState("");
  const [simulatingPlate, setSimulatingPlate] = useState(false);
  const [simulatedPlateResult, setSimulatedPlateResult] = useState<any>(null);
  const [testPlateInput, setTestPlateInput] = useState("BRA2E19");
  const [vehicleSearchTerm, setVehicleSearchTerm] = useState("");
  const [vehicleCategoryFilter, setVehicleCategoryFilter] = useState("ALL");

  // Form State
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [telegramPaused, setTelegramPaused] = useState(false);
  const [telegramCooldown, setTelegramCooldown] = useState(30);

  const [retentionDays, setRetentionDays] = useState(7);
  const [bufferSeconds, setBufferSeconds] = useState(5);

  // Read-only server info
  const [serverInfo, setServerInfo] = useState<SettingsResponse | null>(null);

  // Action status
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [telegramTestResult, setTelegramTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [runningCleanup, setRunningCleanup] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);
  const [copiedWs, setCopiedWs] = useState(false);

  // Tests Tab State
  const [simulatingMotion, setSimulatingMotion] = useState(false);
  const [simulateMotionResult, setSimulateMotionResult] = useState<string | null>(null);
  const [testRtspUrl, setTestRtspUrl] = useState("rtsp://192.168.1.6:8554/stream");
  const [testingRtsp, setTestingRtsp] = useState(false);
  const [rtspTestResult, setRtspTestResult] = useState<{ success: boolean; message: string; latency_ms?: number } | null>(null);

  // Logs Tab State
  const [logsData, setLogsData] = useState<any>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logLevelFilter, setLogLevelFilter] = useState("ALL");
  const [copiedLogs, setCopiedLogs] = useState(false);

  // Backup & Server Operations State
  const [importingBackup, setImportingBackup] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const [sendingTelegramBackup, setSendingTelegramBackup] = useState(false);
  const [telegramBackupResult, setTelegramBackupResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isRestartModalOpen, setIsRestartModalOpen] = useState(false);
  const [isShutdownModalOpen, setIsShutdownModalOpen] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [serverShutdownDone, setServerShutdownDone] = useState(false);
  const [restartCountdown, setRestartCountdown] = useState(8);

  // Dynamic Processing & Standby State (0% CPU)
  const [isProcessingPaused, setIsProcessingPaused] = useState(false);
  const [togglingProcessing, setTogglingProcessing] = useState(false);
  const [processingFeedback, setProcessingFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiClient.getSettings();
        setServerInfo(data);
        setTelegramToken(data.telegram_bot_token || "");
        setTelegramChatId(data.telegram_chat_id || "");
        setTelegramEnabled(data.telegram_enabled ?? true);
        setTelegramPaused(data.telegram_paused ?? false);
        setTelegramCooldown(data.telegram_cooldown_seconds || 30);
        setRetentionDays(data.retention_days || 7);
        setBufferSeconds(data.default_buffer_seconds || 5);
        setIsProcessingPaused(data.processing_paused ?? false);
      } catch (e) {
        console.error("Failed to load settings:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
    fetchDevices();

    // Setup Live WebSocket to detect device pings and processing status in real-time
    const wsUrl = `ws://${window.location.hostname}:8080/ws/events?device_type=Web%20Dashboard`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "DEVICE_PING_TEST") {
          setLastPingedDeviceId(data.device_id);
          setLastPingInfo(data);
          fetchDevices();
        } else if (data.type === "PROCESSING_STATUS_CHANGED") {
          setIsProcessingPaused(Boolean(data.paused));
        }
      } catch (e) {
        // Ignore non-json
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const fetchDevices = async () => {
    setDevicesLoading(true);
    try {
      const devList = await apiClient.getDevices();
      setDevices(devList);
    } catch (e) {
      console.error("Failed to load devices:", e);
    } finally {
      setDevicesLoading(false);
    }
  };

  const handleUpdateDeviceStatus = async (deviceId: string, newStatus: string) => {
    try {
      await apiClient.updateDevice(deviceId, { status: newStatus });
      setDevices((prev) =>
        prev.map((d) => (d.device_id === deviceId ? { ...d, status: newStatus } : d))
      );
    } catch (e: any) {
      alert("Erro ao alterar status do dispositivo: " + (e.message || e));
    }
  };

  const handleSaveDeviceName = async (deviceId: string) => {
    try {
      await apiClient.updateDevice(deviceId, { device_name: editingDeviceName });
      setDevices((prev) =>
        prev.map((d) => (d.device_id === deviceId ? { ...d, device_name: editingDeviceName } : d))
      );
      setEditingDeviceId(null);
    } catch (e: any) {
      alert("Erro ao renomear dispositivo: " + (e.message || e));
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    if (!confirm("Tem certeza que deseja esquecer/remover este dispositivo?")) return;
    try {
      await apiClient.deleteDevice(deviceId);
      setDevices((prev) => prev.filter((d) => d.device_id !== deviceId));
    } catch (e: any) {
      alert("Erro ao remover dispositivo: " + (e.message || e));
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const data = await apiClient.getDiagnosticsLogs(200, logLevelFilter);
      setLogsData(data);
    } catch (e) {
      console.error("Failed to load logs:", e);
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchVehicles = async () => {
    setVehiclesLoading(true);
    try {
      const data = await apiClient.getVehicles();
      setVehicles(data);
    } catch (e) {
      console.error("Failed to load vehicles:", e);
    } finally {
      setVehiclesLoading(false);
    }
  };

  const fetchPlateLogs = async () => {
    setPlateLogsLoading(true);
    try {
      const data = await apiClient.getPlateLogs(50);
      setPlateLogs(data);
    } catch (e) {
      console.error("Failed to load plate logs:", e);
    } finally {
      setPlateLogsLoading(false);
    }
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlateNumber || !newOwnerName) {
      alert("Por favor preencha a placa e o nome do proprietário.");
      return;
    }
    try {
      const created = await apiClient.createVehicle({
        plate_number: newPlateNumber,
        owner_name: newOwnerName,
        vehicle_model: newVehicleModel,
        category: newCategory,
        notes: newNotes,
      });
      setVehicles((prev) => [created, ...prev]);
      setIsVehicleModalOpen(false);
      setNewPlateNumber("");
      setNewOwnerName("");
      setNewVehicleModel("");
      setNewNotes("");
    } catch (e: any) {
      alert("Erro ao cadastrar veículo: " + (e.message || e));
    }
  };

  const handleDeleteVehicle = async (vehicleId: number) => {
    if (!confirm("Tem certeza que deseja remover este veículo?")) return;
    try {
      await apiClient.deleteVehicle(vehicleId);
      setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
    } catch (e: any) {
      alert("Erro ao remover veículo: " + (e.message || e));
    }
  };

  const handleSimulatePlate = async () => {
    setSimulatingPlate(true);
    setSimulatedPlateResult(null);
    try {
      const res = await apiClient.simulatePlateDetection({
        plate_number: testPlateInput,
      });
      setSimulatedPlateResult(res.detection);
      fetchPlateLogs();
      fetchVehicles();
    } catch (e: any) {
      alert("Falha na simulação de leitura de placa: " + (e.message || e));
    } finally {
      setSimulatingPlate(false);
    }
  };

  useEffect(() => {
    if (activeTab === "vehicles") {
      fetchVehicles();
      fetchPlateLogs();
    }
    if (activeTab === "logs") {
      fetchLogs();
    }
    if (activeTab === "devices") {
      fetchDevices();
    }
  }, [activeTab, logLevelFilter]);

  const handleCopyLogsForAntigravity = () => {
    if (!logsData?.markdown_report) return;
    navigator.clipboard.writeText(logsData.markdown_report);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 3000);
  };

  const handleSimulateMotion = async () => {
    setSimulatingMotion(true);
    setSimulateMotionResult(null);
    try {
      const res = await apiClient.simulateMotionAlert({
        camera_id: 1,
        camera_name: "Câmera de Teste (Simulação)",
        score: 0.98,
      });
      setSimulateMotionResult(res.message);
    } catch (e: any) {
      setSimulateMotionResult("Erro ao disparar: " + (e.message || e));
    } finally {
      setSimulatingMotion(false);
    }
  };

  const handleTestRtsp = async () => {
    if (!testRtspUrl) return;
    setTestingRtsp(true);
    setRtspTestResult(null);
    try {
      const res = await apiClient.testRTSP(testRtspUrl);
      setRtspTestResult(res);
    } catch (e: any) {
      setRtspTestResult({
        success: false,
        message: e.message || "Erro ao testar stream RTSP",
      });
    } finally {
      setTestingRtsp(false);
    }
  };

  const handlePlayAudioChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch (e) {
      console.warn("Audio Context alert failed:", e);
    }
  };

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      await apiClient.updateSettings({
        telegram_bot_token: telegramToken,
        telegram_chat_id: telegramChatId,
        telegram_enabled: telegramEnabled,
        telegram_paused: telegramPaused,
        telegram_cooldown_seconds: Number(telegramCooldown),
        retention_days: Number(retentionDays),
        default_buffer_seconds: Number(bufferSeconds),
      });
      const data = await apiClient.getSettings();
      setServerInfo(data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar configurações!");
    } finally {
      setSaving(false);
    }
  };

  const handleTestTelegram = async () => {
    setTestingTelegram(true);
    setTelegramTestResult(null);
    try {
      const res = await apiClient.testTelegram({
        bot_token: telegramToken || undefined,
        chat_id: telegramChatId || undefined,
      });
      setTelegramTestResult({ success: true, message: res.message });
    } catch (e: any) {
      setTelegramTestResult({
        success: false,
        message: e.message || "Erro desconhecido ao testar Telegram",
      });
    } finally {
      setTestingTelegram(false);
    }
  };

  const handleManualCleanup = async () => {
    setRunningCleanup(true);
    setCleanupResult(null);
    try {
      const res = await apiClient.triggerCleanup();
      setCleanupResult(res.message);
      const data = await apiClient.getSettings();
      setServerInfo(data);
    } catch (e: any) {
      setCleanupResult("Erro na limpeza: " + (e.message || e));
    } finally {
      setRunningCleanup(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedWs(true);
    setTimeout(() => setCopiedWs(false), 2000);
  };

  const handleExportBackup = () => {
    window.location.href = apiClient.getExportConfigUrl();
  };

  const handleSendTelegramBackup = async () => {
    setSendingTelegramBackup(true);
    setTelegramBackupResult(null);
    try {
      const res = await apiClient.sendTelegramBackup();
      setTelegramBackupResult({ success: true, message: res.message });
    } catch (e: any) {
      setTelegramBackupResult({ success: false, message: e.message || "Erro ao enviar backup para o Telegram" });
    } finally {
      setSendingTelegramBackup(false);
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportingBackup(true);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const json = JSON.parse(text);
        const res = await apiClient.importConfig(json);
        setImportResult({ success: true, message: res.message });

        // Refresh settings, devices, vehicles
        const settingsData = await apiClient.getSettings();
        setServerInfo(settingsData);
        const devicesData = await apiClient.getDevices();
        setDevices(devicesData);
        const vehiclesData = await apiClient.getVehicles();
        setVehicles(vehiclesData);
      } catch (err: any) {
        setImportResult({
          success: false,
          message: err.message || "Erro ao processar arquivo de backup .json",
        });
      } finally {
        setImportingBackup(false);
      }
    };
    reader.readAsText(file);
  };

  const handleTriggerRestart = async () => {
    setIsRestarting(true);
    setIsRestartModalOpen(true);
    try {
      await apiClient.restartServer();
    } catch (e) {
      // Connection may close as server restarts
    }

    let count = 8;
    setRestartCountdown(count);
    const interval = setInterval(async () => {
      count -= 1;
      setRestartCountdown(count);
      if (count <= 3) {
        try {
          const res = await fetch(`${API_BASE}/api/settings/`);
          if (res.ok) {
            clearInterval(interval);
            setIsRestarting(false);
            setTimeout(() => {
              setIsRestartModalOpen(false);
              window.location.reload();
            }, 1000);
          }
        } catch (e) {
          // Still restarting
        }
      }
      if (count <= 0) {
        clearInterval(interval);
        setIsRestarting(false);
        setIsRestartModalOpen(false);
        window.location.reload();
      }
    }, 1000);
  };

  const handlePauseProcessing = async () => {
    setTogglingProcessing(true);
    setProcessingFeedback(null);
    try {
      const res = await apiClient.pauseProcessing();
      setIsProcessingPaused(true);
      setProcessingFeedback({ success: true, message: res.message });
      setTimeout(() => setProcessingFeedback(null), 4000);
    } catch (err: any) {
      setProcessingFeedback({ success: false, message: err.message || "Erro ao pausar processamento" });
    } finally {
      setTogglingProcessing(false);
    }
  };

  const handleResumeProcessing = async () => {
    setTogglingProcessing(true);
    setProcessingFeedback(null);
    try {
      const res = await apiClient.resumeProcessing();
      setIsProcessingPaused(false);
      setProcessingFeedback({ success: true, message: res.message });
      setTimeout(() => setProcessingFeedback(null), 4000);
    } catch (err: any) {
      setProcessingFeedback({ success: false, message: err.message || "Erro ao retomar processamento" });
    } finally {
      setTogglingProcessing(false);
    }
  };

  const handleTriggerShutdown = async () => {
    setIsShuttingDown(true);
    try {
      await apiClient.shutdownServer();
      setServerShutdownDone(true);
    } catch (e) {
      setServerShutdownDone(true);
    } finally {
      setIsShuttingDown(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-slate-800 bg-[#0f172a]/80 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors bg-slate-800/60 hover:bg-slate-800 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-700/50"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Monitor</span>
          </Link>
          <div className="h-4 w-px bg-slate-700" />
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2 flex-wrap">
            <Sliders className="w-5 h-5 text-blue-500" />
            <span>Central de Controle &amp; Dispositivos</span>
            <span
              className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20"
              title="Versão Oficial do Sistema (Formato 9 dígitos: 000.000.000)"
            >
              v{serverInfo?.version || "001.006.053"}
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccess && (
            <div className="flex items-center gap-2 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>Configurações salvas com sucesso!</span>
            </div>
          )}
          <button
            onClick={handleSaveSettings}
            disabled={saving || loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-600/20"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Salvando..." : "Salvar Alterações"}</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto p-6 gap-6">
        {/* Navigation Sidebar */}
        <aside className="w-64 shrink-0 space-y-1.5">
          <button
            onClick={() => handleSwitchTab("vehicles")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "vehicles"
                ? "bg-amber-600 text-white shadow-lg shadow-amber-600/25 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Car className="w-4 h-4 text-amber-400" />
            <div className="text-left flex-1">
              <div>Placas &amp; Veículos (LPR)</div>
              <div className="text-[10px] text-amber-200/80 font-normal">Controle de Portão 5MP</div>
            </div>
          </button>

          <button
            onClick={() => handleSwitchTab("devices")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "devices"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Shield className="w-4 h-4 text-emerald-400" />
            <div className="text-left flex-1">
              <div>Dispositivos Conectados</div>
              <div className="text-[10px] text-emerald-300/80 font-normal">Controle de Acesso &amp; ACL</div>
            </div>
          </button>

          <button
            onClick={() => handleSwitchTab("tests")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "tests"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <FlaskConical className="w-4 h-4 text-emerald-400" />
            <div className="text-left flex-1">
              <div>Central de Testes</div>
              <div className="text-[10px] text-emerald-300/80 font-normal">Disparos e Simulações</div>
            </div>
          </button>

          <button
            onClick={() => handleSwitchTab("logs")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "logs"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Terminal className="w-4 h-4 text-cyan-400" />
            <div className="text-left flex-1">
              <div>Logs &amp; Antigravity</div>
              <div className="text-[10px] text-cyan-300/80 font-normal">Exportação de Relatórios</div>
            </div>
          </button>

          <div className="h-px bg-slate-800 my-2" />

          <button
            onClick={() => handleSwitchTab("tv")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "tv"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Tv className="w-4 h-4 text-indigo-400" />
            <div className="text-left">
              <div>Smart TV &amp; Tablet</div>
              <div className="text-[10px] text-slate-400 font-normal">Pareamento e PiP</div>
            </div>
          </button>

          <button
            onClick={() => handleSwitchTab("telegram")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "telegram"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Send className="w-4 h-4 text-sky-400" />
            <div className="text-left">
              <div>Bot do Telegram</div>
              <div className="text-[10px] text-slate-400 font-normal">Fotos e Alertas Push</div>
            </div>
          </button>

          <button
            onClick={() => handleSwitchTab("storage")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "storage"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <HardDrive className="w-4 h-4 text-amber-400" />
            <div className="text-left">
              <div>Armazenamento</div>
              <div className="text-[10px] text-slate-400 font-normal">Retenção de Vídeos</div>
            </div>
          </button>

          <button
            onClick={() => handleSwitchTab("engine")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "engine"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Cpu className="w-4 h-4 text-emerald-400" />
            <div className="text-left">
              <div>Motor &amp; Ring Buffer</div>
              <div className="text-[10px] text-slate-400 font-normal">Zero-Latency Ingestor</div>
            </div>
          </button>

          <button
            onClick={() => handleSwitchTab("backup")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "backup"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <FolderArchive className="w-4 h-4 text-purple-400" />
            <div className="text-left">
              <div>Backup &amp; Sistema</div>
              <div className="text-[10px] text-purple-300/80 font-normal">Exportar / Desligar / Reiniciar</div>
            </div>
          </button>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0 bg-[#0f172a]/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur">
          {loading ? (
            <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Carregando configurações...
            </div>
          ) : (
            <>
              {/* ================= TAB: VEHICLES & LPR ================= */}
              {activeTab === "vehicles" && (
                <div className="space-y-6">
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                        <Car className="w-5 h-5 text-amber-400" />
                        <span>Reconhecimento Automático de Placas (LPR / ANPR - 5MP)</span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Controle de acesso por placas Mercosul e antigas integrado à sua câmera 5MP. Alertas instantâneos na Smart TV!
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsVehicleModalOpen(true)}
                        className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-md shadow-amber-600/20 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Cadastrar Veículo</span>
                      </button>

                      <button
                        onClick={() => {
                          fetchVehicles();
                          fetchPlateLogs();
                        }}
                        disabled={vehiclesLoading}
                        className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${vehiclesLoading ? "animate-spin" : ""}`} />
                        <span>Atualizar</span>
                      </button>
                    </div>
                  </div>

                  {/* Simulator & OCR Test Workbench */}
                  <div className="bg-gradient-to-br from-slate-900/90 to-amber-950/20 border border-amber-500/30 rounded-2xl p-5 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-100">Bancada de Testes de Leitura &amp; Alerta na TV</div>
                          <div className="text-[11px] text-slate-400">Simule a detecção de uma placa para ver a identificação do morador e o aviso PiP na TV.</div>
                        </div>
                      </div>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-full font-semibold">
                        Motor LPR Ativo
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      <div className="md:col-span-4 flex items-center justify-center p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                        {/* Brazilian Stylized Plate Display */}
                        <div className="bg-white border-2 border-slate-900 rounded-md w-48 shadow-lg overflow-hidden flex flex-col items-center">
                          <div className="bg-blue-700 text-white w-full px-2 py-0.5 flex items-center justify-between text-[9px] font-black tracking-wider">
                            <span>BRASIL</span>
                            <span className="text-[8px] opacity-80">MERCOSUL</span>
                          </div>
                          <div className="py-2 text-slate-900 font-black text-2xl tracking-widest font-mono">
                            {testPlateInput.toUpperCase() || "PLACA"}
                          </div>
                        </div>
                      </div>

                      <div className="md:col-span-8 space-y-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={testPlateInput}
                            onChange={(e) => setTestPlateInput(e.target.value.toUpperCase())}
                            placeholder="Ex: BRA2E19 ou ABC1234"
                            maxLength={8}
                            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono font-bold uppercase tracking-wider focus:outline-none focus:border-amber-500 flex-1 max-w-xs"
                          />

                          <button
                            onClick={handleSimulatePlate}
                            disabled={simulatingPlate || !testPlateInput}
                            className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md shadow-amber-600/30 flex items-center gap-2"
                          >
                            <Zap className={`w-3.5 h-3.5 ${simulatingPlate ? "animate-spin" : ""}`} />
                            <span>{simulatingPlate ? "Processando OCR..." : "Simular Reconhecimento & Alerta TV"}</span>
                          </button>
                        </div>

                        {simulatedPlateResult && (
                          <div className="p-3 bg-slate-950/80 border border-emerald-500/40 rounded-xl text-xs space-y-1.5 animate-in fade-in">
                            <div className="flex items-center justify-between">
                              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                                <CheckCircle className="w-3.5 h-3.5" />
                                {simulatedPlateResult.alert_title}
                              </span>
                              <span className="text-slate-400 font-mono text-[10px]">
                                Confiança: {(simulatedPlateResult.confidence * 100).toFixed(0)}% • Formato: {simulatedPlateResult.plate_type}
                              </span>
                            </div>
                            <div className="text-slate-300 text-[11px]">
                              Proprietário: <strong className="text-white">{simulatedPlateResult.owner_name}</strong> • Veículo: <strong className="text-white">{simulatedPlateResult.vehicle_model}</strong> • Categoria: <span className="text-amber-300 font-semibold">{simulatedPlateResult.category}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Registered Vehicles List */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                          <Car className="w-4 h-4 text-amber-400" />
                          <span>Veículos &amp; Placas Cadastradas ({vehicles.length})</span>
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Controle de acesso por reconhecimento óptico de caracteres (ANPR / LPR)
                        </p>
                      </div>

                      {/* Search & Category Filter Bar */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="text"
                          value={vehicleSearchTerm}
                          onChange={(e) => setVehicleSearchTerm(e.target.value)}
                          placeholder="Buscar por placa, morador ou carro..."
                          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 w-56"
                        />

                        <select
                          value={vehicleCategoryFilter}
                          onChange={(e) => setVehicleCategoryFilter(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                        >
                          <option value="ALL">Todas as Categorias</option>
                          <option value="MORADOR">Morador</option>
                          <option value="VISITANTE">Visitante</option>
                          <option value="PRESTADOR">Prestador</option>
                          <option value="VIP">VIP / Alerta</option>
                        </select>
                      </div>
                    </div>

                    {vehiclesLoading ? (
                      <div className="p-12 text-center text-slate-500 text-xs">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-400" />
                        Carregando banco de veículos...
                      </div>
                    ) : vehicles.filter((v) => {
                        if (vehicleCategoryFilter !== "ALL" && v.category !== vehicleCategoryFilter) return false;
                        if (vehicleSearchTerm) {
                          const q = vehicleSearchTerm.toLowerCase();
                          const matchPlate = v.plate_number.toLowerCase().includes(q);
                          const matchOwner = v.owner_name.toLowerCase().includes(q);
                          const matchModel = (v.vehicle_model || "").toLowerCase().includes(q);
                          if (!matchPlate && !matchOwner && !matchModel) return false;
                        }
                        return true;
                      }).length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {vehicles
                          .filter((v) => {
                            if (vehicleCategoryFilter !== "ALL" && v.category !== vehicleCategoryFilter) return false;
                            if (vehicleSearchTerm) {
                              const q = vehicleSearchTerm.toLowerCase();
                              const matchPlate = v.plate_number.toLowerCase().includes(q);
                              const matchOwner = v.owner_name.toLowerCase().includes(q);
                              const matchModel = (v.vehicle_model || "").toLowerCase().includes(q);
                              if (!matchPlate && !matchOwner && !matchModel) return false;
                            }
                            return true;
                          })
                          .map((v) => {
                            const isMercosul = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/i.test(v.plate_number.replace(/[^A-Za-z0-9]/g, ""));
                            const categoryColor =
                              v.category === "MORADOR"
                                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                                : v.category === "VISITANTE"
                                ? "bg-blue-500/10 text-blue-300 border-blue-500/30"
                                : v.category === "PRESTADOR"
                                ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                : "bg-purple-500/10 text-purple-300 border-purple-500/30";

                            return (
                              <div
                                key={v.id}
                                className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 p-4 rounded-2xl space-y-3.5 transition-all shadow-lg hover:shadow-amber-500/5 group flex flex-col justify-between"
                              >
                                <div>
                                  {/* Top Header: Plate Visual + Category Pill */}
                                  <div className="flex items-center justify-between gap-2">
                                    {/* Realistic Brazilian Plate Badge */}
                                    <div className="bg-white border-2 border-slate-900 rounded-md overflow-hidden shadow-md shrink-0 w-36">
                                      <div className="bg-blue-700 text-white px-2 py-0.2 flex items-center justify-between text-[8px] font-black tracking-wider leading-tight">
                                        <span>BRASIL</span>
                                        <span className="text-[7px] opacity-80">{isMercosul ? "MERCOSUL" : "BR"}</span>
                                      </div>
                                      <div className="py-1 text-center text-slate-950 font-black text-lg tracking-widest font-mono select-all">
                                        {v.plate_number.toUpperCase()}
                                      </div>
                                    </div>

                                    {/* Category Pill */}
                                    <span className={`text-[10px] border px-2.5 py-1 rounded-full font-bold uppercase tracking-wider shrink-0 ${categoryColor}`}>
                                      {v.category === "MORADOR" ? "🏠 " : v.category === "PRESTADOR" ? "🛠️ " : v.category === "VISITANTE" ? "👤 " : "⭐ "}
                                      {v.category}
                                    </span>
                                  </div>

                                  {/* Owner & Vehicle Specs */}
                                  <div className="pt-3 space-y-1">
                                    <div className="text-sm font-bold text-white flex items-center gap-1.5">
                                      <span>{v.owner_name}</span>
                                    </div>
                                    <div className="text-xs text-slate-400 flex items-center gap-1.5">
                                      <Car className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                      <span className="truncate">{v.vehicle_model || "Modelo não informado"}</span>
                                    </div>
                                    {v.notes && (
                                      <div className="text-[11px] text-slate-500 bg-slate-950/60 px-2 py-1 rounded-lg border border-slate-800/60 mt-1 truncate" title={v.notes}>
                                        {v.notes}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Footer Stats & Actions */}
                                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2.5 border-t border-slate-800/80">
                                  <span className="font-mono text-[10px]">
                                    Passagens: <strong className="text-amber-400 font-bold">{v.total_detections || 0}</strong>
                                  </span>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setTestPlateInput(v.plate_number);
                                        window.scrollTo({ top: 0, behavior: "smooth" });
                                      }}
                                      className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 rounded-lg text-[10px] font-semibold transition flex items-center gap-1"
                                      title="Carregar placa na bancada de simulação de TV"
                                    >
                                      <Zap className="w-3 h-3 text-amber-400" />
                                      <span>Testar</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteVehicle(v.id)}
                                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                                      title="Remover veículo"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
                        <Car className="w-8 h-8 text-slate-500 mx-auto" />
                        <div className="text-sm font-semibold text-slate-300">
                          {vehicleSearchTerm || vehicleCategoryFilter !== "ALL" ? "Nenhum veículo encontrado com esse filtro" : "Nenhum veículo cadastrado"}
                        </div>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                          {vehicleSearchTerm || vehicleCategoryFilter !== "ALL"
                            ? "Tente alterar os termos de busca ou selecionar outra categoria."
                            : "Cadastre as placas dos moradores, familiares e prestadores de serviço para identificação com foto e som na TV!"}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Recent Plate Logs */}
                  <div className="space-y-3 pt-4 border-t border-slate-800/80">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>Histórico Recente de Placas Capturadas</span>
                    </h3>

                    {plateLogs.length > 0 ? (
                      <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="divide-y divide-slate-800/60">
                          {plateLogs.map((log) => (
                            <div key={log.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-900/40">
                              <div className="flex items-center gap-3">
                                <div className="bg-white px-2 py-0.5 rounded text-slate-950 font-mono font-black text-xs">
                                  {log.plate_number}
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-200">
                                    {log.owner_name ? `${log.owner_name} (${log.vehicle_model})` : "Veículo Não Cadastrado"}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    Câmera: {log.camera_name} • Confiança: {(log.confidence * 100).toFixed(0)}%
                                  </div>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="text-[10px] text-slate-400">
                                  {new Date(log.detected_at).toLocaleTimeString()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 text-center text-slate-500 text-xs bg-slate-900/30 rounded-xl border border-slate-800">
                        Nenhuma leitura registrada recentemente.
                      </div>
                    )}
                  </div>

                  {/* Modal: Cadastrar Veículo */}
                  {isVehicleModalOpen && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                            <Car className="w-5 h-5 text-amber-400" />
                            <span>Cadastrar Novo Veículo</span>
                          </h3>
                          <button
                            onClick={() => setIsVehicleModalOpen(false)}
                            className="text-slate-400 hover:text-slate-200"
                          >
                            ✕
                          </button>
                        </div>

                        <form onSubmit={handleCreateVehicle} className="space-y-3.5">
                          <div>
                            <label className="text-xs font-semibold text-slate-300 block mb-1">
                              Placa do Veículo *
                            </label>
                            <input
                              type="text"
                              required
                              value={newPlateNumber}
                              onChange={(e) => setNewPlateNumber(e.target.value.toUpperCase())}
                              placeholder="Ex: BRA2E19 ou ABC1234"
                              maxLength={8}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono font-bold uppercase tracking-wider focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-slate-300 block mb-1">
                              Nome do Proprietário / Morador *
                            </label>
                            <input
                              type="text"
                              required
                              value={newOwnerName}
                              onChange={(e) => setNewOwnerName(e.target.value)}
                              placeholder="Ex: João Paulo (Casa 05)"
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-semibold text-slate-300 block mb-1">
                                Modelo / Cor
                              </label>
                              <input
                                type="text"
                                value={newVehicleModel}
                                onChange={(e) => setNewVehicleModel(e.target.value)}
                                placeholder="Ex: Civic Preto"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                              />
                            </div>

                            <div>
                              <label className="text-xs font-semibold text-slate-300 block mb-1">
                                Categoria
                              </label>
                              <select
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                              >
                                <option value="MORADOR">Morador</option>
                                <option value="VISITANTE">Visitante</option>
                                <option value="PRESTADOR">Prestador</option>
                                <option value="BLOQUEADO">Bloqueado / Alerta</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-slate-300 block mb-1">
                              Observações (Opcional)
                            </label>
                            <input
                              type="text"
                              value={newNotes}
                              onChange={(e) => setNewNotes(e.target.value)}
                              placeholder="Ex: Vaga 02, entregas matutinas"
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setIsVehicleModalOpen(false)}
                              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-md shadow-amber-600/30"
                            >
                              Salvar Veículo
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ================= TAB: DEVICES & ACL ================= */}
              {activeTab === "devices" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-emerald-400" />
                        <span>Gestão &amp; Controle de Acesso de Dispositivos (ACL)</span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Gerencie permissões de visualização e identifique na hora qual Smart TV ou Tablet fez o último teste de ping!
                      </p>
                    </div>

                    <button
                      onClick={fetchDevices}
                      disabled={devicesLoading}
                      className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-1.5 rounded-lg text-xs font-medium border border-slate-700 transition-colors self-start sm:self-auto"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${devicesLoading ? "animate-spin" : ""}`} />
                      <span>Atualizar Lista</span>
                    </button>
                  </div>

                  {/* Highlight Banner if a device just pinged */}
                  {lastPingInfo && (
                    <div className="bg-amber-500/10 border-2 border-amber-400/80 rounded-xl p-4 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center">
                          <Radio className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5" />
                            <span>DISPOSITIVO ACABOU DE FAZER TESTE DE PING NO SERVIDOR!</span>
                          </div>
                          <div className="text-sm font-semibold text-slate-100 mt-0.5">
                            {lastPingInfo.device_name} • <span className="font-mono text-amber-300">{lastPingInfo.ip_address}</span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Modelo: {lastPingInfo.manufacturer_model || "Android"} • Identificado em: {new Date(lastPingInfo.last_ping_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setEditingDeviceId(lastPingInfo.device_id);
                          setEditingDeviceName(lastPingInfo.device_name);
                        }}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3.5 py-2 rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-amber-500/20 shrink-0"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Renomear Este Dispositivo</span>
                      </button>
                    </div>
                  )}

                  {/* Device List */}
                  <div className="space-y-3">
                    {devices && devices.length > 0 ? (
                      devices.map((device) => {
                        const isEditing = editingDeviceId === device.device_id;
                        const isJustPinged = lastPingedDeviceId === device.device_id;

                        return (
                          <div
                            key={device.device_id}
                            className={`bg-slate-900/90 border rounded-xl p-4.5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                              isJustPinged
                                ? "border-amber-400 bg-amber-500/5 shadow-lg shadow-amber-500/10"
                                : "border-slate-800/90 hover:border-slate-700"
                            }`}
                          >
                            {/* Device Info */}
                            <div className="flex items-start gap-3.5">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                isJustPinged
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                                  : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              }`}>
                                {device.device_type.includes("TV") ? (
                                  <Tv className="w-5 h-5" />
                                ) : device.device_type.includes("Tablet") ? (
                                  <Tablet className="w-5 h-5" />
                                ) : device.device_type.includes("Web") ? (
                                  <Monitor className="w-5 h-5" />
                                ) : (
                                  <Smartphone className="w-5 h-5" />
                                )}
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {isEditing ? (
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={editingDeviceName}
                                        onChange={(e) => setEditingDeviceName(e.target.value)}
                                        className="bg-slate-950 border border-blue-500 rounded px-2 py-0.5 text-xs text-white"
                                        autoFocus
                                      />
                                      <button
                                        onClick={() => handleSaveDeviceName(device.device_id)}
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded text-[11px]"
                                      >
                                        Salvar
                                      </button>
                                      <button
                                        onClick={() => setEditingDeviceId(null)}
                                        className="text-slate-400 hover:text-white text-[11px]"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <span className="text-sm font-semibold text-slate-100">{device.device_name}</span>
                                      <button
                                        onClick={() => {
                                          setEditingDeviceId(device.device_id);
                                          setEditingDeviceName(device.device_name);
                                        }}
                                        className="text-slate-500 hover:text-slate-300 transition-colors"
                                        title="Renomear dispositivo"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}

                                  {/* Online Badge */}
                                  {device.is_online ? (
                                    <span className="flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                      Online Agora
                                    </span>
                                  ) : (
                                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                                      Offline
                                    </span>
                                  )}

                                  {/* Just Pinged Badge */}
                                  {device.last_ping_at && (
                                    <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                      <Radio className="w-3 h-3 text-amber-400" />
                                      Último Teste: {new Date(device.last_ping_at).toLocaleTimeString()} ({device.ping_count} pings)
                                    </span>
                                  )}
                                </div>

                                <div className="text-xs text-slate-400 flex items-center gap-3 flex-wrap">
                                  <span className="font-mono text-slate-300">IP: {device.ip_address}</span>
                                  <span>•</span>
                                  <span>Tipo: {device.device_type}</span>
                                  {device.manufacturer_model && (
                                    <>
                                      <span>•</span>
                                      <span className="text-slate-300 font-medium">Hardware: {device.manufacturer_model}</span>
                                    </>
                                  )}
                                  {device.mac_address && device.mac_address !== "UNKNOWN_MAC" && (
                                    <>
                                      <span>•</span>
                                      <span className="font-mono text-cyan-400/90 text-[11px]">MAC: {device.mac_address}</span>
                                    </>
                                  )}
                                  <span>•</span>
                                  <span className="font-mono text-purple-300/80 text-[10px]" title={device.device_id}>
                                    ID: {device.device_id}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Status Selector & Actions */}
                            <div className="flex items-center gap-2 self-end md:self-center">
                              {/* Status Buttons */}
                              <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex items-center gap-1">
                                <button
                                  onClick={() => handleUpdateDeviceStatus(device.device_id, "ALLOWED")}
                                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${
                                    device.status === "ALLOWED"
                                      ? "bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30"
                                      : "text-slate-400 hover:text-emerald-400 hover:bg-slate-900"
                                  }`}
                                  title="Permitido: Recebe alertas e streamings normalmente"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Permitido</span>
                                </button>

                                <button
                                  onClick={() => handleUpdateDeviceStatus(device.device_id, "PAUSED")}
                                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${
                                    device.status === "PAUSED"
                                      ? "bg-amber-600 text-white font-bold shadow-md shadow-amber-600/30"
                                      : "text-slate-400 hover:text-amber-400 hover:bg-slate-900"
                                  }`}
                                  title="Pausado: Temporariamente sem notificações de movimento"
                                >
                                  <PauseCircle className="w-3.5 h-3.5" />
                                  <span>Pausado</span>
                                </button>

                                <button
                                  onClick={() => handleUpdateDeviceStatus(device.device_id, "BLOCKED")}
                                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${
                                    device.status === "BLOCKED"
                                      ? "bg-rose-600 text-white font-bold shadow-md shadow-rose-600/30"
                                      : "text-slate-400 hover:text-rose-400 hover:bg-slate-900"
                                  }`}
                                  title="Bloqueado: Não recebe nenhum alerta"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                  <span>Bloqueado</span>
                                </button>

                                <button
                                  onClick={() => handleUpdateDeviceStatus(device.device_id, "UNKNOWN")}
                                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${
                                    device.status === "UNKNOWN"
                                      ? "bg-slate-600 text-white font-bold"
                                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                                  }`}
                                  title="Desconhecido: Pendente de autorização"
                                >
                                  <HelpCircle className="w-3.5 h-3.5" />
                                  <span>Desconhecido</span>
                                </button>
                              </div>

                              <button
                                onClick={() => handleDeleteDevice(device.device_id)}
                                className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                title="Esquecer dispositivo"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center space-y-2">
                        <Shield className="w-8 h-8 text-slate-500 mx-auto" />
                        <div className="text-sm font-semibold text-slate-300">Nenhum dispositivo registrado ainda</div>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                          Assim que o aplicativo no Android TV ou Tablet se conectar ou clicar em Testar Ping, ele aparecerá aqui com destaque em tempo real!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ================= TAB: TESTS ================= */}
              {activeTab === "tests" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                      <FlaskConical className="w-5 h-5 text-emerald-400" />
                      <span>Laboratório de Testes &amp; Simulações do Sistema</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Execute testes interativos de WebSocket, RTSP e áudio para validar ponta a ponta sem precisar de movimento físico.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Test 1: Motion Alert Simulation */}
                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                          <Activity className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-100">Simulação de Alerta em Tempo Real</h3>
                          <p className="text-xs text-slate-400">Dispara evento WebSocket para Smart TV, Tablet e Web.</p>
                        </div>
                      </div>

                      <button
                        onClick={handleSimulateMotion}
                        disabled={simulatingMotion}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>{simulatingMotion ? "Disparando WebSocket..." : "Disparar Alerta de Movimento Agora"}</span>
                      </button>

                      {simulateMotionResult && (
                        <div className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 p-3 rounded-lg flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{simulateMotionResult}</span>
                        </div>
                      )}
                    </div>

                    {/* Test 2: RTSP Stream Ping Test */}
                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                          <Video className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-100">Teste de Conexão RTSP da Câmera</h3>
                          <p className="text-xs text-slate-400">Mede a latência e handshake de rede do stream.</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <input
                          type="text"
                          value={testRtspUrl}
                          onChange={(e) => setTestRtspUrl(e.target.value)}
                          placeholder="rtsp://192.168.1.6:8554/stream"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                        <button
                          onClick={handleTestRtsp}
                          disabled={testingRtsp}
                          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2"
                        >
                          <Wifi className="w-3.5 h-3.5" />
                          <span>{testingRtsp ? "Testando Socket..." : "Testar Conexão RTSP (Ping Socket)"}</span>
                        </button>
                      </div>

                      {rtspTestResult && (
                        <div
                          className={`text-xs p-3 rounded-lg flex items-start gap-2 ${
                            rtspTestResult.success
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {rtspTestResult.success ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <div>{rtspTestResult.message}</div>
                            {rtspTestResult.latency_ms && (
                              <div className="text-[11px] opacity-80 mt-1 font-mono">
                                Latência de resposta: {rtspTestResult.latency_ms} ms
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Test 3: Audio Chime Test */}
                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                          <Volume2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-100">Teste de Áudio do Navegador</h3>
                          <p className="text-xs text-slate-400">Toca o chime sonoro (Web Audio API 880Hz).</p>
                        </div>
                      </div>

                      <button
                        onClick={handlePlayAudioChime}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 border border-slate-700"
                      >
                        <Volume2 className="w-4 h-4 text-amber-400" />
                        <span>Tocar Som Chime de Alerta</span>
                      </button>
                    </div>

                    {/* Test 4: Telegram Push Test */}
                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                          <Send className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-100">Teste do Bot do Telegram</h3>
                          <p className="text-xs text-slate-400">Envia mensagem de teste para o chat configurado.</p>
                        </div>
                      </div>

                      <button
                        onClick={handleTestTelegram}
                        disabled={testingTelegram}
                        className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        <span>{testingTelegram ? "Enviando..." : "Enviar Mensagem no Telegram"}</span>
                      </button>

                      {telegramTestResult && (
                        <div
                          className={`text-xs p-3 rounded-lg flex items-start gap-2 ${
                            telegramTestResult.success
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {telegramTestResult.success ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          )}
                          <span>{telegramTestResult.message}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ================= TAB: LOGS & ANTIGRAVITY ================= */}
              {activeTab === "logs" && (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-cyan-400" />
                        <span>Telemetria &amp; Relatório para o Antigravity</span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Copie todos os logs com 1 clique para colar no Antigravity e diagnosticar qualquer problema.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={fetchLogs}
                        disabled={logsLoading}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? "animate-spin" : ""}`} />
                        <span>Atualizar</span>
                      </button>

                      <button
                        onClick={handleCopyLogsForAntigravity}
                        className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-1.5 rounded-lg text-xs font-semibold shadow-lg shadow-cyan-600/25 transition-all"
                      >
                        {copiedLogs ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedLogs ? "Copiado para o Clipboard!" : "📋 Copiar Logs para Antigravity"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Telemetry Summary Cards */}
                  {logsData?.summary && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
                        <div className="text-[11px] text-slate-400">Servidor Local</div>
                        <div className="text-sm font-bold text-emerald-400 mt-0.5 font-mono">
                          {logsData.summary.local_ip}:{logsData.summary.port}
                        </div>
                      </div>

                      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
                        <div className="text-[11px] text-slate-400">Clientes WebSocket</div>
                        <div className="text-sm font-bold text-cyan-400 mt-0.5">
                          {logsData.summary.connected_ws_clients} conectados
                        </div>
                      </div>

                      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
                        <div className="text-[11px] text-slate-400">Câmeras Ativas</div>
                        <div className="text-sm font-bold text-amber-400 mt-0.5">
                          {logsData.summary.active_cameras_count} câmeras
                        </div>
                      </div>

                      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
                        <div className="text-[11px] text-slate-400">Armazenamento</div>
                        <div className="text-sm font-bold text-slate-200 mt-0.5">
                          {logsData.summary.storage?.total_size_mb} MB ({logsData.summary.storage?.total_files} vídeos)
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Level Filters */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 mr-2">Filtrar:</span>
                    {["ALL", "INFO", "WARNING", "ERROR", "DEBUG"].map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => setLogLevelFilter(lvl)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                          logLevelFilter === lvl
                            ? "bg-slate-700 text-white font-semibold"
                            : "bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                        }`}
                      >
                        {lvl === "ALL" && "Todos"}
                        {lvl === "INFO" && "🟢 Info"}
                        {lvl === "WARNING" && "🟡 Avisos"}
                        {lvl === "ERROR" && "🔴 Erros"}
                        {lvl === "DEBUG" && "⚙️ Debug"}
                      </button>
                    ))}
                  </div>

                  {/* Logs Terminal Box */}
                  <div className="bg-[#020617] border border-slate-800/80 rounded-xl p-4 font-mono text-xs overflow-x-auto max-h-[480px] overflow-y-auto space-y-1 select-text">
                    {logsData?.logs && logsData.logs.length > 0 ? (
                      logsData.logs.map((log: any, idx: number) => {
                        const levelColor =
                          log.level === "ERROR"
                            ? "text-rose-400 bg-rose-500/10 px-1 rounded"
                            : log.level === "WARNING"
                            ? "text-amber-400"
                            : log.level === "INFO"
                            ? "text-emerald-400"
                            : "text-slate-500";

                        return (
                          <div key={idx} className="leading-relaxed hover:bg-slate-900/50 py-0.5 px-1 rounded">
                            <span className="text-slate-500">[{log.timestamp}]</span>{" "}
                            <span className={`font-semibold ${levelColor}`}>[{log.level}]</span>{" "}
                            <span className="text-slate-400">
                              {log.module}:{log.function}:{log.line}
                            </span>{" "}
                            - <span className="text-slate-200">{log.message}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-slate-500 py-8 text-center">Nenhum log encontrado para o filtro selecionado.</div>
                    )}
                  </div>
                </div>
              )}

              {/* ================= TAB: SMART TV ================= */}
              {activeTab === "tv" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                      <Tv className="w-5 h-5 text-indigo-400" />
                      <span>Pareamento com Android TV &amp; Tablets</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Conecte seu aplicativo Android TV ou Tablet ao servidor para receber alertas Picture-in-Picture (PiP) instantâneos.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
                        <label className="text-xs font-semibold text-slate-300 block">IP do Servidor na Rede Local</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={serverInfo?.local_ip || "192.168.1.96"}
                            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-emerald-400 flex-1 select-all"
                          />
                          <button
                            onClick={() => copyToClipboard(serverInfo?.local_ip || "")}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
                          >
                            Copiar IP
                          </button>
                        </div>
                      </div>

                      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
                        <label className="text-xs font-semibold text-slate-300 block">Endereço WebSocket do Sentinela</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={serverInfo?.server_ws_url || ""}
                            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-400 flex-1 select-all"
                          />
                          <button
                            onClick={() => copyToClipboard(serverInfo?.server_ws_url || "")}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
                          >
                            {copiedWs ? "Copiado!" : "Copiar"}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                      <div className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-1.5">
                        <QrCode className="w-4 h-4 text-blue-400" />
                        <span>Cartão de Pareamento</span>
                      </div>
                      <img
                        src={`${API_BASE}/api/settings/qr-pairing`}
                        alt="Pairing Card"
                        className="rounded-lg border border-slate-700 max-h-48 shadow-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ================= TAB: TELEGRAM ================= */}
              {activeTab === "telegram" && (
                <form onSubmit={handleSaveSettings} className="space-y-6">
                  <div>
                    <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                      <Send className="w-5 h-5 text-sky-400" />
                      <span>Notificações no Telegram</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Receba fotos instantâneas e clipes MP4 de eventos de movimento diretamente no seu Telegram.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Pause / Resume Media Uploads Banner */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-inner">
                      <div className="flex items-center gap-3.5">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                          telegramPaused
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                        }`}>
                          {telegramPaused ? <PauseCircle className="w-6 h-6" /> : <PlayCircle className="w-6 h-6" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-2 flex-wrap">
                            <span>Envio de Arquivos &amp; Mídias (Fotos e Vídeos)</span>
                            {telegramPaused ? (
                              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                <PauseCircle className="w-3 h-3" /> PAUSADO
                              </span>
                            ) : (
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                <PlayCircle className="w-3 h-3" /> TRANSMISSÃO ATIVA
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {telegramPaused
                              ? "O envio de fotos e vídeos para o Telegram está pausado. O servidor continua gravando localmente e emitindo alertas na Smart TV."
                              : "Fotos e clipes MP4 de eventos são enviados automaticamente para o seu canal/grupo na nuvem."}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          const newPaused = !telegramPaused;
                          setTelegramPaused(newPaused);
                          try {
                            await apiClient.updateSettings({ telegram_paused: newPaused });
                            setSaveSuccess(true);
                            setTimeout(() => setSaveSuccess(false), 3000);
                          } catch (e) {
                            console.error(e);
                          }
                        }}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shrink-0 ${
                          telegramPaused
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                            : "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20"
                        }`}
                      >
                        {telegramPaused ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
                        <span>{telegramPaused ? "Retomar Envio de Arquivos" : "Pausar Envio de Arquivos"}</span>
                      </button>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1.5">Bot Token do Telegram</label>
                      <input
                        type="password"
                        value={telegramToken}
                        onChange={(e) => setTelegramToken(e.target.value)}
                        placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1.5">Chat ID do Destinatário</label>
                      <input
                        type="text"
                        value={telegramChatId}
                        onChange={(e) => setTelegramChatId(e.target.value)}
                        placeholder="123456789 ou -100123456789"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-3">
                      <button
                        type="submit"
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-blue-600/25"
                      >
                        <Save className="w-4 h-4" />
                        <span>{saving ? "Salvando..." : "Salvar Configurações do Telegram"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleTestTelegram}
                        disabled={testingTelegram || !telegramToken}
                        className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-700 transition flex items-center gap-2"
                      >
                        <Send className="w-3.5 h-3.5 text-sky-400" />
                        <span>{testingTelegram ? "Enviando teste..." : "Testar Envio de Mensagem"}</span>
                      </button>

                      {serverInfo?.telegram_bot_configured && (
                        <div className="text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Bot Ativo &amp; Sincronizado</span>
                        </div>
                      )}
                    </div>

                    {telegramTestResult && (
                      <div
                        className={`text-xs p-3 rounded-lg flex items-start gap-2 ${
                          telegramTestResult.success
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {telegramTestResult.success ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        )}
                        <span>{telegramTestResult.message}</span>
                      </div>
                    )}

                    {/* Telegram Cloud Vault & Smart Hashtags Guide Card */}
                    <div className="card-dark p-5 rounded-2xl border border-sky-500/20 bg-sky-950/20 space-y-3">
                      <div className="flex items-center gap-2.5">
                        <Sparkles className="w-4 h-4 text-sky-400" />
                        <h3 className="text-xs font-bold text-sky-300 uppercase tracking-wider">
                          Telegram Cloud Vault • Busca Semântica por Hashtags
                        </h3>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Cada foto e vídeo salvo no Telegram funciona como um <strong className="text-white">Drive Ilimitado na Nuvem</strong> indexado por hashtags clicáveis. Você pode pesquisar instantaneamente no Telegram usando:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                          <span className="text-slate-400 font-semibold block mb-1">📅 Por Data &amp; Período:</span>
                          <code className="text-sky-300 text-[11px]">#agosto2026 #d24_08_2026 #dia24 #segunda #manha #h07</code>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                          <span className="text-slate-400 font-semibold block mb-1">🚗 Por Placa &amp; Veículo:</span>
                          <code className="text-emerald-300 text-[11px]">#placa_bra2e19 #bra2e19 #byd #dolphin #corolla #morador</code>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                          <span className="text-slate-400 font-semibold block mb-1">👤 Por Pessoa Identificada:</span>
                          <code className="text-purple-300 text-[11px]">#joao #paulo #jotape #clara #pedro #visitante</code>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                          <span className="text-slate-400 font-semibold block mb-1">📍 Por Local &amp; Câmera:</span>
                          <code className="text-amber-300 text-[11px]">#portao_principal #garagem #entrada #cam1 #movimento</code>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              )}

              {/* ================= TAB: STORAGE ================= */}
              {activeTab === "storage" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                      <HardDrive className="w-5 h-5 text-amber-400" />
                      <span>Armazenamento &amp; Retenção Automática</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Gerencie a política de expiração de gravações e limpeza de espaço em disco.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                      <div className="text-xs text-slate-400">Total de Arquivos</div>
                      <div className="text-xl font-bold text-slate-100 mt-1">{serverInfo?.storage?.total_files || 0}</div>
                    </div>
                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                      <div className="text-xs text-slate-400">Espaço Ocupado</div>
                      <div className="text-xl font-bold text-amber-400 mt-1">
                        {serverInfo?.storage?.total_size_mb || 0} MB
                      </div>
                    </div>
                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                      <div className="text-xs text-slate-400">Diretório de Gravações</div>
                      <div className="text-xs font-mono text-slate-300 mt-1 truncate" title={serverInfo?.storage?.media_path}>
                        {serverInfo?.storage?.media_path || "data/media"}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                        Dias de Retenção (Exclusão automática)
                      </label>
                      <input
                        type="number"
                        value={retentionDays}
                        onChange={(e) => setRetentionDays(Number(e.target.value))}
                        min={1}
                        max={365}
                        className="w-48 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-3">
                      <button
                        type="button"
                        onClick={() => handleSaveSettings()}
                        disabled={saving}
                        className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-amber-600/25"
                      >
                        <Save className="w-4 h-4" />
                        <span>{saving ? "Salvando..." : "Salvar Política de Armazenamento"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleManualCleanup}
                        disabled={runningCleanup}
                        className="bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{runningCleanup ? "Executando limpeza..." : "Executar Limpeza Manual Agora"}</span>
                      </button>
                    </div>
                    {cleanupResult && <div className="text-xs text-slate-300 mt-2">{cleanupResult}</div>}
                  </div>
                </div>
              )}

              {/* ================= TAB: ENGINE ================= */}
              {activeTab === "engine" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-emerald-400" />
                      <span>Motor de Detecção &amp; Buffer Circular</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Ajuste os parâmetros de gravação pré-evento e buffer de memória RAM do motor OpenCV MOG2.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                        Segundos de Pré-Buffer em RAM (Vídeo gravado antes do movimento)
                      </label>
                      <input
                        type="number"
                        value={bufferSeconds}
                        onChange={(e) => setBufferSeconds(Number(e.target.value))}
                        min={1}
                        max={15}
                        className="w-48 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Recomendado: 5 a 8 segundos. Mantém os segundos anteriores à detecção no clipe salvo.
                      </p>
                    </div>

                    <div className="pt-3">
                      <button
                        type="button"
                        onClick={() => handleSaveSettings()}
                        disabled={saving}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-600/25"
                      >
                        <Save className="w-4 h-4" />
                        <span>{saving ? "Salvando..." : "Salvar Parâmetros do Motor"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= TAB: BACKUP & SYSTEM OPERATIONS ================= */}
              {activeTab === "backup" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                      <FolderArchive className="w-5 h-5 text-purple-400" />
                      <span>Backup, Restauração &amp; Operação do Servidor</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Exporte todas as configurações, câmeras e placas em formato universal (.json) compatível com Windows, Mac e Linux, ou controle o ciclo de vida do servidor.
                    </p>
                  </div>

                  {/* Section 1: Backup & Restore */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Export Card */}
                    <div className="card-dark p-5 rounded-2xl border border-white/5 space-y-4 bg-slate-900/40">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
                          <Download className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">Exportar Configurações</h3>
                          <p className="text-[11px] text-slate-400">Baixar arquivo .json com todas as regras</p>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        Gera um arquivo de backup completo contendo:
                      </p>
                      <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                        <li>Todas as Câmeras (RTSP, sensibilidade, zonas ROI e exclusão)</li>
                        <li>Veículos e Placas Cadastradas de Moradores</li>
                        <li>Dispositivos e Telas Autorizados (Smart TVs, Tablets)</li>
                        <li>Ajustes do Telegram, Retenção e Buffer de Vídeo</li>
                      </ul>

                      <div className="flex flex-col gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleExportBackup}
                          className="w-full h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition active:scale-98"
                        >
                          <FileJson className="w-4 h-4" />
                          <span>Baixar Backup Completo (.json)</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleSendTelegramBackup}
                          disabled={sendingTelegramBackup}
                          className="w-full h-10 px-4 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 text-sky-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5 text-sky-400" />
                          <span>{sendingTelegramBackup ? "Enviando para o Telegram..." : "Enviar Cópia para o Telegram Agora"}</span>
                        </button>
                      </div>

                      {telegramBackupResult && (
                        <div
                          className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                            telegramBackupResult.success
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                              : "bg-rose-500/10 border-rose-500/20 text-rose-300"
                          }`}
                        >
                          {telegramBackupResult.success ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                          ) : (
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                          )}
                          <span>{telegramBackupResult.message}</span>
                        </div>
                      )}
                    </div>

                    {/* Import Card */}
                    <div className="card-dark p-5 rounded-2xl border border-white/5 space-y-4 bg-slate-900/40">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-600/10 text-emerald-400 border border-emerald-500/20">
                          <Upload className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">Restaurar de um Arquivo</h3>
                          <p className="text-[11px] text-slate-400">Carregar backup .json para o ServONVIF</p>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        Selecione o arquivo <code className="text-emerald-400 font-mono">.json</code> exportado anteriormente para sincronizar todas as configurações instantaneamente.
                      </p>

                      <div className="pt-2">
                        <label className="w-full h-10 px-4 rounded-xl border border-dashed border-slate-700 hover:border-emerald-500 bg-slate-950/60 hover:bg-emerald-500/5 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition">
                          <Upload className="w-4 h-4 text-emerald-400" />
                          <span>{importingBackup ? "Importando configurações..." : "Selecionar Arquivo de Backup (.json)"}</span>
                          <input
                            type="file"
                            accept=".json"
                            onChange={handleImportBackup}
                            disabled={importingBackup}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {importResult && (
                        <div
                          className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                            importResult.success
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                              : "bg-rose-500/10 border-rose-500/20 text-rose-300"
                          }`}
                        >
                          {importResult.success ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                          ) : (
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                          )}
                          <span>{importResult.message}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section 2: Real-Time Processing & Standby Controls (0% CPU) */}
                  <div className="card-dark p-6 rounded-2xl border border-white/5 space-y-5 bg-slate-900/50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl border ${
                          isProcessingPaused
                            ? "bg-amber-600/10 text-amber-400 border-amber-500/20"
                            : "bg-emerald-600/10 text-emerald-400 border-emerald-500/20"
                        }`}>
                          {isProcessingPaused ? <PauseCircle className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white">Processamento em Tempo Real &amp; Standby</h3>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isProcessingPaused
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            }`}>
                              {isProcessingPaused ? "⏸️ Standby (0% CPU)" : "🟢 Ativo (Processando)"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {isProcessingPaused
                              ? "O processamento de vídeo, MOG2 e ANPR estão pausados. A CPU está em 0%, mas a API e interface continuam respondendo."
                              : "Monitoramento contínuo em execução. O sistema analisa movimentos e placas em tempo real."}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {isProcessingPaused ? (
                          <button
                            type="button"
                            onClick={handleResumeProcessing}
                            disabled={togglingProcessing}
                            className="h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition active:scale-98 disabled:opacity-50"
                          >
                            <Play className="w-4 h-4 fill-white" />
                            <span>{togglingProcessing ? "Retomando..." : "Retomar Processamento"}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handlePauseProcessing}
                            disabled={togglingProcessing}
                            className="h-11 px-5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition active:scale-98 disabled:opacity-50"
                          >
                            <Pause className="w-4 h-4 fill-amber-400" />
                            <span>{togglingProcessing ? "Pausando..." : "Pausar Servidor / Detecções (0% CPU)"}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {processingFeedback && (
                      <div
                        className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 animate-in fade-in ${
                          processingFeedback.success
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                            : "bg-rose-500/10 border-rose-500/20 text-rose-300"
                        }`}
                      >
                        {processingFeedback.success ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                        )}
                        <span>{processingFeedback.message}</span>
                      </div>
                    )}
                  </div>

                  {/* Section 3: Server Lifecycle Controls */}
                  <div className="card-dark p-6 rounded-2xl border border-white/5 space-y-5 bg-slate-900/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-amber-600/10 text-amber-400 border border-amber-500/20">
                        <Power className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Controle de Ciclo de Vida do Servidor</h3>
                        <p className="text-[11px] text-slate-400">
                          Reinicie o motor ou desligue os processos com segurança (Windows, Linux e Mac)
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      {/* Restart Button */}
                      <button
                        type="button"
                        onClick={() => setIsRestartModalOpen(true)}
                        className="h-12 px-5 rounded-xl bg-amber-600/10 hover:bg-amber-600/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-2.5 transition active:scale-98"
                      >
                        <RotateCcw className="w-4 h-4 text-amber-400" />
                        <span>Reiniciar Servidor ServONVIF</span>
                      </button>

                      {/* Shutdown Button */}
                      <button
                        type="button"
                        onClick={() => setIsShutdownModalOpen(true)}
                        className="h-12 px-5 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center justify-center gap-2.5 transition active:scale-98"
                      >
                        <Power className="w-4 h-4 text-rose-400" />
                        <span>Desligar Servidor</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ================= MODAL: CONFIRMAR REINICIALIZAÇÃO ================= */}
      {isRestartModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="card-dark rounded-2xl w-full max-w-md p-6 border border-white/10 shadow-2xl space-y-5 bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-600/10 text-amber-400 border border-amber-500/20">
                <RotateCcw className={`w-6 h-6 ${isRestarting ? "animate-spin" : ""}`} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {isRestarting ? "Reiniciando Servidor..." : "Confirmar Reinicialização"}
                </h3>
                <p className="text-xs text-slate-400">
                  {isRestarting ? `Restabelecendo conexão em ${restartCountdown}s...` : "O motor ServONVIF e os fluxos RTSP serão recarregados."}
                </p>
              </div>
            </div>

            {isRestarting ? (
              <div className="py-4 flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin" />
                <p className="text-xs text-slate-300 text-center">
                  Aguardando reconexão da API (porta 8080)...
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRestartModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleTriggerRestart}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl shadow-md shadow-amber-600/20 transition flex items-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Sim, Reiniciar Agora</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL: CONFIRMAR DESLIGAMENTO ================= */}
      {isShutdownModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="card-dark rounded-2xl w-full max-w-md p-6 border border-white/10 shadow-2xl space-y-5 bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-rose-600/10 text-rose-400 border border-rose-500/20">
                <Power className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {serverShutdownDone ? "Servidor Desligado" : "Desligar o Servidor?"}
                </h3>
                <p className="text-xs text-slate-400">
                  {serverShutdownDone ? "Todos os processos foram finalizados com segurança." : "As câmeras, conexões e alertas de TV serão pausados."}
                </p>
              </div>
            </div>

            {serverShutdownDone ? (
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-2">
                <p className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  <span>ServONVIF Core Engine encerrado.</span>
                </p>
                <p className="text-slate-400">
                  Para ligar novamente no Windows, dê dois cliques em <code className="text-blue-400">iniciar_servonvif_windows.bat</code>. No Linux/Mac execute <code className="text-blue-400">./iniciar_servonvif_linux.sh</code>.
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsShutdownModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleTriggerShutdown}
                  disabled={isShuttingDown}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md shadow-rose-600/20 transition flex items-center gap-2"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{isShuttingDown ? "Desligando..." : "Sim, Desligar"}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
