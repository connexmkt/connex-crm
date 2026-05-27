"use client";

import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SalesData } from "@/app/api/relatorios/route";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

interface SalesTabProps {
  data: SalesData;
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
  return `R$ ${value.toLocaleString("pt-BR")}`;
}

const PIE_COLORS = [
  "#5B5FE8",
  "#14B8A6",
  "#F59E0B",
  "#EC4899",
  "#8B5CF6",
  "#EF4444",
];

const tooltipStyle = {
  backgroundColor: "var(--card)",
  borderColor: "var(--border)",
  borderRadius: "8px",
};

const axisTickStyle = { fontSize: 12, fill: "var(--muted-foreground)" };

export function SalesTab({ data }: SalesTabProps) {
  const {
    stageBreakdown,
    stageConversions,
    finalCloseRate,
    sources,
    lostReasons,
  } = data;

  // Exclui 'perdido' do breakdown visual de etapas ativas
  const activeBreakdown = stageBreakdown.filter((s) => s.stage !== "perdido");

  const lostBreakdownItem = stageBreakdown.find((s) => s.stage === "perdido");

  return (
    <div className="space-y-6 pt-4">
      {/* Volume por Etapa */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Volume por Etapa
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {activeBreakdown.map((item) => (
            <Card key={item.stage} className="bg-card border-border">
              <CardContent className="p-4">
                <div
                  className="mb-2 h-1 w-full rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <p className="text-xs font-medium text-muted-foreground truncate">
                  {item.label}
                </p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {item.count}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        {lostBreakdownItem && lostBreakdownItem.count > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {lostBreakdownItem.count} lead
            {lostBreakdownItem.count !== 1 ? "s" : ""} perdido
            {lostBreakdownItem.count !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Taxa de Conversão entre Etapas */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Conversão por Etapa
                </CardTitle>
                <CardDescription>
                  Taxa de avanço entre etapas do funil
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5">
                  <Trophy className="h-4 w-4 text-success" />
                  <span className="text-2xl font-bold text-foreground">
                    {finalCloseRate}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  taxa de fechamento
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stageConversions}
                  layout="vertical"
                  margin={{ left: 0, right: 24 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="rgba(255,255,255,0.05)"
                  />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    axisLine={false}
                    tickLine={false}
                    tick={axisTickStyle}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="from"
                    axisLine={false}
                    tickLine={false}
                    tick={axisTickStyle}
                    width={110}
                  />
                  <Tooltip
                    formatter={(v: number) => [`${v}%`, "Conversão"]}
                    contentStyle={tooltipStyle}
                  />
                  <Bar
                    dataKey="rate"
                    name="Conversão"
                    fill="#5B5FE8"
                    radius={[0, 4, 4, 0]}
                    label={{
                      position: "right",
                      formatter: (v: number) => `${v}%`,
                      fill: "var(--muted-foreground)",
                      fontSize: 11,
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Canais de Origem */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Canais de Origem
            </CardTitle>
            <CardDescription>Leads e fechamentos por fonte</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sources}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgba(255,255,255,0.05)"
                  />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={axisTickStyle}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={axisTickStyle}
                    allowDecimals={false}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: "12px", paddingTop: "16px" }}
                  />
                  <Bar
                    dataKey="count"
                    name="Leads"
                    fill="#5B5FE8"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="won"
                    name="Fechados"
                    fill="#22C55E"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Motivos de Perda */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Motivos de Perda
          </CardTitle>
          <CardDescription>
            Distribuição dos motivos nos leads perdidos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lostReasons.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              Nenhum lead perdido registrado
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <div className="h-[220px] w-[220px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={lostReasons}
                      dataKey="count"
                      nameKey="reason"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                    >
                      {lostReasons.map((_, i) => (
                        <Cell
                          key={i}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v: number, name) => [v, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                {lostReasons.map((item, i) => {
                  const total = lostReasons.reduce((s, x) => s + x.count, 0);
                  const pct =
                    total > 0 ? Math.round((item.count / total) * 100) : 0;
                  return (
                    <div
                      key={item.reason}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{
                            backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                          }}
                        />
                        <span className="truncate text-sm text-foreground">
                          {item.reason}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm shrink-0">
                        <span className="font-medium text-foreground">
                          {item.count}
                        </span>
                        <span
                          className={cn(
                            "w-10 text-right text-xs",
                            "text-muted-foreground",
                          )}
                        >
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
