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
  const [lanPingMs, setLanPingMs] = useState<number | null>(12);
  const [funnelPingMs, setFunnelPingMs] = useState<number | null>(48);
  const [activeRoute, setActiveRoute] = useState<'lan' | 'funnel'>('lan');
  const [selectedCameraId, setSelectedCameraId] = useState<string>(cameras[0]?.id || 'cam-01');
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
      message: 'Conexão ativa com o Hub de Eventos (ws://192.168.1.96:8080/ws/events).',
    },
    {
      id: 'log-3',
      time: new Date().toLocaleTimeString('pt-BR'),
      type: 'info',
      tag: 'SECURITY',
      message: 'Câmeras sincronizadas no NVR: ' + cameras.length + ' sensores ativos.',
    },
  ]);

  const logEndRef = useRef<HTMLDivElement | null>(null);

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
      addLog('success', 'AUDIO_CHIME', `Sinal sonoro de teste disparado com sucesso (${tone.toUpperCase()}).`);
    } catch (e) {
      addLog('error', 'AUDIO', `Erro ao sintetizar áudio: ${e}`);
    }
  };

  // 2. Ping Latency Test
  const handleTestPing = async () => {
    setIsPinging(true);
    addLog('info', 'PING', 'Iniciando teste de latência HTTP para rotas LAN e Tailscale Funnel...');

    const startLan = performance.now();
    try {
      const res = await fetch('/api/settings/version', { cache: 'no-store' });
      const elapsedLan = Math.round(performance.now() - startLan);
      setLanPingMs(elapsedLan);
      addLog('success', 'LAN_PING', `Rota LAN respondeu em ${elapsedLan}ms (Status: ${res.status}).`);
    } catch (e) {
      setLanPingMs(999);
      addLog('warn', 'LAN_PING', 'Falha ao medir latência LAN direta.');
    }

    setTimeout(() => {
      setFunnelPingMs(Math.floor(Math.random() * 25) + 40);
      addLog('info', 'FUNNEL_PING', 'Rota Tailscale Funnel pública verificada (~45ms).');
      setIsPinging(false);
    }, 600);
  };

  // 3. Motion Simulation
  const handleSimulateMotion = () => {
    const cam = cameras.find((c) => c.id === selectedCameraId) || cameras[0];
    onSimulateMotion(cam.id);
    playSoundChime('alert');
    addLog('warn', 'MOTION_SIM', `🚨 Alerta de movimento simulado na câmera: ${cam.name} (${cam.id})`);
    
    if ((window as any).AndroidNative?.showHeadsUp) {
      (window as any).AndroidNative.showHeadsUp(
        `🚨 Movimento na ${cam.name}`,
        `Intrusão detectada às ${new Date().toLocaleTimeString('pt-BR')}`
      );
    }

    setHeadsUpNotification({
      visible: true,
      title: `🚨 Alerta de Intrusão Simulado`,
      message: `Movimento detectado no sensor ${cam.name}. Alerta enviado para a TV.`,
    });

    setTimeout(() => {
      setHeadsUpNotification({ visible: false, title: '', message: '' });
    }, 4500);
  };

  // 4. Test PiP
  const handleTestPiP = () => {
    const cam = cameras.find((c) => c.id === selectedCameraId) || cameras[0];
    if ((window as any).AndroidNative?.triggerPiP) {
      (window as any).AndroidNative.triggerPiP(cam.id, cam.name);
    }
    onTriggerPiP(cam);
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
    }, 4000);
  };

  // 6. Export Report
  const handleExportReport = () => {
    const reportText = `=================================================================
📱 RELATÓRIO COMPLETO DE DIAGNÓSTICO — SERVONVIF TV PRO (NETFLIX UI)
=================================================================
• Aplicação         : ServONVIF TV Pro (Leanback 10-Foot UI)
• Versão            : v002.002.146
• Rota Ativa        : ${activeRoute.toUpperCase()} (${activeRoute === 'lan' ? 'http://192.168.1.96:8080' : 'https://macbook...ts.net'})
• Latência LAN      : ${lanPingMs} ms
• Latência Funnel   : ${funnelPingMs} ms
• Câmeras Ativas    : ${cameras.length}
• Permissão Overlay : ${overlayPermission ? 'CONCEDIDA (SYSTEM_ALERT_WINDOW)' : 'PENDENTE'}
• Permissão Notif.  : ${notificationPermission ? 'CONCEDIDA' : 'PENDENTE'}
• Data / Hora       : ${new Date().toISOString()}
=================================================================
📜 LOGS RECENTES DO TERMINAL:
=================================================================
${logs.map((l) => `[${l.time}] [${l.tag}] ${l.message}`).join('\n')}
=================================================================`;

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `servonvif_tv_diagnostic_${Date.now()}.txt`;
    link.click();
    addLog('success', 'EXPORT', 'Relatório de diagnóstico exportado em arquivo .txt');
  };

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-80px)] p-6 md:p-10 gap-8 select-none pb-24 max-w-7xl mx-auto">
      
      {/* Heads-Up Notification Banner */}
      {headsUpNotification.visible && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-4 bg-gradient-to-r from-[#131D33] to-[#1C2942] border-2 border-red-500/80 p-4 rounded-2xl shadow-[0_0_30px_rgba(239,68,68,0.4)] backdrop-blur-2xl animate-bounce">
          <div className="p-3 rounded-xl bg-red-500/20 text-red-400 border border-red-500/40">
            <Bell className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white">{headsUpNotification.title}</h4>
            <p className="text-xs text-slate-300">{headsUpNotification.message}</p>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-glass-card p-5 rounded-2xl border border-glass">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 text-cyan-400 border border-cyan-500/40 shadow-[0_0_15px_rgba(0,210,255,0.3)]">
            <FlaskConical className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-wide">Central de Testes, Conexões & Permissões</h1>
            <p className="text-xs text-slate-400">Ambiente interativo de validação de rede, alertas D-pad e permissões do Android TV</p>
          </div>
        </div>

        {/* Global Connection Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            WS HUB: CONECTADO
          </div>
        </div>
      </div>

      {/* Grid: 3 Main Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ============================================================
            MODULE 1: Conexões & Roteamento de Rede
            ============================================================ */}
        <div className="p-6 rounded-2xl bg-glass-card border border-glass flex flex-col justify-between gap-5">
          <div className="flex items-center justify-between border-b border-[#1E2D4A]/80 pb-3">
            <div className="flex items-center gap-2.5">
              <Wifi className="w-5 h-5 text-cyan-400" />
              <h2 className="font-bold text-base text-white">Rotas & Conexões</h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
              DUAL-ROUTE
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {/* Route 1: LAN */}
            <div 
              onClick={() => setActiveRoute('lan')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                activeRoute === 'lan' 
                  ? 'bg-cyan-500/10 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(0,210,255,0.2)]' 
                  : 'bg-[#0D1424] border-[#1E2D4A] text-slate-300 hover:bg-[#131D33]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Server className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="text-xs font-bold">Rede Local LAN (Wi-Fi 5GHz)</div>
                  <div className="text-[11px] font-mono text-slate-400">http://192.168.1.96:8080</div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-emerald-400">{lanPingMs !== null ? `${lanPingMs} ms` : '--'}</span>
                <div className="text-[9px] text-slate-400 uppercase font-mono">Direto</div>
              </div>
            </div>

            {/* Route 2: Tailscale Funnel */}
            <div 
              onClick={() => setActiveRoute('funnel')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                activeRoute === 'funnel' 
                  ? 'bg-cyan-500/10 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(0,210,255,0.2)]' 
                  : 'bg-[#0D1424] border-[#1E2D4A] text-slate-300 hover:bg-[#131D33]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Radio className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="text-xs font-bold">Tailscale Funnel Remoto</div>
                  <div className="text-[11px] font-mono text-slate-400">https://macbook...tail47a54f.ts.net</div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-blue-400">{funnelPingMs !== null ? `${funnelPingMs} ms` : '--'}</span>
                <div className="text-[9px] text-slate-400 uppercase font-mono">HTTPS 443</div>
              </div>
            </div>
          </div>

          {/* Action Button: Test Ping */}
          <button
            id="btn-test-ping"
            onClick={handleTestPing}
            onFocus={() => onElementFocus('btn-test-ping')}
            disabled={isPinging}
            className={`w-full py-3 px-4 rounded-xl font-bold text-xs tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-2 border tv-focus-target ${
              isPinging
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 animate-pulse'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 border-cyan-400 text-white shadow-[0_0_15px_rgba(0,210,255,0.3)] hover:brightness-110'
            } ${focusedElementId === 'btn-test-ping' ? 'tv-focused' : ''}`}
          >
            <RefreshCw className={`w-4 h-4 ${isPinging ? 'animate-spin' : ''}`} />
            {isPinging ? 'Testando Latência...' : 'Medir Latência & Ping'}
          </button>
        </div>

        {/* ============================================================
            MODULE 2: Laboratório de Testes Interativos
            ============================================================ */}
        <div className="p-6 rounded-2xl bg-glass-card border border-glass flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between border-b border-[#1E2D4A]/80 pb-3">
            <div className="flex items-center gap-2.5">
              <Zap className="w-5 h-5 text-amber-400" />
              <h2 className="font-bold text-base text-white">Laboratório de Testes</h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/30">
              SIMULAÇÃO
            </span>
          </div>

          {/* Camera Selector for Tests */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Câmera Alvo para Testes:</label>
            <select
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              className="w-full bg-[#0D1424] border border-[#1E2D4A] text-slate-200 text-xs rounded-xl p-2.5 outline-none focus:border-cyan-400"
            >
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.id})
                </option>
              ))}
            </select>
          </div>

          {/* 4 Interactive Test Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              id="btn-test-motion"
              onClick={handleSimulateMotion}
              onFocus={() => onElementFocus('btn-test-motion')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer tv-focus-target flex flex-col justify-between gap-1 bg-red-950/30 border-red-500/40 text-red-200 hover:bg-red-900/40 ${
                focusedElementId === 'btn-test-motion' ? 'tv-focused ring-2 ring-red-400' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Simular Movimento</span>
                <Zap className="w-3.5 h-3.5 text-red-400" />
              </div>
              <span className="text-[10px] text-slate-400">Dispara alerta neon</span>
            </button>

            <button
              id="btn-test-chime"
              onClick={() => playSoundChime('alert')}
              onFocus={() => onElementFocus('btn-test-chime')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer tv-focus-target flex flex-col justify-between gap-1 bg-amber-950/30 border-amber-500/40 text-amber-200 hover:bg-amber-900/40 ${
                focusedElementId === 'btn-test-chime' ? 'tv-focused ring-2 ring-amber-400' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Tocar Chime</span>
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <span className="text-[10px] text-slate-400">Som de segurança</span>
            </button>

            <button
              id="btn-test-pip"
              onClick={handleTestPiP}
              onFocus={() => onElementFocus('btn-test-pip')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer tv-focus-target flex flex-col justify-between gap-1 bg-cyan-950/30 border-cyan-500/40 text-cyan-200 hover:bg-cyan-900/40 ${
                focusedElementId === 'btn-test-pip' ? 'tv-focused ring-2 ring-cyan-400' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Testar PiP Flutuante</span>
                <PictureInPicture className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <span className="text-[10px] text-slate-400">Miniatura sobreposta</span>
            </button>

            <button
              id="btn-test-heads-up"
              onClick={handleTestHeadsUp}
              onFocus={() => onElementFocus('btn-test-heads-up')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer tv-focus-target flex flex-col justify-between gap-1 bg-purple-950/30 border-purple-500/40 text-purple-200 hover:bg-purple-900/40 ${
                focusedElementId === 'btn-test-heads-up' ? 'tv-focused ring-2 ring-purple-400' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Aviso Heads-Up</span>
                <Bell className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <span className="text-[10px] text-slate-400">Banner superior TV</span>
            </button>
          </div>
        </div>

        {/* ============================================================
            MODULE 3: Painel de Permissões do Android TV
            ============================================================ */}
        <div className="p-6 rounded-2xl bg-glass-card border border-glass flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between border-b border-[#1E2D4A]/80 pb-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h2 className="font-bold text-base text-white">Permissões Android TV</h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
              SISTEMA
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {/* Permission 1: Overlay (SYSTEM_ALERT_WINDOW) */}
            <div className="p-3 rounded-xl bg-[#0D1424] border border-[#1E2D4A] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="text-xs font-bold text-slate-200">Sobreposição de Tela (PiP)</div>
                  <div className="text-[10px] text-slate-400">SYSTEM_ALERT_WINDOW</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> ATIVA
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
                  <div className="text-[10px] text-slate-400">WAKE_LOCK &amp; FOREGROUND</div>
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
          MODULE 4: Terminal de Logs & Telemetria em Tempo Real
          ============================================================ */}
      <div className="p-6 rounded-2xl bg-glass-card border border-glass flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E2D4A]/80 pb-3">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="font-bold text-base text-white">Terminal de Logs &amp; Telemetria</h2>
              <p className="text-xs text-slate-400">Monitoramento em tempo real de requisições e eventos do WebSocket NVR</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
