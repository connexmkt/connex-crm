import { AppShell } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClienteInstagramLoading() {
  return (
    <AppShell title="Relatórios de Instagram">
      <div className="space-y-6">
        <Skeleton className="h-4 w-48" />
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <Skeleton className="h-5 w-24 rounded-md" />
        </div>
        <Skeleton className="h-9 w-48 rounded-lg" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
