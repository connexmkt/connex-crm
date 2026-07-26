import { AppShell } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function SemanaLoading() {
  return (
    <AppShell title="Relatórios de Instagram">
      <div className="space-y-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-5 w-56" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    </AppShell>
  );
}
