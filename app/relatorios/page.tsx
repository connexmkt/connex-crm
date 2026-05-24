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
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line,
  Legend,
} from "recharts";

import {
  Download,
  Share2,
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
  FunnelItem,
  RevenueItem,
  ClientReportItem,
  KpiData,
} from "@/app/api/relatorios/route";

const COLORS = ["#5B5FE8", "#14B8A6", "#8B5CF6", "#22C55E", "#F59E0B"];

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
        setError(err instanceof Error ? err.message : "Erro ao carregar relatórios");
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
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
        </div>
      </AppShell>
    );
  }

  const { kpiData, clientGrowthData, channelData, funnelData, revenueData, clientReports } =
    payload;

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

          {/* Funnel Distribution Chart */}
          <FunnelDistributionChart data={funnelData} />

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
            <p className="font-heading text-2xl font-bold text-foreground">{value}</p>
            <div className="flex items-center gap-1">
              {isPositive ? (
                <TrendingUp
                  className={cn("h-4 w-4", isGood ? "text-success" : "text-danger")}
                />
              ) : (
                <TrendingUp
                  className={cn("h-4 w-4 rotate-180", isGood ? "text-success" : "text-danger")}
                />
              )}
              <span
                className={cn("text-sm font-medium", isGood ? "text-success" : "text-danger")}
              >
                {isPositive ? "+" : ""}
                {variation}%
              </span>
              <span className="text-xs text-muted-foreground ml-1">vs mês anterior</span>
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
        <CardTitle className="text-base font-semibold">Crescimento de Clientes</CardTitle>
        <CardDescription>Evolução da base de clientes ativos</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorClients" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5B5FE8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#5B5FE8" stopOpacity={0} />
                </linearGradient>
              </defs>
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
                contentStyle={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                  borderRadius: "8px",
                }}
              />
              <Area
                type="monotone"
                dataKey="clients"
                stroke="#5B5FE8"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorClients)"
              />
            </AreaChart>
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
        <CardTitle className="text-base font-semibold">Performance por Canal</CardTitle>
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
              <Bar dataKey="leads" name="Leads" fill="#5B5FE8" radius={[4, 4, 0, 0]} />
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

function FunnelDistributionChart({ data }: { data: FunnelItem[] }) {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Distribuição do Funil</CardTitle>
        <CardDescription>Volume de leads por etapa do pipeline</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                  borderRadius: "8px",
                }}
              />
              <Legend
                iconType="circle"
                layout="vertical"
                align="right"
                verticalAlign="middle"
                wrapperStyle={{ fontSize: "12px" }}
              />
            </PieChart>
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
        <CardTitle className="text-base font-semibold">Faturamento Mensal</CardTitle>
        <CardDescription>Comparativo de faturamento mês a mês</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
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
              <Bar dataKey="value" name="Atual" fill="#5B5FE8" radius={[4, 4, 0, 0]} />
              <Line
                type="monotone"
                dataKey="previous"
                name="Anterior"
                stroke="#F59E0B"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </ComposedChart>
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
      <CardHeader>
        <CardTitle className="text-base font-semibold">Relatório por Cliente</CardTitle>
        <CardDescription>Detalhamento de performance individual</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Campanha Ativa
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Leads
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Taxa Conv.
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  ROI Estimado
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {reports.map((report) => (
                <tr
                  key={report.id}
                  className="hover:bg-primary/5 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                        {report.name[0]}
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {report.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-muted-foreground">
                      {report.activeCampaign ?? "Nenhuma"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-foreground">{report.leads}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-foreground">{report.convRate}%</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-success">
                      {report.roi > 0 ? `${report.roi}x` : "-"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-2 py-0",
                        report.status === "Ativo"
                          ? "bg-success/10 text-success border-success/20"
                          : report.status === "Em risco"
                            ? "bg-warning/10 text-warning border-warning/20"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {report.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
