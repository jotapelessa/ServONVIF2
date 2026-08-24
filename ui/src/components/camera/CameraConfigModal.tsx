"use client";

import { useState, useEffect } from "react";
import { Camera, Device, apiClient } from "@/lib/api-client";
import {
  X,
  Sliders,
  Tv,
  CheckCircle2,
  AlertCircle,
  Save,
  Loader2,
  Shield,
  Smartphone,
  Monitor,
  Sparkles,
} from "lucide-react";

interface CameraConfigModalProps {
  camera: Camera;
  onClose: () => void;
  onSaved: () => void;
}

export function CameraConfigModal({ camera, onClose, onSaved }: CameraConfigModalProps) {
  const [name, setName] = useState(camera.name);
  const [sensitivity, setSensitivity] = useState(camera.sensitivity || 0.03);
  const [allowedDeviceIds, setAllowedDeviceIds] = useState<string[]>(camera.allowed_device_ids || []);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    async function loadDevices() {
      try {
        const devs = await apiClient.getDevices();
        setDevices(devs);
      } catch (e) {
        console.error("Erro ao carregar dispositivos:", e);
      } finally {
        setLoadingDevices(false);
      }
    }
    loadDevices();
  }, []);

  const toggleDevice = (devId: string) => {
    setAllowedDeviceIds((prev) =>
      prev.includes(devId) ? prev.filter((id) => id !== devId) : [...prev, devId]
    );
  };

  const selectAllDevices = () => {
    setAllowedDeviceIds(devices.map((d) => d.device_id));
  };

  const clearAllDevices = () => {
    setAllowedDeviceIds([]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.updateCamera(camera.id, {
        name,
        sensitivity: Number(sensitivity),
        allowed_device_ids: allowedDeviceIds,
      });
      setSavedSuccess(true);
      setTimeout(() => {
        onSaved();
        onClose();
      }, 700);
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar configurações da câmera");
    } finally {
      setSaving(false);
    }
  };

  const getSensitivityLabel = (val: number) => {
    if (val === 0) return { label: "⏸️ Desativado", desc: "Detecção de movimento desligada nesta câmera", color: "text-slate-400" };
    if (val <= 10) return { label: "🛡️ Anti-Falso Positivo (Estrito)", desc: "Detecta apenas pessoas inteiras ou veículos. Ignora insetos, galhos e ruídos de pixel.", color: "text-emerald-400" };
    if (val <= 25) return { label: "⚖️ Balanceado (Recomendado)", desc: "Sensibilidade padrão ideal para portões, garagens e calçadas.", color: "text-blue-400" };
    if (val <= 40) return { label: "🔍 Média-Alta Sensibilidade", desc: "Detecta movimentação a distâncias maiores.", color: "text-amber-400" };
    return { label: "⚡ Alta Sensibilidade (Nível Máximo)", desc: "Detecta qualquer mudança sutil no ambiente.", color: "text-rose-400" };
  };

  // Convert old legacy decimal (e.g. 0.03) to 0-50 scale
  const displaySens = sensitivity < 1.0 && sensitivity > 0 ? Math.round(sensitivity * 500) : sensitivity;
  const sensInfo = getSensitivityLabel(displaySens);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="card-dark rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Configurações da Câmera</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                  ID #{camera.id}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Ajuste sensibilidade anti-falsos positivos (0 a 50) e roteamento de alertas para telas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Camera Name */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">
              Nome de Exibição da Câmera
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950/80 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition"
              required
            />
          </div>

          {/* 1. MOG2 Sensitivity Slider (0 to 50) */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  1. Sensibilidade Anti-Ruído
                </span>
                <span className={`text-xs font-semibold ${sensInfo.color}`}>
                  {sensInfo.label}
                </span>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Nível {displaySens} / 50
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              {sensInfo.desc}
            </p>

            <div className="pt-1">
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={displaySens}
                onChange={(e) => setSensitivity(parseInt(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1.5 px-1">
                <span>0 (Off)</span>
                <span className="text-emerald-400 font-semibold">1-10 (Anti-Falsos)</span>
                <span className="text-blue-400 font-semibold">20 (Recomendado)</span>
                <span>35 (Alta)</span>
                <span>50 (Máx)</span>
              </div>
            </div>
          </div>

          {/* 2. Device Alert Routing */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider block">
                  2. Dispositivos Autorizados a Receber Alertas
                </span>
                <span className="text-[11px] text-slate-400">
                  Selecione quais telas devem exibir o PiP e tocar som ao detectar movimento nesta câmera.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={selectAllDevices}
                  className="px-2.5 py-1 text-[11px] font-medium text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg transition"
                >
                  Marcar Todos
                </button>
                <button
                  type="button"
                  onClick={clearAllDevices}
                  className="px-2.5 py-1 text-[11px] font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                >
                  Limpar
                </button>
              </div>
            </div>

            {loadingDevices ? (
              <div className="flex items-center justify-center py-6 text-xs text-slate-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                <span>Carregando dispositivos conectados...</span>
              </div>
            ) : devices.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {devices.map((dev) => {
                  const isSpecificSelected = allowedDeviceIds.includes(dev.device_id);
                  const isEffectiveActive = allowedDeviceIds.length === 0 || isSpecificSelected;

                  return (
                    <div
                      key={dev.id}
                      onClick={() => toggleDevice(dev.device_id)}
                      className={`relative flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all duration-150 select-none ${
                        isSpecificSelected
                          ? "bg-blue-600/15 border-blue-500 text-white shadow-md shadow-blue-500/5 ring-1 ring-blue-500/30"
                          : allowedDeviceIds.length === 0
                          ? "bg-slate-800/60 border-slate-700 text-slate-200 hover:border-slate-600"
                          : "bg-slate-950/50 border-slate-800/80 text-slate-500 hover:border-slate-700 hover:text-slate-400"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-2.5 rounded-xl shrink-0 ${
                            dev.device_type === "Android TV"
                              ? "bg-purple-500/20 text-purple-400 border border-purple-500/20"
                              : dev.device_type === "Web Browser"
                              ? "bg-blue-500/20 text-blue-400 border border-blue-500/20"
                              : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                          }`}
                        >
                          {dev.device_type === "Android TV" ? (
                            <Tv className="w-4 h-4" />
                          ) : (
                            <Monitor className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white truncate">
                            {dev.name}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>{dev.ip_address}</span>
                            <span>&bull;</span>
                            <span className="truncate">{dev.device_type}</span>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-lg flex items-center justify-center border transition ml-2 shrink-0 ${
                          isSpecificSelected
                            ? "bg-blue-600 border-blue-500 text-white shadow-sm"
                            : allowedDeviceIds.length === 0
                            ? "bg-slate-700/60 border-slate-600 text-slate-300"
                            : "border-slate-800 bg-slate-900 text-transparent"
                        }`}
                      >
                        {isEffectiveActive && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-slate-400 bg-slate-950/80 rounded-xl border border-slate-800">
                Nenhum dispositivo Android TV ou tela registrado ainda no ServONVIF.
              </div>
            )}

            {allowedDeviceIds.length === 0 && (
              <div className="flex items-center gap-2 text-[11px] text-amber-300 font-medium px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Modo Padrão Global: <strong>Todas as telas conectadas</strong> receberão alertas desta câmera.
                </span>
              </div>
            )}
          </div>

          {/* Footer Save Button */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 h-10 px-5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-500/20 transition active:scale-95 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : savedSuccess ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{savedSuccess ? "Salvo!" : "Salvar Configurações"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
