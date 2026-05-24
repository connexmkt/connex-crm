"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";

import {
  Download,
  FileText,
  TrendingUp,
  Users,
  Target,
  Zap,
  Calendar as CalendarIcon,
  Loader2,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import type {
  RelatoriosPayload,
  ClientGrowthItem,
  ChannelItem,
  RevenueItem,
  ClientReportItem,
} from "@/app/api/relatorios/route";

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

  const { kpiData, clientGrowthData, channelData, revenueData, clientReports } = payload;

  return (
    <AppShell title="Relatórios">
      <div className="space-y-6">
        {/* Header with filters and export */}
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

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Total Investido"
            value={`R$ ${kpiData.totalInvestido.toLocaleString("pt-BR")}`}
            variation={kpiData.investidoVariacao}
            icon={Target}
          />
          <KpiCard
            title="Leads Gerados"
            value={kpiData.totalLeads.toString()}
            variation={kpiData.leadsVariacao}
            icon={Users}
          />
          <KpiCard
            title="Custo por Lead (CPL)"
            value={`R$ ${kpiData.cpl.toFixed(2)}`}
            variation={kpiData.cplVariacao}
            icon={Zap}
            inverse
          />
          <KpiCard
            title="Taxa de Conversão"
            value={`${kpiData.taxaConversao.toFixed(1)}%`}
            variation={kpiData.taxaConversaoVariacao}
            icon={TrendingUp}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Client Growth Chart */}
          <ClientGrowthChart data={clientGrowthData} />

          {/* Channel Performance Chart */}
          <ChannelPerformanceChart data={channelData} />

          {/* Revenue vs Previous Chart */}
          <RevenueChart data={revenueData} />
        </div>

        {/* Client Report Table */}
        <ClientReportTable reports={clientReports} />
      </div>
    </AppShell>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  title,
  value,
  variation,
  icon: Icon,
  inverse = false,
}: {
  title: string;
  value: string;
  variation: number;
  icon: React.ElementType;
  inverse?: boolean;
}) {
  const isPositive = variation >= 0;
  const isGood = inverse ? !isPositive : isPositive;

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="font-heading text-2xl font-bold text-foreground">
              {value}
            </p>
            <div className="flex items-center gap-1">
              {isPositive ? (
                <TrendingUp
                  className={cn(
                    "h-4 w-4",
                    isGood ? "text-success" : "text-danger",
                  )}
                />
              ) : (
                <TrendingUp
                  className={cn(
                    "h-4 w-4 rotate-180",
                    isGood ? "text-success" : "text-danger",
                  )}
                />
              )}
              <span
                className={cn(
                  "text-sm font-medium",
                  isGood ? "text-success" : "text-danger",
                )}
              >
                {isPositive ? "+" : ""}
                {variation}%
              </span>
              <span className="text-xs text-muted-foreground ml-1">
                vs mês anterior
              </span>
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Charts ────────────────────────────────────────────────────────────────────

function ClientGrowthChart({ data }: { data: ClientGrowthItem[] }) {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Crescimento de Leads
        </CardTitle>
        <CardDescription>Leads ativos no pipeline por mês</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(255,255,255,0.05)"
              />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.05)" }}
                contentStyle={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                  borderRadius: "8px",
                }}
              />
              <Bar
                dataKey="leads"
                name="Leads ativos"
                fill="#5B5FE8"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function ChannelPerformanceChart({ data }: { data: ChannelItem[] }) {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Performance por Canal
        </CardTitle>
        <CardDescription>Leads e conversões por plataforma</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(255,255,255,0.05)"
              />
              <XAxis
                dataKey="channel"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                  borderRadius: "8px",
                }}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }}
              />
              <Bar
                dataKey="leads"
                name="Leads"
                fill="#5B5FE8"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="conversions"
                name="Conversões"
                fill="#14B8A6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function RevenueChart({ data }: { data: RevenueItem[] }) {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Faturamento Mensal
        </CardTitle>
        <CardDescription>Faturamento mensal (contratos ativos)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(255,255,255,0.05)"
              />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number) =>
                  value.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })
                }
                contentStyle={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                  borderRadius: "8px",
                }}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }}
              />
              <Line
                type="monotone"
                dataKey="value"
                name="Faturamento"
                stroke="#5B5FE8"
                strokeWidth={3}
                dot={{ r: 4, fill: "#5B5FE8", strokeWidth: 2 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Client Report Table ───────────────────────────────────────────────────────

function ClientReportTable({ reports }: { reports: ClientReportItem[] }) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">
            Relatório por Cliente
          </CardTitle>
          <CardDescription>
            Detalhamento de performance individual
          </CardDescription>
        </div>
        <Badge
          variant="secondary"
          className="bg-primary/10 text-primary border-none"
        >
          Em breve
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
          <FileText className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground">
          Relatório por Cliente
        </h3>
        <p className="text-sm text-muted-foreground max-w-[280px] mt-1">
          Em breve — detalhamento individual de performance por cliente.
        </p>
      </CardContent>
    </Card>
  );
}
