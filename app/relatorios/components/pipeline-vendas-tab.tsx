"use client";

import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import type { PipelineData } from "@/app/api/relatorios/route";

interface PipelineVendasTabProps {
  data: PipelineData;
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

export function PipelineVendasTab({ data }: PipelineVendasTabProps) {
  const {
    stageBreakdown,
    funnelConversions,
    finalCloseRate,
    sources,
    lostReasons,
    lostLeadsDetail,
    leaderboard,
  } = data;

  const activeBreakdown = stageBreakdown.filter((s) => s.stage !== "perdido");
  const lostBreakdownItem = stageBreakdown.find((s) => s.stage === "perdido");
  const maxCount = Math.max(...activeBreakdown.map((s) => s.count), 1);

  return (
    <div className="space-y-6 pt-4">
      {/* Volume por Etapa */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
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
                <p className="truncate text-xs font-medium text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {item.count}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatCurrency(item.totalValue)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        {lostBreakdownItem && lostBreakdownItem.count > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {lostBreakdownItem.count} lead
            {lostBreakdownItem.count !== 1 ? "s" : ""} perdido
            {lostBreakdownItem.count !== 1 ? "s" : ""} —{" "}
            {formatCurrency(lostBreakdownItem.totalValue)}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Funil de Conversão Visual */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Funil de Conversão
                </CardTitle>
                <CardDescription>
                  Taxa de avanço entre etapas do processo comercial
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5">
                  <Trophy className="h-4 w-4 text-warning" />
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
            {activeBreakdown.every((s) => s.count === 0) ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                Sem leads no pipeline
              </div>
            ) : (
              <div className="space-y-1 pt-2">
                {activeBreakdown.map((stage, i) => {
                  const widthPct =
                    maxCount > 0
                      ? Math.max(20, Math.round((stage.count / maxCount) * 100))
                      : 20;
                  const conv = funnelConversions[i];
                  return (
                    <div key={stage.stage}>
                      <div className="flex items-center gap-3">
                        <span className="w-28 shrink-0 truncate text-right text-xs text-muted-foreground">
                          {stage.label}
                        </span>
                        <div className="relative flex-1">
                          <div
                            className="flex h-8 items-center justify-end rounded px-3 transition-all"
                            style={{
                              width: `${widthPct}%`,
                              backgroundColor: stage.color,
                              minWidth: "2.5rem",
                            }}
                          >
                            <span className="text-xs font-bold text-white">
                              {stage.count}
                            </span>
                          </div>
                        </div>
                      </div>
                      {conv && (
                        <div className="flex items-center gap-3 py-0.5">
                          <span className="w-28 shrink-0" />
                          <span className="text-xs text-muted-foreground">
                            ↓{" "}
                            <span
                              className={cn(
                                "font-medium",
                                conv.rate >= 50
                                  ? "text-success"
                                  : conv.rate >= 25
                                    ? "text-warning"
                                    : "text-danger",
                              )}
                            >
                              {conv.rate}%
                            </span>{" "}
                            avançaram para {conv.to}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Canais de Origem */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Canais de Origem
            </CardTitle>
            <CardDescription>
              Volume de leads captados e fechados por canal
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sources.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                Nenhum dado de canal disponível
              </div>
            ) : (
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
                      name="Leads captados"
                      fill="#5B5FE8"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="won"
                      name="Leads fechados"
                      fill="#22C55E"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
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
            Distribuição e detalhe dos leads perdidos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lostReasons.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              Nenhum lead perdido com motivo registrado
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-6 sm:flex-row">
                <div className="h-[200px] w-[200px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={lostReasons}
                        dataKey="count"
                        nameKey="reason"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
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
                    const share =
                      total > 0 ? Math.round((item.count / total) * 100) : 0;
                    return (
                      <div
                        key={item.reason}
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="flex min-w-0 items-center gap-2">
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
                        <div className="flex shrink-0 items-center gap-3 text-sm">
                          <span className="font-medium text-foreground">
                            {item.count}
                          </span>
                          <span className="w-10 text-right text-xs text-muted-foreground">
                            {share}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tabela de leads perdidos */}
              {lostLeadsDetail.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                    Leads perdidos
                  </h3>
                  <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                            Lead
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                            Motivo
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                            Responsável
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {lostLeadsDetail.map((item, idx) => (
                          <tr
                            key={item.id}
                            className={idx % 2 === 0 ? "" : "bg-muted/20"}
                          >
                            <td className="px-4 py-2 font-medium text-foreground">
                              {item.name}
                            </td>
                            <td className="px-4 py-2 text-muted-foreground">
                              {item.reason}
                            </td>
                            <td className="px-4 py-2 text-muted-foreground">
                              {item.responsible}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leaderboard de Vendas */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-warning" />
            <CardTitle className="text-base font-semibold">
              Leaderboard de Vendas
            </CardTitle>
          </div>
          <CardDescription>
            Ranking por negócios fechados e valor gerado no período
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leaderboard.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum negócio fechado registrado no período
            </p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry, i) => (
                <div
                  key={entry.userId}
                  className="flex items-center gap-4 rounded-lg border border-border p-3"
                >
                  <span className="w-5 shrink-0 text-center text-sm font-bold text-muted-foreground">
                    {i + 1}
                  </span>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {entry.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {entry.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.dealsWon} negócio
                      {entry.dealsWon !== 1 ? "s" : ""} fechado
                      {entry.dealsWon !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-foreground">
                    {formatCurrency(entry.valueWon)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
