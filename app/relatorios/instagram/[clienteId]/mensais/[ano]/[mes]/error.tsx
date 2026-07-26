"use client";

import { AppShell } from "@/components/layout";
import { ReportErrorState } from "@/app/relatorios/instagram/components/ReportErrorState";

export default function MensaisMesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppShell title="Relatórios de Instagram">
      <ReportErrorState
        error={error}
        reset={reset}
        message="Não foi possível carregar o relatório deste mês agora. Tente novamente em instantes."
      />
    </AppShell>
  );
}
