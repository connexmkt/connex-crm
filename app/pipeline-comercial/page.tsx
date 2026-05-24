"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { PipelineLead, PipelineStage } from "@/lib/types";

import {
  DndContext,
  DragOverlay,
  closestCorners,
  useSensor,
  useSensors,
  PointerSensor,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";

import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import {
  Plus,
  X,
  Loader2,
  Calendar,
  AlertTriangle,
  Phone,
  Mail,
  Building2,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  PIPELINE_STAGE_CONFIG as stageConfig,
  PIPELINE_STAGES as stages,
  LOST_REASON_OPTIONS,
  LEAD_SOURCES_OPTIONS,
  TEMPERATURE_CONFIG,
  INTERACTION_KIND_CONFIG,
} from "@/lib/constants/pipeline";

// ─── Components ───────────────────────────────────────────────────────────────
import { PipelineLeadCard } from "./components/PipelineLeadCard";
import { SortablePipelineLeadCard } from "./components/SortablePipelineLeadCard";

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
  return `R$ ${value.toLocaleString("pt-BR")}`;
}

function formatDate(date: Date | string | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

// ─── KanbanColumn ─────────────────────────────────────────────────────────────

function KanbanColumn({
  stage,
  leads,
  onSelectLead,
  onAddLead,
}: {
  stage: PipelineStage;
  leads: PipelineLead[];
  onSelectLead: (lead: PipelineLead) => void;
  onAddLead: (stage: PipelineStage) => void;
}) {
  const config = stageConfig[stage];
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const totalValue = leads.reduce((sum, l) => sum + l.estimatedValue, 0);
  const staleCount = leads.filter((l) => l.isStale).length;
  const isTerminal = stage === "fechado" || stage === "perdido";

  return (
    <div
      className={cn(
        "flex w-[280px] shrink-0 flex-col rounded-xl border transition-all duration-150",
        isOver
          ? "border-primary/50 shadow-lg shadow-primary/10"
          : "border-border",
        "bg-card",
      )}
    >
      {/* Column header */}
      <div className={cn("rounded-t-xl px-4 py-3", config.headerBg)}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base">{config.icon}</span>
          <h3 className="text-sm font-semibold text-foreground">
            {config.label}
          </h3>
          <Badge
            variant="secondary"
            className="h-5 min-w-[20px] justify-center px-1.5 text-[10px]"
          >
            {leads.length}
          </Badge>
          {staleCount > 0 && (
            <Badge className="h-5 px-1.5 text-[10px] bg-danger/20 text-danger border-danger/20 border">
              {staleCount} atrasado{staleCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        {leads.length > 0 && (
          <p
            className="mt-0.5 text-xs font-semibold"
            style={{ color: config.color }}
          >
            {formatCurrency(totalValue)}
          </p>
        )}
      </div>

      {/* Cards area */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 overflow-y-auto p-3 transition-colors min-h-[120px]",
          isOver && "bg-primary/5",
        )}
      >
        <SortableContext
          items={leads.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2 min-h-[40px]">
            {leads.map((lead) => (
              <SortablePipelineLeadCard
                key={lead.id}
                lead={lead}
                onClick={() => onSelectLead(lead)}
              />
            ))}
          </div>
        </SortableContext>
      </div>

      {/* Add button */}
      {!isTerminal && (
        <div className="p-3 pt-0">
          <Button
            variant="ghost"
            size="sm"
            className="w-full gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onAddLead(stage)}
          >
            <Plus className="h-3.5 w-3.5" />
            Novo Lead
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── LeadDetailDrawer ─────────────────────────────────────────────────────────

function LeadDetailDrawer({
  lead,
  onClose,
  onStageChange,
}: {
  lead: PipelineLead;
  onClose: () => void;
  onStageChange: (lead: PipelineLead, stage: PipelineStage) => void;
}) {
  const config = stageConfig[lead.stage];
  const tempConfig = TEMPERATURE_CONFIG[lead.temperature] ?? TEMPERATURE_CONFIG.morno;
  const [interactions, setInteractions] = useState<any[]>([]);
  const [loadingInteractions, setLoadingInteractions] = useState(false);
  const [newInteraction, setNewInteraction] = useState({
    kind: "whatsapp" as any,
    description: "",
  });
  const [submittingInteraction, setSubmittingInteraction] = useState(false);

  useEffect(() => {
    if (lead.id) {
      setLoadingInteractions(true);
      fetch(`/api/pipeline/${lead.id}/interactions`)
        .then((r) => r.json())
        .then((json) => setInteractions(json.data || []))
        .catch((err) => console.error("Erro ao carregar interações", err))
        .finally(() => setLoadingInteractions(false));
    }
  }, [lead.id]);

  async function handleAddInteraction(e: React.FormEvent) {
    e.preventDefault();
    if (!newInteraction.description.trim()) return;

    setSubmittingInteraction(true);
    try {
      const res = await fetch(`/api/pipeline/${lead.id}/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newInteraction),
      });

      if (!res.ok) throw new Error("Erro ao adicionar interação");

      const json = await res.json();
      setInteractions((prev) => [json.data, ...prev]);
      setNewInteraction({ kind: "whatsapp", description: "" });
      toast.success("Interação registrada!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao registrar interação");
    } finally {
      setSubmittingInteraction(false);
    }
  }

  return (
    <motion.div
      initial={{ x: 420, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 420, opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 280 }}
      className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[420px] flex-col bg-card shadow-2xl border-l border-border"
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border p-6">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl font-bold"
            style={{
              background: `${config.color}18`,
              color: config.color,
            }}
          >
            {lead.companyName[0]}
          </div>
          <div>
            <h2 className="font-heading text-base font-semibold text-foreground">
              {lead.companyName}
            </h2>
            <p className="text-sm text-muted-foreground">{lead.contactName}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Badge
                variant="outline"
                className="text-[10px]"
                style={{
                  color: config.color,
                  borderColor: `${config.color}40`,
                  backgroundColor: `${config.color}10`,
                }}
              >
                {config.icon} {config.label}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] border-transparent",
                  tempConfig.bg,
                  tempConfig.color
                )}
              >
                {tempConfig.icon}{" "}
                {tempConfig.label}
              </Badge>
            </div>
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

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-secondary/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">Valor Estimado</p>
            <p className="mt-1 text-lg font-bold text-foreground">
              {formatCurrency(lead.estimatedValue)}
            </p>
          </div>
          <div
            className={cn(
              "rounded-lg p-3 text-center",
              lead.isStale ? "bg-danger/10" : "bg-secondary/50",
            )}
          >
            <p className="text-xs text-muted-foreground">Dias no Estágio</p>
            <p
              className={cn(
                "mt-1 text-lg font-bold",
                lead.isStale ? "text-danger" : "text-foreground",
              )}
            >
              {lead.daysInStage}d
              {lead.isStale && (
                <AlertTriangle className="inline h-4 w-4 ml-1 mb-0.5" />
              )}
            </p>
          </div>
        </div>

        {/* Contact */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Contato
          </h3>
          <div className="space-y-1.5">
            {lead.contactEmail && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate text-foreground">
                  {lead.contactEmail}
                </span>
              </div>
            )}
            {lead.contactPhone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-foreground">{lead.contactPhone}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-foreground">{lead.companyName}</span>
            </div>
          </div>
        </div>

        {/* Histórico de Interações */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Histórico de Interações
          </h3>

          {/* Form de nova interação */}
          <form
            onSubmit={handleAddInteraction}
            className="space-y-3 rounded-lg border border-border p-3 bg-secondary/20"
          >
            <div className="flex gap-2">
              <Select
                value={newInteraction.kind}
                onValueChange={(v) =>
                  setNewInteraction((prev) => ({ ...prev, kind: v }))
                }
              >
                <SelectTrigger className="h-8 w-[120px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INTERACTION_KIND_CONFIG).map(
                    ([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <span>{config.icon}</span>
                          <span>{config.label}</span>
                        </span>
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
              <Button
                type="submit"
                size="sm"
                disabled={submittingInteraction || !newInteraction.description}
                className="h-8 ml-auto text-xs"
              >
                {submittingInteraction ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Adicionar"
                )}
              </Button>
            </div>
            <Textarea
              placeholder="Descreva o que aconteceu..."
              value={newInteraction.description}
              onChange={(e) =>
                setNewInteraction((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="min-h-[60px] text-xs resize-none"
            />
          </form>

          {/* Lista de interações */}
          <div className="space-y-4 pt-2">
            {loadingInteractions ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : interactions.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-4">
                Nenhuma interação registrada.
              </p>
            ) : (
              <div className="relative space-y-4 pl-4 before:absolute before:left-1.5 before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-border">
                {interactions.map((interaction) => (
                  <div key={interaction.id} className="relative flex gap-3">
                    <div className="absolute -left-[13px] top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full border-2 border-primary bg-card" />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-primary flex items-center gap-1">
                          {INTERACTION_KIND_CONFIG[interaction.kind as keyof typeof INTERACTION_KIND_CONFIG]?.icon}{" "}
                          {INTERACTION_KIND_CONFIG[interaction.kind as keyof typeof INTERACTION_KIND_CONFIG]?.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(interaction.occurredAt).toLocaleString(
                            "pt-BR",
                            {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">
                        {interaction.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Responsável</span>
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={lead.responsible?.avatar} />
                <AvatarFallback className="bg-primary/10 text-[9px] text-primary">
                  {lead.responsible?.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("") ?? "?"}
                </AvatarFallback>
              </Avatar>
              <span className="text-foreground">
                {lead.responsible?.name?.split(" ")[0]}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Origem</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs capitalize">
                {LEAD_SOURCES_OPTIONS.find((o) => o.value === lead.source)
                  ?.label || lead.source}
              </Badge>
              {lead.source === "indicacao" && lead.sourceReferrer && (
                <Badge variant="outline" className="text-[10px] py-0 h-4">
                  {lead.sourceReferrer}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Lost reason */}
        {lead.lostReason && (
          <div className="rounded-lg bg-danger/10 p-3 space-y-1">
            <p className="text-xs font-semibold text-danger uppercase tracking-wider">
              Motivo da Perda
            </p>
            <p className="text-sm text-foreground">{lead.lostReason}</p>
          </div>
        )}

        {/* Notes */}
        {lead.notes && (
          <div className="space-y-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Notas
            </h3>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {lead.notes}
            </p>
          </div>
        )}

        {/* Move to stage */}
        {lead.stage !== "fechado" && lead.stage !== "perdido" && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Mover para Etapa
            </h3>
            <div className="flex flex-wrap gap-2">
              {stages
                .filter((s: PipelineStage) => s !== lead.stage)
                .map((s: PipelineStage) => (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => onStageChange(lead, s)}
                  >
                    {stageConfig[s].icon} {stageConfig[s].label}
                  </Button>
                ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Novo Lead Dialog ─────────────────────────────────────────────────────────

type LeadSource = "site" | "indicacao" | "prospeccao" | "instagram" | "evento";
type LeadTemperature = "quente" | "morno" | "frio";

interface NovoLeadForm {
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  estimatedValue: string;
  source: LeadSource;
  sourceReferrer: string;
  temperature: LeadTemperature;
  nextAction: string;
  nextActionDate: string;
  meetingDate: string;
  notes: string;
  staleAfterDays: string;
}

function NovoLeadDialog({
  defaultStage,
  onCreated,
  onClose,
}: {
  defaultStage: PipelineStage;
  onCreated: (lead: PipelineLead) => void;
  onClose: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<NovoLeadForm>({
    companyName: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    estimatedValue: "",
    source: "prospeccao",
    sourceReferrer: "",
    temperature: "morno",
    nextAction: "",
    nextActionDate: "",
    meetingDate: "",
    notes: "",
    staleAfterDays: "7",
  });

  function update(field: keyof NovoLeadForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !form.companyName.trim() ||
      !form.contactName.trim() ||
      !form.estimatedValue
    ) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        companyName: form.companyName.trim(),
        contactName: form.contactName.trim(),
        estimatedValue: Number(form.estimatedValue),
        stage: defaultStage,
        source: form.source,
        sourceReferrer: form.sourceReferrer || undefined,
        temperature: form.temperature,
        staleAfterDays: Number(form.staleAfterDays) || 7,
      };
      if (form.contactEmail.trim())
        body.contactEmail = form.contactEmail.trim();
      if (form.contactPhone.trim())
        body.contactPhone = form.contactPhone.trim();
      if (form.nextAction.trim()) body.nextAction = form.nextAction.trim();
      if (form.nextActionDate) body.nextActionDate = form.nextActionDate;
      if (form.meetingDate && defaultStage === "reuniao_agendada")
        body.meetingDate = form.meetingDate;
      if (form.notes.trim()) body.notes = form.notes.trim();

      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Erro ao criar lead");
      const json = await res.json();
      onCreated(json.data);
      toast.success(`Lead "${form.companyName}" criado!`);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao criar lead");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{stageConfig[defaultStage].icon}</span>
            Novo Lead — {stageConfig[defaultStage].label}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="companyName">Empresa *</Label>
              <Input
                id="companyName"
                placeholder="Nome da empresa"
                value={form.companyName}
                onChange={(e) => update("companyName", e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contactName">Contato *</Label>
              <Input
                id="contactName"
                placeholder="Nome do contato"
                value={form.contactName}
                onChange={(e) => update("contactName", e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="estimatedValue">Valor Estimado (R$) *</Label>
              <Input
                id="estimatedValue"
                type="number"
                placeholder="0"
                min={0}
                value={form.estimatedValue}
                onChange={(e) => update("estimatedValue", e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contactEmail">E-mail</Label>
              <Input
                id="contactEmail"
                type="email"
                placeholder="email@empresa.com"
                value={form.contactEmail}
                onChange={(e) => update("contactEmail", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contactPhone">Telefone</Label>
              <Input
                id="contactPhone"
                placeholder="(11) 9 9999-9999"
                value={form.contactPhone}
                onChange={(e) => update("contactPhone", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="source">Origem *</Label>
              <Select
                value={form.source}
                onValueChange={(v: LeadSource) => update("source", v)}
              >
                <SelectTrigger id="source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="temperature">Temperatura *</Label>
              <Select
                value={form.temperature}
                onValueChange={(v: LeadTemperature) => update("temperature", v)}
              >
                <SelectTrigger id="temperature">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TEMPERATURE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.icon} {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.source === "indicacao" && (
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="sourceReferrer">Quem indicou? *</Label>
                <Input
                  id="sourceReferrer"
                  placeholder="Nome da pessoa ou empresa"
                  value={form.sourceReferrer}
                  onChange={(e) => update("sourceReferrer", e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="staleAfterDays">Alertar após (dias)</Label>
              <Input
                id="staleAfterDays"
                type="number"
                min={1}
                value={form.staleAfterDays}
                onChange={(e) => update("staleAfterDays", e.target.value)}
              />
            </div>

            {defaultStage === "reuniao_agendada" && (
              <div className="space-y-1.5">
                <Label htmlFor="meetingDate">Data da Reunião</Label>
                <Input
                  id="meetingDate"
                  type="date"
                  value={form.meetingDate}
                  onChange={(e) => update("meetingDate", e.target.value)}
                />
              </div>
            )}

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="nextAction">Próxima Ação</Label>
              <Input
                id="nextAction"
                placeholder="Ex: Ligar sexta, Aguardar resposta..."
                value={form.nextAction}
                onChange={(e) => update("nextAction", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nextActionDate">Data da Ação</Label>
              <Input
                id="nextActionDate"
                type="date"
                value={form.nextActionDate}
                onChange={(e) => update("nextActionDate", e.target.value)}
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                placeholder="Observações sobre o lead..."
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Lead
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Lost Reason Dialog ───────────────────────────────────────────────────────

function LostReasonDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState<string>("");
  const [customDetail, setCustomDetail] = useState("");

  const isOther = reason === "Outro";
  const isValid = reason && (!isOther || customDetail.trim().length >= 3);

  function handleConfirm() {
    if (!isValid) return;
    const finalReason = isOther ? `Outro: ${customDetail.trim()}` : reason;
    onConfirm(finalReason);
  }

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Motivo da Perda</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <p className="text-sm text-muted-foreground">
            Registre por que este lead não foi fechado.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="lost-reason">Motivo *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="lost-reason">
                <SelectValue placeholder="Selecione um motivo" />
              </SelectTrigger>
              <SelectContent>
                {LOST_REASON_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isOther && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
              <Label htmlFor="custom-detail">Detalhamento *</Label>
              <Textarea
                id="custom-detail"
                placeholder="Descreva o motivo (mín. 3 caracteres)..."
                value={customDetail}
                onChange={(e) => setCustomDetail(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={!isValid}
            onClick={handleConfirm}
          >
            Confirmar Perda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PipelineComericalPage() {
  const [leads, setLeads] = useState<PipelineLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<PipelineLead | null>(null);
  const [novoLeadStage, setNovoLeadStage] = useState<PipelineStage | null>(
    null,
  );
  const [pendingMove, setPendingMove] = useState<{
    leadId: string;
    targetStage: PipelineStage;
  } | null>(null);

  useEffect(() => {
    fetch("/api/pipeline?page=1&limit=100")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((json) => setLeads(json.data?.items ?? []))
      .catch((err) => console.error("[pipeline-comercial]", err))
      .finally(() => setLoading(false));
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  async function moveLeadStage(
    leadId: string,
    targetStage: PipelineStage,
    extra?: { lostReason?: string },
  ) {
    const previousLeads = leads;

    // Optimistic update
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? { ...l, stage: targetStage, daysInStage: 0, isStale: false }
          : l,
      ),
    );
    if (selectedLead?.id === leadId) {
      setSelectedLead((prev) =>
        prev
          ? { ...prev, stage: targetStage, daysInStage: 0, isStale: false }
          : prev,
      );
    }

    try {
      const body: Record<string, unknown> = { stage: targetStage };
      if (extra?.lostReason) body.lostReason = extra.lostReason;

      const res = await fetch(`/api/pipeline/${leadId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Erro ao mover estágio");

      const json = await res.json();
      const updated: PipelineLead = json.data;
      setLeads((prev) => prev.map((l) => (l.id === leadId ? updated : l)));

      if (targetStage === "fechado") {
        toast.success("🏆 Lead fechado e cliente ativo criado!", {
          action: {
            label: "Ver Cliente",
            onClick: () => (window.location.href = "/clientes"),
          },
        });
      } else if (targetStage === "perdido") {
        toast.info("Lead marcado como perdido.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao mover lead. Revertendo...");
      setLeads(previousLeads);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const draggedId = active.id as string;
    const overId = over.id as string;

    if (draggedId === overId) return;

    const overLead = leads.find((l) => l.id === overId);
    const draggedLead = leads.find((l) => l.id === draggedId);

    if (!draggedLead) return;

    const targetStage: PipelineStage = overLead
      ? overLead.stage
      : (overId as PipelineStage);

    if (targetStage === draggedLead.stage) return;

    if (targetStage === "perdido") {
      setPendingMove({ leadId: draggedId, targetStage });
      return;
    }

    moveLeadStage(draggedId, targetStage);
  }

  function handleStageChangeFromDrawer(
    lead: PipelineLead,
    targetStage: PipelineStage,
  ) {
    setSelectedLead(null);
    if (targetStage === "perdido") {
      setPendingMove({ leadId: lead.id, targetStage });
      return;
    }
    moveLeadStage(lead.id, targetStage);
  }

  function handleLostReasonConfirm(reason: string) {
    if (!pendingMove) return;
    moveLeadStage(pendingMove.leadId, "perdido", { lostReason: reason });
    setPendingMove(null);
  }

  function handleLeadCreated(lead: PipelineLead) {
    setLeads((prev) => [lead, ...prev]);
  }

  const leadsByStage = stages.reduce(
    (acc: Record<PipelineStage, PipelineLead[]>, stage: PipelineStage) => {
      acc[stage] = leads.filter((l) => l.stage === stage);
      return acc;
    },
    {} as Record<PipelineStage, PipelineLead[]>,
  );

  const activeLeads = leads.filter(
    (l) => l.stage !== "fechado" && l.stage !== "perdido",
  );
  const totalPipeline = activeLeads.reduce(
    (sum, l) => sum + l.estimatedValue,
    0,
  );
  const fechadoValue = leads
    .filter((l) => l.stage === "fechado")
    .reduce((sum, l) => sum + l.estimatedValue, 0);
  const staleCount = activeLeads.filter((l) => l.isStale).length;

  if (loading) {
    return (
      <AppShell title="Pipeline Comercial">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Pipeline Comercial">
      <div className="space-y-4">
        {/* Summary bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-lg border border-border bg-card px-4 py-2">
              <p className="text-xs text-muted-foreground">Pipeline Ativo</p>
              <p className="text-base font-bold text-foreground">
                {formatCurrency(totalPipeline)}
              </p>
            </div>
            <div className="rounded-lg border border-success/20 bg-success/5 px-4 py-2">
              <p className="text-xs text-muted-foreground">Fechados</p>
              <p className="text-base font-bold text-success">
                {formatCurrency(fechadoValue)}
              </p>
            </div>
            {staleCount > 0 && (
              <div className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-2">
                <p className="text-xs text-muted-foreground">Atrasados</p>
                <p className="text-base font-bold text-danger">
                  {staleCount} lead{staleCount > 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>
          <Button
            onClick={() => setNovoLeadStage("novo_lead")}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Novo Lead
          </Button>
        </div>

        {/* Kanban */}
        <div className="overflow-x-auto pb-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 min-w-max">
              {stages.map((stage: PipelineStage) => (
                <KanbanColumn
                  key={stage}
                  stage={stage}
                  leads={leadsByStage[stage]}
                  onSelectLead={setSelectedLead}
                  onAddLead={setNovoLeadStage}
                />
              ))}
            </div>

            <DragOverlay>
              {activeLead && <PipelineLeadCard lead={activeLead} isDragging />}
            </DragOverlay>
          </DndContext>
        </div>
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
              onStageChange={handleStageChangeFromDrawer}
            />
          </>
        )}
      </AnimatePresence>

      {/* Novo Lead dialog */}
      {novoLeadStage && (
        <NovoLeadDialog
          defaultStage={novoLeadStage}
          onCreated={handleLeadCreated}
          onClose={() => setNovoLeadStage(null)}
        />
      )}

      {/* Lost reason dialog */}
      {pendingMove && (
        <LostReasonDialog
          onConfirm={handleLostReasonConfirm}
          onCancel={() => setPendingMove(null)}
        />
      )}
    </AppShell>
  );
}
