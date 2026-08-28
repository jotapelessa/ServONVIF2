import React, { useState } from 'react';
import { 
  Settings, 
  Tv, 
  Sliders, 
  Volume2, 
  PictureInPicture, 
  Wifi, 
  LogOut, 
  Check, 
  Sparkles, 
  Eye, 
  Zap, 
  HardDrive 
} from 'lucide-react';
import { TVSettings } from '../types';

interface SettingsTabProps {
  settings: TVSettings;
  onUpdateSettings: (newSettings: Partial<TVSettings>) => void;
  focusedElementId: string | null;
  onElementFocus: (id: string) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  onUpdateSettings,
  focusedElementId,
  onElementFocus,
}) => {
  const [disconnectModalOpen, setDisconnectModalOpen] = useState(false);

  const qualities: { id: TVSettings['streamQuality']; label: string; desc: string }[] = [
    { id: 'auto', label: 'Auto Dinâmico', desc: 'Ajuste automático baseado na largura de banda da TV' },
    { id: '5mp', label: '5MP / 4K Ultra HD', desc: 'Máxima nitidez e detalhes para telas 4K grandes' },
    { id: '1080p', label: '1080p Full HD', desc: 'Equilíbrio ideal entre fluidez (60fps) e resolução' },
    { id: '720p', label: '720p Econômico', desc: 'Baixa latência para conexões remotas via Tailscale' },
  ];

  const sensitivities: { id: TVSettings['dpadSensitivity']; label: string; desc: string }[] = [
    { id: 'normal', label: 'Normal (Padrão Android TV)', desc: 'Transições suaves com 200ms ease-out' },
    { id: 'fast', label: 'Rápido / Instantâneo', desc: 'Troca imediata de foco sem atraso' },
    { id: 'cinematic', label: 'Cinematográfico (Estilo Apple TV)', desc: 'Deslocamento elástico com inércia' },
  ];

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-80px)] p-6 md:p-10 gap-8 select-none pb-24 max-w-5xl mx-auto">
      
      {/* Top Header */}
      <div className="flex items-center gap-3 bg-glass-card p-4 rounded-2xl border border-glass">
        <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,210,255,0.3)]">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-100">Preferências & Ajustes da Smart TV</h1>
          <p className="text-xs text-slate-400">Configuração de decodificação de vídeo por hardware, controle remoto e PiP</p>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="flex flex-col gap-6">
        
        {/* 1. Qualidade de Transmissão */}
        <section className="p-6 rounded-2xl bg-glass-card border border-glass flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h2 className="font-bold text-base text-white">Qualidade e Resolução de Transmissão RTSP</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {qualities.map((q) => {
              const isSelected = settings.streamQuality === q.id;
              const elementId = `setting-quality-${q.id}`;
              const isFocused = focusedElementId === elementId;

              return (
                <button
                  key={q.id}
                  id={elementId}
                  onClick={() => onUpdateSettings({ streamQuality: q.id })}
                  onFocus={() => onElementFocus(elementId)}
                  className={`p-4 rounded-xl text-left transition-all cursor-pointer tv-focus-target flex flex-col justify-between gap-1 border ${
                    isSelected
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/20 border-cyan-400 text-cyan-300 shadow-[0_0_14px_rgba(0,210,255,0.25)]'
                      : 'bg-[#0D1424] border-[#1E2D4A] text-slate-300 hover:bg-[#131D33]'
                  } ${isFocused ? 'tv-focused' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{q.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                  </div>
                  <span className="text-xs text-slate-400">{q.desc}</span>
                </button>
              );
            })}
          </div>
        </section>


        {/* 2. Sensibilidade do D-pad e Controle Remoto */}
        <section className="p-6 rounded-2xl bg-glass-card border border-glass flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Tv className="w-4 h-4 text-cyan-400" />
            <h2 className="font-bold text-base text-white">Comportamento de Foco e D-pad da TV</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {sensitivities.map((s) => {
              const isSelected = settings.dpadSensitivity === s.id;
              const elementId = `setting-sens-${s.id}`;
              const isFocused = focusedElementId === elementId;

              return (
                <button
                  key={s.id}
                  id={elementId}
                  onClick={() => onUpdateSettings({ dpadSensitivity: s.id })}
                  onFocus={() => onElementFocus(elementId)}
                  className={`p-4 rounded-xl text-left transition-all cursor-pointer tv-focus-target flex flex-col justify-between gap-1 border ${
                    isSelected
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/20 border-cyan-400 text-cyan-300 shadow-[0_0_14px_rgba(0,210,255,0.25)]'
                      : 'bg-[#0D1424] border-[#1E2D4A] text-slate-300 hover:bg-[#131D33]'
                  } ${isFocused ? 'tv-focused' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">{s.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                  </div>
                  <span className="text-[11px] text-slate-400">{s.desc}</span>
                </button>
              );
            })}
          </div>
        </section>


        {/* 3. Toggles de Sistema */}
        <section className="p-6 rounded-2xl bg-glass-card border border-glass flex flex-col gap-4">
          <h2 className="font-bold text-base text-white">Recursos e Alertas</h2>

          <div className="flex flex-col gap-3">
            
            {/* PiP Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-[#0D1424] border border-[#1E2D4A]">
              <div className="flex items-center gap-3">
                <PictureInPicture className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="font-bold text-sm text-slate-200">Modo Picture-in-Picture (PiP Android TV)</h3>
                  <p className="text-xs text-slate-400">Exibe a câmera em janela flutuante sobre outros aplicativos</p>
                </div>
              </div>
              <button
                id="setting-toggle-pip"
                onClick={() => onUpdateSettings({ pipEnabled: !settings.pipEnabled })}
                onFocus={() => onElementFocus('setting-toggle-pip')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer tv-focus-target ${
                  settings.pipEnabled ? 'bg-purple-600' : 'bg-slate-700'
                } ${focusedElementId === 'setting-toggle-pip' ? 'tv-focused' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.pipEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Audio Alerts Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-[#0D1424] border border-[#1E2D4A]">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm text-slate-200">Alertas Sonoros de Movimento</h3>
                  <p className="text-xs text-slate-400">Emite aviso acústico suave na TV quando houver detecção humana ou de veículo</p>
                </div>
              </div>
              <button
                id="setting-toggle-audio"
                onClick={() => onUpdateSettings({ audioAlerts: !settings.audioAlerts })}
                onFocus={() => onElementFocus('setting-toggle-audio')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer tv-focus-target ${
                  settings.audioAlerts ? 'bg-emerald-600' : 'bg-slate-700'
                } ${focusedElementId === 'setting-toggle-audio' ? 'tv-focused' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.audioAlerts ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Scanlines Effect */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-[#0D1424] border border-[#1E2D4A]">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="font-bold text-sm text-slate-200">Filtro de Scanlines CRT / CFTV Analógico</h3>
                  <p className="text-xs text-slate-400">Aplica textura sutil de monitor de segurança nas transmissões de vídeo</p>
                </div>
              </div>
              <button
                id="setting-toggle-scanlines"
                onClick={() => onUpdateSettings({ showScanlines: !settings.showScanlines })}
                onFocus={() => onElementFocus('setting-toggle-scanlines')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer tv-focus-target ${
                  settings.showScanlines ? 'bg-cyan-600' : 'bg-slate-700'
                } ${focusedElementId === 'setting-toggle-scanlines' ? 'tv-focused' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.showScanlines ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

          </div>
        </section>


        {/* 4. Servidor & Conexão */}
        <section className="p-6 rounded-2xl bg-glass-card border border-glass flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Servidor NVR Conectado</span>
            <p className="font-bold text-white text-base font-mono">{settings.activeServer}</p>
          </div>

          <button
            id="setting-btn-disconnect"
            onClick={() => setDisconnectModalOpen(true)}
            onFocus={() => onElementFocus('setting-btn-disconnect')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-950/80 text-rose-300 border border-rose-500/40 hover:bg-rose-900 transition-all cursor-pointer tv-focus-target ${
              focusedElementId === 'setting-btn-disconnect' ? 'tv-focused' : ''
            }`}
          >
            <LogOut className="w-4 h-4" />
            <span>Desconectar / Trocar Servidor</span>
          </button>
        </section>

      </div>

      {/* Disconnect Modal */}
      {disconnectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#0D1424] border border-rose-500/50 shadow-2xl flex flex-col gap-4">
            <h3 className="font-bold text-lg text-white">Trocar Servidor ServONVIF?</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Você deseja buscar outro servidor ServONVIF Core NVR na sua rede local ou via Tailscale Funnel?
            </p>
            <div className="flex justify-end gap-3 pt-3 border-t border-[#1E2D4A]">
              <button
                onClick={() => setDisconnectModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setDisconnectModalOpen(false);
                  alert('Buscando servidores ServONVIF via mDNS e Tailscale...');
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-500"
              >
                Procurar Novo Servidor
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
