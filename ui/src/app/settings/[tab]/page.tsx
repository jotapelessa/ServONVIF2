import SettingsPage from "../page";

export const dynamicParams = true;

export function generateStaticParams() {
  return [
    { tab: "vehicles" },
    { tab: "placas" },
    { tab: "lpr" },
    { tab: "devices" },
    { tab: "dispositivos" },
    { tab: "tests" },
    { tab: "testes" },
    { tab: "simulacoes" },
    { tab: "logs" },
    { tab: "diagnostico" },
    { tab: "tv" },
    { tab: "smarttv" },
    { tab: "tablet" },
    { tab: "telegram" },
    { tab: "bot" },
    { tab: "storage" },
    { tab: "armazenamento" },
    { tab: "retencao" },
    { tab: "engine" },
    { tab: "motor" },
    { tab: "buffer" },
    { tab: "backup" },
    { tab: "sistema" },
    { tab: "restauracao" },
    { tab: "guide" },
    { tab: "guia" },
    { tab: "cameras" },
    { tab: "tutorial" },
    { tab: "aitek" },
    { tab: "onvif" },
    { tab: "rtsp" },
    { tab: "zimaos" },
    { tab: "casaos" },
    { tab: "gk3pro" },
    { tab: "jasperlake" },
    { tab: "n5105" },
    { tab: "minipc" },
    { tab: "servidor" },
    { tab: "docker" },
  ];
}

export default function DynamicSettingsTab({ params }: { params: { tab: string } }) {
  return <SettingsPage initialTab={params.tab} />;
}
