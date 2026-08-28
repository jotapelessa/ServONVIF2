import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  Grid, 
  Car, 
  History, 
  Activity, 
  Settings, 
  Wifi, 
  ShieldCheck, 
  Tv, 
  Radio, 
  Code2,
  Maximize2,
  FlaskConical
} from 'lucide-react';
import { TabType, SystemHealth } from '../types';

interface TopAppBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  systemHealth: SystemHealth;
  onToggleRemote: () => void;
  onToggleAndroidCode: () => void;
  focusedElementId: string | null;
  onElementFocus: (id: string) => void;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  activeTab,
  onTabChange,
  systemHealth,
  onToggleRemote,
  onToggleAndroidCode,
  focusedElementId,
  onElementFocus,
}) => {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      
      const day = now.getDate();
      const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      const month = months[now.getMonth()];
      setDateStr(`${day} de ${month}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const tabs: { id: TabType; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { id: 'home', label: 'Início', icon: <Tv className="w-4 h-4" />, shortcut: '1' },
    { id: 'mosaic', label: 'Mosaico Multitelas', icon: <Grid className="w-4 h-4" />, shortcut: '2' },
    { id: 'lpr', label: 'Central LPR', icon: <Car className="w-4 h-4" />, shortcut: '3' },
    { id: 'recordings', label: 'Gravações', icon: <History className="w-4 h-4" />, shortcut: '4' },
    { id: 'testlab', label: 'Central de Testes', icon: <FlaskConical className="w-4 h-4 text-cyan-400" />, shortcut: '5' },
    { id: 'health', label: 'Status & Diagnóstico', icon: <Activity className="w-4 h-4" />, shortcut: '6' },
    { id: 'settings', label: 'Configurações', icon: <Settings className="w-4 h-4" />, shortcut: '7' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#070B14]/80 backdrop-blur-2xl border-b border-[#1E2D4A]/50 px-8 py-3.5 transition-colors">
      <div className="max-w-[1920px] mx-auto flex items-center justify-between gap-4">
        
        {/* Logo & Identity */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#00D2FF]/20 to-[#007AFF]/30 border border-[#00D2FF]/40 text-[#00D2FF] shadow-[0_0_15px_rgba(0,210,255,0.25)]">
            <Radio className="w-5 h-5 animate-pulse text-[#00D2FF]" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#00D2FF] shadow-[0_0_8px_#00D2FF]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black tracking-wider text-xl bg-gradient-to-r from-white via-slate-100 to-[#00D2FF] bg-clip-text text-transparent">
                ServONVIF
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest bg-[#007AFF] text-white rounded font-mono shadow-[0_0_10px_rgba(0,122,255,0.4)]">
                TV PRO
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-400 tracking-wider">
              v002.002.146 • 10-Foot Leanback UI
            </p>
          </div>
        </div>

        {/* Navigation Tabs (Frosted Glass Pill Tabs with D-pad Focus) */}
        <nav className="flex items-center gap-1 bg-[#131D33]/60 backdrop-blur-xl p-1 rounded-full border border-[#1E2D4A] shadow-2xl">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const elementId = `tab-${tab.id}`;
            const isFocused = focusedElementId === elementId;

            return (
              <button
                key={tab.id}
                id={elementId}
                onClick={() => onTabChange(tab.id)}
                onFocus={() => onElementFocus(elementId)}
                className={`group relative flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer select-none whitespace-nowrap tv-focus-target ${
                  isActive
                    ? 'bg-[#007AFF] text-white shadow-[0_0_15px_rgba(0,122,255,0.35)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                } ${isFocused ? 'tv-focused' : ''}`}
              >
                <span className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#ffffff]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Section: Android Export, Remote, Network Status & Clock */}
        <div className="flex items-center gap-3">
          
          {/* Android Code Exporter Button */}
          <button
            id="btn-android-export"
            onClick={onToggleAndroidCode}
            onFocus={() => onElementFocus('btn-android-export')}
            title="Exportar Código Android TV / Jetpack Compose"
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-emerald-950/40 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900/60 transition-all cursor-pointer tv-focus-target backdrop-blur-xl ${
              focusedElementId === 'btn-android-export' ? 'tv-focused' : ''
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Código Android TV</span>
          </button>

          {/* Virtual TV Remote Button */}
          <button
            id="btn-virtual-remote"
            onClick={onToggleRemote}
            onFocus={() => onElementFocus('btn-virtual-remote')}
            title="Simulador de Controle Remoto D-pad da Smart TV"
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-[#131D33]/80 text-[#00D2FF] border border-[#00D2FF]/40 hover:bg-[#1B2947] transition-all cursor-pointer tv-focus-target backdrop-blur-xl ${
              focusedElementId === 'btn-virtual-remote' ? 'tv-focused' : ''
            }`}
          >
            <Tv className="w-3.5 h-3.5 text-[#00D2FF]" />
            <span className="hidden xl:inline">Controle D-pad</span>
          </button>

          {/* Dynamic Connection Status Badge */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#131D33]/60 backdrop-blur-xl border border-[#1E2D4A] text-xs font-mono">
            {systemHealth.networkRoute === 'lan' && (
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-semibold text-slate-200">LAN Wi-Fi</span>
                <span className="text-emerald-400 font-bold">• {systemHealth.latencyMs}ms</span>
              </div>
            )}

            {systemHealth.networkRoute === 'tailscale' && (
              <div className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#00D2FF]" />
                <span className="font-semibold text-slate-200">Tailscale Funnel</span>
                <span className="text-cyan-400 font-bold">• 24ms</span>
              </div>
            )}

            {systemHealth.networkRoute === 'disconnected' && (
              <div className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span className="font-semibold text-rose-400">Servidor Desconectado</span>
              </div>
            )}
          </div>

          {/* Clock and Calendar */}
          <div className="text-right pl-3 border-l border-[#1E2D4A]/60">
            <div className="text-sm font-bold text-slate-100 font-mono tracking-tight">
              {timeStr || '14:35:00'}
            </div>
            <div className="text-[10px] font-medium text-slate-400">
              {dateStr || '28 de Agosto'}
            </div>
          </div>
        </div>

      </div>
    </header>
  );
};
