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
  Clock,
  Move,
  Maximize2,
  Play,
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
  const [testPipFeedback, setTestPipFeedback] = useState(false);

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

  const pipSizes: { id: TVSettings['pipSize']; label: string; dims: string; desc: string }[] = [
    { id: 'micro', label: 'Micro', dims: '200x112 px', desc: 'Discreto e minimalista no canto' },
    { id: 'mini', label: 'Mini (Padrão)', dims: '260x146 px', desc: 'Tamanho recomendado para Android TV' },
    { id: 'compact', label: 'Compacto', dims: '320x180 px', desc: 'Equilíbrio ideal para visualização 16:9' },
    { id: 'medium', label: 'Médio', dims: '380x214 px', desc: 'Alta visibilidade para monitoramento contínuo' },
    { id: 'large', label: 'Grande', dims: '480x270 px', desc: 'Máximo detalhe em telas 4K' },
  ];

  const pipPositions: { id: TVSettings['pipPosition']; label: string; icon: string; desc: string }[] = [
    { id: 'top_right', label: 'Superior Direito', icon: '↗️', desc: 'Canto superior direito da tela (Padrão)' },
    { id: 'top_left', label: 'Superior Esquerdo', icon: '↖️', desc: 'Canto superior esquerdo da tela' },
    { id: 'bottom_right', label: 'Inferior Direito', icon: '↘️', desc: 'Canto inferior direito da tela' },
    { id: 'bottom_left', label: 'Inferior Esquerdo', icon: '↙️', desc: 'Canto inferior esquerdo da tela' },
    { id: 'center', label: 'Centro da Tela', icon: '⏺️', desc: 'Posição centralizada flutuante' },
  ];

  const pipDurations: { seconds: number; label: string; desc: string }[] = [
    { seconds: 5, label: '5 Segundos', desc: 'Alerta rápido' },
    { seconds: 10, label: '10 Segundos', desc: 'Padrão recomendado' },
    { seconds: 15, label: '15 Segundos', desc: 'Verificação detalhada' },
    { seconds: 30, label: '30 Segundos', desc: 'Tempo prolongado' },
    { seconds: 60, label: '60 Segundos', desc: 'Monitoramento contínuo' },
  ];

  const handleTestCurrentPip = () => {
    setTestPipFeedback(true);
    if ((window as any).AndroidNative?.triggerPiP) {
      (window as any).AndroidNative.triggerPiP('1', 'Câmera Teste PiP');
    }
    onUpdateSettings({ pipEnabled: true });
    setTimeout(() => setTestPipFeedback(false), 3000);
  };

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-80px)] p-4 sm:p-6 md:p-10 gap-6 select-none pb-28 max-w-5xl mx-auto">
      
      {/* Top Header */}
      <div className="flex items-center gap-3 bg-glass-card p-4 rounded-2xl border border-glass">
        <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,210,255,0.3)]">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-100">Central de Ajustes & Preferências</h1>
          <p className="text-xs text-slate-400">Personalização de PiP Flutuante, decodificação por hardware e navegação D-pad</p>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="flex flex-col gap-6">
        
        {/* ============================================================
            SECTION 1: PERSONALIZAÇÃO DA JANELA PIP (PICTURE-IN-PICTURE)
            ============================================================ */}
        <section className="p-6 rounded-2xl bg-glass-card border border-purple-500/30 flex flex-col gap-5 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
          
          <div className="flex items-center justify-between border-b border-[#1E2D4A]/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                <PictureInPicture className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-base text-white">Janela Flutuante PiP Preview (Android TV)</h2>
                <p className="text-xs text-slate-400">Ajuste o tamanho, posição na tela e tempo de exibição automática</p>
              </div>
            </div>

            <button
              id="btn-test-pip-preview"
              onClick={handleTestCurrentPip}
              onFocus={() => onElementFocus('btn-test-pip-preview')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                testPipFeedback
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]'
                  : 'bg-purple-600 text-white hover:bg-purple-500 border-purple-400/50 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
              } tv-focus-target ${
                focusedElementId === 'btn-test-pip-preview' ? 'tv-focused ring-4 ring-purple-400' : ''
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>{testPipFeedback ? 'Testando PiP na TV...' : 'Testar PiP Agora'}</span>
            </button>
          </div>

          {/* 1.1 Tamanho da Janela PiP */}
          <div className="flex flex-col gap-2.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-purple-400" />
              1. Tamanho da Janela PiP:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {pipSizes.map((size) => {
                const isSelected = (settings.pipSize || 'mini') === size.id;
                const elementId = `setting-pip-size-${size.id}`;
                const isFocused = focusedElementId === elementId;

                return (
                  <button
                    key={size.id}
                    id={elementId}
                    onClick={() => onUpdateSettings({ pipSize: size.id })}
                    onFocus={() => onElementFocus(elementId)}
                    className={`p-3 rounded-xl text-left transition-all cursor-pointer tv-focus-target flex flex-col justify-between gap-1 border ${
                      isSelected
                        ? 'bg-purple-500/20 border-purple-400 text-purple-300 shadow-[0_0_14px_rgba(168,85,247,0.3)]'
                        : 'bg-[#0D1424] border-[#1E2D4A] text-slate-300 hover:bg-[#131D33]'
                    } ${isFocused ? 'tv-focused ring-2 ring-purple-400' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{size.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-purple-400" />}
                    </div>
                    <span className="font-mono text-[10px] text-purple-300/80 font-semibold">{size.dims}</span>
                    <span className="text-[10px] text-slate-400 leading-tight">{size.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 1.2 Posição da Janela Flutuante */}
          <div className="flex flex-col gap-2.5 pt-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Move className="w-3.5 h-3.5 text-cyan-400" />
              2. Posição da Janela na Tela:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {pipPositions.map((pos) => {
                const isSelected = (settings.pipPosition || 'top_right') === pos.id;
                const elementId = `setting-pip-pos-${pos.id}`;
                const isFocused = focusedElementId === elementId;

                return (
                  <button
                    key={pos.id}
                    id={elementId}
                    onClick={() => onUpdateSettings({ pipPosition: pos.id })}
                    onFocus={() => onElementFocus(elementId)}
                    className={`p-3 rounded-xl text-left transition-all cursor-pointer tv-focus-target flex flex-col justify-between gap-1 border ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_14px_rgba(0,210,255,0.3)]'
                        : 'bg-[#0D1424] border-[#1E2D4A] text-slate-300 hover:bg-[#131D33]'
                    } ${isFocused ? 'tv-focused ring-2 ring-cyan-400' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs flex items-center gap-1">
                        <span>{pos.icon}</span>
                        <span>{pos.label}</span>
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </div>
                    <span className="text-[10px] text-slate-400 leading-tight">{pos.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 1.3 Duração do PiP Preview */}
          <div className="flex flex-col gap-2.5 pt-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              3. Duração da Janela Flutuante na Tela:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {pipDurations.map((dur) => {
                const isSelected = (settings.pipDurationSeconds || 10) === dur.seconds;
                const elementId = `setting-pip-dur-${dur.seconds}`;
                const isFocused = focusedElementId === elementId;

                return (
                  <button
                    key={dur.seconds}
                    id={elementId}
                    onClick={() => onUpdateSettings({ pipDurationSeconds: dur.seconds })}
                    onFocus={() => onElementFocus(elementId)}
                    className={`p-3 rounded-xl text-left transition-all cursor-pointer tv-focus-target flex flex-col justify-between gap-1 border ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.3)]'
                        : 'bg-[#0D1424] border-[#1E2D4A] text-slate-300 hover:bg-[#131D33]'
                    } ${isFocused ? 'tv-focused ring-2 ring-amber-400' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs font-mono">{dur.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                    <span className="text-[10px] text-slate-400 leading-tight">{dur.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </section>

        {/* ============================================================
            SECTION 2: QUALIDADE DE TRANSMISSÃO RTSP
            ============================================================ */}
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
                  } ${isFocused ? 'tv-focused ring-2 ring-cyan-400' : ''}`}
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

        {/* ============================================================
            SECTION 3: SENSIBILIDADE DO CONTROLE REMOTO & D-PAD
            ============================================================ */}
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
                  } ${isFocused ? 'tv-focused ring-2 ring-cyan-400' : ''}`}
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

        {/* ============================================================
            SECTION 4: RECURSOS E ALERTAS ACÚSTICOS
            ============================================================ */}
        <section className="p-6 rounded-2xl bg-glass-card border border-glass flex flex-col gap-4">
          <h2 className="font-bold text-base text-white">Recursos e Alertas</h2>

          <div className="flex flex-col gap-3">
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

        {/* ============================================================
            SECTION 5: SERVIDOR NVR CONECTADO
            ============================================================ */}
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
