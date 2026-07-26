import { AppShell } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function SemanaisMesLoading() {
  return (
    <AppShell title="Relatórios de Instagram">
      <div className="space-y-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-5 w-48" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
