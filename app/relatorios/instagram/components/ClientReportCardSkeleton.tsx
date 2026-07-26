import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton do `ClientReportCard`, exibido em `loading.tsx` (FR-021). */
export function ClientReportCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border pt-3">
        <Skeleton className="h-5 w-24 rounded-md" />
        <Skeleton className="h-3 w-28" />
      </div>
    </div>
  );
}
