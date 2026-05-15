"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DashboardPayload } from "@/app/api/dashboard/route";
import { NovaTarefaDialog } from "@/components/tasks/nova-tarefa-dialog";
import { toast } from "sonner";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import {
  Users,
  TrendingUp,
  TrendingDown,
  Megaphone,
  DollarSign,
  Kanban,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Phone,
  Trash2,
} from "lucide-react";

// ── Tipos locais ──────────────────────────────────────────────────────────────

type Activity = DashboardPayload["activities"][number];
type Task = DashboardPayload["tasks"][number];
type AtRiskClient = DashboardPayload["atRiskClients"][number];
type PipelineItem = DashboardPayload["pipelineChartData"][number];

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1500) {
  const [count, setCount] = useState(0);
  const startTime = useRef<number | null>(null);

  useEffect(() => {
    startTime.current = null;
    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);

  return count;
}

// ── Componentes ───────────────────────────────────────────────────────────────

function KpiCard({
  title,
  value,
  variation,
  icon: Icon,
  prefix = "",
  suffix = "",
  formatValue,
}: {
  title: string;
  value: number;
  variation: number;
  icon: React.ElementType;
  prefix?: string;
  suffix?: string;
  formatValue?: (v: number) => string;
}) {
  const count = useCountUp(value);
  const isPositive = variation >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {title}
              </p>
              <p className="font-heading text-3xl font-bold text-foreground">
                {prefix}
                {formatValue
                  ? formatValue(count)
                  : count.toLocaleString("pt-BR")}
                {suffix}
              </p>
              <div className="flex items-center gap-1">
                {isPositive ? (
                  <TrendingUp className="h-4 w-4 text-success" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-danger" />
                )}
                <span
                  className={cn(
                    "text-sm font-medium",
                    isPositive ? "text-success" : "text-danger",
                  )}
                >
                  {isPositive ? "+" : ""}
                  {variation.toFixed(1)}%
                </span>
                <span className="text-xs text-muted-foreground">
                  vs mês anterior
                </span>
              </div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Icon className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

const activityColors: Record<string, string> = {
  novo_lead: "bg-primary/10 text-primary border-primary/20",
  reuniao: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  contrato: "bg-success/10 text-success border-success/20",
  campanha: "bg-warning/10 text-warning border-warning/20",
};

const activityLabels: Record<string, string> = {
  novo_lead: "Novo Lead",
  reuniao: "Reunião",
  contrato: "Contrato",
  campanha: "Campanha",
};

function formatRelativeTime(date: Date) {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (hours < 1) return "Agora há pouco";
  if (hours < 24) return `há ${hours}h`;
  return `há ${days}d`;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="text-sm font-bold text-primary">
          {payload[0].value} leads
        </p>
      </div>
    );
  }
  return null;
};

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_KPI: DashboardPayload["kpiData"] = {
  totalClientes: 0,
  clientesVariacao: 0,
  leadsNoPipeline: 0,
  leadsVariacao: 0,
  campanhasAtivas: 0,
  campanhasVariacao: 0,
  faturamentoMes: 0,
  faturamentoVariacao: 0,
};

