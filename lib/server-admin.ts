import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client administrativo (Service Role) do próprio Supabase do connex-crm —
 * usado exclusivamente pelos Route Handlers de ingestão de relatórios de
 * Instagram (Insights → CRM) para contornar RLS de forma controlada.
 *
 * NUNCA importar este módulo em código que rode no cliente (browser).
 * Ver specs/003-relatorios-instagram-crm/research.md § D11.
 */
export function createCrmAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
