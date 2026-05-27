"use client";

import { DollarSign, Users, TrendingUp, BarChart2 } from "lucide-react";
import { KpiCard } from "./kpi-card";
import type { OverviewData } from "@/app/api/relatorios/route";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

interface OverviewTabProps {
  data: OverviewData;
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

export function OverviewTab({ data }: OverviewTabProps) {
  const {
    mrr,
    mrrPrev,
    activeClients,
    pipelineLeads,
    pipelineValue,
    conversionRate,
    revenueByMonth,
    leadsByMonth,
  } = data;

  const tooltipStyle = {
    backgroundColor: "var(--card)",
    borderColor: "var(--border)",
    borderRadius: "8px",
  };

  const axisTickStyle = { fontSize: 12, fill: "var(--muted-foreground)" };

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

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* MRR Mensal */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              MRR Mensal
            </CardTitle>
            <CardDescription>
              Receita mensal recorrente (contratos ativos)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueByMonth}>
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
                    formatter={(v: number) =>
                      v.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })
                    }
                    contentStyle={tooltipStyle}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name="MRR"
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

        {/* Crescimento de Leads */}
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
                <BarChart data={leadsByMonth}>
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
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                    contentStyle={tooltipStyle}
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
      </div>
    </div>
  );
}
