import React, { useState } from 'react';
import { 
  Car, 
  ShieldCheck, 
  UserCheck, 
  AlertTriangle, 
  Clock, 
  Plus, 
  Check, 
  X, 
  Edit3, 
  Search, 
  Gauge, 
  Camera as CameraIcon,
  Sparkles
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
  const [newVehicleModalOpen, setNewVehicleModalOpen] = useState(false);
  const [newPlate, setNewPlate] = useState('');
  const [newModel, setNewModel] = useState('');

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
      label: 'Placas da Família / Autorizadas',
      count: detections.filter((d) => d.category === 'family').length,
      icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
      color: 'text-emerald-400',
    },
    {
      id: 'visitor',
      label: 'Visitantes / Não Cadastrados',
      count: detections.filter((d) => d.category === 'visitor').length,
      icon: <UserCheck className="w-4 h-4 text-amber-400" />,
      color: 'text-amber-400',
    },
    {
      id: 'suspicious',
      label: 'Placas Suspeitas / Bloqueadas',
      count: detections.filter((d) => d.category === 'suspicious').length,
      icon: <AlertTriangle className="w-4 h-4 text-rose-400" />,
      color: 'text-rose-400',
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row w-full min-h-[calc(100vh-80px)] p-6 md:p-10 gap-8 select-none pb-24">
      
      {/* 1. Left Vertical Filter Sidebar (Foco D-pad Vertical) */}
      <aside className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-4">
        
        <div className="p-5 rounded-2xl bg-glass-card border border-glass">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_12px_rgba(52,211,153,0.3)]">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-white">Central LPR IA</h2>
              <p className="text-xs text-slate-400">Reconhecimento Óptico de Placas</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {filters.map((filter) => {
              const isSelected = selectedFilter === filter.id;
              const elementId = `lpr-filter-${filter.id}`;
              const isFocused = focusedElementId === elementId;

              return (
                <button
                  key={filter.id}
                  id={elementId}
                  onClick={() => setSelectedFilter(filter.id)}
                  onFocus={() => onElementFocus(elementId)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer text-left tv-focus-target ${
                    isSelected
                      ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-300 border border-emerald-500/50 shadow-[0_0_14px_rgba(52,211,153,0.25)]'
                      : 'bg-[#0D1424]/80 text-slate-300 border border-[#1E2D4A] hover:bg-[#131D33]'
                  } ${isFocused ? 'tv-focused' : ''}`}
                >
                  <div className="flex items-center gap-2.5">
                    {filter.icon}
                    <span className="truncate">{filter.label}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-black/60 font-mono text-xs font-bold text-slate-300">
                    {filter.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-[#1E2D4A]/80">
            <button
              id="lpr-btn-cadastrar-novo"
              onClick={() => setNewVehicleModalOpen(true)}
              onFocus={() => onElementFocus('lpr-btn-cadastrar-novo')}
              className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-600 text-black hover:brightness-110 shadow-[0_0_15px_rgba(52,211,153,0.35)] transition-all cursor-pointer tv-focus-target ${
                focusedElementId === 'lpr-btn-cadastrar-novo' ? 'tv-focused' : ''
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Novo Veículo</span>
            </button>
          </div>
        </div>

        {/* Info stats card */}
        <div className="p-4 rounded-2xl bg-glass-card border border-glass flex flex-col gap-2.5 text-xs text-slate-400">
          <div className="flex justify-between items-center text-slate-300 font-medium">
            <span>Taxa de Precisão OCR:</span>
            <span className="font-mono text-emerald-400 font-bold">98.8%</span>
          </div>
          <div className="flex justify-between items-center text-slate-300 font-medium">
            <span>Tempo Médio Detecção:</span>
            <span className="font-mono text-cyan-400 font-bold">140ms</span>
          </div>
          <div className="flex justify-between items-center text-slate-300 font-medium">
            <span>Padrões Suportados:</span>
            <span className="font-mono text-slate-200">Mercosul + Antigo BR</span>
          </div>
        </div>

      </aside>


      {/* 2. Main Central Panel of Vehicles */}
      <main className="flex-1 flex flex-col gap-5">
        
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <span>Registros Cronológicos</span>
            <span className="text-sm font-normal text-slate-400 font-mono">
              ({filteredList.length} ocorrências)
            </span>
          </h1>
          <p className="text-xs text-slate-400">
            Navegue com D-pad e pressione OK no card para abrir o vídeo correspondente
          </p>
        </div>

        {/* Vehicles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-5">
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
                <div className="relative h-48 w-full overflow-hidden bg-slate-950">
                  <img
                    src={lpr.thumbnailUrl}
                    alt={lpr.model}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#131D33] via-transparent to-black/40" />

                  {/* Mercosul Neon Plate Tag */}
                  <div className="absolute top-3 left-3 flex items-center border-2 border-emerald-400/90 bg-black/90 rounded-md px-2.5 py-1 shadow-[0_0_16px_rgba(52,211,153,0.6)]">
                    <div className="w-2 h-4 bg-blue-600 rounded-xs mr-2" />
                    <span className="font-mono font-black text-lg text-emerald-300 tracking-widest">
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
                      <span className="px-2.5 py-1 rounded-md bg-rose-950/90 border border-rose-500/50 text-rose-300 font-bold text-xs font-mono animate-alarm-pulse">
                        BLOQUEADO / ALERTA
                      </span>
                    )}
                  </div>

                  {/* Speed & Confidence pill */}
                  <div className="absolute bottom-2.5 left-3 flex items-center gap-2 text-xs font-mono text-slate-200">
                    <span className="px-2 py-0.5 rounded bg-black/70 backdrop-blur-md">
                      {lpr.confidence}% Precisão IA
                    </span>
                    {lpr.speedKmH && (
                      <span className="px-2 py-0.5 rounded bg-black/70 backdrop-blur-md flex items-center gap-1">
                        <Gauge className="w-3 h-3 text-cyan-400" />
                        {lpr.speedKmH} km/h
                      </span>
                    )}
                  </div>
                </div>

                {/* Details Section */}
                <div className="p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-white">
                      {lpr.model}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      {lpr.color} • {lpr.vehicleType}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#0D1424]/90 border border-[#1E2D4A] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Morador / Responsável
                      </span>
                      <p className="text-sm font-semibold text-cyan-300 truncate">
                        {lpr.ownerName || 'Não Cadastrado'}
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(lpr);
                      }}
                      title="Editar dados do morador"
                      className="p-2 rounded-lg bg-[#1E2D4A]/60 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 transition-colors pointer-events-auto"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5 font-mono">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      {lpr.timestamp}
                    </span>
                    <span className="text-slate-300 font-medium">
                      {lpr.cameraName}
                    </span>
                  </div>

                </div>

              </div>
            );
          })}
        </div>

      </main>

      {/* Edit Resident / Plate Modal */}
      {editingDetection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#0D1424] border border-cyan-500/50 shadow-[0_0_30px_rgba(0,210,255,0.3)] flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#1E2D4A] pb-3">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-cyan-400" />
                Cadastrar / Editar Morador
              </h3>
              <button
                onClick={() => setEditingDetection(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-center p-3 bg-black/60 rounded-xl border border-emerald-500/40">
              <span className="font-mono text-2xl font-black text-emerald-300 tracking-widest">
                {editingDetection.plate}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-300">
                Nome do Morador ou Descrição:
              </label>
              <input
                type="text"
                value={editOwnerName}
                onChange={(e) => setEditOwnerName(e.target.value)}
                placeholder="Ex: Dr. Roberto Lessa (Residência Principal)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#131D33] border border-[#1E2D4A] text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-300">
                Categoria de Acesso:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setEditCategory('family')}
                  className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                    editCategory === 'family'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400'
                      : 'bg-[#131D33] text-slate-400 border-[#1E2D4A]'
                  }`}
                >
                  Família
                </button>
                <button
                  type="button"
                  onClick={() => setEditCategory('visitor')}
                  className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                    editCategory === 'visitor'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-400'
                      : 'bg-[#131D33] text-slate-400 border-[#1E2D4A]'
                  }`}
                >
                  Visitante
                </button>
                <button
                  type="button"
                  onClick={() => setEditCategory('suspicious')}
                  className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                    editCategory === 'suspicious'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-400'
                      : 'bg-[#131D33] text-slate-400 border-[#1E2D4A]'
                  }`}
                >
                  Bloqueada
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-2 pt-3 border-t border-[#1E2D4A]">
              <button
                onClick={() => setEditingDetection(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_15px_rgba(0,210,255,0.4)]"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Vehicle Register Modal */}
      {newVehicleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#0D1424] border border-emerald-500/50 shadow-[0_0_30px_rgba(52,211,153,0.3)] flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#1E2D4A] pb-3">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                Cadastrar Nova Placa / Veículo
              </h3>
              <button
                onClick={() => setNewVehicleModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-300">
                Placa do Veículo (Mercosul ou Padrão):
              </label>
              <input
                type="text"
                value={newPlate}
                onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                placeholder="Ex: ABC1D23"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#131D33] border border-[#1E2D4A] text-white font-mono uppercase focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-300">
                Modelo e Cor do Veículo:
              </label>
              <input
                type="text"
                value={newModel}
                onChange={(e) => setNewModel(e.target.value)}
                placeholder="Ex: Honda Civic Touring - Preto"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#131D33] border border-[#1E2D4A] text-white focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div className="flex items-center justify-end gap-3 mt-2 pt-3 border-t border-[#1E2D4A]">
              <button
                onClick={() => setNewVehicleModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (newPlate) {
                    onAddOrUpdateOwner(`lpr-new-${Date.now()}`, newModel || 'Novo Veículo', 'family');
                    setNewVehicleModalOpen(false);
                    setNewPlate('');
                    setNewModel('');
                  }
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.4)]"
              >
                Cadastrar Veículo
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
