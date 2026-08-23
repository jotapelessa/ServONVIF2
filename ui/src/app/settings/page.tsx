"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient, API_BASE } from "@/lib/api-client";
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
  ExternalLink,
} from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"telegram" | "tv" | "storage" | "engine" | "tests" | "logs">("tests");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [telegramCooldown, setTelegramCooldown] = useState(30);

  const [retentionDays, setRetentionDays] = useState(7);
  const [bufferSeconds, setBufferSeconds] = useState(5);

  // Read-only server info
  const [serverInfo, setServerInfo] = useState<{
    local_ip: string;
    port: number;
    server_ws_url: string;
    server_http_url: string;
    storage: {
      total_files: number;
      total_size_mb: number;
      media_path: string;
    };
  } | null>(null);

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

  useEffect(() => {
    async function load() {
      try {
        const data = await apiClient.getSettings();
        setServerInfo(data);
        setTelegramToken(data.telegram_bot_token || "");
        setTelegramChatId(data.telegram_chat_id || "");
        setTelegramEnabled(data.telegram_enabled ?? true);
        setTelegramCooldown(data.telegram_cooldown_seconds || 30);
        setRetentionDays(data.retention_days || 7);
        setBufferSeconds(data.default_buffer_seconds || 5);
      } catch (e) {
        console.error("Failed to load settings:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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

  useEffect(() => {
    if (activeTab === "logs") {
      fetchLogs();
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

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      await apiClient.updateSettings({
        telegram_bot_token: telegramToken,
        telegram_chat_id: telegramChatId,
        telegram_enabled: telegramEnabled,
        telegram_cooldown_seconds: Number(telegramCooldown),
        retention_days: Number(retentionDays),
        default_buffer_seconds: Number(bufferSeconds),
      });
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
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-500" />
            <span>Central de Controle &amp; Diagnóstico</span>
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
            onClick={() => setActiveTab("tests")}
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
            onClick={() => setActiveTab("logs")}
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
            onClick={() => setActiveTab("tv")}
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
            onClick={() => setActiveTab("telegram")}
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
            onClick={() => setActiveTab("storage")}
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
            onClick={() => setActiveTab("engine")}
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

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleTestTelegram}
                        disabled={testingTelegram || !telegramToken}
                        className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 px-4 py-2 rounded-lg text-xs font-medium border border-slate-700 transition-colors flex items-center gap-2"
                      >
                        <Send className="w-3.5 h-3.5 text-sky-400" />
                        <span>{testingTelegram ? "Enviando teste..." : "Testar Envio de Mensagem"}</span>
                      </button>
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

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleManualCleanup}
                        disabled={runningCleanup}
                        className="bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{runningCleanup ? "Executando limpeza..." : "Executar Limpeza Manual Agora"}</span>
                      </button>
                      {cleanupResult && <div className="text-xs text-slate-300 mt-2">{cleanupResult}</div>}
                    </div>
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
                        Recomendado: 5 segundos. Mantém os 5 segundos anteriores à detecção no vídeo salvo.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
