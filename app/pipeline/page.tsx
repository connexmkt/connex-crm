"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Clock, X, DollarSign, Loader2 } from "lucide-react";
import { AppShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Lead, FunnelStage } from "@/lib/types";
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

const stageConfig: Record<
  FunnelStage,
  { label: string; emoji: string; color: string; bg: string; headerBg: string }
> = {
  atracao: {
    label: "Atração",
    emoji: "🎯",
    color: "#5B5FE8",
    bg: "bg-primary/5",
    headerBg: "bg-primary/10",
  },
  retencao: {
    label: "Retenção",
    emoji: "🔁",
    color: "#14B8A6",
    bg: "bg-chart-2/5",
    headerBg: "bg-chart-2/10",
  },
  adesao: {
    label: "Adesão",
    emoji: "🤝",
    color: "#8B5CF6",
    bg: "bg-chart-3/5",
    headerBg: "bg-chart-3/10",
  },
  recompra: {
    label: "Recompra",
    emoji: "💰",
    color: "#22C55E",
    bg: "bg-success/5",
    headerBg: "bg-success/10",
  },
  indicacao: {
    label: "Indicação",
    emoji: "📣",
    color: "#F59E0B",
    bg: "bg-warning/5",
    headerBg: "bg-warning/10",
  },
};

const priorityColors = {
  high: "bg-danger",
  medium: "bg-warning",
  low: "bg-muted-foreground",
};

const stages: FunnelStage[] = [
  "atracao",
  "retencao",
  "adesao",
  "recompra",
  "indicacao",
];

function LeadCard({
  lead,
  isDragging = false,
  onClick,
}: {
  lead: Lead;
  isDragging?: boolean;
  onClick?: () => void;
}) {
  const config = stageConfig[lead.stage];

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
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {lead.companyName}
          </p>
          <p className="text-xs text-muted-foreground">{lead.contactName}</p>
        </div>
        <div
          className={cn(
            "h-2.5 w-2.5 rounded-full shrink-0 mt-1",
            priorityColors[lead.priority],
          )}
          title={`Prioridade: ${lead.priority}`}
        />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
          <DollarSign className="h-3 w-3 text-success" />
          R$ {lead.contractValue.toLocaleString("pt-BR")}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {lead.daysInStage}d
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end">
        <Avatar className="h-6 w-6">
          <AvatarImage src={lead.responsible.avatar} />
          <AvatarFallback className="bg-primary/10 text-[9px] text-primary">
            {lead.responsible.name
              .split(" ")
              .map((n: string) => n[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}

function SortableLeadCard({
  lead,
  onClick,
}: {
  lead: Lead;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <LeadCard lead={lead} onClick={onClick} />
    </div>
  );
}

function KanbanColumn({
  stage,
  leads,
  onAddLead,
  onSelectLead,
}: {
  stage: FunnelStage;
  leads: Lead[];
  onAddLead: (stage: FunnelStage) => void;
  onSelectLead: (lead: Lead) => void;
}) {
  const config = stageConfig[stage];
  const total = leads.reduce((sum, l) => sum + l.contractValue, 0);

  return (
    <div className="flex w-[280px] shrink-0 flex-col rounded-xl border border-border bg-card">
      {/* Column header */}
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
              {leads.length}
            </Badge>
          </div>
        </div>
        <p className="mt-1 text-xs font-medium" style={{ color: config.color }}>
          R$ {total.toLocaleString("pt-BR")}
        </p>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-3">
        <SortableContext
          items={leads.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2 min-h-[40px]">
            {leads.map((lead) => (
              <SortableLeadCard
                key={lead.id}
                lead={lead}
                onClick={() => onSelectLead(lead)}
              />
            ))}
          </div>
        </SortableContext>
      </div>

      {/* Add lead button */}
      <div className="p-3 pt-0">
        <Button
          variant="ghost"
          size="sm"
          className="w-full gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => onAddLead(stage)}
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar Lead
        </Button>
      </div>
    </div>
  );
}

function LeadDetailDrawer({
  lead,
  onClose,
}: {
  lead: Lead;
  onClose: () => void;
}) {
  const config = stageConfig[lead.stage];

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
            className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
            style={{ background: `${config.color}15` }}
          >
            {config.emoji}
          </div>
          <div>
            <h2 className="font-heading text-base font-semibold text-foreground">
              {lead.companyName}
            </h2>
            <p className="text-sm text-muted-foreground">{lead.contactName}</p>
            <Badge
              variant="outline"
              className="mt-1 text-[10px]"
              style={{
                color: config.color,
                borderColor: `${config.color}40`,
                backgroundColor: `${config.color}10`,
              }}
            >
              {config.label}
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
              R$ {lead.contractValue.toLocaleString("pt-BR")}
            </p>
          </div>
          <div className="rounded-lg bg-secondary/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">Dias na Etapa</p>
            <p className="mt-1 text-lg font-bold text-foreground">
              {lead.daysInStage}d
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Detalhes
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Prioridade</span>
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px]",
                  lead.priority === "high"
                    ? "bg-danger/10 text-danger"
                    : lead.priority === "medium"
                      ? "bg-warning/10 text-warning"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {lead.priority === "high"
                  ? "Alta"
                  : lead.priority === "medium"
                    ? "Média"
                    : "Baixa"}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Responsável</span>
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={lead.responsible.avatar} />
                  <AvatarFallback className="bg-primary/10 text-[9px] text-primary">
                    {lead.responsible.name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <span className="text-foreground">
                  {lead.responsible.name.split(" ")[0]}
                </span>
              </div>
            </div>
          </div>
        </div>

        {lead.notes && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Notas
            </h3>
            <p className="rounded-lg bg-secondary/50 p-3 text-sm text-foreground">
              {lead.notes}
            </p>
          </div>
        )}

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
                  s === lead.stage &&
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

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    fetch("/api/leads")
      .then((r) => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((json) => setLeads(json.data as Lead[]))
      .catch((err) => console.error("[pipeline] falha ao carregar leads:", err))
      .finally(() => setLoading(false));
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const overLead = leads.find((l) => l.id === overId);
    const activeLead = leads.find((l) => l.id === activeId);

    if (!activeLead) return;

    const targetStage = overLead ? overLead.stage : (overId as FunnelStage);

    setLeads((prev) =>
      prev.map((l) => (l.id === activeId ? { ...l, stage: targetStage } : l)),
    );
  }

  const leadsByStage = stages.reduce(
    (acc, stage) => {
      acc[stage] = leads.filter((l) => l.stage === stage);
      return acc;
    },
    {} as Record<FunnelStage, Lead[]>,
  );

  if (loading) {
    return (
      <AppShell title="Pipeline">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Pipeline">
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
                leads={leadsByStage[stage]}
                onAddLead={() => {}}
                onSelectLead={setSelectedLead}
              />
            ))}
          </div>
          <DragOverlay>
            {activeLead && <LeadCard lead={activeLead} isDragging />}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Lead detail drawer */}
      <AnimatePresence>
        {selectedLead && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLead(null)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            />
            <LeadDetailDrawer
              lead={selectedLead}
              onClose={() => setSelectedLead(null)}
            />
          </>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