// ── Página ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardPayload | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((json: { data: DashboardPayload }) => {
        setDashboardData(json.data);
        setTasks(json.data.tasks || []);
      })
      .catch((err) => console.error("[Dashboard] fetch error:", err))
      .finally(() => setLoading(false));
  }, []);

  const kpiData = dashboardData?.kpiData ?? DEFAULT_KPI;
  const pipelineChartData: PipelineItem[] =
    dashboardData?.pipelineChartData ?? [];
  const activities: Activity[] = dashboardData?.activities ?? [];
  const atRiskClients: AtRiskClient[] = dashboardData?.atRiskClients ?? [];

  const toggleTask = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;

    // Atualização otimista
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: newStatus } : t)),
    );

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: newStatus }),
      });

      if (!res.ok) throw new Error("Erro ao atualizar tarefa");
    } catch (error) {
      console.error("Error toggling task:", error);
      toast.error("Erro ao atualizar tarefa");
      // Reverter em caso de erro
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: currentStatus } : t)),
      );
    }
  };

  const deleteTask = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta tarefa?")) return;

    const originalTasks = [...tasks];
    setTasks((prev) => prev.filter((t) => t.id !== id));

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Erro ao excluir tarefa");
      toast.success("Tarefa excluída");
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Erro ao excluir tarefa");
      setTasks(originalTasks);
    }
  };

  const handleTaskCreated = (newTask: Task) => {
    setTasks((prev) => [newTask, ...prev].slice(0, 10)); // Mantém limite visual
  };

  const priorityColors = {
    high: "bg-danger/10 text-danger",
    medium: "bg-warning/10 text-warning",
    low: "bg-muted text-muted-foreground",
  };

  return (
    <AppShell title="Dashboard">
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Total de Clientes Ativos"
            value={kpiData.totalClientes}
            variation={kpiData.clientesVariacao}
            icon={Users}
          />
          <KpiCard
            title="Leads no Pipeline"
            value={kpiData.leadsNoPipeline}
            variation={kpiData.leadsVariacao}
            icon={Kanban}
          />
          <KpiCard
            title="Campanhas Ativas"
            value={kpiData.campanhasAtivas}
            variation={kpiData.campanhasVariacao}
            icon={Megaphone}
          />
          <KpiCard
            title="Faturamento do Mês"
            value={kpiData.faturamentoMes}
            variation={kpiData.faturamentoVariacao}
            icon={DollarSign}
            prefix="R$ "
            formatValue={(v) =>
              v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toString()
            }
          />
        </div>

        {/* Middle row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Pipeline chart */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-4">
              <CardTitle className="font-heading text-base font-semibold">
                Pipeline por Etapa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <h1>TODO</h1>
              <p>Esse gráfico servirá para acomodar os leads por etapa até o fechamento do contrato</p>
            </CardContent>
          </Card>

          {/* Recent activities */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-4">
              <CardTitle className="font-heading text-base font-semibold">
                Atividades Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <h1>TODO</h1>
              <p>Esse card servirá para acompanhar as atividades recentes</p>
              <p>As atividades recentes serão as últimas 10 atividades registradas</p>
              <p>Exemplo: marcação de reunião, criação de cliente, etc.</p>
            </CardContent>
          </Card>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Tasks */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="font-heading text-base font-semibold">
                Próximas Tarefas
              </CardTitle>
              <NovaTarefaDialog onTaskCreated={handleTaskCreated} />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 animate-pulse"
                    >
                      <div className="h-5 w-5 shrink-0 rounded-full bg-secondary" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 rounded bg-secondary w-2/3" />
                        <div className="h-2 rounded bg-secondary w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => {
                    const done = task.completed;
                    return (
                      <div
                        key={task.id}
                        className="group flex items-center gap-3 rounded-lg p-2 hover:bg-secondary/50 transition-colors"
                      >
                        <div
                          className="cursor-pointer"
                          onClick={() => toggleTask(task.id, done)}
                        >
                          {done ? (
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                          ) : (
                            <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                          )}
                        </div>
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => toggleTask(task.id, done)}
                        >
                          <p
                            className={cn(
                              "text-sm font-medium transition-all",
                              done
                                ? "line-through text-muted-foreground"
                                : "text-foreground",
                            )}
                          >
                            {task.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Vence:{" "}
                            {new Date(task.dueDate).toLocaleDateString(
                              "pt-BR",
                              {
                                day: "2-digit",
                                month: "short",
                              },
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={cn(
                              "text-[10px] px-1.5 py-0",
                              priorityColors[task.priority],
                            )}
                            variant="secondary"
                          >
                            {task.priority === "high"
                              ? "Alta"
                              : task.priority === "medium"
                                ? "Média"
                                : "Baixa"}
                          </Badge>
                          <Avatar className="h-6 w-6">
                            <AvatarImage
                              src={task.assignee.avatar}
                              alt={task.assignee.name}
                            />
                            <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                              {task.assignee.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTask(task.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* At risk clients */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 font-heading text-base font-semibold">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Clientes em Risco
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-warning/20 bg-warning/5 p-3 animate-pulse"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-warning/10" />
                        <div className="space-y-2">
                          <div className="h-3 w-28 rounded bg-secondary" />
                          <div className="h-2 w-20 rounded bg-secondary" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : atRiskClients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="h-10 w-10 text-success opacity-50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Nenhum cliente em risco
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {atRiskClients.map((client) => {
                    const daysSince = Math.floor(
                      (Date.now() - new Date(client.lastActivity).getTime()) /
                        86_400_000,
                    );
                    return (
                      <div
                        key={client.id}
                        className="flex items-center justify-between rounded-lg border border-warning/20 bg-warning/5 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10 text-sm font-bold text-warning">
                            {client.name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {client.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Sem atividade há {daysSince} dias
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1.5 border-warning/30 text-xs text-warning hover:bg-warning/10 hover:text-warning"
                        >
                          <Phone className="h-3 w-3" />
                          Contatar
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
