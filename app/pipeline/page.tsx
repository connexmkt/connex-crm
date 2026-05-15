"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  X,
  DollarSign,
  Loader2,
  Mail,
  Phone,
  Globe,
  Calendar,
  Building2,
} from "lucide-react";
import { AppShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Client, FunnelStage } from "@/lib/types";
import { cn } from "@/lib/utils";

import {
  DndContext,
  DragOverlay,
  closestCorners,
  useSensor,
  useSensors,
  PointerSensor,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";

import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";

// ─── Tipos locais ─────────────────────────────────────────────────────────────

type ClientWithStage = Client & { stage: FunnelStage };

// ─── Configs ──────────────────────────────────────────────────────────────────

const stageConfig: Record<
  FunnelStage,
  { label: string; emoji: string; color: string; headerBg: string }
> = {
  atracao: {
    label: "Atração",
    emoji: "🎯",
    color: "#5B5FE8",
    headerBg: "bg-primary/10",
  },
  retencao: {
    label: "Retenção",
    emoji: "🔁",
    color: "#14B8A6",
    headerBg: "bg-chart-2/10",
  },
  adesao: {
    label: "Adesão",
    emoji: "🤝",
    color: "#8B5CF6",
    headerBg: "bg-chart-3/10",
  },
  recompra: {
    label: "Recompra",
    emoji: "💰",
    color: "#22C55E",
    headerBg: "bg-success/10",
  },
  indicacao: {
    label: "Indicação",
    emoji: "📣",
    color: "#F59E0B",
    headerBg: "bg-warning/10",
  },
};

const stages: FunnelStage[] = [
  "atracao",
  "retencao",
  "adesao",
  "recompra",
  "indicacao",
];

/** Mapeia o status do cliente para uma etapa inicial do funil */
function statusToStage(status: Client["status"]): FunnelStage {
  switch (status) {
    case "Lead":
      return "atracao";
    case "Em risco":
      return "retencao";
    case "Ativo":
      return "adesao";
    case "Inativo":
      return "recompra";
  }
}

/** Deriva prioridade visual a partir do status */
function statusToPriority(
  status: Client["status"],
): "high" | "medium" | "low" {
  if (status === "Em risco") return "high";
  if (status === "Lead") return "medium";
  return "low";
}

const priorityColors = {
  high: "bg-danger",
  medium: "bg-warning",
  low: "bg-muted-foreground",
};

// ─── ClientCard ───────────────────────────────────────────────────────────────

function ClientCard({
  client,
  isDragging = false,
  onClick,
}: {
  client: ClientWithStage;
  isDragging?: boolean;
  onClick?: () => void;
}) {
  const priority = statusToPriority(client.status);

  return (
    <div
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-xl border border-border bg-card p-4 transition-all",
        isDragging
          ? "shadow-xl scale-[1.02] border-primary/40"
          : "hover:border-primary/20 hover:shadow-md",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {client.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {client.segment}
          </p>
        </div>
        <div
          className={cn(
            "h-2.5 w-2.5 shrink-0 rounded-full mt-1",
            priorityColors[priority],
          )}
          title={`Status: ${client.status}`}
        />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
          <DollarSign className="h-3 w-3 text-success" />
          R$ {client.contractValue.toLocaleString("pt-BR")}
        </div>
        <Badge
          variant="outline"
          className="text-[10px] px-1.5 py-0 border-border"
        >
          {client.plan}
        </Badge>
      </div>
      {client.responsible && (
        <div className="mt-2 flex items-center justify-end">
          <Avatar className="h-6 w-6">
            <AvatarImage src={client.responsible.avatar} />
            <AvatarFallback className="bg-primary/10 text-[9px] text-primary">
              {client.responsible.name
                .split(" ")
                .map((n: string) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
        </div>
      )}
    </div>
  );
}

// ─── SortableClientCard ───────────────────────────────────────────────────────

function SortableClientCard({
  client,
  onClick,
}: {
  client: ClientWithStage;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: client.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ClientCard client={client} onClick={onClick} />
    </div>
  );
}

// ─── KanbanColumn ─────────────────────────────────────────────────────────────

function KanbanColumn({
  stage,
  clients,
  onSelectClient,
}: {
  stage: FunnelStage;
  clients: ClientWithStage[];
  onSelectClient: (client: ClientWithStage) => void;
}) {
  const config = stageConfig[stage];
  const total = clients.reduce((sum, c) => sum + c.contractValue, 0);

  return (
    <div className="flex w-[280px] shrink-0 flex-col rounded-xl border border-border bg-card">
      <div className={cn("rounded-t-xl p-4", config.headerBg)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">{config.emoji}</span>
            <h3 className="text-sm font-semibold text-foreground">
              {config.label}
            </h3>
            <Badge
              variant="secondary"
              className="h-5 min-w-[20px] justify-center px-1.5 text-[10px]"
            >
              {clients.length}
            </Badge>
          </div>
        </div>
        <p className="mt-1 text-xs font-medium" style={{ color: config.color }}>
          R$ {total.toLocaleString("pt-BR")}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <SortableContext
          items={clients.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2 min-h-[40px]">
            {clients.map((client) => (
              <SortableClientCard
                key={client.id}
                client={client}
                onClick={() => onSelectClient(client)}
              />
            ))}
          </div>
        </SortableContext>
      </div>

      <div className="p-3 pt-0">
        <Button
          variant="ghost"
          size="sm"
          className="w-full gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar Cliente
        </Button>
      </div>
    </div>
  );
}

// ─── ClientDetailDrawer ───────────────────────────────────────────────────────

function ClientDetailDrawer({
  client,
  onClose,
}: {
  client: ClientWithStage;
  onClose: () => void;
}) {
  const config = stageConfig[client.stage];

  return (
    <motion.div
      initial={{ x: 420, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 420, opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 280 }}
      className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[400px] flex-col bg-card shadow-2xl border-l border-border"
    >
      <div className="flex items-start justify-between border-b border-border p-6">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl font-bold"
            style={{ background: `${config.color}15`, color: config.color }}
          >
            {client.name[0]}
          </div>
          <div>
            <h2 className="font-heading text-base font-semibold text-foreground">
              {client.name}
            </h2>
            <p className="text-sm text-muted-foreground">{client.segment}</p>
            <Badge
              variant="outline"
              className="mt-1 text-[10px]"
              style={{
                color: config.color,
                borderColor: `${config.color}40`,
                backgroundColor: `${config.color}10`,
              }}
            >
              {config.emoji} {config.label}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-secondary/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">Valor do Contrato</p>
            <p className="mt-1 text-lg font-bold text-foreground">
              R$ {client.contractValue.toLocaleString("pt-BR")}
            </p>
          </div>
          <div className="rounded-lg bg-secondary/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">Plano</p>
            <p className="mt-1 text-lg font-bold text-foreground">
              {client.plan}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Contato
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate text-foreground">
                {client.contact.email}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-foreground">{client.contact.phone}</span>
            </div>
            {client.contact.website && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate text-primary">
                  {client.contact.website}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Detalhes
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" /> Segmento
              </span>
              <span className="font-medium text-foreground">
                {client.segment}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" /> Onboarding
              </span>
              <span className="font-medium text-foreground">
                {new Date(client.onboardingDate).toLocaleDateString("pt-BR")}
              </span>
            </div>
            {client.responsible && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Responsável</span>
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={client.responsible.avatar} />
                    <AvatarFallback className="bg-primary/10 text-[9px] text-primary">
                      {client.responsible.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-foreground">
                    {client.responsible.name.split(" ")[0]}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Mover para Etapa
          </h3>
          <div className="flex flex-wrap gap-2">
            {stages.map((s) => (
              <Button
                key={s}
                variant="outline"
                size="sm"
                className={cn(
                  "text-xs",
                  s === client.stage &&
                    "border-primary bg-primary/10 text-primary",
                )}
              >
                {stageConfig[s].emoji} {stageConfig[s].label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [clients, setClients] = useState<ClientWithStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientWithStage | null>(
    null,
  );

  useEffect(() => {
    fetch("/api/clientes?page=1&limit=100")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((json) => {
        const items: Client[] = json.data?.items ?? [];
        setClients(
          items.map((c) => ({ ...c, stage: statusToStage(c.status) })),
        );
      })
      .catch((err) =>
        console.error("[pipeline] falha ao carregar clientes:", err),
      )
      .finally(() => setLoading(false));
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const activeClient = activeId
    ? clients.find((c) => c.id === activeId)
    : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const draggedId = active.id as string;
    const overId = over.id as string;

    if (draggedId === overId) return;

    const overClient = clients.find((c) => c.id === overId);
    const draggedClient = clients.find((c) => c.id === draggedId);

    if (!draggedClient) return;

    const targetStage = overClient
      ? overClient.stage
      : (overId as FunnelStage);

    setClients((prev) =>
      prev.map((c) =>
        c.id === draggedId ? { ...c, stage: targetStage } : c,
      ),
    );

    if (selectedClient?.id === draggedId) {
      setSelectedClient((prev) =>
        prev ? { ...prev, stage: targetStage } : prev,
      );
    }
  }

  const clientsByStage = stages.reduce(
    (acc, stage) => {
      acc[stage] = clients.filter((c) => c.stage === stage);
      return acc;
    },
    {} as Record<FunnelStage, ClientWithStage[]>,
  );

  if (loading) {
    return (
      <AppShell title="Kanban">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Kanban">
      <div className="overflow-x-auto pb-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 min-w-max">
            {stages.map((stage) => (
              <KanbanColumn
                key={stage}
                stage={stage}
                clients={clientsByStage[stage]}
                onSelectClient={setSelectedClient}
              />
            ))}
          </div>
          <DragOverlay>
            {activeClient && (
              <ClientCard client={activeClient} isDragging />
            )}
          </DragOverlay>
        </DndContext>
      </div>

      <AnimatePresence>
        {selectedClient && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedClient(null)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            />
            <ClientDetailDrawer
              client={selectedClient}
              onClose={() => setSelectedClient(null)}
            />
          </>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
