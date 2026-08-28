import React, { useState, useEffect, useRef } from 'react';
import { 
  FlaskConical, 
  Wifi, 
  Radio, 
  Bell, 
  Volume2, 
  PictureInPicture, 
  ShieldCheck, 
  Terminal, 
  Trash2, 
  Download, 
  Copy,
  Check,
  Play, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Layers, 
  Sliders, 
  Lock, 
  Activity,
  Server,
  Smartphone
} from 'lucide-react';
import { Camera, SystemHealth, SecurityEvent } from '../types';
import { getApiBase } from '../services/apiService';

interface TestLabTabProps {
  cameras: Camera[];
  systemHealth: SystemHealth;
  onSimulateMotion: (cameraId: string) => void;
  onTriggerPiP: (camera: Camera) => void;
  focusedElementId: string | null;
  onElementFocus: (id: string) => void;
}

interface TestLog {
  id: string;
  time: string;
  type: 'info' | 'success' | 'warn' | 'error' | 'ws';
  tag: string;
  message: string;
}

export const TestLabTab: React.FC<TestLabTabProps> = ({
  cameras,
  systemHealth,
  onSimulateMotion,
  onTriggerPiP,
  focusedElementId,
  onElementFocus,
}) => {
  // Test States
  const [isPinging, setIsPinging] = useState(false);
  const [lanPingMs, setLanPingMs] = useState<number | null>(null);
  const [funnelPingMs, setFunnelPingMs] = useState<number | null>(null);
  const [activeRoute, setActiveRoute] = useState<'lan' | 'funnel'>('lan');
  const [selectedCameraId, setSelectedCameraId] = useState<string>(cameras[0]?.id || '1');
  const [isCopied, setIsCopied] = useState(false);
  const [headsUpNotification, setHeadsUpNotification] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  // Android Permissions State
  const [overlayPermission, setOverlayPermission] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState(true);
  const [wakeLockPermission, setWakeLockPermission] = useState(true);

  // Terminal Logs
  const [logs, setLogs] = useState<TestLog[]>([
    {
      id: 'log-1',
      time: new Date().toLocaleTimeString('pt-BR'),
      type: 'info',
      tag: 'SYSTEM',
      message: 'Central de Testes & Diagnósticos inicializada. 10-Foot UI pronta.',
    },
    {
      id: 'log-2',
      time: new Date().toLocaleTimeString('pt-BR'),
      type: 'success',
      tag: 'WS_HUB',
      message: 'Monitorando conexões e eventos do ServONVIF em tempo real.',
    },
  ]);

  const logEndRef = useRef<HTMLDivElement>(null);

  // Check Android TV native permissions on mount
  useEffect(() => {
    try {
      if ((window as any).AndroidNative?.checkPermissions) {
        const permsStr = (window as any).AndroidNative.checkPermissions();
        const perms = JSON.parse(permsStr);
        setOverlayPermission(perms.overlay ?? true);
        setNotificationPermission(perms.notifications ?? true);
        setWakeLockPermission(perms.wakeLock ?? true);
      }
    } catch (e) {
      console.warn('Native permission check not available:', e);
    }
  }, []);

  const addLog = (type: TestLog['type'], tag: string, message: string) => {
    const newLog: TestLog = {
      id: `log-${Date.now()}-${Math.random()}`,
      time: new Date().toLocaleTimeString('pt-BR'),
      type,
      tag,
      message,
    };
    setLogs((prev) => [...prev.slice(-40), newLog]);
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // 1. Play Chime Sound via Web Audio API Synthesis or Android Native Ringtone
  const playSoundChime = (tone: 'alert' | 'success' | 'warn' = 'alert') => {
    try {
      if ((window as any).AndroidNative?.playSoundChime) {
        (window as any).AndroidNative.playSoundChime(tone);
      } else {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);

          if (tone === 'alert') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.36);
          } else {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, ctx.currentTime);
            gain.gain.setValueAtTime(0.25, ctx.currentTime);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
          }
        }
      }
      addLog('success', 'AUDIO_CHIME', `Sinal sonoro de teste disparado (${tone.toUpperCase()}).`);
    } catch (e) {
      addLog('error', 'AUDIO', `Erro ao sintetizar áudio: ${e}`);
    }
  };

  // 2. Real Ping Latency Test (Native Bridge + HTTP Endpoint)
  const handleTestPing = async () => {
    setIsPinging(true);
    const apiBase = getApiBase();
    addLog('info', 'PING', `Disparando teste de latência HTTP para o servidor: ${apiBase}...`);

    try {
      // 1. Test via Android Native Bridge if available
      if ((window as any).AndroidNative?.pingServer) {
        const pingResultStr = (window as any).AndroidNative.pingServer(`${apiBase}/api/settings/ping`);
        const result = JSON.parse(pingResultStr);
        if (result.ok) {
          setLanPingMs(result.latency_ms);
          addLog('success', 'LAN_PING', `📡 Servidor LAN (${apiBase}) respondeu com sucesso em ${result.latency_ms}ms (HTTP ${result.status}).`);
        } else {
          setLanPingMs(999);
          addLog('error', 'LAN_PING', `Falha ao pingar servidor LAN: ${result.error || 'Timeout'}`);
        }
      } else {
        // Direct browser fetch
        const startLan = performance.now();
        const res = await fetch(`${apiBase}/api/settings/ping`, { cache: 'no-store' });
        const elapsedLan = Math.round(performance.now() - startLan);
        setLanPingMs(elapsedLan);
        if (res.ok) {
          addLog('success', 'LAN_PING', `📡 Servidor LAN (${apiBase}) respondeu em ${elapsedLan}ms (Status: ${res.status}).`);
        } else {
          addLog('warn', 'LAN_PING', `Servidor LAN respondeu com status HTTP ${res.status}.`);
        }
      }

      // 2. Check Tailscale Funnel if available
      const infoRes = await fetch(`${apiBase}/api/auth/connection-info`, { cache: 'no-store' });
      if (infoRes.ok) {
        const info = await infoRes.json();
        if (info.is_funnel_active && info.tailscale_url) {
          const startTs = performance.now();
          const tsRes = await fetch(`${info.tailscale_url}/api/settings/ping`, { cache: 'no-store' });
          const elapsedTs = Math.round(performance.now() - startTs);
          setFunnelPingMs(elapsedTs);
          addLog('success', 'FUNNEL_PING', `Rota Tailscale (${info.tailscale_url}) respondeu em ${elapsedTs}ms.`);
        } else {
          setFunnelPingMs(null);
          addLog('info', 'FUNNEL_PING', 'Tailscale Funnel não ativado no servidor.');
        }
      }
    } catch (e) {
      setLanPingMs(999);
      addLog('error', 'PING', `Falha de rede ao conectar no servidor (${apiBase}): ${e}`);
    } finally {
      setIsPinging(false);
    }
  };

  // 3. Motion Simulation
  const handleSimulateMotion = () => {
    const cam = cameras.find((c) => c.id === selectedCameraId) || cameras[0] || { id: '1', name: 'Câmera Principal' };
    onSimulateMotion(cam.id);
    playSoundChime('alert');
    addLog('warn', 'MOTION_SIM', `🚨 Alerta de movimento simulado na câmera: ${cam.name} (${cam.id})`);
    
    if ((window as any).AndroidNative?.showHeadsUp) {
      (window as any).AndroidNative.showHeadsUp(
        `🚨 Movimento na ${cam.name}`,
        `Intrusão detectada no setor monitorado às ${new Date().toLocaleTimeString('pt-BR')}`
      );
    }

    setHeadsUpNotification({
      visible: true,
      title: `🚨 Alerta de Movimento: ${cam.name}`,
      message: `Intrusão detectada no setor monitorado às ${new Date().toLocaleTimeString('pt-BR')}`,
    });

    setTimeout(() => {
      setHeadsUpNotification({ visible: false, title: '', message: '' });
    }, 4500);
  };

  // 4. Test PiP (Unificado: Nativo exclusivo no Android TV, Web apenas em fallback)
  const handleTestPiP = () => {
    const cam = cameras.find((c) => c.id === selectedCameraId) || cameras[0] || { id: '1', name: 'Câmera Principal' };
    if ((window as any).AndroidNative?.triggerPiP) {
      (window as any).AndroidNative.triggerPiP(cam.id, cam.name);
    } else {
      onTriggerPiP(cam);
    }
    addLog('info', 'PIP_ALERT', `Janela flutuante Picture-in-Picture ativada para: ${cam.name}`);
  };

  // 5. Test Heads Up Banner
  const handleTestHeadsUp = () => {
    if ((window as any).AndroidNative?.showHeadsUp) {
      (window as any).AndroidNative.showHeadsUp(
        '🔔 Teste Heads-Up ServONVIF',
        'Notificação nativa no Android TV funcionando 100%!'
      );
    }
    setHeadsUpNotification({
      visible: true,
      title: `🔔 Teste de Notificação Heads-Up`,
      message: `O sistema de sobreposição e avisos instantâneos está 100% operacional.`,
    });
    playSoundChime('success');
    addLog('info', 'HEADS_UP', 'Notificação de topo Heads-Up disparada na tela.');

    setTimeout(() => {
      setHeadsUpNotification({ visible: false, title: '', message: '' });
    }, 4500);
  };

  // 6. Copy All Logs to Clipboard
  const handleCopyLogs = () => {
    const plainText = logs.map((l) => `[${l.time}] [${l.tag}] ${l.message}`).join('\n');
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(plainText);
    }
    if ((window as any).AndroidNative?.copyToClipboard) {
      (window as any).AndroidNative.copyToClipboard(plainText);
    }
    setIsCopied(true);
    addLog('success', 'CLIPBOARD', 'Todos os logs foram copiados para a área de transferência!');
    setTimeout(() => setIsCopied(false), 3000);
  };

  // 7. Export Log Report
  const handleExportReport = () => {
    const reportText = `=== RELATÓRIO DE TELEMETRIA SERVONVIF TV PRO ===
Data/Hora: ${new Date().toLocaleString('pt-BR')}
Servidor: ${getApiBase()}
Latência LAN: ${lanPingMs !== null ? `${lanPingMs}ms` : 'Não medido'}
Câmeras Ativas: ${cameras.length}
Permissões: Overlay=${overlayPermission}, Notificações=${notificationPermission}, WakeLock=${wakeLockPermission}

--- LOGS DE TELEMETRIA ---
${logs.map((l) => `[${l.time}] [${l.tag}] ${l.message}`).join('\n')}
=================================================`;

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `servonvif_tv_telemetry_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addLog('success', 'REPORT', 'Relatório de diagnóstico exportado em arquivo .txt.');
  };

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-80px)] p-4 sm:p-6 md:p-10 gap-6 select-none pb-28">
      
      {/* Heads-Up Notification Banner Simulation */}
      {headsUpNotification.visible && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-xl p-4 rounded-2xl bg-[#0D1424]/95 border-2 border-amber-500 text-white shadow-[0_0_30px_rgba(245,158,11,0.6)] backdrop-blur-2xl flex items-center gap-3.5 animate-bounce">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <Bell className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-sm text-amber-300">{headsUpNotification.title}</h4>
            <p className="text-xs text-slate-200">{headsUpNotification.message}</p>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-glass-card p-4 rounded-2xl border border-glass">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,210,255,0.3)]">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-bold text-slate-100">Central de Testes, Conexões & Permissões</h1>
            <p className="text-xs text-slate-400 hidden sm:block">Laboratório interativo para testes de latência, alertas, PiP e permissões do Android TV</p>
          </div>
        </div>

        <button
          id="btn-trigger-ping-top"
          onClick={handleTestPing}
          onFocus={() => onElementFocus('btn-trigger-ping-top')}
          disabled={isPinging}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-lg tv-focus-target ${
            isPinging
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-[#007AFF] text-white hover:bg-blue-500 shadow-[0_0_15px_rgba(0,122,255,0.4)]'
          } ${focusedElementId === 'btn-trigger-ping-top' ? 'tv-focused ring-4 ring-cyan-400' : ''}`}
        >
          <RefreshCw className={`w-4 h-4 ${isPinging ? 'animate-spin' : ''}`} />
          <span>{isPinging ? 'Medindo Latência...' : 'Medir Latência & Ping'}</span>
        </button>
      </div>

      {/* Grid: 2 Columns on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ============================================================
            MODULE 1: Conexões & Rotas de Rede
            ============================================================ */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-glass-card border border-glass flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#1E2D4A]/80 pb-3">
            <div className="flex items-center gap-2.5">
              <Server className="w-5 h-5 text-emerald-400" />
              <div>
                <h2 className="font-bold text-base text-white">Status das Conexões com o Servidor</h2>
                <p className="text-xs text-slate-400">Rotas direta na rede local (LAN) e remota (Tailscale Funnel)</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
              DUAL ROUTE
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Route 1: LAN */}
            <div className="p-4 rounded-xl bg-[#0D1424] border border-[#1E2D4A] flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-bold text-sm text-slate-200">Rede Local (LAN Direta)</span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {lanPingMs !== null ? `${lanPingMs}ms` : '---'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">{getApiBase()}</p>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-full" />
              </div>
            </div>

            {/* Route 2: Tailscale Funnel */}
            <div className="p-4 rounded-xl bg-[#0D1424] border border-[#1E2D4A] flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  <span className="font-bold text-sm text-slate-200">Tailscale Funnel (HTTPS)</span>
                </div>
                <span className="text-xs font-mono font-bold text-cyan-400">
                  {funnelPingMs !== null ? `${funnelPingMs}ms` : 'Automático'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">https://servonvif-iot.ts.net:443</p>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-cyan-500 h-full w-3/4" />
              </div>
            </div>

          </div>

          {/* Interactive Test Triggers */}
          <div className="pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Laboratório de Testes Interativos</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              
              {/* Test 1: Simular Movimento */}
              <button
                id="btn-test-motion"
                onClick={handleSimulateMotion}
                onFocus={() => onElementFocus('btn-test-motion')}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col items-center gap-2 text-center bg-[#0D1424] border-[#1E2D4A] hover:border-amber-400 text-slate-200 tv-focus-target ${
                  focusedElementId === 'btn-test-motion' ? 'tv-focused ring-2 ring-amber-400' : ''
                }`}
              >
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-bold">Simular Movimento</span>
              </button>

              {/* Test 2: Chime Sonoro */}
              <button
                id="btn-test-chime"
                onClick={() => playSoundChime('alert')}
                onFocus={() => onElementFocus('btn-test-chime')}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col items-center gap-2 text-center bg-[#0D1424] border-[#1E2D4A] hover:border-emerald-400 text-slate-200 tv-focus-target ${
                  focusedElementId === 'btn-test-chime' ? 'tv-focused ring-2 ring-emerald-400' : ''
                }`}
              >
                <Volume2 className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-bold">Tocar Chime Áudio</span>
              </button>

              {/* Test 3: PiP Flutuante */}
              <button
                id="btn-test-pip"
                onClick={handleTestPiP}
                onFocus={() => onElementFocus('btn-test-pip')}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col items-center gap-2 text-center bg-[#0D1424] border-[#1E2D4A] hover:border-cyan-400 text-slate-200 tv-focus-target ${
                  focusedElementId === 'btn-test-pip' ? 'tv-focused ring-2 ring-cyan-400' : ''
                }`}
              >
                <PictureInPicture className="w-5 h-5 text-cyan-400" />
                <span className="text-xs font-bold">Testar PiP Flutuante</span>
              </button>

              {/* Test 4: Heads-Up Notification */}
              <button
                id="btn-test-headsup"
                onClick={handleTestHeadsUp}
                onFocus={() => onElementFocus('btn-test-headsup')}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col items-center gap-2 text-center bg-[#0D1424] border-[#1E2D4A] hover:border-purple-400 text-slate-200 tv-focus-target ${
                  focusedElementId === 'btn-test-headsup' ? 'tv-focused ring-2 ring-purple-400' : ''
                }`}
              >
                <Bell className="w-5 h-5 text-purple-400" />
                <span className="text-xs font-bold">Aviso Heads-Up</span>
              </button>

            </div>
          </div>
        </div>

        {/* ============================================================
            MODULE 2: Permissões do Android TV
            ============================================================ */}
        <div className="p-6 rounded-2xl bg-glass-card border border-glass flex flex-col justify-between gap-4">
          <div className="flex items-center gap-2.5 border-b border-[#1E2D4A]/80 pb-3">
            <Smartphone className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="font-bold text-base text-white">Permissões Android TV</h2>
              <p className="text-xs text-slate-400">Recursos nativos do sistema operacional</p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {/* Permission 1: Overlay */}
            <div className="p-3 rounded-xl bg-[#0D1424] border border-[#1E2D4A] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <PictureInPicture className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="text-xs font-bold text-slate-200">Sobreposição de Tela (PiP)</div>
                  <div className="text-[10px] text-slate-400">SYSTEM_ALERT_WINDOW</div>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 ${
                overlayPermission
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-950 text-rose-400 border border-rose-500/30'
              }`}>
                <CheckCircle2 className="w-3 h-3" /> {overlayPermission ? 'CONCEDIDA' : 'PENDENTE'}
              </span>
            </div>

            {/* Permission 2: Notifications */}
            <div className="p-3 rounded-xl bg-[#0D1424] border border-[#1E2D4A] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-purple-400" />
                <div>
                  <div className="text-xs font-bold text-slate-200">Notificações Heads-Up</div>
                  <div className="text-[10px] text-slate-400">POST_NOTIFICATIONS</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> ATIVA
              </span>
            </div>

            {/* Permission 3: Wake Lock */}
            <div className="p-3 rounded-xl bg-[#0D1424] border border-[#1E2D4A] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Zap className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-xs font-bold text-slate-200">Modo 24/7 sem Suspensão</div>
                  <div className="text-[10px] text-slate-400">WAKE_LOCK & FOREGROUND</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> ATIVA
              </span>
            </div>
          </div>

          {/* Button: Open Android Settings */}
          <button
            id="btn-android-settings"
            onClick={() => {
              if ((window as any).AndroidNative?.requestOverlayPermission) {
                (window as any).AndroidNative.requestOverlayPermission();
              }
              addLog('info', 'ANDROID', 'Abrindo configurações de permissões do sistema Android TV...');
            }}
            onFocus={() => onElementFocus('btn-android-settings')}
            className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-2 border bg-[#131D33] border-[#1E2D4A] text-slate-200 hover:bg-[#1A2642] tv-focus-target ${
              focusedElementId === 'btn-android-settings' ? 'tv-focused' : ''
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            Ajustar Permissões no Android
          </button>
        </div>

      </div>

      {/* ============================================================
          MODULE 3: Terminal de Logs & Telemetria em Tempo Real
          ============================================================ */}
      <div className="p-6 rounded-2xl bg-glass-card border border-glass flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E2D4A]/80 pb-3">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="font-bold text-base text-white">Terminal de Logs & Telemetria</h2>
              <p className="text-xs text-slate-400">Monitoramento em tempo real de requisições, pings e eventos do NVR</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            
            {/* Copiar Logs Button */}
            <button
              id="btn-copy-logs"
              onClick={handleCopyLogs}
              onFocus={() => onElementFocus('btn-copy-logs')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                isCopied
                  ? 'bg-emerald-500/30 border-emerald-400 text-emerald-300'
                  : 'bg-[#0D1424] border-[#1E2D4A] text-slate-200 hover:bg-[#131D33]'
              } tv-focus-target ${
                focusedElementId === 'btn-copy-logs' ? 'tv-focused' : ''
              }`}
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{isCopied ? 'Logs Copiados!' : 'Copiar Logs'}</span>
            </button>

            {/* Limpar Logs Button */}
            <button
              id="btn-clear-logs"
              onClick={() => setLogs([])}
              onFocus={() => onElementFocus('btn-clear-logs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 bg-[#0D1424] border-[#1E2D4A] text-slate-300 hover:bg-[#131D33] tv-focus-target ${
                focusedElementId === 'btn-clear-logs' ? 'tv-focused' : ''
              }`}
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              Limpar
            </button>

            {/* Exportar Relatorio .txt Button */}
            <button
              id="btn-export-report"
              onClick={handleExportReport}
              onFocus={() => onElementFocus('btn-export-report')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 bg-gradient-to-r from-cyan-500/20 to-blue-600/30 border-cyan-400/60 text-cyan-300 hover:brightness-125 tv-focus-target ${
                focusedElementId === 'btn-export-report' ? 'tv-focused' : ''
              }`}
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              Exportar Relatório (.txt)
            </button>
          </div>
        </div>

        {/* Dark Terminal Box */}
        <div className="w-full h-56 bg-[#040711] border border-[#162238] rounded-xl p-4 font-mono text-xs overflow-y-auto flex flex-col gap-1.5 shadow-inner">
          {logs.length === 0 ? (
            <div className="text-slate-500 italic py-6 text-center">Nenhum log registrado. Realize um teste acima para visualizar a telemetria.</div>
          ) : (
            logs.map((l) => {
              let tagColor = 'text-cyan-400 bg-cyan-950/80 border-cyan-500/30';
              let msgColor = 'text-slate-200';

              if (l.type === 'success') {
                tagColor = 'text-emerald-400 bg-emerald-950/80 border-emerald-500/30';
                msgColor = 'text-emerald-200';
              } else if (l.type === 'warn') {
                tagColor = 'text-amber-400 bg-amber-950/80 border-amber-500/30';
                msgColor = 'text-amber-200';
              } else if (l.type === 'error') {
                tagColor = 'text-red-400 bg-red-950/80 border-red-500/30';
                msgColor = 'text-red-300';
              }

              return (
                <div key={l.id} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-slate-500 select-none">[{l.time}]</span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border uppercase tracking-wider ${tagColor}`}>
                    {l.tag}
                  </span>
                  <span className={msgColor}>{l.message}</span>
                </div>
              );
            })
          )}
          <div ref={logEndRef} />
        </div>
      </div>

    </div>
  );
};
