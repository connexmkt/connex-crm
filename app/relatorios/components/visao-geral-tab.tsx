"use client";

import { DollarSign, Users, TrendingUp, BarChart2, Clock, Calendar } from "lucide-react";
import { KpiCard } from "./kpi-card";
import { Badge } from "@/components/ui/badge";
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
import type { VisaoGeralData } from "@/app/api/relatorios/route";

interface VisaoGeralTabProps {
  data: VisaoGeralData;
}

function pct(curr: number, prev: number): number {
  if (prev === 0) return 0;
  return Math.round(((curr - prev) / prev) * 100);
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

export function VisaoGeralTab({ data }: VisaoGeralTabProps) {
  const {
    mrr,
    mrrPrev,
    activeClients,
    pipelineLeads,
    pipelineValue,
    conversionRate,
    mrrPlusClientsChart,
    staleItems,
    renewalsNext30,
  } = data;

  return (
    <div className="space-y-6 pt-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="MRR"
          value={formatCurrency(mrr)}
          variation={pct(mrr, mrrPrev)}
          icon={DollarSign}
        />
        <KpiCard
          title="Clientes Ativos"
          value={activeClients.toString()}
          icon={Users}
        />
        <KpiCard
          title="Leads no Pipeline"
          value={pipelineLeads.toString()}
          subValue={`Valor: ${formatCurrency(pipelineValue)}`}
          icon={BarChart2}
        />
        <KpiCard
          title="Taxa de Conversão"
          value={`${conversionRate}%`}
          icon={TrendingUp}
        />
      </div>

      {/* Gráfico dual-axis MRR + Novos Clientes */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            MRR & Leads no Pipeline
          </CardTitle>
          <CardDescription>
            Correlação entre geração de leads e receita mensal recorrente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mrrPlusClientsChart}>
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
                  yAxisId="left"
                  axisLine={false}
                  tickLine={false}
                  tick={axisTickStyle}
                  tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={axisTickStyle}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number, name: string) =>
                    name === "MRR"
                      ? [
                          value.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }),
                          name,
                        ]
                      : [value, name]
                  }
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="mrr"
                  name="MRR"
                  stroke="#5B5FE8"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#5B5FE8", strokeWidth: 2 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="leads"
                  name="Leads no Pipeline"
                  stroke="#14B8A6"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={{ r: 3, fill: "#14B8A6", strokeWidth: 2 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Cards de alerta */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Leads Parados */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning" />
                <CardTitle className="text-base font-semibold">
                  Leads Parados
                </CardTitle>
              </div>
              {staleItems.length > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-warning/10 text-warning border-none"
                >
                  {staleItems.length}
                </Badge>
              )}
            </div>
            <CardDescription>
              Leads sem atualização além do prazo esperado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {staleItems.length === 0 ? (
              <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <span className="text-success">✓</span>
                Nenhum lead parado — tudo em dia
              </div>
            ) : (
              <div className="space-y-2">
                {staleItems.slice(0, 8).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.responsible}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="ml-2 shrink-0 bg-warning/10 text-warning border-none"
                    >
                      {item.daysIdle}d
                    </Badge>
                  </div>
                ))}
                {staleItems.length > 8 && (
                  <p className="pt-1 text-center text-xs text-muted-foreground">
                    + {staleItems.length - 8} leads
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Renovações em 30 dias */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-semibold">
                  Renovações em 30 dias
                </CardTitle>
              </div>
              {renewalsNext30.length > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-primary/10 text-primary border-none"
                >
                  {renewalsNext30.length}
                </Badge>
              )}
            </div>
            <CardDescription>
              Contratos com vencimento nos próximos 30 dias
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renewalsNext30.length === 0 ? (
              <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <span className="text-success">✓</span>
                Nenhuma renovação prevista para os próximos 30 dias
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
                    <span className="shrink-0 text-sm font-semibold text-foreground">
                      {formatCurrency(r.contractValue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
