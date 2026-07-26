import { AppShell } from "@/components/layout";
import { ClientReportCardSkeleton } from "./components/ClientReportCardSkeleton";

export default function InstagramReportsLoading() {
  return (
    <AppShell title="Relatórios de Instagram">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <ClientReportCardSkeleton key={index} />
        ))}
      </div>
    </AppShell>
  );
}
