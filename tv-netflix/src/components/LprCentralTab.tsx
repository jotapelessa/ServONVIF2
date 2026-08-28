import React, { useState } from 'react';
import { 
  Car, 
  ShieldCheck, 
  UserCheck, 
  AlertTriangle, 
  Clock, 
  Check, 
  X, 
  Edit3, 
  Search, 
  Gauge, 
  Camera as CameraIcon,
  Sparkles,
  Inbox
} from 'lucide-react';
import { LprDetection, LprCategory } from '../types';

interface LprCentralTabProps {
  detections: LprDetection[];
  onAddOrUpdateOwner: (id: string, newOwner: string, newCategory: 'family' | 'visitor' | 'suspicious') => void;
  focusedElementId: string | null;
  onElementFocus: (id: string) => void;
  onViewPlayback: (detection: LprDetection) => void;
}

export const LprCentralTab: React.FC<LprCentralTabProps> = ({
  detections,
  onAddOrUpdateOwner,
  focusedElementId,
  onElementFocus,
  onViewPlayback,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<LprCategory>('all');
  const [editingDetection, setEditingDetection] = useState<LprDetection | null>(null);
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editCategory, setEditCategory] = useState<'family' | 'visitor' | 'suspicious'>('family');

  // Filter list
  const filteredList = detections.filter((item) => {
    if (selectedFilter === 'all') return true;
    return item.category === selectedFilter;
  });

  const handleOpenEdit = (lpr: LprDetection) => {
    setEditingDetection(lpr);
    setEditOwnerName(lpr.ownerName || '');
    setEditCategory(lpr.category);
  };

  const handleSaveEdit = () => {
    if (editingDetection) {
      onAddOrUpdateOwner(editingDetection.id, editOwnerName, editCategory);
      setEditingDetection(null);
    }
  };

  const filters: { id: LprCategory; label: string; count: number; icon: React.ReactNode; color: string }[] = [
    {
      id: 'all',
      label: 'Todas as Placas',
      count: detections.length,
      icon: <Car className="w-4 h-4" />,
      color: 'text-cyan-400',
    },
    {
      id: 'family',
      label: 'Autorizadas',
      count: detections.filter((d) => d.category === 'family').length,
      icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
      color: 'text-emerald-400',
    },
    {
      id: 'visitor',
      label: 'Visitantes',
      count: detections.filter((d) => d.category === 'visitor').length,
      icon: <UserCheck className="w-4 h-4 text-amber-400" />,
      color: 'text-amber-400',
    },
    {
      id: 'suspicious',
      label: 'Bloqueadas',
      count: detections.filter((d) => d.category === 'suspicious').length,
      icon: <AlertTriangle className="w-4 h-4 text-rose-400" />,
      color: 'text-rose-400',
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row w-full min-h-[calc(100vh-80px)] p-4 sm:p-6 md:p-10 gap-6 select-none pb-24">
      
      {/* 1. Left Vertical Filter Sidebar */}
      <aside className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4">
        
        <div className="p-4 sm:p-5 rounded-2xl bg-glass-card border border-glass">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_12px_rgba(52,211,153,0.3)]">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Central LPR</h2>
              <p className="text-xs text-slate-400">Reconhecimento de Placas</p>
            </div>
          </div>

          {/* Categories Navigation */}
          <div className="flex flex-col gap-1.5">
            {filters.map((f) => {
              const isActive = selectedFilter === f.id;
              const elementId = `lpr-filter-${f.id}`;
              const isFocused = focusedElementId === elementId;

              return (
                <button
                  key={f.id}
                  id={elementId}
                  onClick={() => setSelectedFilter(f.id)}
                  onFocus={() => onElementFocus(elementId)}
                  className={`flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all cursor-pointer tv-focus-target ${
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-[0_0_15px_rgba(52,211,153,0.3)]'
                      : 'bg-[#0D1424] text-slate-400 border border-[#1E2D4A] hover:bg-[#131D33]'
                  } ${isFocused ? 'tv-focused ring-2 ring-emerald-400' : ''}`}
                >
                  <div className="flex items-center gap-2.5">
                    {f.icon}
                    <span>{f.label}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-black/50 font-mono text-[10px] text-slate-300">
                    {f.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

      </aside>

      {/* 2. Main Central Panel of Vehicles */}
      <main className="flex-1 flex flex-col gap-4">
        
        <div className="flex items-center justify-between">
          <h1 className="text-lg sm:text-xl font-bold text-slate-100 flex items-center gap-2">
            <span>Registros Cronológicos</span>
            <span className="text-sm font-normal text-slate-400 font-mono">
              ({filteredList.length} ocorrências)
            </span>
          </h1>
          <p className="text-xs text-slate-400 hidden sm:block">
            Pressione OK no card para abrir o vídeo correspondente
          </p>
        </div>

        {/* Vehicles Grid or Empty State */}
        {filteredList.length === 0 ? (
          <div className="w-full p-12 rounded-3xl bg-[#131D33]/40 border border-[#1E2D4A]/60 flex flex-col items-center justify-center gap-3 text-slate-400 text-center">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Car className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">Nenhuma Placa Registrada</h3>
            <p className="text-sm max-w-md text-slate-400">
              Assim que as câmeras identificarem a passagem de veículos, as placas, fotos e horários aparecerão automaticamente aqui.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredList.map((lpr) => {
              const elementId = `lpr-card-${lpr.id}`;
              const isFocused = focusedElementId === elementId;

              return (
                <div
                  key={lpr.id}
                  id={elementId}
                  tabIndex={0}
                  onFocus={() => onElementFocus(elementId)}
                  onClick={() => onViewPlayback(lpr)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onViewPlayback(lpr);
                    }
                  }}
                  className={`group relative rounded-2xl overflow-hidden bg-glass-card border cursor-pointer transition-all duration-200 tv-focus-target flex flex-col ${
                    lpr.category === 'suspicious'
                      ? 'border-rose-500/50'
                      : lpr.category === 'family'
                      ? 'border-emerald-500/30'
                      : 'border-[#1E2D4A]'
                  } ${isFocused ? 'tv-focused ring-2 ring-emerald-400' : 'hover:border-slate-500'}`}
                >
                  {/* Image + Crop Header */}
                  <div className="relative h-40 w-full overflow-hidden bg-slate-950 flex items-center justify-center">
                    {lpr.thumbnailUrl ? (
                      <img
                        src={lpr.thumbnailUrl}
                        alt={lpr.plate}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <Car className="w-12 h-12 text-slate-700" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#131D33] via-transparent to-black/40" />

                    {/* Mercosul Neon Plate Tag */}
                    <div className="absolute top-3 left-3 flex items-center border border-emerald-400/90 bg-black/90 rounded-md px-2.5 py-1 shadow-[0_0_16px_rgba(52,211,153,0.6)]">
                      <div className="w-1.5 h-3.5 bg-blue-600 rounded-xs mr-1.5" />
                      <span className="font-mono font-black text-base text-emerald-300 tracking-widest">
                        {lpr.plate}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      {lpr.category === 'family' && (
                        <span className="px-2.5 py-1 rounded-md bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 font-bold text-xs font-mono">
                          AUTORIZADO
                        </span>
                      )}
                      {lpr.category === 'visitor' && (
                        <span className="px-2.5 py-1 rounded-md bg-amber-950/90 border border-amber-500/50 text-amber-300 font-bold text-xs font-mono">
                          VISITANTE
                        </span>
                      )}
                      {lpr.category === 'suspicious' && (
                        <span className="px-2.5 py-1 rounded-md bg-rose-950/90 border border-rose-500/50 text-rose-300 font-bold text-xs font-mono">
                          BLOQUEADO
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Details Section */}
                  <div className="p-3.5 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">
                        {lpr.model || lpr.vehicleType || 'Veículo'}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">
                        {lpr.color}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#0D1424]/90 border border-[#1E2D4A] flex items-center justify-between">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                          Identificação / Morador
                        </span>
                        <p className="text-xs font-semibold text-cyan-300 truncate">
                          {lpr.ownerName || 'Não Informado'}
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(lpr);
                        }}
                        title="Editar dados"
                        className="p-1.5 rounded-lg bg-[#1E2D4A]/60 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 transition-colors pointer-events-auto"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 font-mono">
                      <span>{lpr.cameraName}</span>
                      <span>{new Date(lpr.timestamp).toLocaleTimeString('pt-BR')}</span>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* Edit Resident / Plate Modal */}
      {editingDetection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#0D1424] border border-cyan-500/50 shadow-[0_0_30px_rgba(0,210,255,0.3)] flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#1E2D4A] pb-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-cyan-400" />
                Cadastrar / Editar Placa
              </h3>
              <button
                onClick={() => setEditingDetection(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-center p-3 bg-black/60 rounded-xl border border-emerald-500/40">
              <span className="font-mono text-xl font-black text-emerald-300 tracking-widest">
                {editingDetection.plate}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-300">
                Nome do Morador ou Identificação:
              </label>
              <input
                type="text"
                value={editOwnerName}
                onChange={(e) => setEditOwnerName(e.target.value)}
                placeholder="Ex: Roberto Lessa"
                className="w-full px-3.5 py-2 rounded-xl bg-[#131D33] border border-[#1E2D4A] text-white focus:outline-none focus:border-cyan-400 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300">
                Categoria de Acesso:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setEditCategory('family')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                    editCategory === 'family'
                      ? 'bg-emerald-500 text-black border-emerald-400'
                      : 'bg-[#131D33] text-slate-300 border-[#1E2D4A]'
                  }`}
                >
                  Autorizada
                </button>
                <button
                  type="button"
                  onClick={() => setEditCategory('visitor')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                    editCategory === 'visitor'
                      ? 'bg-amber-500 text-black border-amber-400'
                      : 'bg-[#131D33] text-slate-300 border-[#1E2D4A]'
                  }`}
                >
                  Visitante
                </button>
                <button
                  type="button"
                  onClick={() => setEditCategory('suspicious')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                    editCategory === 'suspicious'
                      ? 'bg-rose-500 text-white border-rose-400'
                      : 'bg-[#131D33] text-slate-300 border-[#1E2D4A]'
                  }`}
                >
                  Bloqueada
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1E2D4A]">
              <button
                onClick={() => setEditingDetection(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-500 text-black shadow-lg shadow-cyan-500/40 hover:bg-cyan-400"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
