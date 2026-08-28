import React, { useState } from 'react';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Wifi, 
  Server, 
  Zap, 
  ShieldCheck, 
  RotateCw, 
  Terminal, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle 
} from 'lucide-react';
import { SystemHealth } from '../types';

interface SystemHealthTabProps {
  health: SystemHealth;
  onRefreshHealth: () => void;
  onClearCache: () => void;
  focusedElementId: string | null;
  onElementFocus: (id: string) => void;
}

export const SystemHealthTab: React.FC<SystemHealthTabProps> = ({
  health,
  onRefreshHealth,
  onClearCache,
  focusedElementId,
  onElementFocus,
}) => {
  const [testingPing, setTestingPing] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [cacheCleanedNotice, setCacheCleanedNotice] = useState(false);

  const handleTestConnection = () => {
    setTestingPing(true);
    setTimeout(() => {
      setTestingPing(false);
      onRefreshHealth();
    }, 1200);
  };

  const handleClear = () => {
    onClearCache();
    setCacheCleanedNotice(true);
    setTimeout(() => setCacheCleanedNotice(false), 3000);
  };

  const usedDiskGb = health.diskTotalGb - health.diskFreeGb;
  const diskPercentage = Math.round((usedDiskGb / health.diskTotalGb) * 100);

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-80px)] p-6 md:p-10 gap-8 select-none pb-24">
      
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-glass-card p-4 rounded-2xl border border-glass">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,210,255,0.3)]">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Status & Telemetria do Sistema</h1>
            <p className="text-xs text-slate-400">Diagnóstico em tempo real do Servidor Core Mac NVR e Rota de Rede</p>
          </div>
        </div>

        {/* Global Status Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34D399]" />
          SISTEMA OPERACIONAL SAUDÁVEL
        </div>
      </div>

      {/* Main 3 Diagnostic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* ============================================================
            CARD 1: Saúde do Servidor Core (Mac NVR)
            ============================================================ */}
        <div className="p-6 rounded-2xl bg-glass-card border border-glass flex flex-col justify-between gap-5">
          <div className="flex items-center justify-between border-b border-[#1E2D4A]/80 pb-3">
            <div className="flex items-center gap-2.5">
              <Server className="w-5 h-5 text-cyan-400" />
              <h2 className="font-bold text-base text-white">Servidor Core (Mac NVR)</h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
              Apple Silicon M2
            </span>
          </div>

          {/* CPU Metric */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                Uso de CPU Servidor:
              </span>
              <span className="font-mono font-bold text-cyan-400">{health.cpuUsage}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-[#1E2D4A]">
              <div
                style={{ width: `${health.cpuUsage}%` }}
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
              />
            </div>
          </div>

          {/* RAM Metric */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-300">Memória RAM Unificada:</span>
              <span className="font-mono font-bold text-cyan-400">{health.ramUsage}% (6.7 / 16 GB)</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-[#1E2D4A]">
              <div
                style={{ width: `${health.ramUsage}%` }}
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
              />
            </div>
          </div>

          {/* Uptime & Caffeinate */}
          <div className="p-3.5 rounded-xl bg-[#0D1424] border border-[#1E2D4A] flex flex-col gap-2 text-xs">
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Uptime Servidor:
              </span>
              <span className="font-mono text-white font-bold">{health.uptime}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Daemon Caffeinate:
              </span>
              <span className="font-mono text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                24/7 Ativo
              </span>
            </div>
          </div>
        </div>


        {/* ============================================================
            CARD 2: Diagnóstico de Rede & Conexão
            ============================================================ */}
        <div className="p-6 rounded-2xl bg-glass-card border border-glass flex flex-col justify-between gap-5">
          <div className="flex items-center justify-between border-b border-[#1E2D4A]/80 pb-3">
            <div className="flex items-center gap-2.5">
              <Wifi className="w-5 h-5 text-emerald-400" />
              <h2 className="font-bold text-base text-white">Rede & Roteamento</h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
              LAN Gigabit
            </span>
          </div>

          {/* Active Route */}
          <div className="p-3.5 rounded-xl bg-[#0D1424] border border-[#1E2D4A] flex flex-col gap-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Rota Ativa:</span>
              <span className="font-bold font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                🟢 LAN Wi-Fi Local Direta
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Túnel Fallback:</span>
              <span className="font-mono text-cyan-300">🔵 Tailscale Funnel Pronto</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Latência RTT:</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {testingPing ? 'Testando...' : `${health.latencyMs} ms`}
              </span>
            </div>
          </div>

          {/* IP Addresses */}
          <div className="flex flex-col gap-2 text-xs">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">IP Servidor NVR:</span>
              <span className="font-mono text-slate-100">{health.serverIp}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">IP Smart TV:</span>
              <span className="font-mono text-slate-100">{health.clientIp}</span>
            </div>
          </div>
        </div>


        {/* ============================================================
            CARD 3: Armazenamento & Retenção
            ============================================================ */}
        <div className="p-6 rounded-2xl bg-glass-card border border-glass flex flex-col justify-between gap-5">
          <div className="flex items-center justify-between border-b border-[#1E2D4A]/80 pb-3">
            <div className="flex items-center gap-2.5">
              <HardDrive className="w-5 h-5 text-amber-400" />
              <h2 className="font-bold text-base text-white">Armazenamento & Retenção</h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/30">
              SSD NVMe
            </span>
          </div>

          {/* Disk Meter */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-300">Espaço Livre em Disco:</span>
              <span className="font-mono font-bold text-emerald-400">{health.diskFreeGb} GB Livres</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden border border-[#1E2D4A]">
              <div
                style={{ width: `${diskPercentage}%` }}
                className="h-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-amber-500 rounded-full"
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>{usedDiskGb.toFixed(1)} GB Usados</span>
              <span>{health.diskTotalGb} GB Total</span>
            </div>
          </div>

          {/* Retention Stats */}
          <div className="p-3.5 rounded-xl bg-[#0D1424] border border-[#1E2D4A] flex flex-col gap-2 text-xs">
            <div className="flex justify-between items-center text-slate-300">
              <span>Retenção Automática:</span>
              <span className="font-mono font-bold text-cyan-400">{health.retentionDays} Dias de Vídeo</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Câmeras Gravando:</span>
              <span className="font-mono text-emerald-400 font-bold">{health.activeStreams} Canais H.264/H.265</span>
            </div>
          </div>
        </div>

      </div>


      {/* Diagnostic Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
        
        {/* Button: Testar Conexão */}
        <button
          id="health-btn-test"
          onClick={handleTestConnection}
          onFocus={() => onElementFocus('health-btn-test')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-[#0D1424] text-slate-100 border border-cyan-500/40 hover:bg-[#131D33] shadow-[0_0_15px_rgba(0,210,255,0.2)] transition-all cursor-pointer tv-focus-target ${
            focusedElementId === 'health-btn-test' ? 'tv-focused' : ''
          }`}
        >
          <RotateCw className={`w-4 h-4 text-cyan-400 ${testingPing ? 'animate-spin' : ''}`} />
          <span>Testar Conexão de Rede Agora</span>
        </button>

        {/* Button: Exibir Logs */}
        <button
          id="health-btn-logs"
          onClick={() => setShowLogsModal(true)}
          onFocus={() => onElementFocus('health-btn-logs')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-[#0D1424] text-slate-100 border border-[#1E2D4A] hover:bg-[#131D33] transition-all cursor-pointer tv-focus-target ${
            focusedElementId === 'health-btn-logs' ? 'tv-focused' : ''
          }`}
        >
          <Terminal className="w-4 h-4 text-slate-400" />
          <span>Exibir Logs de Erros e Diagnóstico ({health.logs.length})</span>
        </button>

        {/* Button: Limpar Cache */}
        <button
          id="health-btn-clean"
          onClick={handleClear}
          onFocus={() => onElementFocus('health-btn-clean')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-[#0D1424] text-slate-300 border border-[#1E2D4A] hover:bg-[#131D33] transition-all cursor-pointer tv-focus-target ${
            focusedElementId === 'health-btn-clean' ? 'tv-focused' : ''
          }`}
        >
          <Trash2 className="w-4 h-4 text-rose-400" />
          <span>Limpar Cache de Vídeo</span>
        </button>

      </div>

      {/* Clean Cache Notice */}
      {cacheCleanedNotice && (
        <div className="mx-auto px-6 py-2 rounded-xl bg-emerald-950/90 border border-emerald-400 text-emerald-300 text-xs font-bold animate-pulse">
          Cache local de stream da Smart TV liberado com sucesso!
        </div>
      )}

      {/* Logs Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-2xl p-6 rounded-2xl bg-[#0D1424] border border-[#1E2D4A] shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#1E2D4A] pb-3">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Terminal className="w-5 h-5 text-cyan-400" />
                Logs de Telemetria e Diagnóstico ServONVIF
              </h3>
              <button
                onClick={() => setShowLogsModal(false)}
                className="px-3 py-1 rounded-lg text-xs font-bold bg-[#131D33] text-slate-300 hover:text-white"
              >
                Fechar
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto font-mono text-xs p-3 bg-black/60 rounded-xl border border-white/5">
              {health.logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2.5 p-1.5 rounded hover:bg-white/5">
                  <span className="text-slate-500 font-bold">{log.time}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    log.level === 'success' ? 'bg-emerald-950 text-emerald-300' :
                    log.level === 'warn' ? 'bg-amber-950 text-amber-300' :
                    log.level === 'error' ? 'bg-rose-950 text-rose-300' :
                    'bg-cyan-950 text-cyan-300'
                  }`}>
                    {log.module}
                  </span>
                  <span className="text-slate-300 flex-1">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
