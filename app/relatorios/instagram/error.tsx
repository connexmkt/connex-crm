"use client";

import { AppShell } from "@/components/layout";
import { ReportErrorState } from "./components/ReportErrorState";

export default function InstagramReportsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppShell title="Relatórios de Instagram">
      <ReportErrorState error={error} reset={reset} />
    </AppShell>
  );
}
