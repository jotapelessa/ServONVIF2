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
    if (val <= 0.015) return { label: "🪶 Ultra Sensível", desc: "Detecta qualquer mínimo movimento (gatos, pássaros, luzes)", color: "text-amber-400" };
    if (val <= 0.035) return { label: "⚖️ Equilibrado (Padrão)", desc: "Ideal para pessoas caminhando e carros entrando", color: "text-emerald-400" };
    if (val <= 0.06) return { label: "🛡️ Moderado", desc: "Ignora pequenos animais e galhos balançando", color: "text-blue-400" };
    return { label: "🧱 Alta Tolerância", desc: "Apenas grandes volumes (carros, caminhões, grupos)", color: "text-rose-400" };
  };

  const sensInfo = getSensitivityLabel(sensitivity);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="card-dark rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Configurações da Câmera</h2>
              <p className="text-[11px] text-slate-400">
                Ajuste de sensibilidade MOG2 e roteamento de alertas para telas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Camera Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nome de Identificação
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* 1. MOG2 Sensitivity Slider */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  1. Sensibilidade MOG2
                </span>
                <span className={`text-xs font-semibold ${sensInfo.color}`}>
                  {sensInfo.label}
                </span>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {(sensitivity * 100).toFixed(1)}% do quadro
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              {sensInfo.desc}
            </p>

            <div className="pt-1">
              <input
                type="range"
                min="0.005"
                max="0.10"
                step="0.005"
                value={sensitivity}
                onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1 px-1">
                <span>0.5% (Ultra)</span>
                <span>3.0% (Padrão)</span>
                <span>6.0% (Moderado)</span>
                <span>10% (Tolerante)</span>
              </div>
            </div>
          </div>

          {/* 2. Device Alert Routing */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider block">
                  2. Dispositivos Autorizados a Receber Alertas
                </span>
                <span className="text-[11px] text-slate-400">
                  Marque quais telas devem exibir o PiP e tocar som ao detectar movimento nesta câmera.
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllDevices}
                  className="text-[10px] text-blue-400 hover:underline font-medium"
                >
                  Marcar Todos
                </button>
                <span className="text-slate-600">&bull;</span>
                <button
                  type="button"
                  onClick={clearAllDevices}
                  className="text-[10px] text-slate-400 hover:underline font-medium"
                >
                  Limpar
                </button>
              </div>
            </div>

            {loadingDevices ? (
              <div className="flex items-center justify-center py-4 text-xs text-slate-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                <span>Carregando dispositivos...</span>
              </div>
            ) : devices.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {devices.map((dev) => {
                  const isChecked =
                    allowedDeviceIds.length === 0 || allowedDeviceIds.includes(dev.device_id);
                  const isSpecificSelected = allowedDeviceIds.includes(dev.device_id);

                  return (
                    <label
                      key={dev.id}
                      onClick={() => toggleDevice(dev.device_id)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition select-none ${
                        isSpecificSelected || allowedDeviceIds.length === 0
                          ? "bg-slate-800/80 border-blue-500/40 text-white"
                          : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            dev.device_type === "Android TV"
                              ? "bg-purple-500/20 text-purple-400"
                              : "bg-blue-500/20 text-blue-400"
                          }`}
                        >
                          <Tv className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold">{dev.name}</div>
                          <div className="text-[10px] font-mono text-slate-500">
                            {dev.ip_address} &bull; {dev.device_type}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                          isSpecificSelected
                            ? "bg-blue-600 border-blue-500 text-white"
                            : allowedDeviceIds.length === 0
                            ? "bg-blue-600/40 border-blue-500/40 text-white"
                            : "border-slate-700 bg-slate-900"
                        }`}
                      >
                        {(isSpecificSelected || allowedDeviceIds.length === 0) && (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 text-center text-xs text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
                Nenhum dispositivo Android TV ou tela registrado ainda no ServONVIF.
              </div>
            )}

            {allowedDeviceIds.length === 0 && (
              <div className="text-[10px] text-amber-400/90 font-medium px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                ℹ️ Como nenhum dispositivo específico está isolado, <strong>todos os aparelhos autorizados</strong> receberão alertas desta câmera.
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
