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
} from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"telegram" | "tv" | "storage" | "engine">("telegram");
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
        bot_token: telegramToken,
        chat_id: telegramChatId,
      });
      setTelegramTestResult({ success: true, message: res.message });
    } catch (e: any) {
      setTelegramTestResult({ success: false, message: e.message || "Falha na conexão com o Telegram." });
    } finally {
      setTestingTelegram(false);
    }
  };

  const handleRunCleanup = async () => {
    if (!confirm("Deseja executar a varredura e exclusão de vídeos mais antigos que a política de retenção?")) {
      return;
    }
    setRunningCleanup(true);
    setCleanupResult(null);
    try {
      const res = await apiClient.triggerCleanup();
      setCleanupResult(res.message);
      // Reload stats
      const data = await apiClient.getSettings();
      setServerInfo(data);
    } catch (e: any) {
      alert("Erro ao executar limpeza: " + e.message);
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
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#0b0f19]">
      {/* Header */}
      <header className="h-16 w-full app-header px-6 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 h-9 px-3 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
          >
            <ArrowLeft className="w-4 h-4 text-blue-400" />
            <span>Mosaico ao Vivo</span>
          </Link>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              Painel de Configurações do Sistema
            </h1>
            <p className="text-[11px] text-slate-400">Gerencie alertas do Telegram, pareamento TV, armazenamento e motor MOG2</p>
          </div>
        </div>

        {/* Global Save Button */}
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center gap-2 h-9 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm shadow-blue-500/20 transition disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? "Salvando..." : "Salvar Alterações"}</span>
        </button>
      </header>

      {/* Main Workspace Layout with Sidebar Tabs */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Tabs */}
        <nav className="w-64 panel-dark border-r border-white/10 p-4 space-y-1.5 shrink-0 flex flex-col">
          <button
            onClick={() => setActiveTab("telegram")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === "telegram"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Alertas Telegram</span>
          </button>

          <button
            onClick={() => setActiveTab("tv")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === "tv"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>Pareamento Android TV</span>
          </button>

          <button
            onClick={() => setActiveTab("storage")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === "storage"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Armazenamento & Mídia</span>
          </button>

          <button
            onClick={() => setActiveTab("engine")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === "engine"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Motor de Visão & Buffer</span>
          </button>
        </nav>

        {/* Right Tab Content Area */}
        <main className="flex-1 p-8 overflow-y-auto max-w-4xl">
          {saveSuccess && (
            <div className="mb-6 flex items-center gap-2 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Configurações atualizadas com sucesso no servidor!</span>
            </div>
          )}

          {/* TAB 1: TELEGRAM BOT */}
          {activeTab === "telegram" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-400" />
                  Notificações no Telegram
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Receba fotos instantâneas dos invasores ou movimentos detectados diretamente no seu smartphone.
                </p>
              </div>

              <div className="card-dark rounded-2xl p-6 border border-white/10 space-y-5">
                {/* Active Switch */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div>
                    <span className="text-xs font-semibold text-white">Habilitar Alertas do Telegram</span>
                    <p className="text-[11px] text-slate-400">Ativa o envio de fotos e avisos de alarme</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={telegramEnabled}
                    onChange={(e) => setTelegramEnabled(e.target.checked)}
                    className="w-5 h-5 accent-blue-500 rounded cursor-pointer"
                  />
                </div>

                {/* Bot Token */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Bot Token do Telegram
                  </label>
                  <input
                    type="text"
                    placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                    value={telegramToken}
                    onChange={(e) => setTelegramToken(e.target.value)}
                    className="w-full h-10 px-3.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Obtenha seu token conversando com o <span className="text-blue-400">@BotFather</span> no Telegram.
                  </p>
                </div>

                {/* Chat ID */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Seu Chat ID (ou ID do Canal/Grupo)
                  </label>
                  <input
                    type="text"
                    placeholder="ex: 987654321 ou -100123456789"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    className="w-full h-10 px-3.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Descubra seu Chat ID enviando uma mensagem para o <span className="text-blue-400">@userinfobot</span>.
                  </p>
                </div>

                {/* Cooldown */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      Intervalo Mínimo entre Alertas (Cooldown Anti-Flood)
                    </label>
                    <span className="text-xs font-mono font-bold text-blue-400">
                      {telegramCooldown} segundos
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="120"
                    step="5"
                    value={telegramCooldown}
                    onChange={(e) => setTelegramCooldown(Number(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>

                {/* Test Telegram Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleTestTelegram}
                    disabled={testingTelegram}
                    className="flex items-center gap-2 h-9 px-4 text-xs font-semibold text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-600 border border-blue-500/30 rounded-lg transition disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{testingTelegram ? "Enviando teste..." : "Enviar Mensagem de Teste ao Vivo"}</span>
                  </button>

                  {telegramTestResult && (
                    <div
                      className={`mt-3 p-3 rounded-lg text-xs flex items-center gap-2 ${
                        telegramTestResult.success
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {telegramTestResult.success ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0" />
                      )}
                      <span>{telegramTestResult.message}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ANDROID TV / MOBILE PAIRING */}
          {activeTab === "tv" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Tv className="w-5 h-5 text-blue-400" />
                  Pareamento com Android TV e Celulares
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Conecte o aplicativo ServONVIF no seu televisor para receber pop-ups Picture-in-Picture automáticos.
                </p>
              </div>

              <div className="card-dark rounded-2xl p-6 border border-white/10 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  {/* Visual QR / Banner */}
                  <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <img
                      src={`${API_BASE}/api/settings/qr-pairing`}
                      alt="Banner de Pareamento"
                      className="w-full rounded-lg shadow-md border border-white/10"
                    />
                    <span className="text-[10px] text-slate-400 mt-2 font-mono">
                      Aponte o app Android para este endereço IP
                    </span>
                  </div>

                  {/* Manual Connection Info */}
                  <div className="space-y-4">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Endereço IP do Servidor Local
                      </span>
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-emerald-400 font-bold">
                        <span>{serverInfo?.local_ip || "127.0.0.1"}</span>
                        <span className="text-slate-500 font-normal">Porta: {serverInfo?.port || 8080}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Endpoint WebSocket de Eventos
                      </span>
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-white">
                        <span className="truncate max-w-[200px]">{serverInfo?.server_ws_url}</span>
                        <button
                          onClick={() => copyToClipboard(serverInfo?.server_ws_url || "")}
                          className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-white px-2 py-1 bg-slate-800 rounded transition"
                        >
                          <Copy className="w-3 h-3" /> {copiedWs ? "Copiado!" : "Copiar"}
                        </button>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-slate-300 text-xs leading-relaxed">
                      💡 <strong>Como usar na Smart TV:</strong> Instale o APK no Android TV, abra o app e confirme o IP local. A janela PiP surgirá automaticamente sobre qualquer filme quando houver movimento!
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STORAGE & RETENTION */}
          {activeTab === "storage" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-blue-400" />
                  Armazenamento & Retenção de Vídeos
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Controle a limpeza automática para que o disco nunca fique cheio.
                </p>
              </div>

              <div className="card-dark rounded-2xl p-6 border border-white/10 space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Total de Arquivos</span>
                    <p className="text-lg font-bold font-mono text-white mt-1">
                      {serverInfo?.storage?.total_files || 0}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Espaço Ocupado</span>
                    <p className="text-lg font-bold font-mono text-blue-400 mt-1">
                      {serverInfo?.storage?.total_size_mb || 0} MB
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 col-span-2 sm:col-span-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Status da Limpeza</span>
                    <p className="text-xs font-semibold text-emerald-400 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Automática Ativa
                    </p>
                  </div>
                </div>

                {/* Retention Days Slider */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      Dias de Retenção de Gravações
                    </label>
                    <span className="text-xs font-mono font-bold text-blue-400">
                      {retentionDays} dias
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="60"
                    step="1"
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(Number(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Vídeos e miniaturas com mais de {retentionDays} dias são expurgados automaticamente para liberar espaço.
                  </p>
                </div>

                {/* Manual Cleanup Action */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-white block">Limpeza Manual Imediata</span>
                    <p className="text-[11px] text-slate-400">Varre o diretório e remove mídias fora da janela de retenção</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRunCleanup}
                    disabled={runningCleanup}
                    className="flex items-center gap-2 h-9 px-4 text-xs font-semibold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/30 rounded-lg transition disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{runningCleanup ? "Limpando..." : "Executar Limpeza Agora"}</span>
                  </button>
                </div>

                {cleanupResult && (
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300">
                    {cleanupResult}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: COMPUTER VISION & BUFFER */}
          {activeTab === "engine" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-blue-400" />
                  Motor de Visão & Buffer em RAM
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Parâmetros de captura em anel (Ring Buffer) e algoritmo MOG2 OpenCV.
                </p>
              </div>

              <div className="card-dark rounded-2xl p-6 border border-white/10 space-y-5">
                {/* Pre-event Buffer */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      Buffer Pré-Evento em RAM (Segundos antes do movimento)
                    </label>
                    <span className="text-xs font-mono font-bold text-blue-400">
                      {bufferSeconds}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="15"
                    step="1"
                    value={bufferSeconds}
                    onChange={(e) => setBufferSeconds(Number(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Mantém os {bufferSeconds} segundos anteriores em RAM para que o vídeo gravado mostre o invasor se aproximando.
                  </p>
                </div>

                {/* Engine Info Box */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-blue-400" /> Especificações do Motor Nativo
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                    <div>Algoritmo: <span className="text-white font-mono">OpenCV MOG2 (Shadows off)</span></div>
                    <div>Transporte: <span className="text-white font-mono">RTSP over TCP Interleaved</span></div>
                    <div>Formato dos Clipes: <span className="text-white font-mono">H.264 / MP4 (60s chunks)</span></div>
                    <div>Broadcaster: <span className="text-white font-mono">MJPEG Multi-Client Zero-Lag</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
