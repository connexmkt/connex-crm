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
import type { AtividadeTipo } from "@/lib/types";
import { NovaTarefaDialog } from "@/components/tasks/nova-tarefa-dialog";
import { NovaAtividadeDialog } from "@/components/atividades/nova-atividade-dialog";
import { toast } from "sonner";

import {
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
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
  Video,
  Mail,
  MessageSquare,
  FileText,
  FileSignature,
  Activity as ActivityIcon,
} from "lucide-react";

type Atividade = DashboardPayload["activities"][number];
type Task = DashboardPayload["tasks"][number];
type AtRiskClient = DashboardPayload["atRiskClients"][number];
type PipelineItem = DashboardPayload["pipelineChartData"][number];

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

function PipelineStagePieChart({ data }: { data: PipelineItem[] }) {
  const filteredData = data.filter((item) => item.count > 0);
  const isEmpty = filteredData.length === 0;

  if (isEmpty) {
    return (
      <div className="flex h-[300px] flex-col items-center justify-center text-center">
        <Kanban className="h-10 w-10 text-muted-foreground opacity-20" />
        <p className="mt-2 text-sm text-muted-foreground">
          Nenhum lead no pipeline no momento
        </p>
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={filteredData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="count"
            nameKey="stage"
          >
            {filteredData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as PipelineItem;
                return (
                  <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
                    <p className="text-xs font-medium text-foreground">
                      {item.stage}
                    </p>
                    <p className="text-sm font-bold text-primary">
                      {item.count} lead(s)
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            verticalAlign="middle"
            align="right"
            layout="vertical"
            iconType="circle"
            formatter={(value) => (
              <span className="text-xs text-muted-foreground">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

const ATIVIDADE_TIPO_CONFIG: Record<
  AtividadeTipo,
  { label: string; icon: React.ElementType; color: string }
> = {
  reuniao:  { label: "Reunião",   icon: Video,          color: "text-primary bg-primary/10" },
  ligacao:  { label: "Ligação",   icon: Phone,          color: "text-success bg-success/10" },
  email:    { label: "E-mail",    icon: Mail,           color: "text-blue-500 bg-blue-500/10" },
  mensagem: { label: "Mensagem",  icon: MessageSquare,  color: "text-purple-500 bg-purple-500/10" },
  proposta: { label: "Proposta",  icon: FileText,       color: "text-warning bg-warning/10" },
  contrato: { label: "Contrato",  icon: FileSignature,  color: "text-success bg-success/10" },
};

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

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardPayload | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  // Inicializador preguiçoso: `Date.now()` só é chamado uma vez, evitando
  // uma chamada impura durante o render (react-hooks/purity).
  const [now] = useState(() => Date.now());

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((json: { data?: DashboardPayload }) => {
        if (!json.data) return;
        setDashboardData(json.data);
        setTasks(json.data.tasks ?? []);
        setAtividades(json.data.activities ?? []);
      })
      .catch((err) => console.error("[Dashboard] fetch error:", err))
      .finally(() => setLoading(false));
  }, []);

  const kpiData = dashboardData?.kpiData ?? DEFAULT_KPI;
  const pipelineChartData: PipelineItem[] = dashboardData?.pipelineChartData ?? [];
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
    setTasks((prev) => [newTask, ...prev].slice(0, 10));
  };

  const handleAtividadeCriada = (nova: Atividade) => {
    setAtividades((prev) => [nova, ...prev].slice(0, 10));
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
              <PipelineStagePieChart data={pipelineChartData} />
            </CardContent>
          </Card>

          {/* Recent activities */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="font-heading text-base font-semibold">
                Atividades Recentes
              </CardTitle>
              <NovaAtividadeDialog onAtividadeCriada={handleAtividadeCriada} />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="h-8 w-8 shrink-0 rounded-lg bg-secondary" />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-3 w-1/2 rounded bg-secondary" />
                        <div className="h-2 w-3/4 rounded bg-secondary" />
                        <div className="h-2 w-1/3 rounded bg-secondary" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : atividades.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <ActivityIcon className="h-10 w-10 text-muted-foreground opacity-20" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Nenhuma atividade registrada ainda
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Use o botão acima para registrar reuniões, ligações e mais
                  </p>
                </div>
              ) : (
                <div className="relative space-y-0">
                  {/* Linha vertical da timeline */}
                  <div className="absolute left-4 top-4 bottom-4 w-px bg-border" />

                  {atividades.map((ativ, idx) => {
                    const tipoKey = ativ.tipo as AtividadeTipo;
                    const config = ATIVIDADE_TIPO_CONFIG[tipoKey];
                    const Icon = config?.icon ?? ActivityIcon;
                    const colorClass = config?.color ?? "text-muted-foreground bg-secondary";
                    const isLast = idx === atividades.length - 1;

                    return (
                      <div
                        key={ativ.id}
                        className={cn(
                          "relative flex gap-3 pb-4 pl-9",
                          isLast && "pb-0",
                        )}
                      >
                        {/* Ícone do tipo */}
                        <div
                          className={cn(
                            "absolute left-0 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border",
                            colorClass,
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>

                        {/* Conteúdo */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="text-sm font-medium text-foreground">
                                {config?.label ?? tipoKey}
                              </span>
                              <span className="mx-1 text-muted-foreground">·</span>
                              <span className="text-sm text-muted-foreground truncate">
                                {ativ.associacaoNome}
                              </span>
                            </div>
                            <time className="shrink-0 text-[11px] text-muted-foreground">
                              {new Date(ativ.ocorridoEm).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </time>
                          </div>

                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {ativ.descricao}
                          </p>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            {ativ.resultado && (
                              <span className="text-[11px] text-muted-foreground">
                                <span className="font-medium text-foreground">Resultado:</span>{" "}
                                {ativ.resultado}
                              </span>
                            )}
                            {ativ.proximoPasso && (
                              <span className="text-[11px] text-primary">
                                <span className="font-medium">Próximo:</span>{" "}
                                {ativ.proximoPasso}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Avatar className="h-4 w-4">
                              <AvatarImage
                                src={ativ.responsavel.avatar}
                                alt={ativ.responsavel.name}
                              />
                              <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                                {ativ.responsavel.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-[11px] text-muted-foreground">
                              {ativ.responsavel.name}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
                      (now - new Date(client.lastActivity).getTime()) /
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
