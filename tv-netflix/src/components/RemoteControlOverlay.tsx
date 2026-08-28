import React from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  CornerDownLeft, 
  Home, 
  ArrowLeft, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  X, 
  Tv, 
  Power, 
  Maximize2 
} from 'lucide-react';

interface RemoteControlOverlayProps {
  onDpadUp: () => void;
  onDpadDown: () => void;
  onDpadLeft: () => void;
  onDpadRight: () => void;
  onDpadOk: () => void;
  onDpadBack: () => void;
  onDpadHome: () => void;
  onClose: () => void;
}

export const RemoteControlOverlay: React.FC<RemoteControlOverlayProps> = ({
  onDpadUp,
  onDpadDown,
  onDpadLeft,
  onDpadRight,
  onDpadOk,
  onDpadBack,
  onDpadHome,
  onClose,
}) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center bg-[#0D1424]/95 backdrop-blur-2xl p-5 rounded-3xl border-2 border-cyan-500/50 shadow-[0_0_40px_rgba(0,210,255,0.35)] w-64 select-none animate-in fade-in zoom-in duration-200">
      
      {/* Remote Header */}
      <div className="w-full flex items-center justify-between border-b border-[#1E2D4A] pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00D2FF]" />
          <span className="font-bold text-xs text-white tracking-wider font-mono">
            CONTROLE D-PAD
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Top Remote Functional Buttons */}
      <div className="w-full flex items-center justify-between px-2 mb-4">
        <button
          onClick={onDpadHome}
          title="Ir para o Início"
          className="p-2.5 rounded-xl bg-[#131D33] text-cyan-400 hover:bg-cyan-500 hover:text-black border border-[#1E2D4A] transition-all shadow"
        >
          <Home className="w-4 h-4" />
        </button>

        <button
          onClick={onDpadBack}
          title="Voltar"
          className="p-2.5 rounded-xl bg-[#131D33] text-slate-300 hover:bg-cyan-500 hover:text-black border border-[#1E2D4A] transition-all shadow"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => alert('Smart TV ServONVIF em modo Standby.')}
          title="Power / Standby"
          className="p-2.5 rounded-xl bg-rose-950/80 text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/40 transition-all shadow"
        >
          <Power className="w-4 h-4" />
        </button>
      </div>

      {/* Circular D-pad Directional Controller */}
      <div className="relative w-44 h-44 rounded-full bg-[#131D33] border-2 border-[#1E2D4A] flex items-center justify-center shadow-inner my-2">
        
        {/* D-pad UP */}
        <button
          onClick={onDpadUp}
          className="absolute top-2 w-14 h-11 flex items-center justify-center rounded-t-2xl hover:bg-cyan-500/30 active:bg-cyan-500 text-slate-300 hover:text-cyan-300 transition-all"
        >
          <ChevronUp className="w-6 h-6" />
        </button>

        {/* D-pad DOWN */}
        <button
          onClick={onDpadDown}
          className="absolute bottom-2 w-14 h-11 flex items-center justify-center rounded-b-2xl hover:bg-cyan-500/30 active:bg-cyan-500 text-slate-300 hover:text-cyan-300 transition-all"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        {/* D-pad LEFT */}
        <button
          onClick={onDpadLeft}
          className="absolute left-2 w-11 h-14 flex items-center justify-center rounded-l-2xl hover:bg-cyan-500/30 active:bg-cyan-500 text-slate-300 hover:text-cyan-300 transition-all"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* D-pad RIGHT */}
        <button
          onClick={onDpadRight}
          className="absolute right-2 w-11 h-14 flex items-center justify-center rounded-r-2xl hover:bg-cyan-500/30 active:bg-cyan-500 text-slate-300 hover:text-cyan-300 transition-all"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Center OK / ENTER Button */}
        <button
          onClick={onDpadOk}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 hover:brightness-125 active:scale-95 text-black font-black text-xs shadow-[0_0_15px_rgba(0,210,255,0.5)] flex items-center justify-center transition-transform"
        >
          OK
        </button>

      </div>

      {/* Android TV Color Buttons (Red, Green, Yellow, Blue) */}
      <div className="w-full flex items-center justify-between px-3 mt-4 pt-3 border-t border-[#1E2D4A]">
        <button
          onClick={onDpadBack}
          title="Botão Vermelho (Voltar)"
          className="w-7 h-3 rounded-full bg-rose-500 hover:brightness-125 shadow-[0_0_6px_#F43F5E]"
        />
        <button
          onClick={onDpadOk}
          title="Botão Verde (Ação)"
          className="w-7 h-3 rounded-full bg-emerald-500 hover:brightness-125 shadow-[0_0_6px_#10B981]"
        />
        <button
          onClick={onDpadHome}
          title="Botão Amarelo (Início)"
          className="w-7 h-3 rounded-full bg-amber-500 hover:brightness-125 shadow-[0_0_6px_#F59E0B]"
        />
        <button
          onClick={onDpadOk}
          title="Botão Azul (Opções)"
          className="w-7 h-3 rounded-full bg-cyan-500 hover:brightness-125 shadow-[0_0_6px_#00D2FF]"
        />
      </div>

      <p className="text-[10px] text-slate-400 font-mono mt-3 text-center">
        Dica: Você também pode usar as setas do teclado (↑ ↓ ← →) e Enter/Esc!
      </p>

    </div>
  );
};
