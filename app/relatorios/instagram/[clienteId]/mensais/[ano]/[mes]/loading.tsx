import { AppShell } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function MensaisMesLoading() {
  return (
    <AppShell title="Relatórios de Instagram">
      <div className="space-y-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-5 w-48" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
