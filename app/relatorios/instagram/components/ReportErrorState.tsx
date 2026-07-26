"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReportErrorStateProps {
  error: Error & { digest?: string };
  reset: () => void;
  message?: string;
}

/**
 * Corpo compartilhado dos `error.tsx` desta feature — mensagem amigável sem
 * termos técnicos e botão "Tentar novamente" via `reset()` (FR-022). Uma
 * falha em um nível/cliente não deve afetar os demais (FR-023): cada
 * segmento de rota tem seu próprio `error.tsx`, isolando o erro.
 */
export function ReportErrorState({ error, reset, message }: ReportErrorStateProps) {
  useEffect(() => {
    console.error(
      JSON.stringify({ scope: "instagram-reports-ui", errorMessage: error.message, digest: error.digest }),
    );
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
      <AlertTriangle className="h-8 w-8 text-destructive" />
      <p className="max-w-md text-sm text-muted-foreground">
        {message ??
          "Não foi possível carregar os relatórios de Instagram agora. Tente novamente em instantes."}
      </p>
      <Button onClick={() => reset()}>Tentar novamente</Button>
    </div>
  );
}
