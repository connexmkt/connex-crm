import type { SupabaseClient } from "@supabase/supabase-js";
import { ClientesRepository } from "@/lib/repositories/clientes.repository";

export interface ConnexInsightsTenantOption {
  id: string;
  name: string;
}

/**
 * A lista de clientes cadastrados no CRM (`/clientes`) é a única fonte de
 * verdade sobre quais tenants existem no Connex Insights — cada cliente
 * corresponde 1:1 a um tenant remoto com o mesmo `id` (ver
 * `ConnexInsightsRemoteRepository.upsertTenant`). Este service nunca lê a
 * tabela remota `tenants`; ele apenas espelha a base de clientes do CRM.
 */
export const ConnexInsightsTenantsService = {
  async listAll(supabase: SupabaseClient): Promise<ConnexInsightsTenantOption[]> {
    return ClientesRepository.findAllNames(supabase);
  },

  async count(supabase: SupabaseClient): Promise<number> {
    return ClientesRepository.count(supabase);
  },
};
