import type { SupabaseClient } from "@supabase/supabase-js";
import type { PipelineStage, LeadSource } from "@/lib/types";
import { ClientesService } from "./clientes.service";

import {
  PipelineRepository,
  type FindManyPipelineParams,
  type InsertPipelineInput,
  type UpdatePipelineInput,
} from "@/lib/repositories/pipeline.repository";

// ── Input types ────────────────────────────────────────────────────────────────

export type CreateLeadInput = {
  companyName: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  estimatedValue: number;
  stage?: PipelineStage;
  responsibleId?: string;
  lastContactAt?: string;
  nextAction?: string;
  nextActionDate?: string;
  meetingDate?: string;
  source: LeadSource;
  notes?: string;
  staleAfterDays?: number;
};

export type UpdateLeadInput = {
  companyName?: string;
  contactName?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  estimatedValue?: number;
  responsibleId?: string;
  lastContactAt?: string | null;
  nextAction?: string | null;
  nextActionDate?: string | null;
  meetingDate?: string | null;
  source?: LeadSource;
  notes?: string | null;
  staleAfterDays?: number;
};

export type MoveStageInput = {
  stage: PipelineStage;
  /** Required when stage = 'perdido' */
  lostReason?: string;
  /** Recommended when stage = 'reuniao_agendada' */
  meetingDate?: string;
  /** Optional: link to an existing client record when stage = 'fechado' */
  clienteId?: string;
};

// ── Service ────────────────────────────────────────────────────────────────────

export const PipelineService = {
  async list(supabase: SupabaseClient, params: FindManyPipelineParams) {
    return PipelineRepository.findMany(supabase, params);
  },

  async getById(supabase: SupabaseClient, id: string) {
    return PipelineRepository.findById(supabase, id);
  },

  async create(supabase: SupabaseClient, input: CreateLeadInput) {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthenticated");

    const responsibleId = input.responsibleId ?? user.id;
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, name, email, avatar, role")
      .eq("id", responsibleId)
      .single();

    if (profileError || !profile) throw new Error("Responsible user not found");

    const insertInput: InsertPipelineInput = {
      companyName: input.companyName,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      estimatedValue: input.estimatedValue,
      stage: input.stage ?? "novo_lead",
      responsible: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        avatar: profile.avatar ?? "",
        role: profile.role,
      },
      lastContactAt: input.lastContactAt
        ? new Date(input.lastContactAt)
        : undefined,
      nextAction: input.nextAction,
      nextActionDate: input.nextActionDate
        ? new Date(input.nextActionDate)
        : undefined,
      meetingDate: input.meetingDate ? new Date(input.meetingDate) : undefined,
      source: input.source,
      notes: input.notes,
      staleAfterDays: input.staleAfterDays ?? 7,
    };

    return PipelineRepository.insert(supabase, insertInput);
  },

  async update(supabase: SupabaseClient, id: string, input: UpdateLeadInput) {
    await PipelineRepository.findById(supabase, id);

    const patch: UpdatePipelineInput = {};

    if (input.companyName !== undefined) patch.companyName = input.companyName;
    if (input.contactName !== undefined) patch.contactName = input.contactName;
    if (input.contactEmail !== undefined)
      patch.contactEmail = input.contactEmail;
    if (input.contactPhone !== undefined)
      patch.contactPhone = input.contactPhone;
    if (input.estimatedValue !== undefined)
      patch.estimatedValue = input.estimatedValue;
    if (input.lastContactAt !== undefined) {
      patch.lastContactAt = input.lastContactAt
        ? new Date(input.lastContactAt)
        : null;
    }
    if (input.nextAction !== undefined) patch.nextAction = input.nextAction;
    if (input.nextActionDate !== undefined) {
      patch.nextActionDate = input.nextActionDate
        ? new Date(input.nextActionDate)
        : null;
    }
    if (input.meetingDate !== undefined) {
      patch.meetingDate = input.meetingDate
        ? new Date(input.meetingDate)
        : null;
    }
    if (input.source !== undefined) patch.source = input.source;
    if (input.notes !== undefined) patch.notes = input.notes;
    if (input.staleAfterDays !== undefined)
      patch.staleAfterDays = input.staleAfterDays;

    if (input.responsibleId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, name, email, avatar, role")
        .eq("id", input.responsibleId)
        .single();

      if (profile) {
        patch.responsible = {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          avatar: profile.avatar ?? "",
          role: profile.role,
        };
      }
    }

    return PipelineRepository.update(supabase, id, patch);
  },

  async moveStage(supabase: SupabaseClient, id: string, input: MoveStageInput) {
    // Verify lead exists before moving
    await PipelineRepository.findById(supabase, id);

    if (input.stage === "perdido" && !input.lostReason?.trim()) {
      const err = new Error(
        'Motivo da perda é obrigatório para o estágio "perdido"',
      );
      Object.assign(err, { code: "VALIDATION_ERROR" });
      throw err;
    }

    const patch: UpdatePipelineInput = {
      stage: input.stage,
      // Reset the stale clock every time the stage changes
      stageEnteredAt: new Date(),
    };

    if (input.stage === "perdido") {
      patch.lostReason = input.lostReason ?? null;
    }

    if (input.stage === "reuniao_agendada" && input.meetingDate) {
      patch.meetingDate = new Date(input.meetingDate);
    }

    if (input.stage === "fechado") {
      const lead = await PipelineRepository.findById(supabase, id);

      // Se não houver cliente_id vinculado, criamos um novo cliente
      if (!lead.clienteId && !input.clienteId) {
        const newClient = await ClientesService.create(supabase, {
          name: lead.companyName,
          status: "Ativo",
          contractValue: lead.estimatedValue,
          responsibleId: lead.responsible.id,
          segment: "A definir",
          plan: "A definir",
          contact: {
            email: lead.contactEmail || `lead-${lead.id}@pipeline.connex`,
            phone: lead.contactPhone || "00000000",
          },
          internalNotes: `Lead convertido do pipeline. Notas originais: ${lead.notes || "N/A"}`,
        });
        patch.clienteId = newClient.id;
      } else if (input.clienteId) {
        patch.clienteId = input.clienteId;
      }
    }

    return PipelineRepository.update(supabase, id, patch);
  },

  async delete(supabase: SupabaseClient, id: string) {
    await PipelineRepository.findById(supabase, id);
    return PipelineRepository.delete(supabase, id);
  },
};
