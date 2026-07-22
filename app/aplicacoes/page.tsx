import { requireAdminOrRedirect } from "@/lib/auth/require-admin";
import { AppShell } from "@/components/layout";
import { APLICACOES } from "@/lib/constants/aplicacoes";
import { AplicacaoCard } from "./components/AplicacaoCard";

export default async function AplicacoesPage() {
  // FR-004 / SEC-002: somente Admin acessa /aplicacoes; demais papéis são
  // redirecionados para fora da página, mesmo via acesso direto pela URL.
  await requireAdminOrRedirect();

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
