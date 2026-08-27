"use client";

import { useState, useEffect } from "react";
import { Camera, Device, apiClient, OnvifImagingSettings, SensorDiagnosticsResponse } from "@/lib/api-client";
import {
  X,
  Sliders,
  Tv,
  CheckCircle2,
  AlertCircle,
  Save,
  Loader2,
  Shield,
  Smartphone,
  Monitor,
  Sparkles,
  Sun,
  Contrast,
  Palette,
  Sparkle,
  Moon,
  RotateCw,
  ExternalLink,
  Clock,
  Camera as CameraIcon,
  Video,
  Globe,
  RefreshCw,
  Layers,
  Zap,
  Cpu,
  Activity,
  Award
} from "lucide-react";

interface CameraConfigModalProps {
  camera: Camera;
  onClose: () => void;
  onSaved: () => void;
}

export function CameraConfigModal({ camera, onClose, onSaved }: CameraConfigModalProps) {
  const [activeTab, setActiveTab] = useState<"ai_routing" | "onvif_imaging" | "sensor_diagnostics" | "quick_actions" | "network_rtsp">("ai_routing");

  // Tab 1: AI & Routing States
  const [name, setName] = useState(camera.name);
  const [sensitivity, setSensitivity] = useState(camera.sensitivity || 0.03);
  const [allowedDeviceIds, setAllowedDeviceIds] = useState<string[]>(camera.allowed_device_ids || []);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);

  // Tab 2: ONVIF Imaging States
  const [brightness, setBrightness] = useState<number>(50);
  const [contrast, setContrast] = useState<number>(50);
  const [saturation, setSaturation] = useState<number>(50);
  const [sharpness, setSharpness] = useState<number>(50);
  const [irCutFilter, setIrCutFilter] = useState<string>("AUTO");
  const [wdr, setWdr] = useState<string>("OFF");
  const [loadingImaging, setLoadingImaging] = useState<boolean>(false);
  const [savingImaging, setSavingImaging] = useState<boolean>(false);
  const [imagingFeedback, setImagingFeedback] = useState<string | null>(null);

  // Tab 3: Sensor 5MP & Optical Quality Diagnostics
  const [diagnostics, setDiagnostics] = useState<SensorDiagnosticsResponse | null>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);
  const [diagnosticsError, setDiagnosticsError] = useState<string | null>(null);
  const [switchingProfile, setSwitchingProfile] = useState(false);
  const [switchFeedback, setSwitchFeedback] = useState<string | null>(null);

  // Tab 4: Quick Actions & Maintenance States
  const [rebooting, setRebooting] = useState(false);
  const [rebootMessage, setRebootMessage] = useState<string | null>(null);
  const [snapping, setSnapping] = useState(false);
  const [snapMessage, setSnapMessage] = useState<string | null>(null);
  const [syncingTime, setSyncingTime] = useState(false);
  const [timeSyncMessage, setTimeSyncMessage] = useState<string | null>(null);

  // Tab 5: Network & RTSP States
  const [ipAddress, setIpAddress] = useState(camera.ip_address || "");
  const [onvifPort, setOnvifPort] = useState(camera.onvif_port || 80);
  const [rtspUrl, setRtspUrl] = useState(camera.rtsp_url || "");
  const [username, setUsername] = useState(camera.username || "");
  const [password, setPassword] = useState(camera.password || "");

  // Form Save States
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Load Devices, ONVIF Imaging, and Initial Sensor Diagnostics
  useEffect(() => {
    async function loadData() {
      try {
        const devs = await apiClient.getDevices();
        setDevices(devs);
      } catch (e) {
        console.error("Erro ao carregar dispositivos:", e);
      } finally {
        setLoadingDevices(false);
      }
    }
    loadData();
    fetchOnvifImaging();
    fetchSensorDiagnostics();
  }, []);

  const fetchSensorDiagnostics = async () => {
    setLoadingDiagnostics(true);
    setDiagnosticsError(null);
    try {
      const data = await apiClient.getSensorDiagnostics(camera.id);
      setDiagnostics(data);
    } catch (err: any) {
      setDiagnosticsError(err.message || "Erro ao consultar telemetria do sensor");
    } finally {
      setLoadingDiagnostics(false);
    }
  };

  const handleSwitchProfile = async (profileUri: string) => {
    setSwitchingProfile(true);
    setSwitchFeedback(null);
    try {
      const res = await apiClient.switchCameraProfile(camera.id, profileUri);
      setRtspUrl(profileUri);
      setSwitchFeedback("Stream atualizado para Alta Resolução!");
      await fetchSensorDiagnostics();
      setTimeout(() => setSwitchFeedback(null), 4000);
    } catch (err: any) {
      setSwitchFeedback(`Erro: ${err.message || "Falha ao alternar perfil"}`);
    } finally {
      setSwitchingProfile(false);
    }
  };

  const fetchOnvifImaging = async () => {
    setLoadingImaging(true);
    try {
      const data = await apiClient.getOnvifImaging(camera.id);
      if (data && data.success) {
        setBrightness(data.brightness ?? 50);
        setContrast(data.contrast ?? 50);
        setSaturation(data.color_saturation ?? 50);
        setSharpness(data.sharpness ?? 50);
        setIrCutFilter(data.ir_cut_filter || "AUTO");
        setWdr(data.wdr || "OFF");
      }
    } catch (err) {
      console.warn("Câmera sem suporte ONVIF direto ou offline:", err);
    } finally {
      setLoadingImaging(false);
    }
  };

  const handleApplyOnvifImaging = async () => {
    setSavingImaging(true);
    setImagingFeedback(null);
    try {
      await apiClient.setOnvifImaging(camera.id, {
        brightness,
        contrast,
        color_saturation: saturation,
        sharpness,
        ir_cut_filter: irCutFilter,
        wdr
      });
      setImagingFeedback("✅ Ajustes de imagem aplicados na câmera via ONVIF!");
      setTimeout(() => setImagingFeedback(null), 3500);
    } catch (err: any) {
      setImagingFeedback(`❌ Erro: ${err.message || "Falha ao aplicar"}`);
      setTimeout(() => setImagingFeedback(null), 4000);
    } finally {
      setSavingImaging(false);
    }
  };

  const handleRebootCamera = async () => {
    if (!confirm(`Deseja realmente enviar o comando de reinicialização para "${camera.name}"? A câmera levará cerca de 30 segundos para retornar.`)) {
      return;
    }
    setRebooting(true);
    setRebootMessage(null);
    try {
      const res = await apiClient.rebootCamera(camera.id);
      setRebootMessage(res.message || "🔄 Comando de reinicialização enviado com sucesso!");
    } catch (err: any) {
      setRebootMessage(`❌ Falha: ${err.message}`);
    } finally {
      setRebooting(false);
    }
  };

  const handleCaptureInstantSnapshot = async () => {
    setSnapping(true);
    setSnapMessage(null);
    try {
      await apiClient.captureSnapshot(camera.id, true);
      setSnapMessage(`📸 Foto capturada e salva com sucesso! Envio ao Telegram concluído.`);
      setTimeout(() => setSnapMessage(null), 4000);
    } catch (err: any) {
      setSnapMessage(`❌ Erro ao capturar snapshot: ${err.message}`);
      setTimeout(() => setSnapMessage(null), 4000);
    } finally {
      setSnapping(false);
    }
  };

  const handleSyncTime = async () => {
    setSyncingTime(true);
    setTimeSyncMessage(null);
    try {
      const res = await apiClient.syncCameraTime(camera.id);
      setTimeSyncMessage(res.message || "🕒 Relógio sincronizado com o Horário de Brasília!");
      setTimeout(() => setTimeSyncMessage(null), 4500);
    } catch (err: any) {
      setTimeSyncMessage(`❌ Erro: ${err.message || "Falha ao sincronizar"}`);
      setTimeout(() => setTimeSyncMessage(null), 4500);
    } finally {
      setSyncingTime(false);
    }
  };

  const toggleDevice = (devId: string) => {
    setAllowedDeviceIds((prev) =>
      prev.includes(devId) ? prev.filter((id) => id !== devId) : [...prev, devId]
    );
  };

  const selectAllDevices = () => {
    setAllowedDeviceIds(devices.map((d) => d.device_id));
  };

  const clearAllDevices = () => {
    setAllowedDeviceIds([]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.updateCamera(camera.id, {
        name,
        ip_address: ipAddress,
        onvif_port: Number(onvifPort),
        rtsp_url: rtspUrl,
        username: username || undefined,
        password: password || undefined,
        sensitivity: Number(sensitivity),
        allowed_device_ids: allowedDeviceIds,
      });
      setSavedSuccess(true);
      setTimeout(() => {
        onSaved();
        onClose();
      }, 700);
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar configurações da câmera");
    } finally {
      setSaving(false);
    }
  };

  const getSensitivityLabel = (val: number) => {
    if (val === 0) return { label: "⏸️ Desativado", desc: "Detecção de movimento desligada nesta câmera", color: "text-slate-400" };
    if (val <= 10) return { label: "🛡️ Anti-Falso Positivo (Estrito)", desc: "Detecta apenas pessoas inteiras ou veículos. Ignora insetos, galhos e ruídos de pixel.", color: "text-emerald-400" };
    if (val <= 25) return { label: "⚖️ Balanceado (Recomendado)", desc: "Sensibilidade padrão ideal para portões, garagens e calçadas.", color: "text-blue-400" };
    if (val <= 40) return { label: "🔍 Média-Alta Sensibilidade", desc: "Detecta movimentação a distâncias maiores.", color: "text-amber-400" };
    return { label: "⚡ Alta Sensibilidade (Nível Máximo)", desc: "Detecta qualquer mudança sutil no ambiente.", color: "text-rose-400" };
  };

  const displaySens = sensitivity < 1.0 && sensitivity > 0 ? Math.round(sensitivity * 500) : sensitivity;
  const sensInfo = getSensitivityLabel(displaySens);
  const cameraWebUrl = `http://${ipAddress || camera.ip_address || "127.0.0.1"}:${onvifPort || 80}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="card-dark rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Configurações &amp; Controle da Câmera</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                  ID #{camera.id}
                </span>
                {camera.ip_address && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                    {camera.ip_address}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Ajuste fino de inteligência artificial, parâmetros ONVIF de imagem e ações remotas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-white/10 bg-slate-950/60 px-6 gap-2 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("ai_routing")}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition select-none ${
              activeTab === "ai_routing"
                ? "border-blue-500 text-blue-400 bg-blue-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>1. IA &amp; Telas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("onvif_imaging")}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition select-none ${
              activeTab === "onvif_imaging"
                ? "border-emerald-500 text-emerald-400 bg-emerald-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sun className="w-4 h-4" />
            <span>2. Imagem &amp; ONVIF</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("sensor_diagnostics");
              if (!diagnostics) fetchSensorDiagnostics();
            }}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition select-none ${
              activeTab === "sensor_diagnostics"
                ? "border-amber-500 text-amber-400 bg-amber-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>3. Sensor 5MP &amp; Qualidade</span>
            {diagnostics?.upgrade_available && (
              <span className="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.5 rounded-full border border-amber-500/40 animate-pulse">
                Sub-Stream
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("quick_actions")}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition select-none ${
              activeTab === "quick_actions"
                ? "border-purple-500 text-purple-400 bg-purple-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>4. Ações &amp; Manutenção</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("network_rtsp")}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition select-none ${
              activeTab === "network_rtsp"
                ? "border-cyan-500 text-cyan-400 bg-cyan-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>5. Rede &amp; RTSP</span>
          </button>
        </div>

        {/* Modal Form / Tab Contents */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: AI & ROUTING */}
          {activeTab === "ai_routing" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Camera Name */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">
                  Nome de Exibição da Câmera
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950/80 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition"
                  required
                />
              </div>

              {/* MOG2 Sensitivity Slider (0 to 50) */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Sensibilidade Anti-Ruído
                    </span>
                    <span className={`text-xs font-semibold ${sensInfo.color}`}>
                      {sensInfo.label}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Nível {displaySens} / 50
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {sensInfo.desc}
                </p>

                <div className="pt-1">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={displaySens}
                    onChange={(e) => setSensitivity(parseInt(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1.5 px-1">
                    <span>0 (Off)</span>
                    <span className="text-emerald-400 font-semibold">1-10 (Anti-Falsos)</span>
                    <span className="text-blue-400 font-semibold">20 (Recomendado)</span>
                    <span>35 (Alta)</span>
                    <span>50 (Máx)</span>
                  </div>
                </div>
              </div>

              {/* Device Alert Routing */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider block">
                      Dispositivos Autorizados a Receber Alertas
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Selecione quais telas devem exibir o PiP e tocar som ao detectar movimento nesta câmera.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={selectAllDevices}
                      className="px-2.5 py-1 text-[11px] font-medium text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg transition"
                    >
                      Marcar Todos
                    </button>
                    <button
                      type="button"
                      onClick={clearAllDevices}
                      className="px-2.5 py-1 text-[11px] font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                {loadingDevices ? (
                  <div className="flex items-center justify-center py-6 text-xs text-slate-400 gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    <span>Carregando dispositivos conectados...</span>
                  </div>
                ) : devices.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {devices.map((dev) => {
                      const isSpecificSelected = allowedDeviceIds.includes(dev.device_id);
                      const isEffectiveActive = allowedDeviceIds.length === 0 || isSpecificSelected;

                      return (
                        <div
                          key={dev.id}
                          onClick={() => toggleDevice(dev.device_id)}
                          className={`relative flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all duration-150 select-none ${
                            isSpecificSelected
                              ? "bg-blue-600/15 border-blue-500 text-white shadow-md shadow-blue-500/5 ring-1 ring-blue-500/30"
                              : allowedDeviceIds.length === 0
                              ? "bg-slate-800/60 border-slate-700 text-slate-200 hover:border-slate-600"
                              : "bg-slate-950/50 border-slate-800/80 text-slate-500 hover:border-slate-700 hover:text-slate-400"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`p-2.5 rounded-xl shrink-0 ${
                                dev.device_type === "Android TV"
                                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/20"
                                  : dev.device_type === "Web Browser"
                                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/20"
                                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                              }`}
                            >
                              {dev.device_type === "Android TV" ? (
                                <Tv className="w-4 h-4" />
                              ) : (
                                <Monitor className="w-4 h-4" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-white truncate">
                                {dev.name}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span>{dev.ip_address}</span>
                                <span>&bull;</span>
                                <span className="truncate">{dev.device_type}</span>
                              </div>
                            </div>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-lg flex items-center justify-center border transition ml-2 shrink-0 ${
                              isSpecificSelected
                                ? "bg-blue-600 border-blue-500 text-white shadow-sm"
                                : allowedDeviceIds.length === 0
                                ? "bg-slate-700/60 border-slate-600 text-slate-300"
                                : "border-slate-800 bg-slate-900 text-transparent"
                            }`}
                          >
                            {isEffectiveActive && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400 bg-slate-950/80 rounded-xl border border-slate-800">
                    Nenhum dispositivo Android TV ou tela registrado ainda no ServONVIF.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ONVIF IMAGING & HARDWARE CONTROLS */}
          {activeTab === "onvif_imaging" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sun className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Controle Direto no Sensor da Câmera (ONVIF Imaging)</h4>
                    <p className="text-[11px] text-slate-300">
                      Os ajustes abaixo são enviados via protocolo ONVIF diretamente para o processador DSP da câmera em tempo real.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={fetchOnvifImaging}
                  disabled={loadingImaging}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-white/10 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingImaging ? "animate-spin text-emerald-400" : ""}`} />
                  <span>Ler da Câmera</span>
                </button>
              </div>

              {/* Sliders Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Brightness */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <Sun className="w-4 h-4 text-amber-400" />
                      <span>Brilho</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400">{brightness}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>0 (Escuro)</span>
                    <span>50 (Padrão)</span>
                    <span>100 (Claro)</span>
                  </div>
                </div>

                {/* Contrast */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <Contrast className="w-4 h-4 text-cyan-400" />
                      <span>Contraste</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-cyan-400">{contrast}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>0 (Suave)</span>
                    <span>50 (Padrão)</span>
                    <span>100 (Forte)</span>
                  </div>
                </div>

                {/* Saturation */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <Palette className="w-4 h-4 text-purple-400" />
                      <span>Saturação de Cores</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-purple-400">{saturation}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={saturation}
                    onChange={(e) => setSaturation(Number(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>0 (P&amp;B)</span>
                    <span>50 (Padrão)</span>
                    <span>100 (Vívido)</span>
                  </div>
                </div>

                {/* Sharpness */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <Sparkle className="w-4 h-4 text-emerald-400" />
                      <span>Nitidez</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400">{sharpness}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sharpness}
                    onChange={(e) => setSharpness(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>0 (Suave)</span>
                    <span>50 (Padrão)</span>
                    <span>100 (Ultra Nítido)</span>
                  </div>
                </div>
              </div>

              {/* Night Mode & WDR Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* IR Cut Filter / Night Mode */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Moon className="w-4 h-4 text-indigo-400" />
                    <span>Modo Noturno (Dual Light / IR)</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "AUTO", label: "⚡ Auto", desc: "Automático" },
                      { id: "ON", label: "🌙 IR P&B", desc: "Infravermelho" },
                      { id: "OFF", label: "💡 LED Cor", desc: "Luz Colorida" },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setIrCutFilter(mode.id)}
                        className={`p-2 rounded-xl text-xs font-semibold border text-center transition ${
                          irCutFilter === mode.id
                            ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20"
                            : "bg-slate-950/60 text-slate-400 border-white/5 hover:border-slate-700"
                        }`}
                      >
                        <div>{mode.label}</div>
                        <div className="text-[10px] opacity-75 font-normal">{mode.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* WDR Mode */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span>Compensação de Luz (WDR / HDR)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "ON", label: "🛡️ Ativado (Recomendado)", desc: "Equilibra sol e sombras" },
                      { id: "OFF", label: "Desativado", desc: "Contraste nativo" },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setWdr(mode.id)}
                        className={`p-2 rounded-xl text-xs font-semibold border text-center transition ${
                          wdr === mode.id
                            ? "bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-500/20"
                            : "bg-slate-950/60 text-slate-400 border-white/5 hover:border-slate-700"
                        }`}
                      >
                        <div>{mode.label}</div>
                        <div className="text-[10px] opacity-75 font-normal">{mode.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Feedback & Apply Button */}
              <div className="flex items-center justify-between pt-2">
                {imagingFeedback ? (
                  <span className="text-xs font-semibold text-emerald-400 animate-in fade-in">
                    {imagingFeedback}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">
                    Clique abaixo para gravar os novos parâmetros no sensor da câmera.
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleApplyOnvifImaging}
                  disabled={savingImaging}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50"
                >
                  {savingImaging ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Aplicar Ajustes na Câmera</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SENSOR 5MP & OPTICAL QUALITY AUDIT */}
          {activeTab === "sensor_diagnostics" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Top Refresh and Test Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Auditoria Óptica &amp; Resolução Real do Sensor</span>
                      {loadingDiagnostics && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />}
                    </h4>
                    <p className="text-xs text-slate-400">
                      Mede a contagem real de pixels do stream, foco da lente e perfis ONVIF suportados pelo chip físico
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={fetchSensorDiagnostics}
                  disabled={loadingDiagnostics}
                  className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl border border-white/10 shadow transition active:scale-95 disabled:opacity-50 shrink-0"
                >
                  {loadingDiagnostics ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span>Testar Sensor Agora</span>
                </button>
              </div>

              {/* Upgrade Alert Banner (If Sub-stream detected or upgrade available) */}
              {diagnostics?.upgrade_available && diagnostics.recommended_url && (
                <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3 animate-in slide-in-from-top-2">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h5 className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                        Sub-Stream Detectado &bull; Resolução Travada em Baixa Qualidade
                      </h5>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        O seu servidor está recebendo o stream secundário (<strong>{diagnostics.active_stream.width}x{diagnostics.active_stream.height} &bull; {diagnostics.active_stream.megapixels} MP</strong>). 
                        O sensor da sua câmera possui perfil <strong>MAIN de Alta Resolução ({diagnostics.best_profile?.width}x{diagnostics.best_profile?.height} &bull; {diagnostics.best_profile?.megapixels} MP)</strong> disponível!
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                    <span className="text-[11px] font-mono text-amber-300/80 truncate max-w-md">
                      Stream sugerido: {diagnostics.recommended_url}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSwitchProfile(diagnostics.recommended_url!)}
                      disabled={switchingProfile}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition active:scale-95 disabled:opacity-50 shrink-0"
                    >
                      {switchingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 fill-current" />}
                      <span>Ativar Perfil 5MP / Super HD (1-Clique)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Success Banner on switch */}
              {switchFeedback && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{switchFeedback}</span>
                </div>
              )}

              {/* Error Banner */}
              {diagnosticsError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <span>{diagnosticsError}</span>
                </div>
              )}

              {/* Telemetry Metrics Grid */}
              {diagnostics && diagnostics.active_stream && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Card 1: Real Resolution */}
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                      <span>Resolução Real</span>
                      <Monitor className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="text-xl font-bold text-white font-mono">
                      {diagnostics.active_stream.width} &times; {diagnostics.active_stream.height}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        {diagnostics.active_stream.megapixels} Megapixels
                      </span>
                    </div>
                  </div>

                  {/* Card 2: Optical Sharpness */}
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                      <span>Foco Óptico / Nitidez</span>
                      <Activity className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-xl font-bold text-white font-mono">
                      Score {diagnostics.active_stream.sharpness_score}
                    </div>
                    <div className="text-[11px] text-emerald-400 truncate" title={diagnostics.active_stream.focus_status}>
                      {diagnostics.active_stream.focus_status}
                    </div>
                  </div>

                  {/* Card 3: Video Codec & FPS */}
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                      <span>Codec &amp; Frame Rate</span>
                      <Video className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="text-xl font-bold text-white font-mono">
                      {diagnostics.best_profile?.encoding || "H.264"}
                    </div>
                    <div className="text-[11px] text-purple-300">
                      {diagnostics.best_profile?.fps_limit || 25} FPS &bull; {diagnostics.best_profile?.bitrate_kbps || 2048} kbps
                    </div>
                  </div>

                  {/* Card 4: Dynamic Range & Contrast */}
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                      <span>Faixa Dinâmica (Luma)</span>
                      <Sun className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="text-xl font-bold text-white font-mono">
                      {diagnostics.active_stream.luma_mean} / 255
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Contraste: &plusmn;{diagnostics.active_stream.contrast_score}
                    </div>
                  </div>
                </div>
              )}

              {/* Discovered Hardware Profiles Table */}
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h5 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-cyan-400" />
                      <span>Perfis de Hardware ONVIF Detectados no Chip da Câmera</span>
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      Streams pré-configurados no encoder interno da câmera com resoluções nativas
                    </p>
                  </div>
                  <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg border border-white/5">
                    {diagnostics?.profiles?.length || 0} perfis encontrados
                  </span>
                </div>

                <div className="space-y-2.5">
                  {diagnostics?.profiles && diagnostics.profiles.length > 0 ? (
                    diagnostics.profiles.map((p, idx) => {
                      const isCurrent = rtspUrl.includes(p.rtsp_uri) || (p.rtsp_uri && rtspUrl.includes(p.rtsp_uri.split("@").pop() || ""));
                      return (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                            isCurrent
                              ? "bg-blue-500/10 border-blue-500/40 text-white"
                              : "bg-slate-950/40 border-white/5 hover:border-white/10 text-slate-300"
                          }`}
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold font-mono">
                                {p.name || p.token}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                                p.megapixels >= 4.0
                                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                  : p.megapixels >= 2.0
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : "bg-slate-700/50 text-slate-300 border border-slate-600"
                              }`}>
                                {p.width} &times; {p.height} ({p.megapixels} MP)
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {p.encoding} &bull; {p.fps_limit} FPS &bull; {p.bitrate_kbps} kbps
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] bg-blue-500 text-white font-bold px-2 py-0.5 rounded-full shadow">
                                  ATIVO ATUALMENTE
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 truncate max-w-xl">
                              {p.rtsp_uri || "URI ONVIF Padrão"}
                            </div>
                          </div>

                          <div className="shrink-0">
                            {!isCurrent && p.rtsp_uri ? (
                              <button
                                type="button"
                                onClick={() => handleSwitchProfile(p.rtsp_uri)}
                                disabled={switchingProfile}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white text-xs font-semibold rounded-lg border border-white/10 transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                              >
                                {switchingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                                <span>Ativar Perfil</span>
                              </button>
                            ) : isCurrent ? (
                              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" /> Em uso
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-6 text-slate-500 text-xs">
                      {loadingDiagnostics ? "Consultando chip ONVIF da câmera..." : "Nenhum perfil ONVIF encontrado ou câmera em modo RTSP genérico."}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: QUICK ACTIONS & MAINTENANCE */}
          {activeTab === "quick_actions" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Remote Camera Reboot */}
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-rose-400">
                      <RotateCw className="w-4 h-4" />
                      <span>Reiniciar Câmera Remotamente</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Envia um sinal de <strong>SystemReboot</strong> via ONVIF para reiniciar o firmware da câmera sem precisar desconectar cabos ou subir em escadas.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleRebootCamera}
                      disabled={rebooting}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-xl text-xs font-semibold transition active:scale-95 disabled:opacity-50"
                    >
                      {rebooting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
                      <span>Reiniciar Câmera (Reboot)</span>
                    </button>
                  </div>
                </div>

                {/* 2. Open Embedded Web Portal */}
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-cyan-400">
                      <Globe className="w-4 h-4" />
                      <span>Painel Web da Câmera (HTTP 80)</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Acesse a interface web nativa do fabricante ({cameraWebUrl}) para atualizar firmware, máscaras de privacidade física ou áudio bidirecional.
                    </p>
                  </div>
                  <div className="pt-2">
                    <a
                      href={cameraWebUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/30 rounded-xl text-xs font-semibold transition active:scale-95"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Abrir Web Portal ({ipAddress || camera.ip_address}:80)</span>
                    </a>
                  </div>
                </div>

                {/* 3. High-Res Snapshot Test */}
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-amber-400">
                      <CameraIcon className="w-4 h-4" />
                      <span>Disparo de Foto Instantânea</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Captura um snapshot instantâneo em alta definição do fluxo RTSP atual, salva em disco e envia para o Telegram.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleCaptureInstantSnapshot}
                      disabled={snapping}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/30 rounded-xl text-xs font-semibold transition active:scale-95 disabled:opacity-50"
                    >
                      {snapping ? <Loader2 className="w-4 h-4 animate-spin" /> : <CameraIcon className="w-4 h-4" />}
                      <span>Tirar Foto de Teste</span>
                    </button>
                  </div>
                </div>

                {/* 4. Time Sync info & Action */}
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-purple-400">
                      <Clock className="w-4 h-4" />
                      <span>Sincronizar com Horário de Brasília</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Envia o comando ONVIF <strong>SetSystemDateAndTime</strong> para ajustar a data, hora e fuso horário da câmera para <strong>UTC-03:00 (Brasília)</strong>.
                    </p>
                  </div>
                  <div className="pt-2 space-y-2">
                    <button
                      type="button"
                      onClick={handleSyncTime}
                      disabled={syncingTime}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 rounded-xl text-xs font-semibold transition active:scale-95 disabled:opacity-50"
                    >
                      {syncingTime ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                      <span>Sincronizar com Horário de Brasília</span>
                    </button>
                    <div className="text-[10px] text-slate-400 font-mono text-center">
                      Fuso: America/Sao_Paulo (BRT+3) &bull; {new Date().toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages */}
              {rebootMessage && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 animate-in fade-in">
                  {rebootMessage}
                </div>
              )}
              {snapMessage && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 animate-in fade-in">
                  {snapMessage}
                </div>
              )}
              {timeSyncMessage && (
                <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 animate-in fade-in">
                  {timeSyncMessage}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: NETWORK & RTSP STREAM */}
          {activeTab === "network_rtsp" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* IP Address */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Endereço IP da Câmera
                  </label>
                  <input
                    type="text"
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                    placeholder="192.168.1.178"
                    className="w-full bg-slate-950/80 border border-white/10 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none transition"
                  />
                </div>

                {/* ONVIF Port */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Porta ONVIF / HTTP
                  </label>
                  <input
                    type="number"
                    value={onvifPort}
                    onChange={(e) => setOnvifPort(Number(e.target.value))}
                    placeholder="80"
                    className="w-full bg-slate-950/80 border border-white/10 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none transition"
                  />
                </div>
              </div>

              {/* RTSP Stream URL */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    URL do Fluxo de Vídeo RTSP
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRtspUrl(`rtsp://${ipAddress || "192.168.1.178"}:554/live/0/MAIN`)}
                      className="text-[10px] text-emerald-400 hover:underline font-mono font-bold"
                      title="Fluxo Principal Nativo Ultra HD 5MP (2304x1296 / 2880x1620)"
                    >
                      🌟 Usar 5MP Ultra HD (/live/0/MAIN)
                    </button>
                    <span>&bull;</span>
                    <button
                      type="button"
                      onClick={() => setRtspUrl(`rtsp://${ipAddress || "192.168.1.178"}:554/live/0/SUB`)}
                      className="text-[10px] text-cyan-400 hover:underline font-mono"
                      title="Fluxo Secundário Leve (800x448)"
                    >
                      Usar Sub-stream (/live/0/SUB)
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={rtspUrl}
                  onChange={(e) => setRtspUrl(e.target.value)}
                  placeholder="rtsp://192.168.1.178:554/live/0/MAIN"
                  className="w-full bg-slate-950/80 border border-white/10 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none transition"
                  required
                />
                <p className="text-[11px] text-slate-400">
                  💡 Para máxima nitidez nas gravações e no Telegram, use o fluxo principal <strong>/live/0/MAIN</strong>.
                </p>
              </div>

              {/* Credentials Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Usuário ONVIF / RTSP
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin (ou vazio)"
                    className="w-full bg-slate-950/80 border border-white/10 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Senha da Câmera
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Deixe em branco se sem senha"
                    className="w-full bg-slate-950/80 border border-white/10 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
            <div className="text-[11px] text-slate-500">
              ServONVIF Multi-Stream Engine &bull; ID #{camera.id}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="h-10 px-4 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 h-10 px-5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-500/20 transition active:scale-95 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : savedSuccess ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{savedSuccess ? "Salvo com Sucesso!" : "Salvar Alterações"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
