import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditLogInput = {
  actorProfileId: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Repository do `audit_log` (Constitution Principle VIII). Tabela do
 * próprio Supabase do connex-crm, append-only.
 */
export const AuditLogRepository = {
  async record(supabase: SupabaseClient, input: AuditLogInput): Promise<void> {
    const { error } = await supabase.from("audit_log").insert({
      actor_profile_id: input.actorProfileId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      metadata: input.metadata ?? {},
    });

    if (error) throw error;
  },
};
