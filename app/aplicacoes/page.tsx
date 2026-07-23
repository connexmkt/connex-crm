import { requireAuthOrRedirect } from "@/lib/auth/require-auth";
import { AppShell } from "@/components/layout";
import { APLICACOES } from "@/lib/constants/aplicacoes";
import { AplicacaoCard } from "./components/AplicacaoCard";

export default async function AplicacoesPage() {
  await requireAuthOrRedirect();

  return (
    <AppShell title="Aplicações">
      <div className="mx-auto max-w-5xl">
        <p className="mb-6 text-sm text-muted-foreground">
          Aplicações e automações de propriedade da Connex disponíveis para administração.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {APLICACOES.map((aplicacao) => (
            <AplicacaoCard key={aplicacao.slug} aplicacao={aplicacao} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
