import { Atividade } from "@/lib/types";
import { Loader2, History } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

export default function HistoricoTab({ clienteId }: { clienteId: string }) {
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [isLoading, startLoadingTransition] = useTransition();

  const fetchAtividades = useCallback(() => {
    startLoadingTransition(async () => {
      try {
        const res = await fetch(
          `/api/atividades?associacaoTipo=cliente&associacaoId=${clienteId}`,
        );
        if (!res.ok) throw new Error();
        const json = await res.json();
        setAtividades(json.data ?? []);
      } catch {
        toast.error("Falha ao carregar histórico");
      }
    });
  }, [clienteId]);

  useEffect(() => {
    fetchAtividades();
  }, [fetchAtividades]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (atividades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8 text-center">
        <History className="h-8 w-8 text-muted-foreground/30" />
        <p className="mt-2 text-sm text-muted-foreground">
          Nenhuma atividade registrada
        </p>
      </div>
    );
  }

  return (
    <div className="relative space-y-4 pl-4 before:absolute before:left-1.5 before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-border">
      {atividades.map((atividade) => (
        <div key={atividade.id} className="relative flex gap-3">
          <div className="absolute -left-[13px] top-1 h-2.5 w-2.5 rounded-full border-2 border-primary bg-card" />
          <div>
            <p className="text-sm text-foreground">{atividade.descricao}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {new Date(atividade.ocorridoEm).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
