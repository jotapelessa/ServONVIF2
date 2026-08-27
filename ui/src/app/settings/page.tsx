"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { apiClient, API_BASE, getApiBase, SettingsResponse, TailscaleStatus, SystemVersionInfo, StorageDetailedResponse } from "@/lib/api-client";
import {
  ArrowLeft,
  Bell,
  Tv,
  HardDrive,
  Cpu,
  GitBranch,
  GitPullRequest,
  ArrowUpCircle,
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
  Image as ImageIcon,
  Film,
  Gauge,
  Eye,
  ShieldAlert,
  ShieldCheck,
  FileText,
  Filter,
  Users,
  Ban,
  FileDown,
  Edit3,
  BookOpen,
  Network,
  Loader2,
  Globe,
  ExternalLink,
  Calculator,
  Server,
  Info,
  BellRing,
  Laptop,
  KeyRound,
} from "lucide-react";

type SettingsTab = "vehicles" | "devices" | "tests" | "logs" | "tv" | "telegram" | "storage" | "engine" | "backup" | "guide" | "zimaos";

const TAB_SLUG_MAP: Record<string, SettingsTab> = {
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
  guide: "guide",
  guia: "guide",
  cameras: "guide",
  tutorial: "guide",
  aitek: "guide",
  onvif: "guide",
  rtsp: "guide",
  zimaos: "zimaos",
  casaos: "zimaos",
  gk3pro: "zimaos",
  jasperlake: "zimaos",
  n5105: "zimaos",
  minipc: "zimaos",
  servidor: "zimaos",
  docker: "zimaos",
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
  guide: "guia",
  zimaos: "zimaos",
};

