"use client";

import { Trophy, MessageSquare, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ActivityData } from "@/app/api/relatorios/route";

interface ActivityTabProps {
  data: ActivityData;
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
  });
}

const KIND_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  email:    "E-mail",
  ligacao:  "Ligação",
  reuniao:  "Reunião",
  outro:    "Outro",
};

export function ActivityTab({ data }: ActivityTabProps) {
  const { salesLeaderboard, recentInteractions, staleItems } = data;

  return (
    <div className="space-y-6 pt-4">
      {/* Leaderboard */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-warning" />
            <CardTitle className="text-base font-semibold">Leaderboard de Vendas</CardTitle>
          </div>
          <CardDescription>Ranking por negócios fechados no período</CardDescription>
        </CardHeader>
        <CardContent>
          {salesLeaderboard.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum negócio fechado registrado
            </p>
          ) : (
            <div className="space-y-2">
              {salesLeaderboard.map((entry, i) => (
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
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{entry.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.dealsWon} negócio{entry.dealsWon !== 1 ? "s" : ""} fechado{entry.dealsWon !== 1 ? "s" : ""}
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Interações Recentes */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-semibold">Interações Recentes</CardTitle>
            </div>
            <CardDescription>Últimas 15 interações registradas</CardDescription>
          </CardHeader>
          <CardContent>
            {recentInteractions.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma interação registrada
              </p>
            ) : (
              <div className="space-y-3">
                {recentInteractions.map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs">
                      💬
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="bg-muted text-muted-foreground border-none text-xs"
                        >
                          {KIND_LABELS[item.kind] ?? item.kind}
                        </Badge>
                        <span className="truncate text-sm font-medium text-foreground">
                          {item.leadName}
                        </span>
                      </div>
                      {item.description && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDate(item.occurredAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tarefas Esquecidas */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" />
              <CardTitle className="text-base font-semibold">Leads Parados</CardTitle>
            </div>
            <CardDescription>Leads sem atualização além do prazo</CardDescription>
          </CardHeader>
          <CardContent>
            {staleItems.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum lead parado
              </p>
            ) : (
              <div className="space-y-2">
                {staleItems.slice(0, 10).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.responsible}</p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="ml-2 shrink-0 bg-warning/10 text-warning border-none"
                    >
                      {item.daysIdle}d
                    </Badge>
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
