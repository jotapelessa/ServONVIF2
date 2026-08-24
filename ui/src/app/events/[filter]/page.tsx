import EventsPage from "../page";

export function generateStaticParams() {
  return [
    { filter: "todos" },
    { filter: "all" },
    { filter: "placas" },
    { filter: "plates" },
    { filter: "pessoas" },
    { filter: "persons" },
    { filter: "videos" },
    { filter: "mp4" },
  ];
}

export default function DynamicEventsFilter({ params }: { params: { filter: string } }) {
  return <EventsPage initialFilter={params.filter} />;
}
