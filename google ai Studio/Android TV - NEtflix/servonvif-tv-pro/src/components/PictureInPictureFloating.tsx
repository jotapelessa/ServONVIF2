import React from 'react';
import { Camera } from '../types';
import { CameraCanvasFeed } from './CameraCanvasFeed';
import { X, Maximize2, Move } from 'lucide-react';

interface PictureInPictureFloatingProps {
  camera: Camera;
  onClose: () => void;
  onMaximize: (cam: Camera) => void;
}

export const PictureInPictureFloating: React.FC<PictureInPictureFloatingProps> = ({
  camera,
  onClose,
  onMaximize,
}) => {
  return (
    <div className="fixed top-20 right-8 z-40 w-80 aspect-video rounded-2xl overflow-hidden bg-black/90 border-2 border-cyan-400 shadow-[0_0_25px_rgba(0,210,255,0.4)] flex flex-col group select-none">
      
      {/* Live Stream */}
      <div className="relative w-full h-full">
        <CameraCanvasFeed camera={camera} showScanlines={false} showOsd={false} />

        {/* Top PiP Controls Bar */}
        <div className="absolute top-0 inset-x-0 p-2 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shadow-[0_0_6px_#00D2FF]" />
            <span className="text-[11px] font-bold text-white truncate max-w-[140px]">
              {camera.name.split(' ')[0]}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onMaximize(camera)}
              title="Expandir para Tela Cheia"
              className="p-1 rounded bg-black/60 hover:bg-white/20 text-slate-200 transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              title="Fechar PiP"
              className="p-1 rounded bg-black/60 hover:bg-rose-500 text-slate-200 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Bottom PiP Badge */}
        <div className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-cyan-300">
          PiP ANDROID TV
        </div>
      </div>

    </div>
  );
};
