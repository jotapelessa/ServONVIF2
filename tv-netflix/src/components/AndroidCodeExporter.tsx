import React, { useState } from 'react';
import { 
  Code2, 
  Copy, 
  Check, 
  FileCode, 
  Download, 
  X, 
  Sparkles, 
  FolderTree, 
  Layers 
} from 'lucide-react';
import { ANDROID_FILES, AndroidFile } from '../data/androidExportCode';

interface AndroidCodeExporterProps {
  onClose: () => void;
}

export const AndroidCodeExporter: React.FC<AndroidCodeExporterProps> = ({ onClose }) => {
  const [selectedFile, setSelectedFile] = useState<AndroidFile>(ANDROID_FILES[0]);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadAll = () => {
    const combined = ANDROID_FILES.map(
      (f) => `// ==========================================\n// FILE: ${f.path}\n// ==========================================\n\n${f.content}\n\n`
    ).join('\n');

    const blob = new Blob([combined], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'servonvif-tv-android-app-modern.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-lg p-4 md:p-8 select-none">
      <div className="w-full max-w-6xl h-[85vh] rounded-3xl bg-[#0D1424] border border-cyan-500/40 shadow-[0_0_50px_rgba(0,210,255,0.25)] flex flex-col overflow-hidden">
        
        {/* Top Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D4A] bg-[#070B14]/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-white flex items-center gap-2">
                Exportador de Código Android TV & Jetpack Compose
                <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono text-xs border border-cyan-500/30">
                  android/app-modern/
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Arquivos prontos para integração no projeto Android TV do ServONVIF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadAll}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 text-black hover:bg-cyan-400 transition-colors shadow"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Pacote Completo</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#131D33] text-slate-400 hover:text-white border border-[#1E2D4A]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body with Sidebar & Code Editor */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* File Tree Sidebar */}
          <div className="w-full md:w-80 bg-[#0A0F1D] border-r border-[#1E2D4A] p-4 flex flex-col gap-2 overflow-y-auto">
            <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
              <FolderTree className="w-3.5 h-3.5 text-cyan-400" />
              Arquivos Android (app-modern)
            </span>

            {ANDROID_FILES.map((file) => {
              const isSelected = selectedFile.path === file.path;

              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full flex items-start gap-2.5 p-3 rounded-xl text-left transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_12px_rgba(0,210,255,0.2)]'
                      : 'bg-[#131D33]/60 text-slate-300 border-transparent hover:bg-[#131D33]'
                  }`}
                >
                  <FileCode className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{file.name}</p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{file.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Main Code Viewer */}
          <div className="flex-1 flex flex-col bg-[#060911] overflow-hidden">
            
            {/* Code Header Bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#1E2D4A] bg-[#0D1424]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-cyan-300 font-bold">
                  {selectedFile.path}
                </span>
              </div>

              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#131D33] text-slate-200 hover:text-white border border-[#1E2D4A] hover:border-cyan-400 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar Código'}</span>
              </button>
            </div>

            {/* Code Content */}
            <div className="flex-1 p-5 overflow-auto font-mono text-xs text-slate-300 leading-relaxed bg-[#070B14]">
              <pre className="whitespace-pre">{selectedFile.content}</pre>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
