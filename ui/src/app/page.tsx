"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { CameraGrid } from "@/components/camera/CameraGrid";
import { ROIDrawer } from "@/components/roi/ROIDrawer";
import { CameraSpotlightModal } from "@/components/camera/CameraSpotlightModal";
import { useCameraStore } from "@/store/useCameraStore";
import { Camera, apiClient } from "@/lib/api-client";
import {
  Loader2,
  Plus,
  Scan,
  X,
  Video,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Radio,
  Layers,
  Network,
} from "lucide-react";

export default function Dashboard() {
  const { cameras, loading, fetchCameras } = useCameraStore();
  const [selectedROICamera, setSelectedROICamera] = useState<Camera | null>(null);
  const [selectedSpotlightCamera, setSelectedSpotlightCamera] = useState<Camera | null>(null);
  const [selectedDeleteCamera, setSelectedDeleteCamera] = useState<Camera | null>(null);
  const [isDeletingCamera, setIsDeletingCamera] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Scan Modal States
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scannedCameras, setScannedCameras] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isAddingBatch, setIsAddingBatch] = useState(false);

  // Manual Add Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCameraName, setNewCameraName] = useState("");
  const [newCameraRTSP, setNewCameraRTSP] = useState("");
  const [newCameraSensitivity, setNewCameraSensitivity] = useState(0.03);

  useEffect(() => {
    fetchCameras();
  }, [fetchCameras]);

  const handleScan = async () => {
    setIsScanModalOpen(true);
    setIsScanning(true);
    setScannedCameras([]);
    try {
      const results = await apiClient.scanCameras();
      setScannedCameras(results);
    } catch (e) {
      console.error("Scan failed:", e);
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddFromScan = async (scanned: any) => {
    try {
      await apiClient.createCamera({
        name: scanned.name,
        rtsp_url: scanned.default_rtsp,
        ip_address: scanned.ip,
        is_active: true,
        sensitivity: 0.03,
      });
      await fetchCameras();
    } catch (e) {
      console.error(e);
      alert("Erro ao adicionar câmera");
    }
  };

  const handleAddAllScanned = async () => {
    const unadded = scannedCameras.filter(
      (sc) => !cameras.some((c) => c.rtsp_url === sc.default_rtsp || (c.ip_address && c.ip_address === sc.ip))
    );
    if (unadded.length === 0) return;

    setIsAddingBatch(true);
    try {
      for (const sc of unadded) {
        await apiClient.createCamera({
          name: sc.name,
          rtsp_url: sc.default_rtsp,
          ip_address: sc.ip,
          is_active: true,
          sensitivity: 0.03,
        });
      }
      await fetchCameras();
      setIsScanModalOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAddingBatch(false);
    }
  };

  const handleCreateManualCamera = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCameraName || !newCameraRTSP) return;

    try {
      await apiClient.createCamera({
        name: newCameraName,
        rtsp_url: newCameraRTSP,
        sensitivity: Number(newCameraSensitivity),
        is_active: true,
      });
      await fetchCameras();
      setIsAddModalOpen(false);
      setNewCameraName("");
      setNewCameraRTSP("");
    } catch (e) {
      console.error(e);
      alert("Erro ao cadastrar câmera");
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedDeleteCamera) return;
    setIsDeletingCamera(true);
    try {
      await apiClient.deleteCamera(selectedDeleteCamera.id);
      setSelectedDeleteCamera(null);
      await fetchCameras();
    } catch (e) {
      console.error(e);
      alert("Erro ao excluir câmera");
    } finally {
      setIsDeletingCamera(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#0b0f19]">
      {/* App Header */}
      <Header
        onScanClick={handleScan}
        onAddCameraClick={() => setIsAddModalOpen(true)}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Central Camera Grid Area */}
        <main className="flex-1 p-5 overflow-y-auto min-w-0">
          {loading && cameras.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span className="text-xs text-slate-400">Carregando câmeras...</span>
            </div>
          ) : (
            <CameraGrid
              cameras={cameras}
              onOpenROI={(cam) => setSelectedROICamera(cam)}
              onSpotlight={(cam) => setSelectedSpotlightCamera(cam)}
              onDeleteCamera={(cam) => setSelectedDeleteCamera(cam)}
              onAddCameraClick={() => setIsAddModalOpen(true)}
            />
          )}
        </main>

        {/* Collapsible Real-time Event Sidebar */}
        <Sidebar isOpen={isSidebarOpen} />
      </div>

      {/* Camera Spotlight Modal */}
      {selectedSpotlightCamera && (
        <CameraSpotlightModal
          camera={selectedSpotlightCamera}
          onClose={() => setSelectedSpotlightCamera(null)}
          onOpenROI={(cam) => {
            setSelectedSpotlightCamera(null);
            setSelectedROICamera(cam);
          }}
          onUpdateSensitivity={async (camId, sens) => {
            try {
              await fetchCameras();
            } catch (e) {
              console.error(e);
            }
          }}
        />
      )}

      {/* ROI Drawer Modal */}
      {selectedROICamera && (
        <ROIDrawer
          camera={selectedROICamera}
          onClose={() => setSelectedROICamera(null)}
          onSaved={() => fetchCameras()}
        />
      )}

      {/* Delete Camera Confirmation Safety Modal */}
      {selectedDeleteCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="card-dark rounded-2xl w-full max-w-md p-6 shadow-2xl border border-rose-500/30 space-y-4">
            <div className="flex items-center gap-3 text-rose-400 pb-3 border-b border-white/10">
              <div className="p-2.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Remover Câmera do Sistema</h3>
                <p className="text-[11px] text-slate-400">O fluxo RTSP e zonas de detecção serão encerrados.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 leading-relaxed">
              Deseja realmente excluir a câmera <strong>{selectedDeleteCamera.name}</strong>?
              <div className="mt-1 font-mono text-[11px] text-slate-400">
                URL: {selectedDeleteCamera.rtsp_url}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSelectedDeleteCamera(null)}
                disabled={isDeletingCamera}
                className="h-8 px-4 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeletingCamera}
                className="flex items-center gap-1.5 h-8 px-4 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition shadow-md shadow-rose-600/20 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingCamera ? "Removendo..." : "Sim, Remover Câmera"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Network Universal Scan Modal */}
      {isScanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="card-dark rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 border border-white/10 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-blue-400 animate-pulse" />
                <div>
                  <h3 className="font-bold text-white text-sm">Scanner Universal de Câmeras</h3>
                  <p className="text-[10px] text-slate-400">Varredura automática ONVIF (Porta 3702) e RTSP (554/8554)</p>
                </div>
              </div>
              <button
                onClick={() => setIsScanModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scanned List Area */}
            <div className="flex-1 overflow-y-auto space-y-2.5 min-h-[180px] p-1">
              {isScanning ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  <div className="text-center">
                    <p className="text-xs font-semibold text-white">Varrendo toda a sub-rede local...</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Testando portas RTSP e pacotes WS-Discovery</p>
                  </div>
                </div>
              ) : scannedCameras.length > 0 ? (
                scannedCameras.map((dev, idx) => {
                  const alreadyAdded = cameras.some(
                    (c) => c.rtsp_url === dev.default_rtsp || (c.ip_address && c.ip_address === dev.ip)
                  );

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                          <Network className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-white">{dev.name}</h4>
                            <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {dev.type}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">{dev.default_rtsp}</p>
                        </div>
                      </div>

                      <div>
                        {alreadyAdded ? (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Conectada
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAddFromScan(dev)}
                            className="h-7 px-3 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition shadow-sm"
                          >
                            Adicionar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-xs text-slate-400 space-y-1">
                  <p className="font-semibold text-white">Nenhum dispositivo detectado na rede local.</p>
                  <p className="text-[11px] text-slate-500">Verifique se suas câmeras estão na mesma rede Wi-Fi/cabeada.</p>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10 shrink-0">
              <button
                onClick={handleScan}
                disabled={isScanning}
                className="h-8 px-3 text-xs font-semibold text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-600 border border-blue-500/30 rounded-lg transition disabled:opacity-50"
              >
                Escanear Novamente
              </button>

              <div className="flex items-center gap-2">
                {scannedCameras.length > 0 && (
                  <button
                    onClick={handleAddAllScanned}
                    disabled={isAddingBatch}
                    className="h-8 px-3.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition shadow-md shadow-blue-600/20 disabled:opacity-50"
                  >
                    {isAddingBatch ? "Adicionando..." : "Adicionar Todas"}
                  </button>
                )}
                <button
                  onClick={() => setIsScanModalOpen(false)}
                  className="h-8 px-4 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-lg transition"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Camera Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCreateManualCamera}
            className="card-dark rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 border border-white/10"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-blue-400" />
                <h3 className="font-semibold text-white text-sm">Adicionar Câmera RTSP Manual</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nome da Câmera
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Portão Principal"
                  value={newCameraName}
                  onChange={(e) => setNewCameraName(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  URL RTSP (H.264)
                </label>
                <input
                  type="text"
                  required
                  placeholder="rtsp://admin:pass@192.168.1.100:554/stream1"
                  value={newCameraRTSP}
                  onChange={(e) => setNewCameraRTSP(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">
                    Sensibilidade MOG2
                  </label>
                  <span className="text-xs font-mono text-blue-400">
                    {(newCameraSensitivity * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.10"
                  step="0.005"
                  value={newCameraSensitivity}
                  onChange={(e) => setNewCameraSensitivity(parseFloat(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="h-8 px-4 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="h-8 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded transition"
              >
                Salvar Câmera
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
