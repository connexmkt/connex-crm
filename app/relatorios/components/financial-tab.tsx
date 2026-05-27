"use client";

import { DollarSign, Users, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "./kpi-card";
import type { FinancialData } from "@/app/api/relatorios/route";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

interface FinancialTabProps {
  data: FinancialData;
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
  return `R$ ${value.toLocaleString("pt-BR")}`;
}

export function FinancialTab({ data }: FinancialTabProps) {
  const { ticketMedio, mrr, activeContracts } = data;

  return (
    <div className="space-y-6 pt-4">
      {/* KPIs reais */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          title="Ticket Médio"
          value={formatCurrency(ticketMedio)}
          icon={DollarSign}
        />
        <KpiCard title="MRR" value={formatCurrency(mrr)} icon={DollarSign} />
        <KpiCard
          title="Contratos Ativos"
          value={activeContracts.toString()}
          icon={Users}
        />
      </div>

      {/* Placeholders — LTV e Inadimplência */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold">
                LTV (Lifetime Value)
              </CardTitle>
              <CardDescription>
                Valor médio gerado por cliente no ciclo de vida
              </CardDescription>
            </div>
            <Badge
              variant="secondary"
              className="bg-primary/10 text-primary border-none"
            >
              Em breve
            </Badge>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground max-w-[280px]">
              Disponível quando o histórico de cancelamentos for registrado.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold">
                Inadimplência
              </CardTitle>
              <CardDescription>
                Contratos com pagamentos em atraso
              </CardDescription>
            </div>
            <Badge
              variant="secondary"
              className="bg-primary/10 text-primary border-none"
            >
              Em breve
            </Badge>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground max-w-[280px]">
              Disponível quando a tabela de faturas for implementada.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
