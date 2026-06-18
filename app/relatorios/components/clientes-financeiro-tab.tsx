"use client";

import { useState } from "react";
import {
  DollarSign,
  Users,
  FileText,
  Heart,
  AlertTriangle,
  XCircle,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { KpiCard } from "./kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ClientesData, ClientSummary } from "@/app/api/relatorios/route";

interface ClientesFinanceiroTabProps {
  data: ClientesData;
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
  return `R$ ${value.toLocaleString("pt-BR")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const tooltipStyle = {
  backgroundColor: "var(--card)",
  borderColor: "var(--border)",
  borderRadius: "8px",
};

const axisTickStyle = { fontSize: 12, fill: "var(--muted-foreground)" };

interface ClientListProps {
  clients: ClientSummary[];
  emptyMessage: string;
}

function ClientList({ clients, emptyMessage }: ClientListProps) {
  if (clients.length === 0) {
    return (
      <p className="py-3 text-sm text-muted-foreground">{emptyMessage}</p>
    );
  }
  return (
    <div className="mt-3 space-y-1.5">
      {clients.map((c) => (
        <div
          key={c.id}
          className="flex items-center justify-between rounded-md border border-border px-3 py-2"
        >
          <span className="truncate text-sm text-foreground">{c.name}</span>
          <span className="ml-3 shrink-0 text-xs text-muted-foreground">
            {formatCurrency(c.contractValue)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ClientesFinanceiroTab({ data }: ClientesFinanceiroTabProps) {
  const {
    ticketMedio,
    mrr,
    activeContracts,
    revenueVsChurn,
    healthScore,
    clientsByHealth,
    renewalsNext30,
    renewalsNext60,
  } = data;

  const [expandedHealth, setExpandedHealth] = useState<
    "healthy" | "atRisk" | "inactive" | null
  >(null);

  const totalClients = healthScore.green + healthScore.yellow + healthScore.red;

  const healthItems = [
    {
      key: "healthy" as const,
      label: "Saudável",
      count: healthScore.green,
      clients: clientsByHealth.healthy,
      icon: Heart,
      color: "text-success",
      bg: "bg-success/10",
      border: "border-success/20",
    },
    {
      key: "atRisk" as const,
      label: "Em Risco",
      count: healthScore.yellow,
      clients: clientsByHealth.atRisk,
      icon: AlertTriangle,
      color: "text-warning",
      bg: "bg-warning/10",
      border: "border-warning/20",
    },
    {
      key: "inactive" as const,
      label: "Inativo",
      count: healthScore.red,
      clients: clientsByHealth.inactive,
      icon: XCircle,
      color: "text-danger",
      bg: "bg-danger/10",
      border: "border-danger/20",
    },
  ];

  const hasChurnData = revenueVsChurn.some((r) => r.gained > 0 || r.churned > 0);

  return (
    <div className="space-y-6 pt-4">
      {/* Cards financeiros */}
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

      {/* Receita vs Churn */}
      {hasChurnData ? (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Receita Ganha vs Perdida
            </CardTitle>
            <CardDescription>
              MRR de novos contratos vs MRR perdido por mês — crescimento
              líquido do negócio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueVsChurn}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgba(255,255,255,0.05)"
                  />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={axisTickStyle}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={axisTickStyle}
                    tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number, name) => [
                      v.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }),
                      name,
                    ]}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="gained"
                    name="MRR Ganho"
                    stroke="#22C55E"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#22C55E", strokeWidth: 2 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="churned"
                    name="MRR Perdido"
                    stroke="#EF4444"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={{ r: 3, fill: "#EF4444", strokeWidth: 2 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold">
                Receita Ganha vs Perdida (Churn)
              </CardTitle>
              <CardDescription>
                Evolução mensal de MRR ganho e MRR perdido
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
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="max-w-[280px] text-sm text-muted-foreground">
              Requer histórico de cancelamentos com data e valor de contrato
              encerrado.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Health Score */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Health Score
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {healthItems.map((item) => {
            const share =
              totalClients > 0
                ? Math.round((item.count / totalClients) * 100)
                : 0;
            const isExpanded = expandedHealth === item.key;

            return (
              <Card
                key={item.key}
                className={cn("border", item.border, "bg-card")}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="text-3xl font-bold text-foreground">
                        {item.count}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {share}% do total
                      </p>
                    </div>
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg",
                        item.bg,
                      )}
                    >
                      <item.icon className={cn("h-5 w-5", item.color)} />
                    </div>
                  </div>
                  {item.count > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-3 h-7 w-full justify-between px-2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        setExpandedHealth(isExpanded ? null : item.key)
                      }
                    >
                      Ver clientes
                      {isExpanded ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                  {isExpanded && (
                    <ClientList
                      clients={item.clients}
                      emptyMessage="Nenhum cliente nesta categoria"
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Renovações */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-warning" />
                <CardTitle className="text-base font-semibold">
                  Renovações em 30 dias
                </CardTitle>
              </div>
              <Badge
                variant="secondary"
                className="bg-warning/10 text-warning border-none"
              >
                {renewalsNext30.length}
              </Badge>
            </div>
            <CardDescription>
              Contratos com vencimento nos próximos 30 dias
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renewalsNext30.length === 0 ? (
              <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Nenhuma renovação prevista
              </div>
            ) : (
              <div className="space-y-2">
                {renewalsNext30.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {r.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(r.renewalDate)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      {formatCurrency(r.contractValue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-semibold">
                  Renovações em 60 dias
                </CardTitle>
              </div>
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary border-none"
              >
                {renewalsNext60.length}
              </Badge>
            </div>
            <CardDescription>
              Contratos com vencimento entre 31 e 60 dias
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renewalsNext60.length === 0 ? (
              <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Nenhuma renovação prevista
              </div>
            ) : (
              <div className="space-y-2">
                {renewalsNext60.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {r.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(r.renewalDate)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      {formatCurrency(r.contractValue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Placeholders Em Breve */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="max-w-[280px] text-sm text-muted-foreground">
              Contratos com pagamento em atraso há mais de X dias — disponível
              quando a tabela de faturas for implementada.
            </p>
          </CardContent>
        </Card>

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
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="max-w-[280px] text-sm text-muted-foreground">
              Requer histórico de cancelamentos — disponível quando os dados de
              encerramento de contrato forem registrados.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
