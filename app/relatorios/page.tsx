"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, Download, FileText, Loader2 } from "lucide-react";

import { OverviewTab } from "./components/overview-tab";
import { SalesTab } from "./components/sales-tab";
import { CsTab } from "./components/cs-tab";
import { FinancialTab } from "./components/financial-tab";
import { ActivityTab } from "./components/activity-tab";

import type { RelatoriosPayload } from "@/app/api/relatorios/route";

export default function RelatoriosPage() {
  const [dateRange] = useState("Últimos 30 dias");
  const [payload, setPayload] = useState<RelatoriosPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRelatorios() {
      try {
        setLoading(true);
        const res = await fetch("/api/relatorios");
        if (!res.ok) throw new Error(`Erro ${res.status}: ${res.statusText}`);
        const json = await res.json();
        setPayload(json.data as RelatoriosPayload);
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
        <Tabs defaultValue="overview">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="sales">Comercial & Vendas</TabsTrigger>
            <TabsTrigger value="cs">Clientes & CS</TabsTrigger>
            <TabsTrigger value="financial">Financeiro</TabsTrigger>
            <TabsTrigger value="activity">Atividades</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab data={payload.overview} />
          </TabsContent>

          <TabsContent value="sales">
            <SalesTab data={payload.sales} />
          </TabsContent>

          <TabsContent value="cs">
            <CsTab data={payload.cs} />
          </TabsContent>

          <TabsContent value="financial">
            <FinancialTab data={payload.financial} />
          </TabsContent>

          <TabsContent value="activity">
            <ActivityTab data={payload.activity} />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