export default function SettingsPage({ initialTab }: { initialTab?: string }) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    if (initialTab && TAB_SLUG_MAP[initialTab.toLowerCase()]) {
      return TAB_SLUG_MAP[initialTab.toLowerCase()];
    }
    return "vehicles";
  });

  const handleSwitchTab = (tab: SettingsTab) => {
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

  // Devices Fleet & ACL State
  const [devices, setDevices] = useState<any[]>([]);
  const [deviceSummary, setDeviceSummary] = useState<any>({ total: 0, online: 0, allowed: 0, blocked: 0, paused: 0, unknown: 0 });
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [deviceSearchTerm, setDeviceSearchTerm] = useState("");
  const [deviceTypeFilter, setDeviceTypeFilter] = useState("ALL");
  const [deviceViewMode, setDeviceViewMode] = useState<"grid" | "table">("grid");
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [editingDeviceName, setEditingDeviceName] = useState("");
  const [lastPingedDeviceId, setLastPingedDeviceId] = useState<string | null>(null);
  const [lastPingInfo, setLastPingInfo] = useState<any>(null);
  const [isAddDeviceModalOpen, setIsAddDeviceModalOpen] = useState(false);
  const [isEditDeviceModalOpen, setIsEditDeviceModalOpen] = useState(false);
  const [editingDeviceObject, setEditingDeviceObject] = useState<any | null>(null);
  const [testingDeviceId, setTestingDeviceId] = useState<string | null>(null);
  const [deviceActionFeedback, setDeviceActionFeedback] = useState<{ success: boolean; text: string } | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [newDeviceForm, setNewDeviceForm] = useState({
    device_name: "",
    ip_address: "",
    device_type: "Android TV",
    manufacturer_model: "",
    mac_address: "",
    status: "ALLOWED",
    notes: "",
  });

  // LPR / Vehicles State
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [plateLogs, setPlateLogs] = useState<any[]>([]);
  const [plateLogsLoading, setPlateLogsLoading] = useState(false);
  const [vehicleStats, setVehicleStats] = useState<any>(null);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any | null>(null);
  const [newPlateNumber, setNewPlateNumber] = useState("");
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newVehicleModel, setNewVehicleModel] = useState("");
  const [newCategory, setNewCategory] = useState("MORADOR");
  const [newNotes, setNewNotes] = useState("");
  const [simulatingPlate, setSimulatingPlate] = useState(false);
  const [simulatedPlateResult, setSimulatedPlateResult] = useState<any>(null);
  const [testPlateInput, setTestPlateInput] = useState("BRA2E19");
  const [testPlateVehicleType, setTestPlateVehicleType] = useState<"CAR" | "MOTO">("CAR");
  const [vehicleSearchTerm, setVehicleSearchTerm] = useState("");
  const [vehicleCategoryFilter, setVehicleCategoryFilter] = useState("ALL");
  const [vehicleViewMode, setVehicleViewMode] = useState<"grid" | "table">("grid");

  // LPR Engine Configuration State
  const [lprEnabled, setLprEnabled] = useState(true);
  const [lprMinConfidence, setLprMinConfidence] = useState(0.70);
  const [lprNotifyTelegram, setLprNotifyTelegram] = useState(true);
  const [lprNotifyTv, setLprNotifyTv] = useState(true);
  const [lprAlarmOnBlocked, setLprAlarmOnBlocked] = useState(true);
  const [lprMotorcycleEnabled, setLprMotorcycleEnabled] = useState(true);
  const [lprCooldownSeconds, setLprCooldownSeconds] = useState(30);
  const [lprRequireMotion, setLprRequireMotion] = useState(true);
  const [lprScanStaticVehicles, setLprScanStaticVehicles] = useState(false);

  // Form State
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [telegramPaused, setTelegramPaused] = useState(false);
  const [telegramCooldown, setTelegramCooldown] = useState(30);
  const [telegramVideoDuration, setTelegramVideoDuration] = useState(10);
  const [telegramPhotoQuality, setTelegramPhotoQuality] = useState<"minima" | "media" | "maxima">("media");
  const [telegramDispatchMode, setTelegramDispatchMode] = useState<"all" | "photo_only" | "video_only">("all");
  const [telegramIncludePrebuffer, setTelegramIncludePrebuffer] = useState(true);
  const [telegramWatermarkEnabled, setTelegramWatermarkEnabled] = useState(true);

  const [retentionDays, setRetentionDays] = useState(7);
  const [maxStorageQuotaGb, setMaxStorageQuotaGb] = useState(0);
  const [minFreeDiskGb, setMinFreeDiskGb] = useState(5.0);
  const [autoCleanupEnabled, setAutoCleanupEnabled] = useState(true);
  const [bufferSeconds, setBufferSeconds] = useState(5);

  // Storage Tab Detailed State
  const [storageData, setStorageData] = useState<StorageDetailedResponse | null>(null);
  const [loadingStorage, setLoadingStorage] = useState(false);
  const [refreshingStorage, setRefreshingStorage] = useState(false);
  const [savingStorage, setSavingStorage] = useState(false);
  const [storageActionMsg, setStorageActionMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [cleaningCameraId, setCleaningCameraId] = useState<number | null>(null);
  const [wipeModalOpen, setWipeModalOpen] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState("");
  const [wipingStorage, setWipingStorage] = useState(false);

  // Read-only server info
  const [serverInfo, setServerInfo] = useState<SettingsResponse | null>(null);

  // Action status
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [testingPhoto, setTestingPhoto] = useState(false);
  const [testingVideo, setTestingVideo] = useState(false);
  const [testingBackup, setTestingBackup] = useState(false);
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

  // GitHub Auto-Update State
  const [systemVersion, setSystemVersion] = useState<SystemVersionInfo | null>(null);
  const [checkingVersion, setCheckingVersion] = useState(false);
  const [isUpdatingSystem, setIsUpdatingSystem] = useState(false);
  const [updateFeedback, setUpdateFeedback] = useState<{ success: boolean; message: string; git_output?: string } | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateCountdown, setUpdateCountdown] = useState(12);

  // Dynamic Processing & Standby State (0% CPU)
  const [isProcessingPaused, setIsProcessingPaused] = useState(false);
  const [togglingProcessing, setTogglingProcessing] = useState(false);
  const [processingFeedback, setProcessingFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Camera Guide Tab State
  const [guideTestUrl, setGuideTestUrl] = useState("rtsp://admin:admin@192.168.1.50:554/stream0");
  const [guideTesting, setGuideTesting] = useState(false);
  const [guideTestResult, setGuideTestResult] = useState<{ success: boolean; message: string; latency_ms?: number } | null>(null);
  const [copiedGuideKey, setCopiedGuideKey] = useState<string | null>(null);
  const [copiedZimaSnippet, setCopiedZimaSnippet] = useState<string | null>(null);

  const handleCopyGuideText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedGuideKey(key);
    setTimeout(() => setCopiedGuideKey(null), 2500);
  };

  const handleCopyZimaSnippet = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedZimaSnippet(id);
    setTimeout(() => setCopiedZimaSnippet(null), 2500);
  };

  const handleTestGuideRtsp = async () => {
    if (!guideTestUrl) return;
    setGuideTesting(true);
    setGuideTestResult(null);
    try {
      const res = await apiClient.testRTSP(guideTestUrl);
      setGuideTestResult(res);
    } catch (e: any) {
      setGuideTestResult({
        success: false,
        message: e.message || "Falha ao conectar no fluxo RTSP da câmera",
      });
    } finally {
      setGuideTesting(false);
    }
  };

  // Hardware & Network Dimensioning Calculator State (1 to 50 Cameras)
  const [calcCameras, setCalcCameras] = useState<number>(4);
  const [calcResolution, setCalcResolution] = useState<"1080p" | "5mp" | "4k">("5mp");
  const [calcFps, setCalcFps] = useState<number>(20);
  const [calcRecordingMode, setCalcRecordingMode] = useState<"motion" | "continuous">("motion");
  const [calcRetentionDays, setCalcRetentionDays] = useState<number>(7);
  const [copiedSetupSummary, setCopiedSetupSummary] = useState(false);

  // Dimensioning Calculation Logic
  const getDimensioningResults = () => {
    // Bitrate per camera in Mbps
    const baseBitrateMbps = calcResolution === "1080p" 
      ? (calcFps === 15 ? 1.5 : calcFps === 20 ? 2.0 : 3.0)
      : calcResolution === "5mp"
      ? (calcFps === 15 ? 3.0 : calcFps === 20 ? 4.0 : 5.5)
      : (calcFps === 15 ? 6.0 : calcFps === 20 ? 8.0 : 12.0); // 4K

    const totalBandwidthMbps = Math.round(calcCameras * baseBitrateMbps * 10) / 10;

    // Daily storage per camera in GB
    // (Bitrate_kbps * 3600 * 24) / (8 * 1024 * 1024)
    const continuousDailyGbPerCam = (baseBitrateMbps * 1000 * 3600 * 24) / (8 * 1024 * 1024);
    const motionDutyCycle = 0.20; // 20% motion activity average per day
    const effectiveDailyGbPerCam = calcRecordingMode === "continuous" 
      ? continuousDailyGbPerCam 
      : continuousDailyGbPerCam * motionDutyCycle;

    const totalStorageGb = Math.ceil(effectiveDailyGbPerCam * calcCameras * calcRetentionDays * 1.15); // +15% safety headroom
    const totalStorageTb = (totalStorageGb / 1024).toFixed(1);

    // RAM calculation (Base OS/FastAPI + PyAV/OpenCV Frame Buffers + AI/LPR + Pre-buffer + Page Cache)
    const frameBufferMbPerCam = calcResolution === "1080p" ? 70 : calcResolution === "5mp" ? 150 : 260;
    const motionAiMbPerCam = 80;
    const prebufferMbPerCam = (baseBitrateMbps / 8) * 5;
    const diskPageCacheMbPerCam = 180;
    const totalMbPerCam = frameBufferMbPerCam + motionAiMbPerCam + prebufferMbPerCam + diskPageCacheMbPerCam;

    const baseSystemRamGb = 3.0; // Base OS + Python + AI Engine
    const totalWorkingRamGb = baseSystemRamGb + (calcCameras * totalMbPerCam) / 1024;

    // Map to standard commercial RAM sticks (8, 16, 32, 64, 128 GB)
    let minRamGb = 8;
    let recRamGb = 16;

    if (calcCameras <= 4) {
      minRamGb = 8;
      recRamGb = 16;
    } else if (calcCameras <= 8) {
      minRamGb = 16;
      recRamGb = 32;
    } else if (calcCameras <= 16) {
      minRamGb = 32;
      recRamGb = 32;
    } else if (calcCameras <= 32) {
      minRamGb = 32;
      recRamGb = 64;
    } else {
      minRamGb = 64;
      recRamGb = 128;
    }

    // SSD NVMe (OS + SQLite WAL DB + Thumbnails)
    const recSsdGb = calcCameras <= 4 ? 256 : calcCameras <= 16 ? 512 : calcCameras <= 32 ? 1000 : 2000;

    // HDD Recommendation
    const recHddTb = Math.max(1, Math.ceil(Number(totalStorageTb)));

    // Internet Upload Speed (Telegram burst + Remote Tailscale PiP)
    const minUploadMbps = Math.max(15, Math.ceil(baseBitrateMbps * 2 + 5));
    const recUploadMbps = Math.max(30, Math.ceil(baseBitrateMbps * 4 + 20));

    // Network Switch
    const switchType = calcCameras <= 4 
      ? "Switch PoE 4/8 Portas 10/100M ou Gigabit (60W)"
      : calcCameras <= 8
      ? "Switch Gigabit PoE 8 Portas (120W, 802.3at)"
      : calcCameras <= 16
      ? "Switch Gigabit PoE+ 16 Portas Gerenciável (250W)"
      : calcCameras <= 32
      ? "Switch Gigabit PoE+ 24/32 Portas com Uplink SFP+ 10G (380W+)"
      : "Switch Central 48 Portas Gigabit PoE+ (750W) + VLAN CFTV + Uplink 10G";

    // CPU Profile
    const cpuProfile = calcCameras <= 4
      ? { title: "Intel N100 / Mac Mini M1/M2 / Core i3 8ª+ / RPi 5", note: "Consumo ultra-baixo (6W a 15W), ideal para residência." }
      : calcCameras <= 8
      ? { title: "Intel Core i5 (10ª-14ª ger.) QuickSync / Ryzen 5 / Apple M1/M2/M3", note: "Excelente para decodificação H.264 por hardware via QuickSync." }
      : calcCameras <= 16
      ? { title: "Intel Core i7 / AMD Ryzen 7 / Mac Studio / Xeon E-2200", note: "Ideal para processamento com LPR (leitura de placas) em tempo real." }
      : calcCameras <= 32
      ? { title: "Intel Core i9 / Ryzen 9 + GPU NVIDIA GTX 1660 / RTX 3060", note: "Aceleração NVENC por GPU dedicada para 32 câmeras sem sobrecarregar a CPU." }
      : { title: "Dual Xeon / AMD EPYC / Core i9 + 1-2x GPUs NVIDIA RTX 4060 / A2000", note: "Servidor corporativo de alta densidade para 50 câmeras 24/7." };

    return {
      baseBitrateMbps,
      totalBandwidthMbps,
      totalStorageGb,
      totalStorageTb,
      minRamGb,
      recRamGb,
      recSsdGb,
      recHddTb,
      minUploadMbps,
      recUploadMbps,
      switchType,
      cpuProfile,
    };
  };

  const handleCopySetupSummary = () => {
    const r = getDimensioningResults();
    const text = `🛠️ SETUP RECOMENDADO SERVONVIF (${calcCameras} CÂMERAS ${calcResolution.toUpperCase()} @ ${calcFps}FPS)
• Câmeras: ${calcCameras}x ${calcResolution.toUpperCase()} (${calcFps} FPS, ${calcRecordingMode === "motion" ? "Gravação por Movimento" : "Gravação Contínua"})
• Retenção Desejada: ${calcRetentionDays} dias (${r.totalStorageTb} TB de vídeo)
• Processador (CPU): ${r.cpuProfile.title}
• Memória RAM: Mínimo ${r.minRamGb} GB | Recomendado ${r.recRamGb} GB DDR4/DDR5
• Armazenamento SSD: ${r.recSsdGb} GB NVMe M.2 (Sistema, Banco SQLite e Thumbnails)
• Armazenamento HDD: ${r.recHddTb} TB Surveillance (WD Purple ou Seagate SkyHawk)
• Rede Local (LAN): ${r.switchType} (Banda: ${r.totalBandwidthMbps} Mbps)
• Upload de Internet: Mínimo ${r.minUploadMbps} Mbps | Recomendado ${r.recUploadMbps} Mbps (Telegram + Tailscale)`;

    navigator.clipboard.writeText(text);
    setCopiedSetupSummary(true);
    setTimeout(() => setCopiedSetupSummary(false), 2500);
  };

  // Tailscale State
  const [tailscaleData, setTailscaleData] = useState<TailscaleStatus | null>(null);
  const [tailscaleLoading, setTailscaleLoading] = useState(false);
  const [tvPairingMode, setTvPairingMode] = useState<"local" | "tailscale">("local");
  const [showTailscaleGuide, setShowTailscaleGuide] = useState(false);

  const fetchTailscaleStatus = async () => {
    setTailscaleLoading(true);
    try {
      const data = await apiClient.getTailscaleStatus();
      setTailscaleData(data);
    } catch (e) {
      console.error("Failed to load Tailscale status:", e);
    } finally {
      setTailscaleLoading(false);
    }
  };

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
        setTelegramVideoDuration(data.telegram_video_duration_seconds || 10);
        setTelegramPhotoQuality((data.telegram_photo_quality as any) || "media");
        setTelegramDispatchMode((data.telegram_dispatch_mode as any) || "all");
        setTelegramIncludePrebuffer(data.telegram_include_prebuffer ?? true);
        setTelegramWatermarkEnabled(data.telegram_watermark_enabled ?? true);
        setLprEnabled(data.lpr_enabled ?? true);
        setLprMinConfidence(data.lpr_min_confidence ?? 0.70);
        setLprNotifyTelegram(data.lpr_notify_telegram ?? true);
        setLprNotifyTv(data.lpr_notify_tv ?? true);
        setLprAlarmOnBlocked(data.lpr_alarm_on_blocked ?? true);
        setLprMotorcycleEnabled(data.lpr_motorcycle_enabled ?? true);
        setLprCooldownSeconds(data.lpr_cooldown_seconds ?? 30);
        setLprRequireMotion(data.lpr_require_motion ?? true);
        setLprScanStaticVehicles(data.lpr_scan_static_vehicles ?? false);
        setRetentionDays(data.retention_days || 7);
        setMaxStorageQuotaGb(data.max_storage_quota_gb || 0);
        setMinFreeDiskGb(data.min_free_disk_gb || 5.0);
        setAutoCleanupEnabled(data.auto_cleanup_enabled ?? true);
        setBufferSeconds(data.default_buffer_seconds || 5);
        setIsProcessingPaused(data.processing_paused ?? false);
        fetchTailscaleStatus();
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
      const res = await apiClient.getDevices();
      if (res && res.devices) {
        setDevices(res.devices);
        if (res.summary) setDeviceSummary(res.summary);
      } else if (Array.isArray(res)) {
        setDevices(res);
      }
    } catch (e) {
      console.error("Failed to load devices:", e);
    } finally {
      setDevicesLoading(false);
    }
  };

  const handleCreateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceForm.device_name.trim()) {
      alert("Por favor, preencha o nome do dispositivo.");
      return;
    }
    try {
      await apiClient.createDevice(newDeviceForm);
      setIsAddDeviceModalOpen(false);
      setNewDeviceForm({
        device_name: "",
        ip_address: "",
        device_type: "Android TV",
        manufacturer_model: "",
        mac_address: "",
        status: "ALLOWED",
        notes: "",
      });
      setDeviceActionFeedback({ success: true, text: "Dispositivo cadastrado com sucesso!" });
      setTimeout(() => setDeviceActionFeedback(null), 3500);
      fetchDevices();
    } catch (e: any) {
      alert("Erro ao cadastrar dispositivo: " + (e.message || e));
    }
  };

  const handleUpdateDeviceDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeviceObject) return;
    try {
      await apiClient.updateDevice(editingDeviceObject.device_id, {
        device_name: editingDeviceObject.device_name,
        device_type: editingDeviceObject.device_type,
        manufacturer_model: editingDeviceObject.manufacturer_model,
        mac_address: editingDeviceObject.mac_address,
        status: editingDeviceObject.status,
        notes: editingDeviceObject.notes,
      });
      setIsEditDeviceModalOpen(false);
      setEditingDeviceObject(null);
      setDeviceActionFeedback({ success: true, text: "Configurações do dispositivo salvas!" });
      setTimeout(() => setDeviceActionFeedback(null), 3500);
      fetchDevices();
    } catch (e: any) {
      alert("Erro ao atualizar dispositivo: " + (e.message || e));
    }
  };

  const handleUpdateDeviceStatus = async (deviceId: string, newStatus: string) => {
    try {
      await apiClient.updateDevice(deviceId, { status: newStatus });
      setDevices((prev) =>
        prev.map((d) => (d.device_id === deviceId ? { ...d, status: newStatus } : d))
      );
      setDeviceActionFeedback({ success: true, text: `Status atualizado para ${newStatus}` });
      setTimeout(() => setDeviceActionFeedback(null), 2500);
      fetchDevices();
    } catch (e: any) {
      alert("Erro ao alterar status do dispositivo: " + (e.message || e));
    }
  };

  const handleTestDeviceNotify = async (deviceId: string, deviceName: string) => {
    setTestingDeviceId(deviceId);
    try {
      const res = await apiClient.testDeviceNotify(deviceId);
      setDeviceActionFeedback({
        success: true,
        text: res.delivered_to_active_socket
          ? `🔔 Pop-up de teste entregue ao vivo na tela de '${deviceName}'!`
          : `📡 Alerta transmitido para '${deviceName}' (verifique se o app está aberto).`
      });
      setTimeout(() => setDeviceActionFeedback(null), 4000);
    } catch (e: any) {
      alert("Erro ao enviar notificação de teste: " + (e.message || e));
    } finally {
      setTestingDeviceId(null);
    }
  };

  const handleBulkDeviceAction = async (action: "ALLOW_ALL" | "PAUSE_ALL" | "BLOCK_UNKNOWN" | "UNBLOCK_ALL") => {
    const actionNames: Record<string, string> = {
      ALLOW_ALL: "Autorizar todos os dispositivos",
      PAUSE_ALL: "Pausar notificações de todos os dispositivos",
      BLOCK_UNKNOWN: "Bloquear dispositivos não-reconhecidos",
      UNBLOCK_ALL: "Desbloquear toda a frota",
    };
    if (!confirm(`Deseja realmente executar a ação em massa: '${actionNames[action]}'?`)) return;
    setBulkActionLoading(true);
    try {
      const res = await apiClient.bulkDeviceAction(action);
      setDeviceActionFeedback({ success: true, text: res.message || "Ação em massa concluída!" });
      setTimeout(() => setDeviceActionFeedback(null), 3500);
      fetchDevices();
    } catch (e: any) {
      alert("Erro na ação em massa: " + (e.message || e));
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleCleanupStaleDevices = async () => {
    if (!confirm("Deseja remover do histórico todos os dispositivos offline há mais de 30 dias?")) return;
    try {
      const res = await apiClient.cleanupStaleDevices(30);
      setDeviceActionFeedback({ success: true, text: res.message || "Dispositivos inativos removidos!" });
      setTimeout(() => setDeviceActionFeedback(null), 3500);
      fetchDevices();
    } catch (e: any) {
      alert("Erro na limpeza: " + (e.message || e));
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
      fetchDevices();
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

  const fetchVehicleStats = async () => {
    try {
      const data = await apiClient.getVehicleStats();
      setVehicleStats(data);
    } catch (e) {
      console.error("Failed to load vehicle stats:", e);
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
      const data = await apiClient.getPlateLogs(100);
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
      fetchVehicleStats();
    } catch (e: any) {
      alert("Erro ao cadastrar veículo: " + (e.message || e));
    }
  };

  const handleSaveEditVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;
    try {
      const updated = await apiClient.updateVehicle(editingVehicle.id, {
        plate_number: editingVehicle.plate_number,
        owner_name: editingVehicle.owner_name,
        vehicle_model: editingVehicle.vehicle_model,
        category: editingVehicle.category,
        notes: editingVehicle.notes,
        is_active: editingVehicle.is_active,
      });
      setVehicles((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      setIsEditModalOpen(false);
      setEditingVehicle(null);
      fetchVehicleStats();
    } catch (e: any) {
      alert("Erro ao atualizar veículo: " + (e.message || e));
    }
  };

  const handleDeleteVehicle = async (vehicleId: number) => {
    if (!confirm("Tem certeza que deseja remover este veículo?")) return;
    try {
      await apiClient.deleteVehicle(vehicleId);
      setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
      fetchVehicleStats();
    } catch (e: any) {
      alert("Erro ao remover veículo: " + (e.message || e));
    }
  };

  const handleDeletePlateLog = async (logId: number) => {
    if (!confirm("Excluir este registro de passagem do histórico?")) return;
    try {
      await apiClient.deletePlateLog(logId);
      setPlateLogs((prev) => prev.filter((l) => l.id !== logId));
      fetchVehicleStats();
    } catch (e: any) {
      alert("Erro ao excluir registro: " + (e.message || e));
    }
  };

  const handleClearAllPlateLogs = async () => {
    if (!confirm("⚠️ ATENÇÃO: Deseja apagar TODO o histórico de passagens de placas? Esta ação é permanente.")) return;
    try {
      await apiClient.clearAllPlateLogs();
      setPlateLogs([]);
      fetchVehicleStats();
    } catch (e: any) {
      alert("Erro ao limpar histórico: " + (e.message || e));
    }
  };

  const handleQuickRegisterFromLog = (log: any, cat = "MORADOR") => {
    setNewPlateNumber(log.plate_number);
    setNewOwnerName(log.owner_name || "");
    setNewVehicleModel(log.vehicle_model || "");
    setNewCategory(cat);
    setNewNotes(`Cadastrado a partir da detecção na câmera ${log.camera_name}`);
    setIsVehicleModalOpen(true);
  };

  const handleExportPlateLogs = () => {
    if (!plateLogs || plateLogs.length === 0) {
      alert("Não há registros de placas para exportar.");
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(plateLogs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `relatorio_placas_servonvif_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
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
      fetchVehicleStats();
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
      fetchVehicleStats();
    }
    if (activeTab === "logs") {
      fetchLogs();
    }
    if (activeTab === "devices") {
      fetchDevices();
    }
    if (activeTab === "backup") {
      fetchSystemVersion();
    }
    if (activeTab === "storage") {
      fetchStorageDetailed(true);
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
        telegram_video_duration_seconds: Number(telegramVideoDuration),
        telegram_photo_quality: telegramPhotoQuality,
        telegram_dispatch_mode: telegramDispatchMode,
        telegram_include_prebuffer: telegramIncludePrebuffer,
        telegram_watermark_enabled: telegramWatermarkEnabled,
        lpr_enabled: lprEnabled,
        lpr_min_confidence: Number(lprMinConfidence),
        lpr_notify_telegram: lprNotifyTelegram,
        lpr_notify_tv: lprNotifyTv,
        lpr_alarm_on_blocked: lprAlarmOnBlocked,
        lpr_motorcycle_enabled: lprMotorcycleEnabled,
        lpr_cooldown_seconds: Number(lprCooldownSeconds),
        lpr_require_motion: lprRequireMotion,
        lpr_scan_static_vehicles: lprScanStaticVehicles,
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

  const handleTestTelegramPhoto = async () => {
    setTestingPhoto(true);
    setTelegramTestResult(null);
    try {
      const res = await apiClient.testTelegramPhoto();
      setTelegramTestResult({ success: true, message: res.message });
    } catch (e: any) {
      setTelegramTestResult({
        success: false,
        message: e.message || "Erro ao enviar foto de teste em qualidade máxima",
      });
    } finally {
      setTestingPhoto(false);
    }
  };

  const handleTestTelegramVideo = async () => {
    setTestingVideo(true);
    setTelegramTestResult(null);
    try {
      const res = await apiClient.testTelegramVideo(Number(telegramVideoDuration) || 30);
      setTelegramTestResult({ success: true, message: res.message });
    } catch (e: any) {
      setTelegramTestResult({
        success: false,
        message: e.message || "Erro ao enviar vídeo de teste em qualidade máxima",
      });
    } finally {
      setTestingVideo(false);
    }
  };

  const handleTestTelegramBackup = async () => {
    setTestingBackup(true);
    setTelegramTestResult(null);
    try {
      const res = await apiClient.testTelegramBackup();
      setTelegramTestResult({ success: true, message: res.message });
    } catch (e: any) {
      setTelegramTestResult({
        success: false,
        message: e.message || "Erro ao enviar backup JSON para o Telegram",
      });
    } finally {
      setTestingBackup(false);
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
      await fetchStorageDetailed(false);
    } catch (e: any) {
      setCleanupResult("Erro na limpeza: " + (e.message || e));
    } finally {
      setRunningCleanup(false);
    }
  };

  const fetchStorageDetailed = async (showLoading = false) => {
    if (showLoading) setLoadingStorage(true);
    setRefreshingStorage(true);
    try {
      const data = await apiClient.getStorageDetailed();
      setStorageData(data);
      if (data.policy) {
        setRetentionDays(data.policy.retention_days || 7);
        setMaxStorageQuotaGb(data.policy.max_storage_quota_gb || 0);
        setMinFreeDiskGb(data.policy.min_free_disk_gb || 5.0);
        setAutoCleanupEnabled(data.policy.auto_cleanup_enabled ?? true);
      }
    } catch (e: any) {
      console.error("Failed to load storage details:", e);
    } finally {
      if (showLoading) setLoadingStorage(false);
      setRefreshingStorage(false);
    }
  };

  const handleSaveStoragePolicy = async () => {
    setSavingStorage(true);
    setStorageActionMsg(null);
    try {
      await apiClient.updateStorageConfig({
        retention_days: Number(retentionDays),
        max_storage_quota_gb: Number(maxStorageQuotaGb),
        min_free_disk_gb: Number(minFreeDiskGb),
        auto_cleanup_enabled: autoCleanupEnabled,
      });
      setStorageActionMsg({ success: true, text: "Políticas de retenção e armazenamento salvas com sucesso!" });
      await fetchStorageDetailed(false);
    } catch (e: any) {
      setStorageActionMsg({ success: false, text: e.message || "Erro ao salvar políticas de armazenamento" });
    } finally {
      setSavingStorage(false);
    }
  };

  const handleRunStorageCleanup = async (days?: number) => {
    setRunningCleanup(true);
    setStorageActionMsg(null);
    try {
      const res = await apiClient.triggerCleanup(days);
      setStorageActionMsg({ success: true, text: res.message || "Limpeza de retenção executada com sucesso!" });
      await fetchStorageDetailed(false);
      const s = await apiClient.getSettings();
      setServerInfo(s);
    } catch (e: any) {
      setStorageActionMsg({ success: false, text: e.message || "Erro ao executar limpeza" });
    } finally {
      setRunningCleanup(false);
    }
  };

  const handleCleanupCamera = async (camId: number, camName: string) => {
    if (!confirm(`Tem certeza que deseja apagar todas as gravações e fotos de '${camName}' (ID #${camId})?`)) return;
    setCleaningCameraId(camId);
    setStorageActionMsg(null);
    try {
      const res = await apiClient.cleanupCameraStorage(camId);
      setStorageActionMsg({ success: true, text: res.message });
      await fetchStorageDetailed(false);
      const s = await apiClient.getSettings();
      setServerInfo(s);
    } catch (e: any) {
      setStorageActionMsg({ success: false, text: e.message || "Erro ao limpar câmera" });
    } finally {
      setCleaningCameraId(null);
    }
  };

  const handleWipeAllStorage = async () => {
    if (wipeConfirmText !== "CONFIRMAR_LIMPEZA_TOTAL") return;
    setWipingStorage(true);
    setStorageActionMsg(null);
    try {
      const res = await apiClient.wipeAllStorage(wipeConfirmText);
      setStorageActionMsg({ success: true, text: res.message });
      setWipeModalOpen(false);
      setWipeConfirmText("");
      await fetchStorageDetailed(false);
      const s = await apiClient.getSettings();
      setServerInfo(s);
    } catch (e: any) {
      setStorageActionMsg({ success: false, text: e.message || "Erro na limpeza total" });
    } finally {
      setWipingStorage(false);
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
        if (devicesData && devicesData.devices) {
          setDevices(devicesData.devices);
          if (devicesData.summary) setDeviceSummary(devicesData.summary);
        } else if (Array.isArray(devicesData)) {
          setDevices(devicesData);
        }
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
          const res = await fetch(`${getApiBase()}/api/settings/`);
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

  const fetchSystemVersion = async () => {
    setCheckingVersion(true);
    try {
      const data = await apiClient.getSystemVersion();
      setSystemVersion(data);
    } catch (e) {
      console.error("Erro ao consultar versão do sistema:", e);
    } finally {
      setCheckingVersion(false);
    }
  };

  const handleTriggerSystemUpdate = async () => {
    setIsUpdatingSystem(true);
    setIsUpdateModalOpen(true);
    setUpdateFeedback(null);
    try {
      const res = await apiClient.applySystemUpdate();
      setUpdateFeedback({ success: true, message: res.message, git_output: res.git_output });
    } catch (err: any) {
      setUpdateFeedback({ success: false, message: err.message || "Erro ao aplicar atualização" });
      setIsUpdatingSystem(false);
      return;
    }

    let count = 12;
    setUpdateCountdown(count);
    const interval = setInterval(async () => {
      count -= 1;
      setUpdateCountdown(count);
      if (count <= 6) {
        try {
          const res = await fetch(`${getApiBase()}/api/settings/system/version`);
          if (res.ok) {
            clearInterval(interval);
            setIsUpdatingSystem(false);
            setTimeout(() => {
              setIsUpdateModalOpen(false);
              window.location.reload();
            }, 1000);
          }
        } catch (e) {
          // Still restarting
        }
      }
      if (count <= 0) {
        clearInterval(interval);
        setIsUpdatingSystem(false);
        setIsUpdateModalOpen(false);
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
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto p-6 gap-6 pb-24">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 shrink-0 space-y-1.5 md:sticky md:top-20 md:self-start">
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

          <div className="h-px bg-slate-800 my-2" />

          <button
            onClick={() => handleSwitchTab("guide")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "guide"
                ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/25 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <div className="text-left flex-1">
              <div>Guia de Câmeras IP</div>
              <div className="text-[10px] text-cyan-300/80 font-normal">AITEK 5MP, PoE &amp; RTSP</div>
            </div>
          </button>

          <button
            onClick={() => handleSwitchTab("zimaos")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "zimaos"
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/25 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Server className="w-4 h-4 text-emerald-400" />
            <div className="text-left flex-1">
              <div className="flex items-center justify-between">
                <span>Guia ZimaOS &amp; GK3</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">N5105</span>
              </div>
              <div className="text-[10px] text-emerald-300/80 font-normal">Docker / 16GB / 512GB SSD</div>
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
              {/* ================= TAB: VEHICLES & LPR ENTERPRISE ================= */}
              {activeTab === "vehicles" && (
                <div className="space-y-6">
                  {/* 1. Header & Quick Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                        <Car className="w-5 h-5 text-amber-400" />
                        <span>Central de Reconhecimento de Placas (LPR / ANPR - 5MP)</span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Controle de acesso por visão computacional (Mercosul, Cinza e Motos). Alertas na TV, Telegram e Lista Negra.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => {
                          setNewPlateNumber("");
                          setNewOwnerName("");
                          setNewVehicleModel("");
                          setNewCategory("MORADOR");
                          setNewNotes("");
                          setIsVehicleModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-md shadow-amber-600/20 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Cadastrar Veículo</span>
                      </button>

                      <button
                        onClick={handleExportPlateLogs}
                        disabled={plateLogs.length === 0}
                        className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
                        title="Exportar relatório de passagens em JSON"
                      >
                        <FileDown className="w-3.5 h-3.5 text-blue-400" />
                        <span>Exportar Relatório</span>
                      </button>

                      <button
                        onClick={() => {
                          fetchVehicles();
                          fetchPlateLogs();
                          fetchVehicleStats();
                        }}
                        disabled={vehiclesLoading || plateLogsLoading}
                        className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${(vehiclesLoading || plateLogsLoading) ? "animate-spin" : ""}`} />
                        <span>Atualizar</span>
                      </button>
                    </div>
                  </div>

                  {/* 2. Analytical KPI Metric Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {/* KPI 1: Total Veículos */}
                    <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow-lg relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Cadastrado</span>
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          <Car className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="text-2xl font-extrabold text-white font-mono">{vehicles.length}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Veículos no Banco Local</div>
                      </div>
                    </div>

                    {/* KPI 2: Moradores */}
                    <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow-lg relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Moradores</span>
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="text-2xl font-extrabold text-emerald-400 font-mono">
                          {vehicleStats?.moradores_count ?? vehicles.filter(v => v.category === "MORADOR").length}
                        </div>
                        <div className="text-[10px] text-emerald-500/80 mt-0.5">Acesso Liberado & VIP</div>
                      </div>
                    </div>

                    {/* KPI 3: Bloqueados / Lista Negra */}
                    <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow-lg relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Lista Negra</span>
                        <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <ShieldAlert className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="text-2xl font-extrabold text-rose-400 font-mono">
                          {vehicleStats?.bloqueados_count ?? vehicles.filter(v => v.category === "BLOQUEADO").length}
                        </div>
                        <div className="text-[10px] text-rose-400/80 mt-0.5">Alarme e Bloqueio Ativo</div>
                      </div>
                    </div>

                    {/* KPI 4: Passagens Hoje */}
                    <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow-lg relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Passagens Hoje</span>
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Clock className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="text-2xl font-extrabold text-amber-400 font-mono">
                          {vehicleStats?.logs_today ?? plateLogs.length}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate" title={vehicleStats?.last_detected_plate ? `Última: ${vehicleStats.last_detected_plate}` : "Nenhuma passagem"}>
                          {vehicleStats?.last_detected_plate ? `Última: ${vehicleStats.last_detected_plate}` : "Monitorando câmeras..."}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. LPR Motor Parameters & Operational Controls */}
                  <div className="bg-[#131b2e] border border-amber-500/20 rounded-2xl p-5 space-y-5 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
                          <Sliders className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-100">Parâmetros Operacionais do Motor LPR &amp; OCR</div>
                          <div className="text-[11px] text-slate-400">Ajuste a sensibilidade de leitura, suporte a motos e regras de alarme.</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-slate-300">Motor LPR:</label>
                        <button
                          type="button"
                          onClick={() => setLprEnabled(!lprEnabled)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            lprEnabled ? "bg-amber-600" : "bg-slate-700"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              lprEnabled ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* OCR Confidence Threshold */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                          <span>Confiança Mínima do OCR (Qualidade da Leitura)</span>
                          <span className="text-amber-400 font-mono text-xs font-bold">
                            {(lprMinConfidence * 100).toFixed(0)}%
                          </span>
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[
                            { label: "60% Rápido", val: 0.60 },
                            { label: "70% Padrão", val: 0.70 },
                            { label: "85% Alta", val: 0.85 },
                            { label: "95% Rigorosa", val: 0.95 },
                          ].map((item) => (
                            <button
                              key={item.val}
                              type="button"
                              onClick={() => setLprMinConfidence(item.val)}
                              className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition ${
                                Math.abs(lprMinConfidence - item.val) < 0.05
                                  ? "bg-amber-600 text-white border-amber-500 font-bold shadow-md shadow-amber-600/30"
                                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-500">
                          Valores menores identificam placas com mais facilidade sob chuva ou baixa luz.
                        </p>
                      </div>

                      {/* Re-read Cooldown */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                          <span>Intervalo Anti-Spam entre Leituras (Cooldown)</span>
                          <span className="text-amber-400 font-mono text-xs font-bold">
                            {lprCooldownSeconds < 60 ? `${lprCooldownSeconds}s` : `${Math.round(lprCooldownSeconds / 60)} min`}
                          </span>
                        </label>
                        <div className="grid grid-cols-5 gap-1.5">
                          {[
                            { label: "15s", val: 15 },
                            { label: "30s", val: 30 },
                            { label: "1 min", val: 60 },
                            { label: "5 min", val: 300 },
                            { label: "10 min", val: 600 },
                          ].map((item) => (
                            <button
                              key={item.val}
                              type="button"
                              onClick={() => setLprCooldownSeconds(item.val)}
                              className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition ${
                                lprCooldownSeconds === item.val
                                  ? "bg-amber-600 text-white border-amber-500 font-bold shadow-md shadow-amber-600/30"
                                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-500">
                          Evita alertas repetidos para um carro estacionado na frente da câmera.
                        </p>
                      </div>
                    </div>

                    {/* Toggles Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
                      {/* Motorcycle OCR */}
                      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-slate-200">Placas de Moto</div>
                          <div className="text-[10px] text-slate-400">Leitura em 2 linhas</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setLprMotorcycleEnabled(!lprMotorcycleEnabled)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            lprMotorcycleEnabled ? "bg-amber-600" : "bg-slate-700"
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                              lprMotorcycleEnabled ? "translate-x-4" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Telegram LPR Alert */}
                      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-slate-200">Alerta no Telegram</div>
                          <div className="text-[10px] text-slate-400">Foto da placa no chat</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setLprNotifyTelegram(!lprNotifyTelegram)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            lprNotifyTelegram ? "bg-sky-600" : "bg-slate-700"
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                              lprNotifyTelegram ? "translate-x-4" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Smart TV PiP Pop-up */}
                      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-slate-200">Pop-up na Smart TV</div>
                          <div className="text-[10px] text-slate-400">Aviso PiP na tela</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setLprNotifyTv(!lprNotifyTv)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            lprNotifyTv ? "bg-indigo-600" : "bg-slate-700"
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                              lprNotifyTv ? "translate-x-4" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Blocked Vehicle Siren */}
                      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-rose-400">Sirene Lista Negra</div>
                          <div className="text-[10px] text-slate-400">Alarme de intruso</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setLprAlarmOnBlocked(!lprAlarmOnBlocked)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            lprAlarmOnBlocked ? "bg-rose-600" : "bg-slate-700"
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                              lprAlarmOnBlocked ? "translate-x-4" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Require Motion Gating (Anti-Garage False Positives) */}
                      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-emerald-400">Exigir Movimento na Zona</div>
                          <div className="text-[10px] text-slate-400">Anti-falso positivo em portão/garagem</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setLprRequireMotion(!lprRequireMotion)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            lprRequireMotion ? "bg-emerald-600" : "bg-slate-700"
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                              lprRequireMotion ? "translate-x-4" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Static Scan Toggle */}
                      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-slate-200">Varredura Estática 30s</div>
                          <div className="text-[10px] text-slate-400">Veículo parado (desativado em garagem)</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setLprScanStaticVehicles(!lprScanStaticVehicles)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            lprScanStaticVehicles ? "bg-amber-600" : "bg-slate-700"
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                              lprScanStaticVehicles ? "translate-x-4" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 4. Interactive Simulation & Plate Test Workbench */}
                  <div className="bg-gradient-to-br from-slate-900/90 to-amber-950/20 border border-amber-500/30 rounded-2xl p-5 space-y-4 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-100">Bancada de Testes de Leitura &amp; Alerta na TV</div>
                          <div className="text-[11px] text-slate-400">Simule a detecção de uma placa para testar o reconhecimento e os alertas visuais.</div>
                        </div>
                      </div>

                      {/* Type Toggle: Car vs Motorcycle */}
                      <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setTestPlateVehicleType("CAR")}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                            testPlateVehicleType === "CAR"
                              ? "bg-amber-600 text-white shadow-sm"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          🚗 Carro (1 Linha)
                        </button>
                        <button
                          type="button"
                          onClick={() => setTestPlateVehicleType("MOTO")}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                            testPlateVehicleType === "MOTO"
                              ? "bg-amber-600 text-white shadow-sm"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          🏍️ Moto (2 Linhas)
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      <div className="md:col-span-4 flex items-center justify-center p-4 bg-slate-950/60 rounded-xl border border-slate-800">
                        {testPlateVehicleType === "CAR" ? (
                          /* Realistic Brazilian Car Plate */
                          <div className="bg-white border-2 border-slate-900 rounded-md w-52 shadow-xl overflow-hidden flex flex-col items-center">
                            <div className="bg-blue-700 text-white w-full px-2.5 py-0.5 flex items-center justify-between text-[9px] font-black tracking-wider">
                              <span>BRASIL</span>
                              <span className="text-[8px] opacity-80 font-bold">MERCOSUL</span>
                            </div>
                            <div className="py-2.5 text-slate-950 font-black text-2xl tracking-widest font-mono select-all">
                              {testPlateInput.toUpperCase() || "PLACA"}
                            </div>
                          </div>
                        ) : (
                          /* Realistic Brazilian Motorcycle Plate (2 Lines) */
                          <div className="bg-white border-2 border-slate-900 rounded-md w-32 shadow-xl overflow-hidden flex flex-col items-center">
                            <div className="bg-blue-700 text-white w-full px-2 py-0.5 flex items-center justify-between text-[8px] font-black tracking-wider">
                              <span>BR</span>
                              <span className="text-[7px] opacity-80">MOTO</span>
                            </div>
                            <div className="py-1 text-center font-mono font-black text-slate-950 leading-tight">
                              <div className="text-sm tracking-widest">{testPlateInput.slice(0, 3).toUpperCase() || "ABC"}</div>
                              <div className="text-base tracking-wider">{testPlateInput.slice(3).toUpperCase() || "1D23"}</div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="md:col-span-8 space-y-3">
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          <input
                            type="text"
                            value={testPlateInput}
                            onChange={(e) => setTestPlateInput(e.target.value.toUpperCase())}
                            placeholder="Ex: BRA2E19 ou ABC1234"
                            maxLength={8}
                            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono font-bold uppercase tracking-wider focus:outline-none focus:border-amber-500 flex-1 min-w-[140px]"
                          />

                          <button
                            onClick={handleSimulatePlate}
                            disabled={simulatingPlate || !testPlateInput}
                            className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md shadow-amber-600/30 flex items-center gap-2 shrink-0"
                          >
                            <Zap className={`w-3.5 h-3.5 ${simulatingPlate ? "animate-spin" : ""}`} />
                            <span>{simulatingPlate ? "Processando OCR..." : "Simular Reconhecimento & Alerta TV"}</span>
                          </button>
                        </div>

                        {simulatedPlateResult && (
                          <div className={`p-3 bg-slate-950/80 border rounded-xl text-xs space-y-1.5 animate-in fade-in ${
                            simulatedPlateResult.category === "BLOQUEADO"
                              ? "border-rose-500/50 bg-rose-950/20"
                              : "border-emerald-500/40"
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className={`font-bold flex items-center gap-1.5 ${
                                simulatedPlateResult.category === "BLOQUEADO" ? "text-rose-400" : "text-emerald-400"
                              }`}>
                                {simulatedPlateResult.category === "BLOQUEADO" ? (
                                  <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                                ) : (
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                                )}
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

                  {/* 5. Registered Vehicles List & Search */}
                  <div className="space-y-4 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                          <Car className="w-4 h-4 text-amber-400" />
                          <span>Banco de Veículos Autorizados &amp; Lista Negra ({vehicles.length})</span>
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Identificação imediata de moradores, visitantes autorizados e alerta para suspeitos.
                        </p>
                      </div>

                      {/* Search & Category Filter Bar */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            value={vehicleSearchTerm}
                            onChange={(e) => setVehicleSearchTerm(e.target.value)}
                            placeholder="Buscar placa, morador..."
                            className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 w-48 sm:w-56"
                          />
                        </div>

                        <select
                          value={vehicleCategoryFilter}
                          onChange={(e) => setVehicleCategoryFilter(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                        >
                          <option value="ALL">Todas as Categorias</option>
                          <option value="MORADOR">🏠 Morador</option>
                          <option value="VISITANTE">👤 Visitante</option>
                          <option value="PRESTADOR">🛠️ Prestador</option>
                          <option value="BLOQUEADO">🚫 Lista Negra / Bloqueado</option>
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
                                : "bg-rose-500/10 text-rose-300 border-rose-500/30";

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
                                      {v.category === "MORADOR" ? "🏠 " : v.category === "PRESTADOR" ? "🛠️ " : v.category === "VISITANTE" ? "👤 " : "🚫 "}
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
                                      onClick={() => {
                                        setEditingVehicle({ ...v });
                                        setIsEditModalOpen(true);
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
                                      title="Editar veículo"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
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

                  {/* 6. Recent Plate Detections & Audit Logs */}
                  <div className="space-y-3 pt-4 border-t border-slate-800/80">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-400" />
                          <span>Histórico de Passagens &amp; Auditoria LPR ({plateLogs.length})</span>
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Registro em tempo real de todas as leituras de placas feitas pelas câmeras.
                        </p>
                      </div>

                      {plateLogs.length > 0 && (
                        <button
                          onClick={handleClearAllPlateLogs}
                          className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20 transition self-start sm:self-auto"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Limpar Histórico</span>
                        </button>
                      )}
                    </div>

                    {plateLogs.length > 0 ? (
                      <div className="bg-slate-950/70 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                        <div className="divide-y divide-slate-800/60 max-h-[420px] overflow-y-auto">
                          {plateLogs.map((log) => {
                            const isRegistered = !!log.owner_name;
                            const isBlocked = log.category === "BLOQUEADO";

                            return (
                              <div
                                key={log.id}
                                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-900/50 transition"
                              >
                                <div className="flex items-center gap-3">
                                  {/* Plate Badge */}
                                  <div className="bg-white px-2.5 py-1 rounded text-slate-950 font-mono font-black text-xs border border-slate-800 shadow-sm shrink-0">
                                    {log.plate_number}
                                  </div>

                                  <div>
                                    <div className="font-semibold text-slate-200 flex items-center gap-2">
                                      <span>
                                        {isRegistered ? `${log.owner_name} (${log.vehicle_model || "Carro"})` : "Veículo Não Cadastrado"}
                                      </span>
                                      <span className={`text-[9px] px-2 py-0.2 rounded-full font-bold uppercase ${
                                        isBlocked
                                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                          : isRegistered
                                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                          : "bg-slate-800 text-slate-400 border border-slate-700"
                                      }`}>
                                        {log.category || "DESCONHECIDO"}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                      Câmera: <span className="text-slate-300">{log.camera_name}</span> • Confiança: <span className="text-amber-400">{(log.confidence * 100).toFixed(0)}%</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                                  <span className="text-[11px] text-slate-400 font-mono">
                                    {new Date(log.detected_at).toLocaleString("pt-BR")}
                                  </span>

                                  <div className="flex items-center gap-1.5">
                                    {!isRegistered && (
                                      <button
                                        type="button"
                                        onClick={() => handleQuickRegisterFromLog(log, "MORADOR")}
                                        className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 rounded-lg text-[10px] font-semibold transition"
                                        title="Cadastrar como morador"
                                      >
                                        + Morador
                                      </button>
                                    )}

                                    {!isBlocked && (
                                      <button
                                        type="button"
                                        onClick={() => handleQuickRegisterFromLog(log, "BLOQUEADO")}
                                        className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 rounded-lg text-[10px] font-semibold transition"
                                        title="Adicionar à lista negra"
                                      >
                                        🚫 Bloquear
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleDeletePlateLog(log.id)}
                                      className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition"
                                      title="Excluir este registro"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 text-center text-slate-500 text-xs bg-slate-900/30 rounded-xl border border-slate-800">
                        Nenhuma passagem registrada no histórico recente.
                      </div>
                    )}
                  </div>

                  {/* 7. Modal: Cadastrar Novo Veículo */}
                  {isVehicleModalOpen && (
                    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                            <Car className="w-5 h-5 text-amber-400" />
                            <span>Cadastrar Novo Veículo</span>
                          </h3>
                          <button
                            onClick={() => setIsVehicleModalOpen(false)}
                            className="text-slate-400 hover:text-slate-200 text-sm font-bold"
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
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
                              >
                                <option value="MORADOR">🏠 Morador</option>
                                <option value="VISITANTE">👤 Visitante</option>
                                <option value="PRESTADOR">🛠️ Prestador</option>
                                <option value="BLOQUEADO">🚫 Lista Negra / Alerta</option>
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

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
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

                  {/* 8. Modal: Editar Veículo Existente */}
                  {isEditModalOpen && editingVehicle && (
                    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                            <Edit3 className="w-5 h-5 text-amber-400" />
                            <span>Editar Dados do Veículo</span>
                          </h3>
                          <button
                            onClick={() => {
                              setIsEditModalOpen(false);
                              setEditingVehicle(null);
                            }}
                            className="text-slate-400 hover:text-slate-200 text-sm font-bold"
                          >
                            ✕
                          </button>
                        </div>

                        <form onSubmit={handleSaveEditVehicle} className="space-y-3.5">
                          <div>
                            <label className="text-xs font-semibold text-slate-300 block mb-1">
                              Placa do Veículo *
                            </label>
                            <input
                              type="text"
                              required
                              value={editingVehicle.plate_number}
                              onChange={(e) => setEditingVehicle({ ...editingVehicle, plate_number: e.target.value.toUpperCase() })}
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
                              value={editingVehicle.owner_name}
                              onChange={(e) => setEditingVehicle({ ...editingVehicle, owner_name: e.target.value })}
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
                                value={editingVehicle.vehicle_model || ""}
                                onChange={(e) => setEditingVehicle({ ...editingVehicle, vehicle_model: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                              />
                            </div>

                            <div>
                              <label className="text-xs font-semibold text-slate-300 block mb-1">
                                Categoria
                              </label>
                              <select
                                value={editingVehicle.category}
                                onChange={(e) => setEditingVehicle({ ...editingVehicle, category: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
                              >
                                <option value="MORADOR">🏠 Morador</option>
                                <option value="VISITANTE">👤 Visitante</option>
                                <option value="PRESTADOR">🛠️ Prestador</option>
                                <option value="BLOQUEADO">🚫 Lista Negra / Alerta</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-slate-300 block mb-1">
                              Observações
                            </label>
                            <input
                              type="text"
                              value={editingVehicle.notes || ""}
                              onChange={(e) => setEditingVehicle({ ...editingVehicle, notes: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                            <button
                              type="button"
                              onClick={() => {
                                setIsEditModalOpen(false);
                                setEditingVehicle(null);
                              }}
                              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-md shadow-blue-600/30"
                            >
                              Salvar Alterações
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ================= TAB: DEVICES & FLEET ACL ================= */}
              {activeTab === "devices" && (
                <div className="space-y-6">
                  {/* 1. Header & Quick Actions */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-emerald-400" />
                        <span>Central de Dispositivos &amp; Controle de Acesso (ACL)</span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Gerencie permissões de PiP, identifique Smart TVs e Tablets conectados e dispare notificações de teste em tempo real.
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                      <button
                        onClick={() => setIsAddDeviceModalOpen(true)}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/20"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Cadastrar Dispositivo</span>
                      </button>

                      <button
                        onClick={fetchDevices}
                        disabled={devicesLoading}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-medium border border-slate-700 transition"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${devicesLoading ? "animate-spin" : ""}`} />
                        <span>Atualizar</span>
                      </button>
                    </div>
                  </div>

                  {/* Action Feedback Toast */}
                  {deviceActionFeedback && (
                    <div className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2.5 shadow-lg animate-in fade-in slide-in-from-top-2 ${
                      deviceActionFeedback.success
                        ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                        : "bg-rose-500/10 border border-rose-500/30 text-rose-300"
                    }`}>
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <span>{deviceActionFeedback.text}</span>
                    </div>
                  )}

                  {/* 2. Fleet KPI Telemetry Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* KPI 1: Total Fleet */}
                    <div className="bg-[#131b2e] border border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow-lg relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Frota de Telas</span>
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          <Tv className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="text-2xl font-extrabold text-white font-mono">
                          {deviceSummary?.total ?? devices.length}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">TVs, Tablets &amp; Celulares</div>
                      </div>
                    </div>

                    {/* KPI 2: Live Online Sockets */}
                    <div className="bg-[#131b2e] border border-emerald-500/20 p-4 rounded-2xl flex flex-col justify-between shadow-lg relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Online Agora</span>
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Radio className="w-4 h-4 animate-pulse" />
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="text-2xl font-extrabold text-emerald-400 font-mono">
                          {deviceSummary?.online ?? devices.filter(d => d.is_online).length}
                        </div>
                        <div className="text-[10px] text-emerald-500/80 mt-0.5 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          WebSocket Sockets Ativos
                        </div>
                      </div>
                    </div>

                    {/* KPI 3: Allowed ACL */}
                    <div className="bg-[#131b2e] border border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow-lg relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Autorizados</span>
                        <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="text-2xl font-extrabold text-cyan-400 font-mono">
                          {deviceSummary?.allowed ?? devices.filter(d => d.status === "ALLOWED").length}
                        </div>
                        <div className="text-[10px] text-cyan-500/80 mt-0.5">Recebendo Alertas &amp; PiP</div>
                      </div>
                    </div>

                    {/* KPI 4: Blocked / Paused */}
                    <div className="bg-[#131b2e] border border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow-lg relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Bloqueados / Pausa</span>
                        <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <Lock className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="text-2xl font-extrabold text-rose-400 font-mono">
                          {(deviceSummary?.blocked ?? 0) + (deviceSummary?.paused ?? 0)}
                        </div>
                        <div className="text-[10px] text-rose-400/80 mt-0.5">Acesso Restrito / Silenciado</div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Highlight Banner if a device just pinged */}
                  {lastPingInfo && (
                    <div className="bg-amber-500/10 border-2 border-amber-400/80 rounded-2xl p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl shadow-amber-500/10 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0">
                          <Radio className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5" />
                            <span>TESTE DE PING RECEBIDO EM TEMPO REAL!</span>
                          </div>
                          <div className="text-sm font-bold text-white mt-0.5">
                            {lastPingInfo.device_name} • <span className="font-mono text-amber-300">{lastPingInfo.ip_address}</span>
                          </div>
                          <div className="text-[11px] text-slate-300">
                            Modelo: <span className="text-white font-medium">{lastPingInfo.manufacturer_model || "Android"}</span> • Horário: {new Date(lastPingInfo.last_ping_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-auto">
                        <button
                          onClick={() => handleTestDeviceNotify(lastPingInfo.device_id, lastPingInfo.device_name)}
                          disabled={testingDeviceId === lastPingInfo.device_id}
                          className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition flex items-center gap-1.5 border border-slate-700"
                        >
                          {testingDeviceId === lastPingInfo.device_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellRing className="w-3.5 h-3.5 text-amber-400" />}
                          <span>Testar Pop-up na TV</span>
                        </button>

                        <button
                          onClick={() => {
                            setEditingDeviceId(lastPingInfo.device_id);
                            setEditingDeviceName(lastPingInfo.device_name);
                          }}
                          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Renomear</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 4. Controls, Search, Filter & Bulk Actions Bar */}
                  <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-xl">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      {/* Search Input */}
                      <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Buscar por nome, IP, MAC ou modelo..."
                          value={deviceSearchTerm}
                          onChange={(e) => setDeviceSearchTerm(e.target.value)}
                          className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                        {deviceSearchTerm && (
                          <button
                            onClick={() => setDeviceSearchTerm("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Bulk Actions Dropdown / Buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => handleBulkDeviceAction("ALLOW_ALL")}
                          disabled={bulkActionLoading}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-950/50 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900/60 transition"
                          title="Autoriza todos os dispositivos registrados"
                        >
                          ✅ Autorizar Todos
                        </button>

                        <button
                          onClick={() => handleBulkDeviceAction("PAUSE_ALL")}
                          disabled={bulkActionLoading}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-950/50 text-amber-300 border border-amber-800/60 hover:bg-amber-900/60 transition"
                          title="Pausa notificações temporariamente"
                        >
                          ⏸️ Pausar Todos
                        </button>

                        <button
                          onClick={handleCleanupStaleDevices}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-slate-300 border border-slate-700/80 hover:bg-slate-800 transition"
                          title="Remove do cadastro dispositivos sem conexão há mais de 30 dias"
                        >
                          🧹 Limpar Inativos
                        </button>

                        {/* View Mode Toggle */}
                        <div className="bg-slate-950 p-0.5 rounded-lg border border-slate-800 flex items-center">
                          <button
                            onClick={() => setDeviceViewMode("grid")}
                            className={`p-1.5 rounded text-xs transition ${
                              deviceViewMode === "grid" ? "bg-slate-800 text-white font-bold" : "text-slate-400 hover:text-white"
                            }`}
                            title="Visualização em Cards"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeviceViewMode("table")}
                            className={`p-1.5 rounded text-xs transition ${
                              deviceViewMode === "table" ? "bg-slate-800 text-white font-bold" : "text-slate-400 hover:text-white"
                            }`}
                            title="Visualização em Tabela"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Filter Category Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                      {[
                        { id: "ALL", label: `Todos (${devices.length})` },
                        { id: "ONLINE", label: `🟢 Online (${devices.filter(d => d.is_online).length})` },
                        { id: "TV", label: `📺 Smart TVs (${devices.filter(d => d.device_type?.includes("TV")).length})` },
                        { id: "TABLET", label: `📱 Tablets (${devices.filter(d => d.device_type?.includes("Tablet")).length})` },
                        { id: "MOBILE", label: `📲 Celulares (${devices.filter(d => d.device_type?.includes("Mobile") || d.device_type?.includes("Phone")).length})` },
                        { id: "WEB", label: `💻 Web/PC (${devices.filter(d => d.device_type?.includes("Web")).length})` },
                        { id: "BLOCKED", label: `🚫 Bloqueados (${devices.filter(d => d.status === "BLOCKED").length})` },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setDeviceTypeFilter(tab.id)}
                          className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition border ${
                            deviceTypeFilter === tab.id
                              ? "bg-blue-600 text-white border-blue-500 font-bold shadow-md shadow-blue-600/30"
                              : "bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-900"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 5. Device List: Filtered & Rendered */}
                  {(() => {
                    const filteredDevices = devices.filter((dev) => {
                      const matchesSearch =
                        !deviceSearchTerm ||
                        dev.device_name?.toLowerCase().includes(deviceSearchTerm.toLowerCase()) ||
                        dev.ip_address?.toLowerCase().includes(deviceSearchTerm.toLowerCase()) ||
                        dev.mac_address?.toLowerCase().includes(deviceSearchTerm.toLowerCase()) ||
                        dev.manufacturer_model?.toLowerCase().includes(deviceSearchTerm.toLowerCase()) ||
                        dev.device_id?.toLowerCase().includes(deviceSearchTerm.toLowerCase());

                      if (!matchesSearch) return false;

                      if (deviceTypeFilter === "ONLINE") return dev.is_online;
                      if (deviceTypeFilter === "TV") return dev.device_type?.includes("TV");
                      if (deviceTypeFilter === "TABLET") return dev.device_type?.includes("Tablet");
                      if (deviceTypeFilter === "MOBILE") return dev.device_type?.includes("Mobile") || dev.device_type?.includes("Phone");
                      if (deviceTypeFilter === "WEB") return dev.device_type?.includes("Web");
                      if (deviceTypeFilter === "BLOCKED") return dev.status === "BLOCKED";
                      return true;
                    });

                    if (filteredDevices.length === 0) {
                      return (
                        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
                          <Shield className="w-10 h-10 text-slate-500 mx-auto" />
                          <div className="text-sm font-semibold text-slate-200">Nenhum dispositivo encontrado</div>
                          <p className="text-xs text-slate-400 max-w-md mx-auto">
                            Nenhum dispositivo corresponde aos filtros aplicados. Cadastre uma nova tela manualmente ou clique em "Testar Ping" no app da TV!
                          </p>
                          <button
                            onClick={() => setIsAddDeviceModalOpen(true)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Cadastrar Novo Dispositivo</span>
                          </button>
                        </div>
                      );
                    }

                    if (deviceViewMode === "table") {
                      return (
                        <div className="bg-[#131b2e] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider">
                                <tr>
                                  <th className="p-3.5">Dispositivo &amp; Tipo</th>
                                  <th className="p-3.5">Rede (IP &amp; MAC)</th>
                                  <th className="p-3.5">Hardware / Modelo</th>
                                  <th className="p-3.5">Status Conexão</th>
                                  <th className="p-3.5">Acesso ACL</th>
                                  <th className="p-3.5 text-right">Ações</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                                {filteredDevices.map((dev) => (
                                  <tr key={dev.device_id} className="hover:bg-slate-800/40 transition">
                                    <td className="p-3.5 font-medium text-white flex items-center gap-2.5">
                                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-blue-400">
                                        {dev.device_type?.includes("TV") ? <Tv className="w-4 h-4" /> : dev.device_type?.includes("Tablet") ? <Tablet className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                                      </div>
                                      <div>
                                        <div className="font-bold text-slate-100">{dev.device_name}</div>
                                        <div className="text-[10px] text-slate-400">{dev.device_type}</div>
                                      </div>
                                    </td>
                                    <td className="p-3.5 font-mono text-[11px]">
                                      <div className="text-slate-200">{dev.ip_address}</div>
                                      <div className="text-[10px] text-cyan-400">{dev.mac_address || "MAC N/D"}</div>
                                    </td>
                                    <td className="p-3.5">
                                      <div className="text-slate-200">{dev.manufacturer_model || "Genérico"}</div>
                                      {dev.notes && <div className="text-[10px] text-slate-400 italic truncate max-w-xs">{dev.notes}</div>}
                                    </td>
                                    <td className="p-3.5">
                                      {dev.is_online ? (
                                        <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                          Online
                                        </span>
                                      ) : (
                                        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                                          Offline
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-3.5">
                                      <select
                                        value={dev.status}
                                        onChange={(e) => handleUpdateDeviceStatus(dev.device_id, e.target.value)}
                                        className={`bg-slate-950 border text-[11px] font-bold rounded-lg px-2 py-1 focus:outline-none cursor-pointer ${
                                          dev.status === "ALLOWED"
                                            ? "text-emerald-400 border-emerald-500/40"
                                            : dev.status === "PAUSED"
                                            ? "text-amber-400 border-amber-500/40"
                                            : "text-rose-400 border-rose-500/40"
                                        }`}
                                      >
                                        <option value="ALLOWED">🟢 Permitido</option>
                                        <option value="PAUSED">🟡 Pausado</option>
                                        <option value="BLOCKED">🔴 Bloqueado</option>
                                        <option value="UNKNOWN">⚪ Quarentena</option>
                                      </select>
                                    </td>
                                    <td className="p-3.5 text-right space-x-1.5">
                                      <button
                                        onClick={() => handleTestDeviceNotify(dev.device_id, dev.device_name)}
                                        disabled={testingDeviceId === dev.device_id}
                                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg transition"
                                        title="Testar Pop-up na Tela"
                                      >
                                        {testingDeviceId === dev.device_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellRing className="w-3.5 h-3.5" />}
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingDeviceObject(dev);
                                          setIsEditDeviceModalOpen(true);
                                        }}
                                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                                        title="Editar Configurações"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteDevice(dev.device_id)}
                                        className="p-1.5 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition"
                                        title="Esquecer dispositivo"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    }

                    // Grid View Cards
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredDevices.map((device) => {
                          const isEditing = editingDeviceId === device.device_id;
                          const isJustPinged = lastPingedDeviceId === device.device_id;

                          return (
                            <div
                              key={device.device_id}
                              className={`bg-[#131b2e] border rounded-2xl p-5 transition-all flex flex-col justify-between gap-4 shadow-xl relative overflow-hidden ${
                                isJustPinged
                                  ? "border-amber-400 ring-2 ring-amber-400/20 shadow-amber-500/10"
                                  : "border-slate-800 hover:border-slate-700"
                              }`}
                            >
                              {/* Top Bar: Icon + Names + Badges */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3.5">
                                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                                    isJustPinged
                                      ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                                      : device.is_online
                                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                      : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                  }`}>
                                    {device.device_type?.includes("TV") ? (
                                      <Tv className="w-5 h-5" />
                                    ) : device.device_type?.includes("Tablet") ? (
                                      <Tablet className="w-5 h-5" />
                                    ) : device.device_type?.includes("Web") ? (
                                      <Monitor className="w-5 h-5" />
                                    ) : (
                                      <Smartphone className="w-5 h-5" />
                                    )}
                                  </div>

                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {isEditing ? (
                                        <div className="flex items-center gap-1.5">
                                          <input
                                            type="text"
                                            value={editingDeviceName}
                                            onChange={(e) => setEditingDeviceName(e.target.value)}
                                            className="bg-slate-950 border border-blue-500 rounded-lg px-2.5 py-1 text-xs text-white"
                                            autoFocus
                                          />
                                          <button
                                            onClick={() => handleSaveDeviceName(device.device_id)}
                                            className="bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold"
                                          >
                                            OK
                                          </button>
                                          <button
                                            onClick={() => setEditingDeviceId(null)}
                                            className="text-slate-400 hover:text-white text-xs px-1"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      ) : (
                                        <>
                                          <span className="text-sm font-bold text-white">{device.device_name}</span>
                                          <button
                                            onClick={() => {
                                              setEditingDeviceId(device.device_id);
                                              setEditingDeviceName(device.device_name);
                                            }}
                                            className="text-slate-500 hover:text-slate-300 transition"
                                            title="Renomear rapidamente"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                        </>
                                      )}
                                    </div>

                                    <div className="text-xs text-slate-300 font-medium flex items-center gap-2">
                                      <span>{device.manufacturer_model || "Modelo não especificado"}</span>
                                      <span className="text-slate-600">•</span>
                                      <span className="text-slate-400 text-[11px]">{device.device_type}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Status Pill Badge */}
                                <div className="flex flex-col items-end gap-1.5">
                                  {device.is_online ? (
                                    <span className="flex items-center gap-1.5 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                      Online
                                    </span>
                                  ) : (
                                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full font-medium">
                                      Offline
                                    </span>
                                  )}

                                  {device.ping_count > 0 && (
                                    <span className="text-[10px] text-amber-400/90 font-mono">
                                      {device.ping_count} {device.ping_count === 1 ? "ping" : "pings"}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Middle: Network & Technical Details Box */}
                              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Endereço IP</div>
                                  <div className="font-mono text-slate-200 font-medium mt-0.5">{device.ip_address}</div>
                                </div>

                                <div>
                                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Endereço Físico (MAC)</div>
                                  <div className="font-mono text-cyan-400 font-medium mt-0.5 truncate" title={device.mac_address || "N/D"}>
                                    {device.mac_address || "Não informado"}
                                  </div>
                                </div>

                                <div className="col-span-2 pt-1 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                                  <span>Último Acesso: {device.last_ping_at ? new Date(device.last_ping_at).toLocaleTimeString() : new Date(device.last_seen).toLocaleDateString()}</span>
                                  <span className="font-mono text-[10px] text-slate-500 truncate max-w-[140px]" title={device.device_id}>
                                    ID: {device.device_id}
                                  </span>
                                </div>
                              </div>

                              {/* Bottom: ACL Access Controls & Action Buttons */}
                              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80 flex-wrap">
                                {/* ACL Selector Switch */}
                                <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
                                  <button
                                    onClick={() => handleUpdateDeviceStatus(device.device_id, "ALLOWED")}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                                      device.status === "ALLOWED"
                                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                                        : "text-slate-400 hover:text-emerald-400 hover:bg-slate-900"
                                    }`}
                                    title="Permitido: Recebe alertas e streamings normalmente"
                                  >
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    <span>Permitido</span>
                                  </button>

                                  <button
                                    onClick={() => handleUpdateDeviceStatus(device.device_id, "PAUSED")}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                                      device.status === "PAUSED"
                                        ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                                        : "text-slate-400 hover:text-amber-400 hover:bg-slate-900"
                                    }`}
                                    title="Pausado: Silencia alertas temporariamente"
                                  >
                                    <PauseCircle className="w-3.5 h-3.5" />
                                    <span>Pausa</span>
                                  </button>

                                  <button
                                    onClick={() => handleUpdateDeviceStatus(device.device_id, "BLOCKED")}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                                      device.status === "BLOCKED"
                                        ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                                        : "text-slate-400 hover:text-rose-400 hover:bg-slate-900"
                                    }`}
                                    title="Bloqueado: Não recebe nenhum evento"
                                  >
                                    <Lock className="w-3.5 h-3.5" />
                                    <span>Bloquear</span>
                                  </button>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-1.5">
                                  {/* Test Notification Push Button */}
                                  <button
                                    onClick={() => handleTestDeviceNotify(device.device_id, device.device_name)}
                                    disabled={testingDeviceId === device.device_id}
                                    className="p-2 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-700/80 rounded-xl transition flex items-center gap-1.5 text-xs font-medium"
                                    title="Disparar Pop-up de Teste na TV"
                                  >
                                    {testingDeviceId === device.device_id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <BellRing className="w-3.5 h-3.5" />
                                    )}
                                    <span className="hidden sm:inline">Testar TV</span>
                                  </button>

                                  {/* Edit Details Button */}
                                  <button
                                    onClick={() => {
                                      setEditingDeviceObject(device);
                                      setIsEditDeviceModalOpen(true);
                                    }}
                                    className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 rounded-xl transition"
                                    title="Editar detalhes completos"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Delete Button */}
                                  <button
                                    onClick={() => handleDeleteDevice(device.device_id)}
                                    className="p-2 bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700/80 rounded-xl transition"
                                    title="Esquecer dispositivo"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Modal 1: Cadastrar Novo Dispositivo Manualmente */}
                  {isAddDeviceModalOpen && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                      <div className="bg-[#131b2e] border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
                        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <Plus className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-white">Cadastrar Novo Dispositivo</h3>
                              <p className="text-xs text-slate-400">Adicione uma Smart TV, Tablet ou Celular à lista de controle</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setIsAddDeviceModalOpen(false)}
                            className="text-slate-400 hover:text-white p-1 rounded-lg"
                          >
                            ✕
                          </button>
                        </div>

                        <form onSubmit={handleCreateDevice} className="p-5 space-y-4 text-xs">
                          <div>
                            <label className="text-slate-300 font-semibold block mb-1">Nome Amigável do Dispositivo *</label>
                            <input
                              type="text"
                              required
                              placeholder="ex: Smart TV Sala de Estar, Tablet Cozinha"
                              value={newDeviceForm.device_name}
                              onChange={(e) => setNewDeviceForm({ ...newDeviceForm, device_name: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-slate-300 font-semibold block mb-1">Tipo de Tela</label>
                              <select
                                value={newDeviceForm.device_type}
                                onChange={(e) => setNewDeviceForm({ ...newDeviceForm, device_type: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                              >
                                <option value="Android TV">📺 Android TV</option>
                                <option value="Tablet">📱 Tablet Android/iPad</option>
                                <option value="Smartphone">📲 Celular / Mobile</option>
                                <option value="Web Browser">💻 Computador / Web</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-slate-300 font-semibold block mb-1">Status Inicial ACL</label>
                              <select
                                value={newDeviceForm.status}
                                onChange={(e) => setNewDeviceForm({ ...newDeviceForm, status: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                              >
                                <option value="ALLOWED">🟢 Permitido (Recebe PiP)</option>
                                <option value="PAUSED">🟡 Pausado (Sem Alertas)</option>
                                <option value="BLOCKED">🔴 Bloqueado</option>
                                <option value="UNKNOWN">⚪ Quarentena</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-slate-300 font-semibold block mb-1">Endereço IP Local</label>
                              <input
                                type="text"
                                placeholder="192.168.1.100 ou 100.x (Tailscale)"
                                value={newDeviceForm.ip_address}
                                onChange={(e) => setNewDeviceForm({ ...newDeviceForm, ip_address: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                              />
                            </div>

                            <div>
                              <label className="text-slate-300 font-semibold block mb-1">Endereço MAC (Opcional)</label>
                              <input
                                type="text"
                                placeholder="AA:BB:CC:DD:EE:FF"
                                value={newDeviceForm.mac_address}
                                onChange={(e) => setNewDeviceForm({ ...newDeviceForm, mac_address: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-slate-300 font-semibold block mb-1">Modelo de Hardware / Fabricante</label>
                            <input
                              type="text"
                              placeholder="ex: TCL 55P635, Samsung Galaxy Tab S9, Mi Box 4K"
                              value={newDeviceForm.manufacturer_model}
                              onChange={(e) => setNewDeviceForm({ ...newDeviceForm, manufacturer_model: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                            />
                          </div>

                          <div>
                            <label className="text-slate-300 font-semibold block mb-1">Observações &amp; Localização</label>
                            <textarea
                              rows={2}
                              placeholder="ex: TV fixada na parede da varanda gourmet..."
                              value={newDeviceForm.notes}
                              onChange={(e) => setNewDeviceForm({ ...newDeviceForm, notes: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                            />
                          </div>

                          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                            <button
                              type="button"
                              onClick={() => setIsAddDeviceModalOpen(false)}
                              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30"
                            >
                              Cadastrar Dispositivo
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* Modal 2: Editar Dispositivo */}
                  {isEditDeviceModalOpen && editingDeviceObject && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                      <div className="bg-[#131b2e] border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
                        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              <Edit3 className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-white">Editar Dispositivo</h3>
                              <p className="text-xs text-slate-400">ID: {editingDeviceObject.device_id}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setIsEditDeviceModalOpen(false);
                              setEditingDeviceObject(null);
                            }}
                            className="text-slate-400 hover:text-white p-1 rounded-lg"
                          >
                            ✕
                          </button>
                        </div>

                        <form onSubmit={handleUpdateDeviceDetails} className="p-5 space-y-4 text-xs">
                          <div>
                            <label className="text-slate-300 font-semibold block mb-1">Nome Amigável</label>
                            <input
                              type="text"
                              required
                              value={editingDeviceObject.device_name || ""}
                              onChange={(e) => setEditingDeviceObject({ ...editingDeviceObject, device_name: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-slate-300 font-semibold block mb-1">Tipo de Dispositivo</label>
                              <select
                                value={editingDeviceObject.device_type}
                                onChange={(e) => setEditingDeviceObject({ ...editingDeviceObject, device_type: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                              >
                                <option value="Android TV">📺 Android TV</option>
                                <option value="Tablet">📱 Tablet Android/iPad</option>
                                <option value="Smartphone">📲 Celular / Mobile</option>
                                <option value="Web Browser">💻 Computador / Web</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-slate-300 font-semibold block mb-1">Status de Acesso ACL</label>
                              <select
                                value={editingDeviceObject.status}
                                onChange={(e) => setEditingDeviceObject({ ...editingDeviceObject, status: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                              >
                                <option value="ALLOWED">🟢 Permitido (Recebe PiP)</option>
                                <option value="PAUSED">🟡 Pausado (Sem Alertas)</option>
                                <option value="BLOCKED">🔴 Bloqueado</option>
                                <option value="UNKNOWN">⚪ Quarentena</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-slate-300 font-semibold block mb-1">Endereço IP</label>
                              <input
                                type="text"
                                disabled
                                value={editingDeviceObject.ip_address}
                                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-slate-400 font-mono cursor-not-allowed"
                              />
                            </div>

                            <div>
                              <label className="text-slate-300 font-semibold block mb-1">Endereço Físico (MAC)</label>
                              <input
                                type="text"
                                value={editingDeviceObject.mac_address || ""}
                                onChange={(e) => setEditingDeviceObject({ ...editingDeviceObject, mac_address: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-blue-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-slate-300 font-semibold block mb-1">Modelo de Hardware</label>
                            <input
                              type="text"
                              value={editingDeviceObject.manufacturer_model || ""}
                              onChange={(e) => setEditingDeviceObject({ ...editingDeviceObject, manufacturer_model: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="text-slate-300 font-semibold block mb-1">Notas / Observações</label>
                            <textarea
                              rows={2}
                              value={editingDeviceObject.notes || ""}
                              onChange={(e) => setEditingDeviceObject({ ...editingDeviceObject, notes: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                            <button
                              type="button"
                              onClick={() => {
                                setIsEditDeviceModalOpen(false);
                                setEditingDeviceObject(null);
                              }}
                              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30"
                            >
                              Salvar Alterações
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
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

              {/* ================= TAB: SMART TV & TAILSCALE ================= */}
              {activeTab === "tv" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                        <Tv className="w-5 h-5 text-indigo-400" />
                        <span>Pareamento com Android TV, Tablets &amp; Tailscale Remoto</span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Conecte seu aplicativo Android TV ao servidor na rede local ou remotamente de qualquer lugar do mundo via Tailscale WireGuard.
                      </p>
                    </div>

                    {/* Mode Selector */}
                    <div className="flex items-center p-1 bg-slate-900 border border-white/10 rounded-xl self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setTvPairingMode("local")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          tvPairingMode === "local"
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <Wifi className="w-3.5 h-3.5" />
                        <span>Rede Local (LAN)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTvPairingMode("tailscale")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          tvPairingMode === "tailscale"
                            ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>Tailscale Remoto</span>
                      </button>
                    </div>
                  </div>

                  {/* Tailscale Live Mesh Status Card */}
                  <div className="card-dark p-5 rounded-2xl border border-white/5 space-y-4 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-950/80">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl border ${
                          tailscaleData?.is_running
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-slate-800 text-slate-400 border-slate-700"
                        }`}>
                          <Globe className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white">Rede Segura Tailscale (WireGuard Mesh)</span>
                            {tailscaleData?.is_running ? (
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                CONECTADO &bull; {tailscaleData.tailscale_ip}
                              </span>
                            ) : (
                              <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full font-medium">
                                {tailscaleData?.is_installed ? "Instalado (Desconectado)" : "Não Detectado no Host"}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Permite que a Android TV receba alertas PiP em qualquer lugar do mundo com zero configuração de portas.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={fetchTailscaleStatus}
                          disabled={tailscaleLoading}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${tailscaleLoading ? "animate-spin" : ""}`} />
                          <span>Atualizar Status</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowTailscaleGuide((prev) => !prev)}
                          className="px-3 py-1.5 rounded-lg bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-300 border border-cyan-500/20 text-xs font-medium transition"
                        >
                          {showTailscaleGuide ? "Ocultar Guia" : "Guia de Instalação"}
                        </button>
                      </div>
                    </div>

                    {/* Active Peers (if connected) */}
                    {tailscaleData?.is_running && tailscaleData.peers && tailscaleData.peers.length > 0 && (
                      <div className="pt-2 border-t border-white/5 space-y-2">
                        <span className="text-[11px] font-bold text-slate-300 block">
                          Dispositivos Conectados na sua Tailnet ({tailscaleData.peers.length}):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 font-mono text-[11px]">
                          {tailscaleData.peers.map((peer, idx) => (
                            <div key={idx} className="p-2 rounded-lg bg-slate-950/60 border border-white/5 flex items-center justify-between">
                              <div className="min-w-0">
                                <span className="font-bold text-white block truncate">{peer.hostname || "Dispositivo"}</span>
                                <span className="text-slate-400 text-[10px]">{peer.ip} &bull; {peer.os}</span>
                              </div>
                              <span className={`w-2 h-2 rounded-full shrink-0 ${peer.online ? "bg-emerald-400" : "bg-slate-600"}`} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Expandable Fast Install Guide */}
                    {showTailscaleGuide && (
                      <div className="pt-3 border-t border-white/5 space-y-3 animate-in fade-in">
                        <span className="text-xs font-bold text-cyan-300 block">
                          Comandos de Instalação Rápida (100% Gratuito):
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          {/* Mac */}
                          <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5 space-y-1.5">
                            <span className="font-bold text-slate-200">🍎 macOS (Terminal)</span>
                            <code className="text-[11px] text-cyan-300 font-mono block bg-slate-900 p-1.5 rounded select-all truncate">
                              brew install tailscale &amp;&amp; sudo tailscale up
                            </code>
                          </div>

                          {/* Linux */}
                          <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5 space-y-1.5">
                            <span className="font-bold text-slate-200">🐧 Linux / Raspberry Pi</span>
                            <code className="text-[11px] text-emerald-300 font-mono block bg-slate-900 p-1.5 rounded select-all truncate">
                              curl -fsSL https://tailscale.com/install.sh | sh &amp;&amp; sudo tailscale up
                            </code>
                          </div>

                          {/* Windows */}
                          <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5 space-y-1.5">
                            <span className="font-bold text-slate-200">🪟 Windows (PowerShell)</span>
                            <code className="text-[11px] text-indigo-300 font-mono block bg-slate-900 p-1.5 rounded select-all truncate">
                              winget install Tailscale.Tailscale
                            </code>
                          </div>

                          {/* Android TV */}
                          <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5 space-y-1.5">
                            <span className="font-bold text-slate-200">📺 Android TV / Celular</span>
                            <p className="text-[11px] text-slate-400">
                              Baixe o app oficial <strong>Tailscale</strong> na Google Play Store da TV e faça login na mesma conta.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Network Endpoints & QR Code Card */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      {/* Server IP */}
                      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-slate-300 block">
                            {tvPairingMode === "tailscale" ? "IP Remoto do Servidor (Tailscale Mesh)" : "IP do Servidor na Rede Local"}
                          </label>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            tvPairingMode === "tailscale" ? "bg-cyan-500/20 text-cyan-300" : "bg-indigo-500/20 text-indigo-300"
                          }`}>
                            {tvPairingMode === "tailscale" ? "Remoto Global" : "Local LAN"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={
                              tvPairingMode === "tailscale"
                                ? (tailscaleData?.tailscale_ip || "Tailscale não ativo no servidor")
                                : (serverInfo?.local_ip || "192.168.1.96")
                            }
                            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-emerald-400 flex-1 select-all"
                          />
                          <button
                            type="button"
                            onClick={() => copyToClipboard(
                              tvPairingMode === "tailscale"
                                ? (tailscaleData?.tailscale_ip || "")
                                : (serverInfo?.local_ip || "")
                            )}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
                          >
                            Copiar IP
                          </button>
                        </div>
                      </div>

                      {/* WebSocket URL */}
                      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
                        <label className="text-xs font-semibold text-slate-300 block">Endereço WebSocket do Sentinela</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={
                              tvPairingMode === "tailscale" && tailscaleData?.tailscale_ip
                                ? `ws://${tailscaleData.tailscale_ip}:8080/ws/events`
                                : (serverInfo?.server_ws_url || "")
                            }
                            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-400 flex-1 select-all"
                          />
                          <button
                            type="button"
                            onClick={() => copyToClipboard(
                              tvPairingMode === "tailscale" && tailscaleData?.tailscale_ip
                                ? `ws://${tailscaleData.tailscale_ip}:8080/ws/events`
                                : (serverInfo?.server_ws_url || "")
                            )}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
                          >
                            {copiedWs ? "Copiado!" : "Copiar"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* QR Code Card */}
                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                      <div className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-1.5">
                        <QrCode className="w-4 h-4 text-blue-400" />
                        <span>Cartão de Pareamento ({tvPairingMode === "tailscale" ? "Tailscale" : "Local"})</span>
                      </div>
                      <img
                        src={`${API_BASE}/api/settings/qr-pairing${
                          tvPairingMode === "tailscale" && tailscaleData?.tailscale_ip
                            ? `?host=${tailscaleData.tailscale_ip}`
                            : ""
                        }`}
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    </div>

                    {/* ================= ADVANCED MEDIA DISPATCH CONFIGURATION ================= */}
                    <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/90 space-y-5 shadow-inner">
                      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800/80">
                        <Film className="w-4 h-4 text-sky-400" />
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                          Configurações Avançadas de Mídia (Fotos &amp; Vídeos MP4)
                        </h3>
                      </div>

                      {/* 1. Video Duration */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                            <Video className="w-3.5 h-3.5 text-sky-400" />
                            <span>Duração do Vídeo Gravado</span>
                          </label>
                          <span className="text-xs font-mono font-bold text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/20">
                            {telegramVideoDuration} Segundos
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Define a duração do clipe MP4 gravado e enviado para o Telegram quando um movimento ou placa for detectada.
                        </p>
                        <div className="grid grid-cols-5 gap-2 pt-1">
                          {[5, 10, 15, 20, 30].map((sec) => (
                            <button
                              key={sec}
                              type="button"
                              onClick={() => setTelegramVideoDuration(sec)}
                              className={`py-2 px-1 rounded-xl text-xs font-bold transition-all border flex flex-col items-center justify-center gap-0.5 ${
                                telegramVideoDuration === sec
                                  ? "bg-sky-600 text-white border-sky-400 shadow-md shadow-sky-500/25"
                                  : "bg-slate-950/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
                              }`}
                            >
                              <span>{sec}s</span>
                              <span className="text-[9px] font-normal opacity-80">
                                {sec === 5 ? "Rápido" : sec === 10 ? "Padrão" : sec === 30 ? "Completo" : "Médio"}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 2. Photo Resolution & Quality */}
                      <div className="space-y-2 pt-2 border-t border-slate-800/80">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                            <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Resolução &amp; Qualidade das Fotos</span>
                          </label>
                          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 uppercase">
                            {telegramPhotoQuality === "minima" ? "Mínima (640px)" : telegramPhotoQuality === "media" ? "Média HD (720p)" : "Máxima (5MP Nativa)"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Escolha o equilíbrio ideal entre nitidez de imagem para zoom e economia de dados móveis.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                          {[
                            {
                              id: "minima",
                              title: "Mínima (640x360)",
                              sub: "~40 KB • Upload Instantâneo",
                              desc: "Ideal para redes móveis 3G/4G com economia máxima de espaço.",
                            },
                            {
                              id: "media",
                              title: "Média HD (1280x720)",
                              sub: "~150 KB • Recomendado",
                              desc: "Equilíbrio perfeito entre alta nitidez e transmissão ultra-rápida.",
                            },
                            {
                              id: "maxima",
                              title: "Máxima (5MP Nativa)",
                              sub: "Sensor Original • Sem Perda",
                              desc: "Resolução original da câmera para zoom detalhado em rostos e placas.",
                            },
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setTelegramPhotoQuality(opt.id as any)}
                              className={`p-3 rounded-xl text-left transition-all border flex flex-col justify-between gap-1.5 ${
                                telegramPhotoQuality === opt.id
                                  ? "bg-emerald-950/30 border-emerald-500/60 text-white shadow-md shadow-emerald-500/10"
                                  : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-white">{opt.title}</span>
                                  {telegramPhotoQuality === opt.id && (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  )}
                                </div>
                                <div className="text-[10px] font-semibold text-emerald-400 mt-0.5">{opt.sub}</div>
                              </div>
                              <p className="text-[10px] text-slate-400 leading-tight">{opt.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 3. Dispatch Mode: Photo + Video / Photo Only / Video Only */}
                      <div className="space-y-2 pt-2 border-t border-slate-800/80">
                        <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                          <Send className="w-3.5 h-3.5 text-amber-400" />
                          <span>Modo de Envio do Alerta</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                          {[
                            {
                              id: "all",
                              label: "📸 Foto + 🎥 Vídeo",
                              sub: "Foto instantânea (<1s) e clipe MP4 quando terminar a gravação (Recomendado).",
                            },
                            {
                              id: "photo_only",
                              label: "📸 Apenas Foto",
                              sub: "Envia apenas a foto com estampa de horário e caixas de detecção.",
                            },
                            {
                              id: "video_only",
                              label: "🎥 Apenas Vídeo",
                              sub: "Envia somente a gravação em vídeo MP4 Full HD.",
                            },
                          ].map((mode) => (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => setTelegramDispatchMode(mode.id as any)}
                              className={`p-3 rounded-xl text-left border transition-all ${
                                telegramDispatchMode === mode.id
                                  ? "bg-amber-950/30 border-amber-500/60 text-white shadow-md shadow-amber-500/10"
                                  : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-white">{mode.label}</span>
                                {telegramDispatchMode === mode.id && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 leading-tight">{mode.sub}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 4. Toggles: Pre-Buffer & Watermark */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                        {/* Pre-buffer toggle */}
                        <div
                          onClick={() => setTelegramIncludePrebuffer(!telegramIncludePrebuffer)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                            telegramIncludePrebuffer
                              ? "bg-blue-950/20 border-blue-500/40"
                              : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={telegramIncludePrebuffer}
                            onChange={() => {}}
                            className="mt-0.5 rounded text-blue-600 focus:ring-0 cursor-pointer"
                          />
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-blue-400" />
                              <span>Pré-Buffer de 3 Segundos</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                              Inclui no vídeo os 3 segundos que aconteceram <em>antes</em> do movimento iniciar (extraídos da memória RAM).
                            </p>
                          </div>
                        </div>

                        {/* Watermark toggle */}
                        <div
                          onClick={() => setTelegramWatermarkEnabled(!telegramWatermarkEnabled)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                            telegramWatermarkEnabled
                              ? "bg-purple-950/20 border-purple-500/40"
                              : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={telegramWatermarkEnabled}
                            onChange={() => {}}
                            className="mt-0.5 rounded text-purple-600 focus:ring-0 cursor-pointer"
                          />
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                              <span>Data/Hora &amp; Bounding Box</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                              Desenha estampa com timestamp oficial e retângulo demarcando o objeto ou veículo detectado.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 5. Cooldown Between Alerts */}
                      <div className="space-y-2 pt-2 border-t border-slate-800/80">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-blue-400" />
                            <span>Intervalo Mínimo Anti-Spam (Cooldown)</span>
                          </label>
                          <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                            {telegramCooldown} Segundos
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Tempo de espera antes de enviar um novo alerta da mesma câmera para evitar mensagens repetitivas.
                        </p>
                        <div className="grid grid-cols-5 gap-2 pt-1">
                          {[5, 10, 30, 60, 120].map((sec) => (
                            <button
                              key={sec}
                              type="button"
                              onClick={() => setTelegramCooldown(sec)}
                              className={`py-1.5 px-1 rounded-xl text-xs font-bold transition-all border flex items-center justify-center ${
                                telegramCooldown === sec
                                  ? "bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/25"
                                  : "bg-slate-950/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
                              }`}
                            >
                              {sec}s
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 6. Quick Action Buttons for Maximum Quality Media & Tests */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-950 border border-sky-500/20 space-y-3.5 shadow-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-sky-400" />
                          <span className="text-xs font-bold text-white uppercase tracking-wider">
                            Disparo Instantâneo &amp; Teste de Arquivos em Qualidade Máxima
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">
                          5MP Nativo • CRF 17 HD
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Clique nos botões abaixo para disparar transmissões imediatas para o seu Telegram e verificar a fidelidade do sensor e a fluidez do vídeo.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
                        {/* Botão 1: Foto Máxima */}
                        <button
                          type="button"
                          onClick={handleTestTelegramPhoto}
                          disabled={testingPhoto || !telegramToken}
                          className="flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-xl text-xs font-semibold transition shadow-sm active:scale-95 disabled:opacity-50"
                        >
                          {testingPhoto ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : <ImageIcon className="w-4 h-4 text-emerald-400" />}
                          <span>{testingPhoto ? "Enviando 5MP..." : "📸 Foto 5MP Máxima"}</span>
                        </button>

                        {/* Botão 2: Vídeo Máximo */}
                        <button
                          type="button"
                          onClick={handleTestTelegramVideo}
                          disabled={testingVideo || !telegramToken}
                          className="flex items-center justify-center gap-2 py-2.5 px-3 bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/30 rounded-xl text-xs font-semibold transition shadow-sm active:scale-95 disabled:opacity-50"
                        >
                          {testingVideo ? <Loader2 className="w-4 h-4 animate-spin text-sky-400" /> : <Video className="w-4 h-4 text-sky-400" />}
                          <span>{testingVideo ? `Gravando ${telegramVideoDuration}s HD...` : `🎥 Vídeo HD (${telegramVideoDuration}s)`}</span>
                        </button>

                        {/* Botão 3: Backup JSON */}
                        <button
                          type="button"
                          onClick={handleTestTelegramBackup}
                          disabled={testingBackup || !telegramToken}
                          className="flex items-center justify-center gap-2 py-2.5 px-3 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 rounded-xl text-xs font-semibold transition shadow-sm active:scale-95 disabled:opacity-50"
                        >
                          {testingBackup ? <Loader2 className="w-4 h-4 animate-spin text-purple-400" /> : <Save className="w-4 h-4 text-purple-400" />}
                          <span>{testingBackup ? "Exportando..." : "📦 Backup Geral JSON"}</span>
                        </button>

                        {/* Botão 4: Teste Mensagem */}
                        <button
                          type="button"
                          onClick={handleTestTelegram}
                          disabled={testingTelegram || !telegramToken}
                          className="flex items-center justify-center gap-2 py-2.5 px-3 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/30 rounded-xl text-xs font-semibold transition shadow-sm active:scale-95 disabled:opacity-50"
                        >
                          {testingTelegram ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> : <Send className="w-3.5 h-3.5 text-amber-400" />}
                          <span>{testingTelegram ? "Enviando..." : "💬 Mensagem &amp; Tags"}</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
                      <div className="flex items-center gap-3">
                        <button
                          type="submit"
                          disabled={saving}
                          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-blue-600/25 active:scale-95"
                        >
                          <Save className="w-4 h-4" />
                          <span>{saving ? "Salvando..." : "Salvar Configurações do Telegram"}</span>
                        </button>

                        {serverInfo?.telegram_bot_configured && (
                          <div className="text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Bot Ativo &amp; Sincronizado</span>
                          </div>
                        )}
                      </div>
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
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                        <HardDrive className="w-5 h-5 text-amber-400" />
                        <span>Armazenamento, Retenção &amp; Saúde do Disco</span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Monitore partições do host, gerencie cotas de gravação, reciclagem FIFO e limpeza granular por câmera.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fetchStorageDetailed(false)}
                        disabled={refreshingStorage}
                        className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshingStorage ? "animate-spin text-amber-400" : ""}`} />
                        <span>{refreshingStorage ? "Atualizando..." : "Recarregar Dados"}</span>
                      </button>

                      {storageData?.disk && (
                        <div
                          className={`px-3 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${
                            storageData.disk.used_percent >= 95
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                              : storageData.disk.used_percent >= 80
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              storageData.disk.used_percent >= 95
                                ? "bg-rose-400 animate-ping"
                                : storageData.disk.used_percent >= 80
                                ? "bg-amber-400"
                                : "bg-emerald-400"
                            }`}
                          />
                          <span>
                            {storageData.disk.used_percent >= 95
                              ? "Disco Crítico (>95%)"
                              : storageData.disk.used_percent >= 80
                              ? "Disco em Atenção (>80%)"
                              : "Disco Saudável"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Feedback Message */}
                  {storageActionMsg && (
                    <div
                      className={`p-3.5 rounded-xl border flex items-center justify-between text-xs animate-in fade-in duration-200 ${
                        storageActionMsg.success
                          ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                          : "bg-rose-500/10 text-rose-300 border-rose-500/30"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {storageActionMsg.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        )}
                        <span>{storageActionMsg.text}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStorageActionMsg(null)}
                        className="text-slate-400 hover:text-white text-sm leading-none ml-2"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Visual Partition Gauge & 4 Key Cards */}
                  <div className="card-dark p-5 rounded-2xl border border-white/5 space-y-4 bg-slate-900/60">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-amber-400" />
                        <span>Ocupação do Volume do Host ({storageData?.disk?.total_gb || 0} GB)</span>
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        {storageData?.disk?.used_percent || 0}% em uso • {storageData?.disk?.free_gb || 0} GB livres
                      </span>
                    </div>

                    {/* Multi-color Bar */}
                    <div className="w-full bg-slate-950 rounded-xl h-4 overflow-hidden flex border border-slate-800 p-0.5 shadow-inner">
                      {/* ServONVIF portion */}
                      <div
                        className="bg-gradient-to-r from-blue-600 to-sky-400 h-full rounded-l transition-all duration-500"
                        style={{ width: `${Math.max(1, Math.min(100, storageData?.servonvif?.pct_of_disk || 0.5))}%` }}
                        title={`ServONVIF: ${storageData?.servonvif?.total_size_mb || 0} MB (${storageData?.servonvif?.pct_of_disk || 0}%)`}
                      />
                      {/* OS & other apps portion */}
                      <div
                        className="bg-slate-700/80 h-full transition-all duration-500"
                        style={{
                          width: `${Math.max(
                            0,
                            Math.min(
                              100,
                              (storageData?.disk?.used_percent || 0) - (storageData?.servonvif?.pct_of_disk || 0)
                            )
                          )}%`,
                        }}
                        title={`Sistema Operacional & Outros: ${(
                          (storageData?.disk?.used_gb || 0) - (storageData?.servonvif?.total_size_gb || 0)
                        ).toFixed(1)} GB`}
                      />
                      {/* Free Space */}
                      <div
                        className="bg-emerald-500/20 h-full rounded-r transition-all duration-500"
                        style={{ width: `${Math.max(0, storageData?.disk?.free_percent || 0)}%` }}
                        title={`Espaço Livre: ${storageData?.disk?.free_gb || 0} GB (${storageData?.disk?.free_percent || 0}%)`}
                      />
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap items-center gap-4 text-[11px] pt-0.5 text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm bg-gradient-to-r from-blue-600 to-sky-400" />
                        <span>Gravações ServONVIF ({storageData?.servonvif?.total_size_mb || 0} MB)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm bg-slate-700" />
                        <span>Sistema &amp; Docker ({((storageData?.disk?.used_gb || 0) - (storageData?.servonvif?.total_size_gb || 0)).toFixed(1)} GB)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm bg-emerald-500/30 border border-emerald-500/40" />
                        <span>Espaço Livre ({storageData?.disk?.free_gb || 0} GB)</span>
                      </div>
                    </div>

                    {/* 4 Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                      <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5">
                        <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
                          <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                          <span>SSD / Disco Total</span>
                        </div>
                        <div className="text-xl font-bold text-white mt-1">
                          {storageData?.disk?.total_gb || 0} <span className="text-xs text-slate-400 font-normal">GB</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 truncate" title={storageData?.disk?.media_path}>
                          {storageData?.disk?.media_path || "data/media"}
                        </div>
                      </div>

                      <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5">
                        <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
                          <Video className="w-3.5 h-3.5 text-sky-400" />
                          <span>Vídeos &amp; Mídia CFTV</span>
                        </div>
                        <div className="text-xl font-bold text-sky-400 mt-1">
                          {storageData?.servonvif?.total_size_mb || 0} <span className="text-xs text-slate-400 font-normal">MB</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {storageData?.servonvif?.videos_count || 0} vídeos • {storageData?.servonvif?.thumbs_count || 0} fotos
                        </div>
                      </div>

                      <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5">
                        <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Espaço Livre Host</span>
                        </div>
                        <div className="text-xl font-bold text-emerald-400 mt-1">
                          {storageData?.disk?.free_gb || 0} <span className="text-xs text-slate-400 font-normal">GB</span>
                        </div>
                        <div className="text-[10px] text-emerald-500/80 mt-1 font-mono">
                          {storageData?.disk?.free_percent || 0}% de folga disponível
                        </div>
                      </div>

                      <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5">
                        <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Autonomia Estimada</span>
                        </div>
                        <div className="text-xl font-bold text-amber-400 mt-1">
                          ~{storageData?.estimations?.est_days_remaining || 0} <span className="text-xs text-slate-400 font-normal">dias</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          ~{storageData?.estimations?.est_events_remaining || 0} clipes (@{storageData?.estimations?.avg_video_size_mb || 0}MB)
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 1: Configuração de Políticas de Retenção & Auto-Limpeza */}
                  <div className="card-dark p-5 rounded-2xl border border-white/5 space-y-5 bg-slate-900/60">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-amber-600/10 text-amber-400 border border-amber-500/20">
                          <Sliders className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">Políticas de Retenção &amp; Auto-Limpeza Inteligente</h3>
                          <p className="text-[11px] text-slate-400">Configure as regras de expiração de gravações e proteção de disco</p>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 font-semibold">
                        Reciclagem FIFO Ativa
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Campo 1: Retenção por Dias */}
                      <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>1. Retenção Baseada em Tempo (Dias)</span>
                          </label>
                          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            {retentionDays} {retentionDays === 1 ? "Dia" : "Dias"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Gravações com data anterior a este limite são removidas periodicamente pelo worker.
                        </p>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {[7, 15, 30, 60, 90, 180, 365].map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => setRetentionDays(d)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                                retentionDays === d
                                  ? "bg-amber-600 text-white shadow-sm shadow-amber-600/30"
                                  : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
                              }`}
                            >
                              {d}d
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                          <input
                            type="range"
                            min={1}
                            max={365}
                            value={retentionDays}
                            onChange={(e) => setRetentionDays(Number(e.target.value))}
                            className="flex-1 accent-amber-500"
                          />
                          <input
                            type="number"
                            min={1}
                            max={365}
                            value={retentionDays}
                            onChange={(e) => setRetentionDays(Math.max(1, Number(e.target.value)))}
                            className="w-20 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-100 font-mono text-center focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      {/* Campo 2: Cota Máxima de Espaço (Quota GB) */}
                      <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                            <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                            <span>2. Cota Máxima de Espaço (Quota GB)</span>
                          </label>
                          <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                            {maxStorageQuotaGb === 0 ? "Ilimitado" : `${maxStorageQuotaGb} GB`}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Limita o tamanho máximo da pasta de mídia. Ao atingir a cota, os arquivos mais antigos são limpos.
                        </p>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {[
                            { label: "Ilimitado", val: 0 },
                            { label: "10 GB", val: 10 },
                            { label: "25 GB", val: 25 },
                            { label: "50 GB", val: 50 },
                            { label: "100 GB", val: 100 },
                            { label: "250 GB", val: 250 },
                            { label: "400 GB", val: 400 },
                          ].map((item) => (
                            <button
                              key={item.val}
                              type="button"
                              onClick={() => setMaxStorageQuotaGb(item.val)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                                maxStorageQuotaGb === item.val
                                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                                  : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                          <input
                            type="number"
                            min={0}
                            max={2000}
                            value={maxStorageQuotaGb}
                            onChange={(e) => setMaxStorageQuotaGb(Math.max(0, Number(e.target.value)))}
                            placeholder="0 = Ilimitado"
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {/* Campo 3: Margem de Segurança Mínima no Host (OS Guard) */}
                      <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>3. Folga Mínima do Host (OS Guard)</span>
                          </label>
                          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            {minFreeDiskGb} GB
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Garante espaço mínimo livre no SSD para que o sistema operacional (ZimaOS/Linux) não trave.
                        </p>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {[3.0, 5.0, 10.0, 20.0].map((gb) => (
                            <button
                              key={gb}
                              type="button"
                              onClick={() => setMinFreeDiskGb(gb)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                                minFreeDiskGb === gb
                                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
                                  : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
                              }`}
                            >
                              {gb.toFixed(1)} GB
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Campo 4: Worker de Limpeza Automática */}
                      <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                              <Activity className="w-3.5 h-3.5 text-purple-400" />
                              <span>4. Limpeza Automática em Background</span>
                            </label>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                autoCleanupEnabled
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-slate-800 text-slate-400"
                              }`}
                            >
                              {autoCleanupEnabled ? "Ativo (Ciclo 6h)" : "Desativado"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                            Executa a cada 6 horas para limpar automaticamente eventos expirados no SQLite e arquivos no disco.
                          </p>
                        </div>

                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => setAutoCleanupEnabled(!autoCleanupEnabled)}
                            className={`w-full py-2 px-3 rounded-lg text-xs font-semibold border transition flex items-center justify-center gap-2 ${
                              autoCleanupEnabled
                                ? "bg-emerald-600/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/25"
                                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                            }`}
                          >
                            <span>{autoCleanupEnabled ? "✓ Worker de Auto-Limpeza Habilitado" : "✕ Auto-Limpeza Desabilitada"}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end pt-2 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={handleSaveStoragePolicy}
                        disabled={savingStorage}
                        className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-amber-600/25 active:scale-95"
                      >
                        {savingStorage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>{savingStorage ? "Salvando Políticas..." : "Salvar Políticas de Armazenamento"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Card 2: Detalhamento por Câmera */}
                  <div className="card-dark p-5 rounded-2xl border border-white/5 space-y-4 bg-slate-900/60">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-sky-600/10 text-sky-400 border border-sky-500/20">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">Consumo por Câmera Conectada</h3>
                          <p className="text-[11px] text-slate-400">Detalhamento individual de eventos gravados e espaço ocupado</p>
                        </div>
                      </div>

                      <span className="text-xs text-slate-400 font-mono">
                        {storageData?.cameras?.length || 0} {storageData?.cameras?.length === 1 ? "Câmera" : "Câmeras"}
                      </span>
                    </div>

                    <div className="space-y-2.5 pt-1">
                      {storageData?.cameras && storageData.cameras.length > 0 ? (
                        storageData.cameras.map((cam) => (
                          <div
                            key={cam.camera_id}
                            className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">{cam.camera_name}</span>
                                <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                  ID #{cam.camera_id}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                                <span className="flex items-center gap-1 text-sky-300">
                                  <Film className="w-3 h-3 text-sky-400" />
                                  {cam.videos_count} vídeos ({cam.videos_size_mb} MB)
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-slate-300">
                                  <ImageIcon className="w-3 h-3 text-emerald-400" />
                                  {cam.thumbs_count} fotos ({cam.thumbs_size_mb} MB)
                                </span>
                              </div>

                              {/* Small Bar */}
                              <div className="w-48 bg-slate-900 rounded-full h-1.5 overflow-hidden mt-1.5">
                                <div
                                  className="bg-sky-500 h-full rounded-full"
                                  style={{ width: `${Math.max(2, Math.min(100, cam.pct_of_servonvif))}%` }}
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-3 self-end sm:self-center">
                              <div className="text-right">
                                <div className="text-sm font-bold text-amber-400 font-mono">{cam.size_mb} MB</div>
                                <div className="text-[10px] text-slate-500">{cam.pct_of_servonvif}% do ServONVIF</div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleCleanupCamera(cam.camera_id, cam.camera_name)}
                                disabled={cleaningCameraId === cam.camera_id || cam.total_files === 0}
                                className="px-2.5 py-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 rounded-lg text-xs font-semibold transition disabled:opacity-30 flex items-center gap-1.5"
                                title="Apagar todos os vídeos e fotos desta câmera"
                              >
                                {cleaningCameraId === cam.camera_id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                                <span>Limpar</span>
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/40">
                          Nenhuma gravação registrada no momento.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card 3: Ferramentas de Limpeza Manual e Manutenção */}
                  <div className="card-dark p-5 rounded-2xl border border-white/5 space-y-4 bg-slate-900/60">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-rose-600/10 text-rose-400 border border-rose-500/20">
                        <Trash2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Ações de Limpeza Manual &amp; Manutenção Imediata</h3>
                        <p className="text-[11px] text-slate-400">Libere espaço imediatamente disparando rotinas de expiração forçada</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                      {/* Botão 1: Limpeza da Política Atual */}
                      <button
                        type="button"
                        onClick={() => handleRunStorageCleanup()}
                        disabled={runningCleanup}
                        className="p-3 bg-amber-600/15 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/30 rounded-xl text-xs font-semibold transition flex flex-col items-start gap-1 text-left disabled:opacity-50 active:scale-98"
                      >
                        <div className="flex items-center gap-1.5 font-bold">
                          {runningCleanup ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4 text-amber-400" />}
                          <span>Limpeza da Política</span>
                        </div>
                        <span className="text-[10px] text-slate-300 font-normal">
                          Exclui arquivos anteriores a {retentionDays} dias
                        </span>
                      </button>

                      {/* Botão 2: Limpeza 7 Dias */}
                      <button
                        type="button"
                        onClick={() => handleRunStorageCleanup(7)}
                        disabled={runningCleanup}
                        className="p-3 bg-slate-950 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 rounded-xl text-xs font-semibold transition flex flex-col items-start gap-1 text-left disabled:opacity-50 active:scale-98"
                      >
                        <div className="flex items-center gap-1.5 font-bold">
                          <Trash2 className="w-4 h-4 text-slate-400" />
                          <span>Excluir &gt; 7 Dias</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-normal">
                          Remove todas as gravações com +7 dias
                        </span>
                      </button>

                      {/* Botão 3: Limpeza 15 Dias */}
                      <button
                        type="button"
                        onClick={() => handleRunStorageCleanup(15)}
                        disabled={runningCleanup}
                        className="p-3 bg-slate-950 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 rounded-xl text-xs font-semibold transition flex flex-col items-start gap-1 text-left disabled:opacity-50 active:scale-98"
                      >
                        <div className="flex items-center gap-1.5 font-bold">
                          <Trash2 className="w-4 h-4 text-slate-400" />
                          <span>Excluir &gt; 15 Dias</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-normal">
                          Remove todas as gravações com +15 dias
                        </span>
                      </button>

                      {/* Botão 4: Wipe Geral de Mídia */}
                      <button
                        type="button"
                        onClick={() => setWipeModalOpen(true)}
                        className="p-3 bg-rose-600/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-xl text-xs font-semibold transition flex flex-col items-start gap-1 text-left active:scale-98"
                      >
                        <div className="flex items-center gap-1.5 font-bold text-rose-300 hover:text-white">
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                          <span>Redefinição Total</span>
                        </div>
                        <span className="text-[10px] text-rose-300/80 hover:text-white font-normal">
                          Apaga 100% dos vídeos e fotos
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Card 4: Mapeamento de Diretório & Suporte a Disco Externo */}
                  <div className="card-dark p-5 rounded-2xl border border-white/5 space-y-3 bg-slate-900/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FolderArchive className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-bold text-white">Diretório de Armazenamento no Host</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">
                        Leitura &amp; Escrita Habilitadas (RW)
                      </span>
                    </div>

                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-sky-300 select-all">
                      {storageData?.disk?.media_path || "data/media"}
                    </div>

                    <div className="p-3.5 bg-blue-500/5 rounded-xl border border-blue-500/15 space-y-1.5 text-xs text-slate-300">
                      <div className="font-bold text-blue-400 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5" />
                        <span>Dica para ZimaOS / CasaOS / Mini PC GK3 Pro:</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Para direcionar as gravações para um <strong>HD Externo USB 3.0 ou SSD SATA secundário</strong>, basta montar o volume no Docker mapeando o diretório de destino:
                      </p>
                      <div className="bg-slate-950 p-2 rounded border border-slate-800 font-mono text-[10px] text-emerald-300 select-all">
                        -v /media/seu_hd_externo/servonvif_media:/app/engine/data/media
                      </div>
                    </div>
                  </div>

                  {/* Modal de Confirmação: Wipe Geral de Mídia */}
                  {wipeModalOpen && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                      <div className="bg-slate-900 border border-rose-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
                        <div className="flex items-center gap-3 text-rose-400">
                          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                            <AlertTriangle className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-white">Limpeza Total de Mídia (Wipe)</h3>
                            <p className="text-xs text-rose-300">Esta ação é irreversível!</p>
                          </div>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          Todos os <strong>{storageData?.servonvif?.total_files || 0} arquivos</strong> ({storageData?.servonvif?.total_size_mb || 0} MB de vídeos e snapshots) de todas as câmeras serão permanentemente excluídos do disco.
                        </p>

                        <div className="space-y-1.5">
                          <label className="text-xs text-slate-400 block">
                            Digite <strong className="text-rose-400 font-mono">CONFIRMAR_LIMPEZA_TOTAL</strong> para autorizar:
                          </label>
                          <input
                            type="text"
                            value={wipeConfirmText}
                            onChange={(e) => setWipeConfirmText(e.target.value)}
                            placeholder="CONFIRMAR_LIMPEZA_TOTAL"
                            className="w-full bg-slate-950 border border-rose-500/30 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-rose-500"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setWipeModalOpen(false);
                              setWipeConfirmText("");
                            }}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleWipeAllStorage}
                            disabled={wipeConfirmText !== "CONFIRMAR_LIMPEZA_TOTAL" || wipingStorage}
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-rose-600/30"
                          >
                            {wipingStorage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            <span>{wipingStorage ? "Apagando..." : "Confirmar e Apagar Tudo"}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
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

                  {/* Section 4: GitHub Self-Update & Remote Version Control */}
                  <div className="card-dark p-6 rounded-2xl border border-white/5 space-y-5 bg-slate-900/50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
                          <GitBranch className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white">Atualizações do Sistema (GitHub)</h3>
                            {systemVersion?.update_available ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 animate-pulse">
                                🟡 Atualização Disponível
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                                🟢 Versão Mais Recente
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Atualize o motor e interface diretamente do repositório remoto sem precisar de SSH ou terminal.
                          </p>
                        </div>
                      </div>

                      {/* Check Button */}
                      <button
                        type="button"
                        onClick={fetchSystemVersion}
                        disabled={checkingVersion}
                        className="h-9 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-white/10 transition active:scale-98 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${checkingVersion ? "animate-spin text-blue-400" : "text-slate-400"}`} />
                        <span>{checkingVersion ? "Verificando..." : "Verificar no GitHub"}</span>
                      </button>
                    </div>

                    {/* Version Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      {/* Local Commit Card */}
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-white/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Versão Instalada Localmente</span>
                          <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                            {systemVersion?.local_commit || "---"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 truncate" title={systemVersion?.local_commit_message}>
                          {systemVersion?.local_commit_message || "Carregando informações locais..."}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {systemVersion?.local_commit_date ? `Última alteração: ${systemVersion.local_commit_date}` : ""}
                        </p>
                      </div>

                      {/* Remote GitHub Commit Card */}
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-white/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Repositório Remoto (GitHub main)</span>
                          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            {systemVersion?.remote_commit || "---"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 truncate" title={systemVersion?.remote_commit_message}>
                          {systemVersion?.remote_commit_message || "Verifique a conexão com o GitHub..."}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {systemVersion?.remote_commit_date ? `Lançado no GitHub: ${new Date(systemVersion.remote_commit_date).toLocaleString("pt-BR")}` : ""}
                        </p>
                      </div>
                    </div>

                    {/* Update Available Banner & Action */}
                    {systemVersion?.update_available ? (
                      <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-slate-950 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            <span>Nova versão detectada no GitHub!</span>
                          </h4>
                          <p className="text-xs text-slate-300">
                            Clique no botão ao lado para baixar as melhorias e reiniciar o servidor automaticamente.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsUpdateModalOpen(true)}
                          className="h-11 px-5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-600/25 transition active:scale-98 shrink-0"
                        >
                          <ArrowUpCircle className="w-4 h-4" />
                          <span>Atualizar Servidor Agora</span>
                        </button>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>O ServONVIF está sincronizado com a ramificação principal do GitHub.</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsUpdateModalOpen(true)}
                          className="text-[11px] font-semibold text-slate-400 hover:text-white underline underline-offset-2 transition"
                        >
                          Forçar Re-sincronização
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ================= TAB: GUIA DE CÂMERAS & RTSP ================= */}
              {activeTab === "guide" && (
                <div className="space-y-6">
                  {/* Header Title Card */}
                  <div className="card-dark p-6 rounded-2xl border border-white/5 space-y-2 bg-slate-900/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-cyan-600/10 text-cyan-400 border border-cyan-500/20">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-white">
                          Guia de Conexão &amp; Manual de Câmeras IP
                        </h2>
                        <p className="text-xs text-slate-400">
                          Instruções passo a passo para a câmera AITEK SEG6050BP 5MP PoE, URLs RTSP de outros fabricantes e boas práticas de rede.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section 1: CÂMERA AITEK SEG6050BP 5MP POE (DESTAQUE) */}
                  <div className="card-dark p-6 rounded-2xl border border-cyan-500/30 space-y-5 bg-gradient-to-br from-cyan-950/20 via-slate-900/60 to-slate-900/50 shadow-xl shadow-cyan-950/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-cyan-500/20">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                          <Video className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white">AITEK SEG6050BP (5MP PoE)</h3>
                            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-bold border border-cyan-500/30">
                              Câmera Principal
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 font-mono">
                            Sensor 5MP (2880×1624) • PoE / DC 12V • H.264/H.265 • Dupla Iluminação Noturna • LPR
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Hardware & Network Specs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Physical Connection */}
                      <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                          <Network className="w-4 h-4" />
                          <span>1. Como Ligar na Rede</span>
                        </div>
                        <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside leading-relaxed">
                          <li>
                            <strong className="text-white">Opção PoE (Recomendado):</strong> Plugue o cabo de rede direto em um <span className="text-cyan-400 font-semibold">Switch PoE ou Injetor PoE</span> (energia e dados no mesmo cabo RJ45).
                          </li>
                          <li>
                            <strong className="text-white">Opção Sem PoE:</strong> Plugue o cabo de rede no roteador e use uma <span className="text-amber-400 font-semibold">fonte 12V 2A P4</span> conectada no plug de força.
                          </li>
                        </ul>
                      </div>

                      {/* Ports & Credentials */}
                      <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                          <ShieldCheck className="w-4 h-4" />
                          <span>2. Credenciais &amp; Portas de Fábrica</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 rounded-lg bg-slate-900/80 border border-white/5">
                            <span className="text-slate-400 text-[10px] block">Usuário Padrão</span>
                            <span className="font-mono font-bold text-white">admin</span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-900/80 border border-white/5">
                            <span className="text-slate-400 text-[10px] block">Senha Padrão</span>
                            <span className="font-mono text-slate-300">em branco ou admin</span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-900/80 border border-white/5">
                            <span className="text-slate-400 text-[10px] block">Porta RTSP</span>
                            <span className="font-mono font-bold text-cyan-400">554</span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-900/80 border border-white/5">
                            <span className="text-slate-400 text-[10px] block">Porta ONVIF</span>
                            <span className="font-mono font-bold text-emerald-400">80 ou 8899</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Pre-formatted AITEK RTSP URLs */}
                    <div className="space-y-3 pt-2">
                      <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                        <span>URLs RTSP Prontas para a Câmera AITEK (Copie com 1 Clique):</span>
                        <span className="text-[10px] text-slate-400 font-normal">Substitua IP e SENHA</span>
                      </div>

                      <div className="space-y-2">
                        {/* Stream 0 (5MP Nativo) */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-cyan-500/20 gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-cyan-300">Fluxo Principal (5MP Nativo 2880×1624)</span>
                              <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-mono">Gravação &amp; LPR</span>
                            </div>
                            <code className="text-xs text-slate-200 font-mono block truncate mt-0.5 select-all">
                              rtsp://admin:SENHA@192.168.1.X:554/stream0
                            </code>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                handleCopyGuideText("rtsp://admin:SENHA@192.168.1.X:554/stream0", "aitek_main");
                                setGuideTestUrl("rtsp://admin:admin@192.168.1.X:554/stream0");
                              }}
                              className="px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-medium flex items-center gap-1.5 transition"
                            >
                              {copiedGuideKey === "aitek_main" ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-emerald-400">Copiado!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copiar URL</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Stream 1 (Substream) */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-white/5 gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-200">Sub-Stream Leve (640×360)</span>
                              <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">Monitoramento Web Leve</span>
                            </div>
                            <code className="text-xs text-slate-300 font-mono block truncate mt-0.5 select-all">
                              rtsp://admin:SENHA@192.168.1.X:554/stream1
                            </code>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                handleCopyGuideText("rtsp://admin:SENHA@192.168.1.X:554/stream1", "aitek_sub");
                                setGuideTestUrl("rtsp://admin:admin@192.168.1.X:554/stream1");
                              }}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition"
                            >
                              {copiedGuideKey === "aitek_sub" ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-emerald-400">Copiado!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copiar URL</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Variações de fábrica */}
                        <div className="p-3 rounded-xl bg-slate-950/40 border border-white/5 text-xs text-slate-400 space-y-1">
                          <span className="font-semibold text-slate-300">Variações alternativas de fábrica da AITEK:</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                            <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60">
                              <span>rtsp://admin:SENHA@IP:554/live/ch0</span>
                              <button
                                type="button"
                                onClick={() => handleCopyGuideText("rtsp://admin:SENHA@192.168.1.X:554/live/ch0", "aitek_alt1")}
                                className="text-cyan-400 hover:text-cyan-300 ml-2"
                              >
                                {copiedGuideKey === "aitek_alt1" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                            <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60">
                              <span>rtsp://admin:SENHA@IP:554/onvif1</span>
                              <button
                                type="button"
                                onClick={() => handleCopyGuideText("rtsp://admin:SENHA@192.168.1.X:554/onvif1", "aitek_alt2")}
                                className="text-cyan-400 hover:text-cyan-300 ml-2"
                              >
                                {copiedGuideKey === "aitek_alt2" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: TESTADOR INTERATIVO DE FLUXO RTSP */}
                  <div className="card-dark p-6 rounded-2xl border border-white/5 space-y-4 bg-slate-900/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-600/10 text-emerald-400 border border-emerald-500/20">
                        <FlaskConical className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Testador de Conexão RTSP em Tempo Real</h3>
                        <p className="text-xs text-slate-400">
                          Cole a URL da sua câmera para testar a comunicação antes de cadastrar no mosaico.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <input
                        type="text"
                        value={guideTestUrl}
                        onChange={(e) => setGuideTestUrl(e.target.value)}
                        placeholder="rtsp://admin:senha@192.168.1.50:554/stream0"
                        className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        type="button"
                        onClick={handleTestGuideRtsp}
                        disabled={guideTesting || !guideTestUrl}
                        className="h-10 px-5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-md shadow-cyan-600/20 shrink-0"
                      >
                        {guideTesting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Testando...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 fill-white" />
                            <span>Testar Conexão RTSP</span>
                          </>
                        )}
                      </button>
                    </div>

                    {guideTestResult && (
                      <div
                        className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
                          guideTestResult.success
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                            : "bg-rose-500/10 border-rose-500/20 text-rose-300"
                        }`}
                      >
                        {guideTestResult.success ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                        )}
                        <div className="space-y-1">
                          <p className="font-bold">
                            {guideTestResult.success ? "Conexão RTSP Estabelecida com Sucesso!" : "Falha na Conexão RTSP"}
                          </p>
                          <p className="opacity-90">{guideTestResult.message}</p>
                          {guideTestResult.latency_ms && (
                            <p className="font-mono text-[11px] opacity-75">
                              Latência de Abertura: {guideTestResult.latency_ms} ms
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 3: DICIONÁRIO MULTI-MARCAS */}
                  <div className="card-dark p-6 rounded-2xl border border-white/5 space-y-4 bg-slate-900/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Dicionário de URLs RTSP por Fabricante</h3>
                        <p className="text-xs text-slate-400">
                          Formatos padrão das principais marcas de câmeras IP comercializadas no Brasil.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Intelbras / Dahua */}
                      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/5 flex flex-col justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-emerald-400 block">Intelbras / Dahua</span>
                          <code className="text-[11px] text-slate-300 font-mono block truncate select-all">
                            rtsp://admin:SENHA@IP:554/cam/realmonitor?channel=1&amp;subtype=0
                          </code>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyGuideText("rtsp://admin:SENHA@192.168.1.X:554/cam/realmonitor?channel=1&subtype=0", "intelbras")}
                          className="self-end px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 flex items-center gap-1 transition"
                        >
                          {copiedGuideKey === "intelbras" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedGuideKey === "intelbras" ? "Copiado" : "Copiar"}</span>
                        </button>
                      </div>

                      {/* TP-Link Tapo */}
                      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/5 flex flex-col justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-cyan-400 block">TP-Link Tapo (C200, C310, C500)</span>
                          <code className="text-[11px] text-slate-300 font-mono block truncate select-all">
                            rtsp://USUARIO:SENHA@IP:554/stream1
                          </code>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyGuideText("rtsp://USUARIO:SENHA@192.168.1.X:554/stream1", "tapo")}
                          className="self-end px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 flex items-center gap-1 transition"
                        >
                          {copiedGuideKey === "tapo" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedGuideKey === "tapo" ? "Copiado" : "Copiar"}</span>
                        </button>
                      </div>

                      {/* Hikvision / Ezviz */}
                      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/5 flex flex-col justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-rose-400 block">Hikvision / Ezviz</span>
                          <code className="text-[11px] text-slate-300 font-mono block truncate select-all">
                            rtsp://admin:SENHA@IP:554/Streaming/Channels/101
                          </code>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyGuideText("rtsp://admin:SENHA@192.168.1.X:554/Streaming/Channels/101", "hikvision")}
                          className="self-end px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 flex items-center gap-1 transition"
                        >
                          {copiedGuideKey === "hikvision" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedGuideKey === "hikvision" ? "Copiado" : "Copiar"}</span>
                        </button>
                      </div>

                      {/* ICSee / Yoosee / Tuya */}
                      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/5 flex flex-col justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-amber-400 block">ICSee / Yoosee / Tuya / XM</span>
                          <code className="text-[11px] text-slate-300 font-mono block truncate select-all">
                            rtsp://admin:SENHA@IP:554/onvif1
                          </code>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyGuideText("rtsp://admin:SENHA@192.168.1.X:554/onvif1", "icsee")}
                          className="self-end px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 flex items-center gap-1 transition"
                        >
                          {copiedGuideKey === "icsee" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedGuideKey === "icsee" ? "Copiado" : "Copiar"}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Section 4: BOAS PRÁTICAS & OTIMIZAÇÃO 5MP */}
                  <div className="card-dark p-6 rounded-2xl border border-white/5 space-y-4 bg-slate-900/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-amber-600/10 text-amber-400 border border-amber-500/20">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Recomendações de Otimização para Câmeras 5MP</h3>
                        <p className="text-xs text-slate-400">
                          Ajustes recomendados no menu web ou app da câmera para máxima fluidez e menor carga térmica.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
                        <span className="text-cyan-300 font-bold block">1. Codec H.264</span>
                        <p className="text-slate-400 leading-relaxed">
                          Prefira H.264 ou H.264+ para aceleração de hardware nativa sem sobrecarregar a CPU do servidor.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
                        <span className="text-emerald-300 font-bold block">2. Taxa de Quadros</span>
                        <p className="text-slate-400 leading-relaxed">
                          Configure a câmera entre 15 e 20 FPS. É perfeito para segurança e detecção de placas com menor uso de banda.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
                        <span className="text-indigo-300 font-bold block">3. Intervalo I-Frame (GOP)</span>
                        <p className="text-slate-400 leading-relaxed">
                          Configure o I-Frame para 2x o valor do FPS (ex: se FPS = 20, defina I-Frame = 40) para estabilidade total.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
                        <span className="text-amber-300 font-bold block">4. Luz Noturna Inteligente</span>
                        <p className="text-slate-400 leading-relaxed">
                          Use o modo Dupla Iluminação: infravermelho no escuro e luz branca LED colorida ao detectar pessoas/veículos.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section 5: CALCULADORA INTERATIVA DE DIMENSIONAMENTO (1 A 50 CÂMERAS) */}
                  {(() => {
                    const r = getDimensioningResults();
                    return (
                      <div className="card-dark p-6 rounded-2xl border border-indigo-500/30 space-y-6 bg-gradient-to-br from-indigo-950/30 via-slate-900/60 to-slate-900/50 shadow-2xl shadow-indigo-950/20">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-indigo-500/20">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                              <Calculator className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-white">
                                  Calculadora de Dimensionamento de Hardware &amp; Rede (1 a 50 Câmeras)
                                </h3>
                                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-bold border border-indigo-500/30">
                                  Interativa em Tempo Real
                                </span>
                              </div>
                              <p className="text-xs text-slate-400">
                                Simule a CPU, memória RAM, SSD/HDD, switch PoE e largura de banda de upload para o Telegram e Tailscale.
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleCopySetupSummary}
                            className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition"
                          >
                            {copiedSetupSummary ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedSetupSummary ? "Resumo Copiado!" : "Copiar Resumo do Setup"}</span>
                          </button>
                        </div>

                        {/* Interactive Controls */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4 rounded-xl bg-slate-950/70 border border-white/5">
                          {/* Number of Cameras */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <label className="font-bold text-slate-200">Câmeras por Servidor</label>
                              <span className="font-mono text-cyan-400 font-bold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
                                {calcCameras} {calcCameras === 1 ? "câmera" : "câmeras"}
                              </span>
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="50"
                              value={calcCameras}
                              onChange={(e) => setCalcCameras(parseInt(e.target.value, 10))}
                              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                            />
                            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                              <span>1 cam</span>
                              <span>16</span>
                              <span>32</span>
                              <span>50 cams</span>
                            </div>
                          </div>

                          {/* Resolution */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-200 block">Resolução das Câmeras</label>
                            <select
                              value={calcResolution}
                              onChange={(e) => setCalcResolution(e.target.value as any)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                            >
                              <option value="1080p">1080p Full HD (2MP • ~2 Mbps)</option>
                              <option value="5mp">5MP AITEK / 3K (5MP • ~4 Mbps)</option>
                              <option value="4k">4K Ultra HD (8MP • ~8 Mbps)</option>
                            </select>
                            <span className="text-[10px] text-slate-400 block">
                              Taxa típica por câmera: <strong className="text-slate-300 font-mono">{r.baseBitrateMbps} Mbps</strong>
                            </span>
                          </div>

                          {/* FPS */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-200 block">Taxa de Quadros (FPS)</label>
                            <div className="grid grid-cols-3 gap-1.5">
                              {[15, 20, 30].map((fpsVal) => (
                                <button
                                  key={fpsVal}
                                  type="button"
                                  onClick={() => setCalcFps(fpsVal as any)}
                                  className={`py-1 rounded text-xs font-semibold transition ${
                                    calcFps === fpsVal
                                      ? "bg-indigo-600 text-white border border-indigo-400/50"
                                      : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
                                  }`}
                                >
                                  {fpsVal} FPS
                                </button>
                              ))}
                            </div>
                            <span className="text-[10px] text-slate-400 block">
                              {calcFps <= 20 ? "Ótimo balanço banda/CPU" : "Fluidez máxima de TV"}
                            </span>
                          </div>

                          {/* Recording Mode */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-200 block">Modo de Gravação</label>
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                onClick={() => setCalcRecordingMode("motion")}
                                className={`py-1 px-2 rounded text-[11px] font-semibold transition ${
                                  calcRecordingMode === "motion"
                                    ? "bg-emerald-600 text-white border border-emerald-400/50"
                                    : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
                                }`}
                              >
                                Por Movimento
                              </button>
                              <button
                                type="button"
                                onClick={() => setCalcRecordingMode("continuous")}
                                className={`py-1 px-2 rounded text-[11px] font-semibold transition ${
                                  calcRecordingMode === "continuous"
                                    ? "bg-amber-600 text-white border border-amber-400/50"
                                    : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
                                }`}
                              >
                                Contínuo 24/7
                              </button>
                            </div>
                            <span className="text-[10px] text-slate-400 block">
                              {calcRecordingMode === "motion" ? "Economiza 80% de disco" : "Grava 100% do tempo"}
                            </span>
                          </div>

                          {/* Retention Days */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-200 block">Retenção no Disco</label>
                            <select
                              value={calcRetentionDays}
                              onChange={(e) => setCalcRetentionDays(parseInt(e.target.value, 10))}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                            >
                              <option value="3">3 Dias de Histórico</option>
                              <option value="7">7 Dias (Padrão 1 Semana)</option>
                              <option value="15">15 Dias (Quinzena)</option>
                              <option value="30">30 Dias (1 Mês)</option>
                              <option value="60">60 Dias (2 Meses)</option>
                            </select>
                            <span className="text-[10px] text-slate-400 block">
                              Autolimpeza automática por idade
                            </span>
                          </div>
                        </div>

                        {/* Calculated Output Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {/* CPU & GPU */}
                          <div className="p-4 rounded-xl bg-slate-950/80 border border-white/5 space-y-2 flex flex-col justify-between">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                                <Cpu className="w-4 h-4" />
                                <span>Processador (CPU / GPU)</span>
                              </div>
                              <div className="text-sm font-bold text-white leading-snug">
                                {r.cpuProfile.title}
                              </div>
                              <p className="text-xs text-slate-400">
                                {r.cpuProfile.note}
                              </p>
                            </div>
                            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                              <span className="text-slate-400">Aceleração de Vídeo:</span>
                              <span className="text-cyan-300 font-mono font-semibold">
                                {calcCameras <= 8 ? "Intel QuickSync / Metal" : "NVIDIA NVENC / QuickSync"}
                              </span>
                            </div>
                          </div>

                          {/* RAM Memory */}
                          <div className="p-4 rounded-xl bg-slate-950/80 border border-white/5 space-y-2 flex flex-col justify-between">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                                <Gauge className="w-4 h-4" />
                                <span>Memória RAM (Vídeo, IA, Deque &amp; OS Cache)</span>
                              </div>
                              <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-emerald-400 font-mono">{r.recRamGb} GB</span>
                                <span className="text-xs text-slate-400 font-mono">(Mínimo: {r.minRamGb} GB)</span>
                              </div>
                              <p className="text-xs text-slate-400">
                                Suporta frames descompactados, análise de IA/LPR, pre-buffer de 5s em RAM e Page Cache do SO para as {calcCameras} câmeras.
                              </p>
                            </div>
                            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                              <span className="text-slate-400">Tipo Recomendado:</span>
                              <span className="text-emerald-300 font-mono font-semibold">DDR4 / DDR5 Dual Channel</span>
                            </div>
                          </div>

                          {/* Storage SSD & HDD */}
                          <div className="p-4 rounded-xl bg-slate-950/80 border border-white/5 space-y-2 flex flex-col justify-between">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                                <HardDrive className="w-4 h-4" />
                                <span>Armazenamento (SSD + HDD)</span>
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-300">SSD NVMe (SO + SQLite):</span>
                                  <strong className="text-amber-400 font-mono">{r.recSsdGb} GB M.2</strong>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-300">HDD Gravação ({calcRetentionDays}d):</span>
                                  <strong className="text-amber-400 font-mono">{r.totalStorageTb} TB ({r.recHddTb} TB recomendado)</strong>
                                </div>
                              </div>
                              <p className="text-xs text-slate-400">
                                Recomendado: WD Purple ou Seagate SkyHawk 5400/7200 RPM para operação 24/7.
                              </p>
                            </div>
                            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                              <span className="text-slate-400">Volume Estimado:</span>
                              <span className="text-amber-300 font-mono font-semibold">{r.totalStorageGb} GB</span>
                            </div>
                          </div>

                          {/* Local Network & Switch PoE */}
                          <div className="p-4 rounded-xl bg-slate-950/80 border border-white/5 space-y-2 flex flex-col justify-between">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                                <Network className="w-4 h-4" />
                                <span>Rede Local &amp; Switch PoE</span>
                              </div>
                              <div className="text-sm font-bold text-white leading-snug">
                                {r.switchType}
                              </div>
                              <p className="text-xs text-slate-400">
                                Tráfego contínuo estimado na LAN: <strong className="text-indigo-300 font-mono">{r.totalBandwidthMbps} Mbps</strong>
                              </p>
                            </div>
                            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                              <span className="text-slate-400">Cabeamento:</span>
                              <span className="text-indigo-300 font-mono font-semibold">Cat5e (até 100m) ou Cat6 100% Cobre</span>
                            </div>
                          </div>

                          {/* Internet Upload for Telegram & Tailscale */}
                          <div className="p-4 rounded-xl bg-slate-950/80 border border-white/5 space-y-2 flex flex-col justify-between">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
                                <Send className="w-4 h-4" />
                                <span>Upload para Telegram &amp; Tailscale</span>
                              </div>
                              <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-rose-400 font-mono">{r.recUploadMbps} Mbps</span>
                                <span className="text-xs text-slate-400 font-mono">(Mín: {r.minUploadMbps} Mbps)</span>
                              </div>
                              <p className="text-xs text-slate-400">
                                Permite envio instantâneo de vídeos MP4 no Telegram e streaming sem buffering para a Android TV remota.
                              </p>
                            </div>
                            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                              <span className="text-slate-400">Tipo de Link:</span>
                              <span className="text-rose-300 font-mono font-semibold">Fibra Óptica com Upload Simétrico</span>
                            </div>
                          </div>

                          {/* Quick Dimensioning Summary */}
                          <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/20 space-y-2 flex flex-col justify-between">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                                <Sparkles className="w-4 h-4" />
                                <span>Classificação do Projeto</span>
                              </div>
                              <div className="text-sm font-bold text-white">
                                {calcCameras <= 4
                                  ? "🟢 Projeto Residencial / Home Lab"
                                  : calcCameras <= 8
                                  ? "🔵 Residência Premium / Comércio Pequeno"
                                  : calcCameras <= 16
                                  ? "🟣 Comércio Médio / Galpão / Condomínio"
                                  : calcCameras <= 32
                                  ? "🟠 Empresarial Médio / Supermercado"
                                  : "🔴 Corporativo Alta Densidade / Data Center"}
                              </div>
                              <p className="text-xs text-slate-300">
                                Capacidade para monitoramento 24/7 com inteligência artificial, detecção de movimento e alertas simultâneos.
                              </p>
                            </div>
                            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                              <span className="text-slate-400">Status do Servidor:</span>
                              <span className="text-emerald-400 font-mono font-bold">100% Homologado</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Section 6: MATRIZ DE SETUPS OFICIAIS (TABELA DE 1 A 50 CÂMERAS) */}
                  <div className="card-dark p-6 rounded-2xl border border-white/5 space-y-4 bg-slate-900/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-cyan-600/10 text-cyan-400 border border-cyan-500/20">
                        <Server className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">
                          Matriz de Setups Homologados (De 1 a 50 Câmeras)
                        </h3>
                        <p className="text-xs text-slate-400">
                          Consulte a tabela de referência rápida para planejar a infraestrutura ideal de acordo com a quantidade de câmeras.
                        </p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse font-sans">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-mono text-[11px]">
                            <th className="py-3 px-3">Escopo / Câmeras</th>
                            <th className="py-3 px-3">Processador (CPU/GPU)</th>
                            <th className="py-3 px-3">Memória RAM</th>
                            <th className="py-3 px-3">Armazenamento</th>
                            <th className="py-3 px-3">Switch PoE (LAN)</th>
                            <th className="py-3 px-3">Upload Recomendado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                          {/* Tier 1: 1 a 4 */}
                          <tr className="hover:bg-slate-800/30 transition">
                            <td className="py-3.5 px-3">
                              <span className="font-bold text-white block">1 a 4 Câmeras</span>
                              <span className="text-[10px] text-emerald-400">Residencial / Escritório</span>
                            </td>
                            <td className="py-3.5 px-3">
                              <span className="text-white font-medium block">Intel N100 / Mac Mini M1/M2</span>
                              <span className="text-[10px] text-slate-500">ou Core i3 8ª+ / RPi 5</span>
                            </td>
                            <td className="py-3.5 px-3 font-mono">
                              <strong className="text-emerald-400">8 GB</strong> DDR4/DDR5
                            </td>
                            <td className="py-3.5 px-3">
                              <span className="block text-slate-200">SSD 256GB NVMe</span>
                              <span className="text-[10px] text-slate-500">+ HDD 1TB a 2TB Surveillance</span>
                            </td>
                            <td className="py-3.5 px-3 text-slate-300">
                              Switch PoE 4/8 Portas 100M/Gigabit (60W)
                            </td>
                            <td className="py-3.5 px-3 font-mono text-cyan-400">
                              <strong>20 a 30 Mbps</strong>
                            </td>
                          </tr>

                          {/* Tier 2: 5 a 8 */}
                          <tr className="hover:bg-slate-800/30 transition">
                            <td className="py-3.5 px-3">
                              <span className="font-bold text-white block">5 a 8 Câmeras</span>
                              <span className="text-[10px] text-cyan-400">Residência Grande / Comércio</span>
                            </td>
                            <td className="py-3.5 px-3">
                              <span className="text-white font-medium block">Intel Core i5 (10ª a 14ª)</span>
                              <span className="text-[10px] text-slate-500">Ryzen 5 / Apple M1/M2/M3 (QuickSync)</span>
                            </td>
                            <td className="py-3.5 px-3 font-mono">
                              <strong className="text-cyan-400">16 GB</strong> DDR4/DDR5
                            </td>
                            <td className="py-3.5 px-3">
                              <span className="block text-slate-200">SSD 512GB NVMe</span>
                              <span className="text-[10px] text-slate-500">+ HDD 4TB WD Purple</span>
                            </td>
                            <td className="py-3.5 px-3 text-slate-300">
                              Switch Gigabit PoE 8 Portas (120W, 802.3at)
                            </td>
                            <td className="py-3.5 px-3 font-mono text-cyan-400">
                              <strong>40 a 60 Mbps</strong>
                            </td>
                          </tr>

                          {/* Tier 3: 9 a 16 */}
                          <tr className="hover:bg-slate-800/30 transition">
                            <td className="py-3.5 px-3">
                              <span className="font-bold text-white block">9 a 16 Câmeras</span>
                              <span className="text-[10px] text-indigo-400">Comércio Médio / Condomínio</span>
                            </td>
                            <td className="py-3.5 px-3">
                              <span className="text-white font-medium block">Intel Core i7 / Ryzen 7</span>
                              <span className="text-[10px] text-slate-500">ou Xeon E-2200 / Mac Studio</span>
                            </td>
                            <td className="py-3.5 px-3 font-mono">
                              <strong className="text-indigo-400">32 GB</strong> DDR4/DDR5
                            </td>
                            <td className="py-3.5 px-3">
                              <span className="block text-slate-200">SSD 1TB NVMe M.2</span>
                              <span className="text-[10px] text-slate-500">+ HDD 8TB a 10TB Surveillance</span>
                            </td>
                            <td className="py-3.5 px-3 text-slate-300">
                              Switch Gigabit PoE+ 16 Portas Gerenciável (250W)
                            </td>
                            <td className="py-3.5 px-3 font-mono text-cyan-400">
                              <strong>80 a 120 Mbps</strong>
                            </td>
                          </tr>

                          {/* Tier 4: 17 a 32 */}
                          <tr className="hover:bg-slate-800/30 transition">
                            <td className="py-3.5 px-3">
                              <span className="font-bold text-white block">17 a 32 Câmeras</span>
                              <span className="text-[10px] text-amber-400">Empresa / Supermercado</span>
                            </td>
                            <td className="py-3.5 px-3">
                              <span className="text-white font-medium block">Intel Core i9 / Ryzen 9</span>
                              <span className="text-[10px] text-amber-400">+ GPU NVIDIA GTX 1660 / RTX 3060</span>
                            </td>
                            <td className="py-3.5 px-3 font-mono">
                              <strong className="text-amber-400">64 GB</strong> DDR4/DDR5
                            </td>
                            <td className="py-3.5 px-3">
                              <span className="block text-slate-200">SSD 1TB NVMe Gen4</span>
                              <span className="text-[10px] text-slate-500">+ RAID 2x 10TB/12TB Surveillance</span>
                            </td>
                            <td className="py-3.5 px-3 text-slate-300">
                              Switch Gigabit PoE+ 24/32p com Uplink 10G SFP+
                            </td>
                            <td className="py-3.5 px-3 font-mono text-cyan-400">
                              <strong>150 a 250 Mbps</strong>
                            </td>
                          </tr>

                          {/* Tier 5: 33 a 50 */}
                          <tr className="hover:bg-slate-800/30 transition">
                            <td className="py-3.5 px-3">
                              <span className="font-bold text-white block">33 a 50 Câmeras</span>
                              <span className="text-[10px] text-rose-400">Data Center / Grande Condomínio</span>
                            </td>
                            <td className="py-3.5 px-3">
                              <span className="text-white font-medium block">Dual Intel Xeon / AMD EPYC</span>
                              <span className="text-[10px] text-rose-400">+ 1-2x GPUs NVIDIA RTX 4060 / A2000</span>
                            </td>
                            <td className="py-3.5 px-3 font-mono">
                              <strong className="text-rose-400">64 GB a 128 GB</strong> ECC
                            </td>
                            <td className="py-3.5 px-3">
                              <span className="block text-slate-200">SSD 2TB NVMe Gen4 (Mirror)</span>
                              <span className="text-[10px] text-slate-500">+ Storage RAID 4x 14TB+ Enterprise</span>
                            </td>
                            <td className="py-3.5 px-3 text-slate-300">
                              Switch Central 48p Gigabit PoE+ (750W) + VLAN CFTV
                            </td>
                            <td className="py-3.5 px-3 font-mono text-cyan-400">
                              <strong>300 a 500+ Mbps</strong>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Section 7: ARQUITETURA, ELIMINAÇÃO DE GARGALOS & BOAS PRÁTICAS */}
                  <div className="card-dark p-6 rounded-2xl border border-white/5 space-y-4 bg-slate-900/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-amber-600/10 text-amber-400 border border-amber-500/20">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">
                          Guia de Arquitetura &amp; Eliminação de Gargalos
                        </h3>
                        <p className="text-xs text-slate-400">
                          Entenda como o ServONVIF gerencia memória, armazenamento e tráfego de rede para suportar até 50 câmeras sem travar.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* Sub-Stream vs Main-Stream */}
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-white/5 space-y-2">
                        <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                          <Eye className="w-4 h-4" />
                          <span>1. A Regra de Ouro: Sub-Stream para IA &amp; Main-Stream para Gravação</span>
                        </span>
                        <p className="text-slate-300 leading-relaxed">
                          Em servidores com mais de 8 câmeras, nunca decodifique 5MP ou 4K na CPU apenas para detectar movimento. O ServONVIF pode ler o <strong className="text-white">Sub-Stream leve (640×360 ou 1280×720 @ 15fps)</strong> para IA e detecção de movimento, e gravar em disco o <strong className="text-emerald-400">Main-Stream 5MP puro</strong>. Isso reduz o uso de CPU em até <strong className="text-cyan-300">85%</strong>!
                        </p>
                      </div>

                      {/* RAM Deque vs SSD Wear */}
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-white/5 space-y-2">
                        <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                          <Gauge className="w-4 h-4" />
                          <span>2. Por que o Pre-Buffer usa RAM e Poupa o SSD?</span>
                        </span>
                        <p className="text-slate-300 leading-relaxed">
                          O ServONVIF armazena os últimos 5 a 10 segundos de vídeo em <strong className="text-white">filas circulares na memória RAM (<code className="text-emerald-400 font-mono">collections.deque</code>)</strong>. Ele nunca grava temporários no disco enquanto não houver evento, garantindo zero desgaste prematuro (TBW) do seu SSD NVMe.
                        </p>
                      </div>

                      {/* Telegram Rate Limit & Queue */}
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-white/5 space-y-2">
                        <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                          <Send className="w-4 h-4" />
                          <span>3. Fila Inteligente do Telegram &amp; Rate Limits</span>
                        </span>
                        <p className="text-slate-300 leading-relaxed">
                          A API do Telegram possui limite global de 30 envios/segundo. O servidor ServONVIF possui <strong className="text-white">Cooldown inteligente configurável (padrão 30s)</strong> e fila assíncrona com compressão ultrarrápida em MP4 H.264, impedindo que múltiplos disparos simultâneos congelem a sua conexão de internet.
                        </p>
                      </div>

                      {/* Separation SSD vs HDD */}
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-white/5 space-y-2">
                        <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                          <HardDrive className="w-4 h-4" />
                          <span>4. Separação Física: SSD NVMe vs HDD Surveillance</span>
                        </span>
                        <p className="text-slate-300 leading-relaxed">
                          Mantenha o Sistema Operacional e o banco de dados SQLite (em modo WAL) em um <strong className="text-amber-300">SSD NVMe M.2</strong> para busca instantânea de eventos e visualização imediata de thumbnails. Utilize <strong className="text-white">HDDs WD Purple ou Seagate SkyHawk</strong> exclusivamente para o fluxo sequencial contínuo de arquivos de vídeo MP4.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= TAB: GUIA ZIMAOS & MINI PC GK3 PRO ================= */}
              {activeTab === "zimaos" && (
                <div className="space-y-8">
                  {/* Hero Header Card */}
                  <div className="card-dark p-6 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/30 via-slate-900/60 to-slate-900/40 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                          <Server className="w-7 h-7" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-base font-bold text-white">Guia de Instalação: ZimaOS &amp; Mini PC GK3 Pro</h2>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                              🐧 ZimaOS / CasaOS Ready
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            Passo a passo completo para transformar seu Mini PC GK3 Pro em um servidor de monitoramento 24/7 com IA de baixo consumo (10W TDP).
                          </p>
                        </div>
                      </div>

                      {/* Hardware Badges */}
                      <div className="flex flex-wrap gap-2">
                        <div className="px-2.5 py-1 rounded-lg bg-slate-950 border border-white/5 text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Jasper Lake N5105 (4C/4T @ 2.9GHz)</span>
                        </div>
                        <div className="px-2.5 py-1 rounded-lg bg-slate-950 border border-white/5 text-[11px] font-mono text-purple-400 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-purple-400" />
                          <span>16 GB RAM DDR4</span>
                        </div>
                        <div className="px-2.5 py-1 rounded-lg bg-slate-950 border border-white/5 text-[11px] font-mono text-amber-400 flex items-center gap-1.5">
                          <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                          <span>512 GB SSD NVMe M.2</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Method 1: Docker Compose in ZimaOS Web GUI (Recommended) */}
                  <div className="card-dark p-6 rounded-2xl border border-white/5 space-y-5 bg-slate-900/50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <span>Método 1: Instalação via Docker Compose no Painel ZimaOS</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">Recomendado</span>
                          </h3>
                          <p className="text-[11px] text-slate-400">Instalação em 1 clique importando o manifesto direto na interface web do ZimaOS</p>
                        </div>
                      </div>
                    </div>

                    {/* Step-by-Step Instructions */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/5 space-y-1.5">
                        <span className="font-bold text-blue-400 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px]">1</span>
                          <span>Abrir App Store</span>
                        </span>
                        <p className="text-slate-300 text-[11px]">
                          No navegador, acesse o ZimaOS (<code className="text-blue-400 font-mono">http://&lt;ip-gk3pro&gt;</code>) e clique no botão <strong className="text-white">&ldquo;App Store&rdquo;</strong>.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/5 space-y-1.5">
                        <span className="font-bold text-blue-400 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px]">2</span>
                          <span>Custom Install</span>
                        </span>
                        <p className="text-slate-300 text-[11px]">
                          Clique em <strong className="text-white">&ldquo;Custom Install&rdquo;</strong> no canto superior direito da tela de aplicativos.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/5 space-y-1.5">
                        <span className="font-bold text-blue-400 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px]">3</span>
                          <span>Importar Compose</span>
                        </span>
                        <p className="text-slate-300 text-[11px]">
                          Clique no ícone de <strong className="text-white">&ldquo;Import&rdquo;</strong> (ícone de documento/terminal) e cole o arquivo abaixo.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/5 space-y-1.5">
                        <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px]">4</span>
                          <span>Pronto para Uso!</span>
                        </span>
                        <p className="text-slate-300 text-[11px]">
                          Clique em <strong className="text-white">&ldquo;Install&rdquo;</strong>. Acesse o painel em <code className="text-emerald-400 font-mono">:3005</code> e a API em <code className="text-emerald-400 font-mono">:8080</code>!
                        </p>
                      </div>
                    </div>

                    {/* Compose Code Snippet */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-400" />
                          <span>docker-compose.yml (Otimizado para Intel Jasper Lake &amp; 16GB RAM)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyZimaSnippet(`version: '3.8'

services:
  servonvif-engine:
    image: python:3.11-slim
    container_name: servonvif-core
    restart: unless-stopped
    network_mode: "host"
    devices:
      - /dev/dri:/dev/dri
    volumes:
      - /DATA/AppData/servonvif/data:/app/engine/data
      - /DATA/AppData/servonvif/media:/app/engine/data/media
      - /etc/localtime:/etc/localtime:ro
      - /etc/timezone:/etc/timezone:ro
    environment:
      - HOST=0.0.0.0
      - PORT=8080
      - PYTHONPATH=/app
      - OPENCV_FFMPEG_CAPTURE_OPTIONS=rtsp_transport;tcp|buffer_size;1024000|max_delay;500000|stimeout;2500000
    logging:
      driver: "json-file"
      options:
        max-size: "20m"
        max-file: "3"

  servonvif-ui:
    image: node:20-alpine
    container_name: servonvif-web
    restart: unless-stopped
    network_mode: "host"
    depends_on:
      - servonvif-engine
    environment:
      - NODE_ENV=production
      - PORT=3005`, "compose")}
                          className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-98"
                        >
                          {copiedZimaSnippet === "compose" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedZimaSnippet === "compose" ? "Copiado!" : "Copiar Docker Compose"}</span>
                        </button>
                      </div>

                      <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed">
{`version: '3.8'

services:
  # 🚀 MOTOR PRINCIPAL: OpenCV MOG2, Ingestão RTSP Zero-Latency, ANPR LPR e API
  servonvif-engine:
    build:
      context: https://github.com/jotapelessa/ServONVIF2.git#main
      dockerfile: docker/Dockerfile
    container_name: servonvif-core
    restart: unless-stopped
    network_mode: "host" # Essencial para ONVIF WS-Discovery UDP broadcast
    devices:
      - /dev/dri:/dev/dri # Aceleração Gráfica por Hardware Intel QuickSync / VA-API (Jasper Lake N5105)
    volumes:
      - /DATA/AppData/servonvif/data:/app/engine/data
      - /DATA/AppData/servonvif/media:/app/engine/data/media
      - /etc/localtime:/etc/localtime:ro
      - /etc/timezone:/etc/timezone:ro
    environment:
      - HOST=0.0.0.0
      - PORT=8080
      - PYTHONPATH=/app
      - OPENCV_FFMPEG_CAPTURE_OPTIONS=rtsp_transport;tcp|buffer_size;1024000|max_delay;500000|stimeout;2500000

  # 🌐 PAINEL WEB: Next.js Dashboard, Mosaico de Câmeras e Configurações
  servonvif-ui:
    build:
      context: https://github.com/jotapelessa/ServONVIF2.git#main:ui
      dockerfile: Dockerfile
    container_name: servonvif-web
    restart: unless-stopped
    network_mode: "host" # Roda na porta 3005 na mesma interface de rede do ZimaOS
    depends_on:
      - servonvif-engine
    environment:
      - NODE_ENV=production
      - PORT=3005`}
                      </pre>
                    </div>
                  </div>

                  {/* Method 2: Native CLI / SSH Installation on Debian / ZimaOS */}
                  <div className="card-dark p-6 rounded-2xl border border-white/5 space-y-5 bg-slate-900/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-purple-600/10 text-purple-400 border border-purple-500/20">
                        <Terminal className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Método 2: Instalação Nativa via Terminal / SSH no ZimaOS</h3>
                        <p className="text-[11px] text-slate-400">Instalação direta com suporte total ao Systemd para inicialização automática no boot</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Step A: Dependencies */}
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-white/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px]">1</span>
                            <span>Instalar Pacotes do Sistema (FFmpeg, Tesseract OCR, Python3, Node.js)</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyZimaSnippet(`apt-get update && apt-get install -y ffmpeg tesseract-ocr tesseract-ocr-por tesseract-ocr-eng libgl1 libglib2.0-0 nodejs npm python3-pip python3-venv git curl`, "step1")}
                            className="h-7 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1 border border-white/5 transition"
                          >
                            {copiedZimaSnippet === "step1" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedZimaSnippet === "step1" ? "Copiado!" : "Copiar"}</span>
                          </button>
                        </div>
                        <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-purple-200 overflow-x-auto">
apt-get update && apt-get install -y ffmpeg tesseract-ocr tesseract-ocr-por tesseract-ocr-eng libgl1 libglib2.0-0 nodejs npm python3-pip python3-venv git curl
                        </pre>
                      </div>

                      {/* Step B: Git Clone */}
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-white/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px]">2</span>
                            <span>Clonar o Repositório no SSD do ZimaOS (/DATA/AppData/servonvif)</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyZimaSnippet(`mkdir -p /DATA/AppData && cd /DATA/AppData
git clone https://github.com/jotapelessa/ServONVIF2.git servonvif
cd /DATA/AppData/servonvif`, "step2")}
                            className="h-7 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1 border border-white/5 transition"
                          >
                            {copiedZimaSnippet === "step2" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedZimaSnippet === "step2" ? "Copiado!" : "Copiar"}</span>
                          </button>
                        </div>
                        <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-purple-200 overflow-x-auto">
mkdir -p /DATA/AppData && cd /DATA/AppData
git clone https://github.com/jotapelessa/ServONVIF2.git servonvif
cd /DATA/AppData/servonvif
                        </pre>
                      </div>

                      {/* Step C: Python Venv & Frontend Build */}
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-white/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px]">3</span>
                            <span>Criar Ambiente Virtual Python &amp; Compilar o Painel Next.js</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyZimaSnippet(`python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r engine/requirements.txt
cd ui && npm install && npm run build && cd ..`, "step3")}
                            className="h-7 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1 border border-white/5 transition"
                          >
                            {copiedZimaSnippet === "step3" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedZimaSnippet === "step3" ? "Copiado!" : "Copiar"}</span>
                          </button>
                        </div>
                        <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-purple-200 overflow-x-auto">
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r engine/requirements.txt
cd ui && npm install && npm run build && cd ..
                        </pre>
                      </div>

                      {/* Step D: Systemd Service */}
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-white/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px]">4</span>
                            <span>Configurar Auto-Inicialização no Boot (Serviço Systemd)</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyZimaSnippet(`cat << 'EOF' > /etc/systemd/system/servonvif.service
[Unit]
Description=ServONVIF PRO Core Engine & UI
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/DATA/AppData/servonvif
Environment=PYTHONPATH=/DATA/AppData/servonvif
Environment=NODE_ENV=production
ExecStart=/bin/bash -c "source /DATA/AppData/servonvif/venv/bin/activate && python3 engine/main.py & cd ui && npm start"
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now servonvif.service`, "step4")}
                            className="h-7 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1 border border-white/5 transition"
                          >
                            {copiedZimaSnippet === "step4" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedZimaSnippet === "step4" ? "Copiado!" : "Copiar"}</span>
                          </button>
                        </div>
                        <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-200 overflow-x-auto">
cat &lt;&lt; &apos;EOF&apos; &gt; /etc/systemd/system/servonvif.service
[Unit]
Description=ServONVIF PRO Core Engine &amp; UI
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/DATA/AppData/servonvif
Environment=PYTHONPATH=/DATA/AppData/servonvif
Environment=NODE_ENV=production
ExecStart=/bin/bash -c &quot;source /DATA/AppData/servonvif/venv/bin/activate &amp;&amp; python3 engine/main.py &amp; cd ui &amp;&amp; npm start&quot;
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now servonvif.service
                        </pre>
                      </div>
                    </div>
                  </div>

                  {/* Hardware Acceleration & Tailscale Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Intel QuickSync VA-API Card */}
                    <div className="card-dark p-5 rounded-2xl border border-white/5 space-y-3 bg-slate-900/40">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-amber-600/10 text-amber-400 border border-amber-500/20">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-white">Aceleração por Hardware: Intel QuickSync (N5105)</h3>
                          <p className="text-[10px] text-slate-400">Decodificação H.264 / H.265 (HEVC) direto na iGPU</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        O processador Intel Jasper Lake N5105 possui <strong className="text-white">24 Execution Units (EUs)</strong> na GPU integrada. Ao mapear o dispositivo <code className="text-amber-400 font-mono">/dev/dri</code>, a decodificação dos fluxos RTSP de 5MP e 4K ocorre diretamente na GPU, liberando os 4 núcleos da CPU para a Inteligência Artificial e OCR de placas (ANPR).
                      </p>
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-white/5 text-[11px] font-mono text-slate-400">
                        <span className="text-slate-500"># Testar se a GPU está disponível no ZimaOS:</span><br />
                        <span className="text-amber-300">ls -la /dev/dri</span>
                      </div>
                    </div>

                    {/* Tailscale Integration Card */}
                    <div className="card-dark p-5 rounded-2xl border border-white/5 space-y-3 bg-slate-900/40">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-sky-600/10 text-sky-400 border border-sky-500/20">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-white">Acesso Remoto Seguro via Tailscale no ZimaOS</h3>
                          <p className="text-[10px] text-slate-400">Acesse no celular Moto G54 e MacBook sem abrir portas</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        O ZimaOS possui o <strong className="text-white">Tailscale nativo na App Store</strong> com 1 clique. Ao ativá-lo, o seu GK3 Pro receberá um IP fixo na sua Tailnet (ex: <code className="text-sky-400 font-mono">100.x.y.z</code>). Você poderá acessar o painel de monitoramento e o APK Android de qualquer lugar com criptografia WireGuard ponta-a-ponta.
                      </p>
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-white/5 text-[11px] font-mono text-slate-400">
                        <span className="text-slate-500"># URL no celular/navegador via Tailscale:</span><br />
                        <span className="text-sky-300">http://100.x.y.z:3005</span>
                      </div>
                    </div>
                  </div>

                  {/* Sizing & Resource Allocation Table for GK3 Pro */}
                  <div className="card-dark p-6 rounded-2xl border border-white/5 space-y-4 bg-slate-900/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-600/10 text-emerald-400 border border-emerald-500/20">
                        <Calculator className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Dimensionamento Estimado no seu GK3 Pro (16GB RAM + 512GB SSD)</h3>
                        <p className="text-[11px] text-slate-400">Comportamento real do servidor com 4 Câmeras AITEK 5MP PoE</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-white/5 space-y-1">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Uso de Memória RAM</span>
                        <div className="text-lg font-bold text-emerald-400 font-mono">~1.2 GB / 16 GB</div>
                        <p className="text-[11px] text-slate-400">
                          Utiliza apenas <strong>7.5% da RAM</strong>. Sobram 14.8 GB livres no GK3 Pro para Pre-Buffer e cache do ZimaOS.
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-950/70 border border-white/5 space-y-1">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Uso de CPU (Intel N5105)</span>
                        <div className="text-lg font-bold text-blue-400 font-mono">~8% a 14%</div>
                        <p className="text-[11px] text-slate-400">
                          Processador opera frio com <strong>TDP de 10W</strong>, silencioso e estável para operação ininterrupta 24/7.
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-950/70 border border-white/5 space-y-1">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Retenção no SSD 512GB</span>
                        <div className="text-lg font-bold text-amber-400 font-mono">~35 a 50 Dias</div>
                        <p className="text-[11px] text-slate-400">
                          Capacidade para milhares de clipes de eventos MP4 em alta definição com expiração automática configurável.
                        </p>
                      </div>
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

      {/* ================= MODAL: AUTO-UPDATE GITHUB ================= */}
      {isUpdateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="card-dark rounded-2xl w-full max-w-lg p-6 border border-white/10 shadow-2xl space-y-5 bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
                <ArrowUpCircle className={`w-6 h-6 ${isUpdatingSystem ? "animate-spin" : ""}`} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {isUpdatingSystem ? "Atualizando ServONVIF..." : "Confirmar Atualização do GitHub"}
                </h3>
                <p className="text-xs text-slate-400">
                  {isUpdatingSystem
                    ? `Baixando código e reiniciando o motor (${updateCountdown}s)...`
                    : "O servidor executará o download da versão mais recente do repositório remoto."}
                </p>
              </div>
            </div>

            {isUpdatingSystem ? (
              <div className="py-6 flex flex-col items-center justify-center space-y-4">
                <div className="w-14 h-14 rounded-full border-4 border-blue-500/20 border-t-blue-400 animate-spin" />
                <div className="text-center space-y-1">
                  <p className="text-xs font-semibold text-slate-200">
                    Sincronizando com GitHub e reiniciando processos...
                  </p>
                  <p className="text-[11px] text-slate-400">
                    A página irá recarregar automaticamente assim que o servidor voltar.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-950/80 border border-white/5 space-y-2 text-xs text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Versão Atual:</span>
                    <span className="font-mono font-bold text-blue-400">{systemVersion?.local_commit || "---"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Nova Versão (GitHub):</span>
                    <span className="font-mono font-bold text-emerald-400">{systemVersion?.remote_commit || "---"}</span>
                  </div>
                  <div className="pt-2 border-t border-white/5">
                    <p className="text-[11px] text-slate-400 italic">
                      &ldquo;{systemVersion?.remote_commit_message || "Atualização com correções e melhorias."}&rdquo;
                    </p>
                  </div>
                </div>

                {updateFeedback && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                      updateFeedback.success
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                        : "bg-rose-500/10 border-rose-500/20 text-rose-300"
                    }`}
                  >
                    {updateFeedback.success ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    )}
                    <span>{updateFeedback.message}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsUpdateModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-xl transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleTriggerSystemUpdate}
                    className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md shadow-blue-600/20 transition flex items-center gap-2"
                  >
                    <ArrowUpCircle className="w-3.5 h-3.5" />
                    <span>Iniciar Atualização Agora</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
