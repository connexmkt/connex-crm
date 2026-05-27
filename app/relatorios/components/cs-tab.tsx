"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CsData } from "@/app/api/relatorios/route";

import {
  Heart,
  AlertTriangle,
  XCircle,
  Calendar,
  FileText,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

interface CsTabProps {
  data: CsData;
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

export function CsTab({ data }: CsTabProps) {
  const { healthScore, renewalsNext30, renewalsNext60, churnSnapshot } = data;

  const totalClients = healthScore.green + healthScore.yellow + healthScore.red;

  const healthItems = [
    {
      label: "Saudável",
      count: healthScore.green,
      icon: Heart,
      color: "text-success",
      bg: "bg-success/10",
      border: "border-success/20",
    },
    {
      label: "Em Risco",
      count: healthScore.yellow,
      icon: AlertTriangle,
      color: "text-warning",
      bg: "bg-warning/10",
      border: "border-warning/20",
    },
    {
      label: "Inativo",
      count: healthScore.red,
      icon: XCircle,
      color: "text-danger",
      bg: "bg-danger/10",
      border: "border-danger/20",
    },
  ];

  return (
    <div className="space-y-6 pt-4">
      {/* Health Score */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Health Score
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {healthItems.map((item) => {
            const pct =
              totalClients > 0
                ? Math.round((item.count / totalClients) * 100)
                : 0;
            return (
              <Card
                key={item.label}
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
                        {pct}% do total
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Renovações Próximas — 30 dias */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Renovações em 30 dias
              </CardTitle>
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

        {/* Renovações Próximas — 60 dias */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Renovações em 60 dias
              </CardTitle>
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary border-none"
              >
                {renewalsNext60.length}
              </Badge>
            </div>
            <CardDescription>
              Contratos com vencimento entre 30–60 dias
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

      {/* Churn Snapshot */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                Taxa de Churn
              </CardTitle>
              <CardDescription>
                Snapshot atual de clientes ativos vs inativos
              </CardDescription>
            </div>
            <Badge
              variant="secondary"
              className="bg-primary/10 text-primary border-none"
            >
              Histórico em breve
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-success">
                {churnSnapshot.activeCount}
              </p>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="text-center">
              <p className="text-3xl font-bold text-danger">
                {churnSnapshot.inactiveCount}
              </p>
              <p className="text-xs text-muted-foreground">Inativos</p>
            </div>
            <div className="ml-auto">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
