import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client administrativo (Service Role) do projeto Supabase da Connex
 * Insights — usado exclusivamente em contexto de servidor (Route Handlers)
 * para ler indicadores/tenants/usuários e provisionar novos acessos.
 *
 * NUNCA importar este módulo em código que rode no cliente (browser).
 * Ver specs/002-provisionamento-usuarios-insights/research.md § D1/D4.
 */
export function createConnexInsightsAdminClient(): SupabaseClient {
  const url = process.env.SUPABASE_INSIGHTS_URL;
  const serviceRoleKey = process.env.SUPABASE_INSIGHTS_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Configure SUPABASE_INSIGHTS_URL e SUPABASE_INSIGHTS_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
