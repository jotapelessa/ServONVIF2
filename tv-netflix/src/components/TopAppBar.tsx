import React, { useState, useEffect } from 'react';
import { 
  Grid, 
  Car, 
  History, 
  Activity, 
  Settings, 
  Radio, 
  FlaskConical,
  Tv
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
        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
      ];
      const month = months[now.getMonth()];
      setDateStr(`${day} ${month}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const tabs: { id: TabType; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { id: 'home', label: 'Início', icon: <Tv className="w-4 h-4" />, shortcut: '1' },
    { id: 'mosaic', label: 'Mosaico', icon: <Grid className="w-4 h-4" />, shortcut: '2' },
    { id: 'lpr', label: 'LPR Veicular', icon: <Car className="w-4 h-4" />, shortcut: '3' },
    { id: 'recordings', label: 'Gravações', icon: <History className="w-4 h-4" />, shortcut: '4' },
    { id: 'testlab', label: 'Testes & PiP', icon: <FlaskConical className="w-4 h-4 text-cyan-400" />, shortcut: '5' },
    { id: 'health', label: 'Diagnóstico', icon: <Activity className="w-4 h-4" />, shortcut: '6' },
    { id: 'settings', label: 'Ajustes', icon: <Settings className="w-4 h-4" />, shortcut: '7' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#070B14]/90 backdrop-blur-2xl border-b border-[#1E2D4A]/60 px-3 sm:px-6 md:px-8 py-2.5 sm:py-3 transition-colors">
      <div className="w-full max-w-[1920px] mx-auto flex flex-wrap items-center justify-between gap-2 sm:gap-4">
        
        {/* Logo & Identity (Responsive Compact) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-[#00D2FF]/20 to-[#007AFF]/30 border border-[#00D2FF]/40 text-[#00D2FF] shadow-[0_0_12px_rgba(0,210,255,0.25)]">
            <Radio className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse text-[#00D2FF]" />
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#00D2FF] shadow-[0_0_6px_#00D2FF]" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-black tracking-wider text-base sm:text-lg bg-gradient-to-r from-white via-slate-100 to-[#00D2FF] bg-clip-text text-transparent font-sans">
              ServONVIF
            </span>
            <span className="px-1.5 py-0.2 text-[9px] sm:text-[10px] font-black uppercase tracking-widest bg-[#007AFF] text-white rounded font-mono shadow-[0_0_8px_rgba(0,122,255,0.4)]">
              TV
            </span>
          </div>
        </div>

        {/* Navigation Tabs (Frosted Glass Pill Tabs with Adaptive Scaling & D-pad Focus) */}
        <nav className="flex items-center gap-0.5 sm:gap-1 bg-[#131D33]/80 backdrop-blur-xl p-1 rounded-full border border-[#1E2D4A] shadow-2xl overflow-x-auto max-w-full">
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
                className={`group relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer select-none whitespace-nowrap tv-focus-target ${
                  isActive
                    ? 'bg-[#007AFF] text-white shadow-[0_0_15px_rgba(0,122,255,0.4)] font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                } ${isFocused ? 'tv-focused' : ''}`}
              >
                <span className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}>
                  {tab.icon}
                </span>
                <span className="tracking-tight">{tab.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#ffffff] hidden sm:inline-block" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Section: Network Status & Clock */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto sm:ml-0">
          
          {/* Dynamic Connection Status Badge */}
          <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-[#131D33]/80 backdrop-blur-xl border border-[#1E2D4A] text-[10px] sm:text-xs font-mono">
            {systemHealth.networkRoute === 'lan' && (
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-semibold text-slate-200">LAN</span>
                <span className="text-emerald-400 font-bold hidden sm:inline">• {systemHealth.latencyMs || 4}ms</span>
              </div>
            )}

            {systemHealth.networkRoute === 'tailscale' && (
              <div className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#00D2FF]" />
                <span className="font-semibold text-slate-200">Tailscale</span>
                <span className="text-cyan-400 font-bold hidden sm:inline">• 24ms</span>
              </div>
            )}

            {systemHealth.networkRoute === 'disconnected' && (
              <div className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span className="font-semibold text-rose-400">Offline</span>
              </div>
            )}
          </div>

          {/* Clock and Calendar */}
          <div className="text-right pl-2 sm:pl-3 border-l border-[#1E2D4A]/60">
            <div className="text-xs sm:text-sm font-bold text-slate-100 font-mono tracking-tight">
              {timeStr || '12:00:00'}
            </div>
            <div className="text-[9px] sm:text-[10px] font-medium text-slate-400 hidden sm:block">
              {dateStr}
            </div>
          </div>
        </div>

      </div>
    </header>
  );
};
