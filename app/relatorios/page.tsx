"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, Download, FileText, Loader2 } from "lucide-react";

import { VisaoGeralTab } from "./components/visao-geral-tab";
import { PipelineVendasTab } from "./components/pipeline-vendas-tab";
import { ClientesFinanceiroTab } from "./components/clientes-financeiro-tab";

import type { RelatoriosPayloadV2 } from "@/app/api/relatorios/route";

export default function RelatoriosPage() {
  const [dateRange] = useState("Últimos 30 dias");
  const [payload, setPayload] = useState<RelatoriosPayloadV2 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRelatorios() {
      try {
        setLoading(true);
        const res = await fetch("/api/relatorios");
        if (!res.ok) throw new Error(`Erro ${res.status}: ${res.statusText}`);
        const json = await res.json();
        setPayload(json.data as RelatoriosPayloadV2);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao carregar relatórios",
        );
      } finally {
        setLoading(false);
      }
    }

    fetchRelatorios();
  }, []);

  if (loading) {
    return (
      <AppShell title="Relatórios">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (error || !payload) {
    return (
      <AppShell title="Relatórios">
        <div className="flex h-64 flex-col items-center justify-center gap-4">
          <p className="text-sm text-muted-foreground">
            {error ?? "Não foi possível carregar os dados."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            Tentar novamente
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Relatórios">
      <div className="space-y-6">
        {/* Header com filtros e exportação */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <CalendarIcon className="h-4 w-4" />
              {dateRange}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <FileText className="h-4 w-4" />
              CSV
            </Button>
            <Button
              variant="default"
              size="sm"
              className="h-9 gap-2 bg-primary text-primary-foreground"
            >
              <Download className="h-4 w-4" />
              Exportar PDF
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="visao-geral">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
            <TabsTrigger value="pipeline-vendas">Pipeline & Vendas</TabsTrigger>
            <TabsTrigger value="clientes-financeiro">
              Clientes & Financeiro
            </TabsTrigger>
          </TabsList>

          <TabsContent value="visao-geral">
            <VisaoGeralTab data={payload.visaoGeral} />
          </TabsContent>

          <TabsContent value="pipeline-vendas">
            <PipelineVendasTab data={payload.pipeline} />
          </TabsContent>

          <TabsContent value="clientes-financeiro">
            <ClientesFinanceiroTab data={payload.clientes} />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
