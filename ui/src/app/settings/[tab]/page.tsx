import SettingsPage from "../page";

export function generateStaticParams() {
  return [
    { tab: "telegram" },
    { tab: "backup" },
    { tab: "placas" },
    { tab: "vehicles" },
    { tab: "devices" },
    { tab: "dispositivos" },
    { tab: "logs" },
    { tab: "tv" },
    { tab: "storage" },
    { tab: "armazenamento" },
    { tab: "engine" },
    { tab: "motor" },
    { tab: "tests" },
    { tab: "testes" },
    { tab: "guia" },
    { tab: "guide" },
    { tab: "cameras" },
    { tab: "tutorial" },
    { tab: "aitek" },
  ];
}

export default function DynamicSettingsTab({ params }: { params: { tab: string } }) {
  return <SettingsPage initialTab={params.tab} />;
}
