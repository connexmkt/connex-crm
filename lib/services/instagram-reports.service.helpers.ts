import type { SupabaseClient } from "@supabase/supabase-js";
import type { InstagramIntegrationStatus } from "@/lib/constants/instagram-reports";
import { ConnexInsightsRemoteRepository } from "@/lib/repositories/connex-insights-remote.repository";

export interface IntegrationLookupResult {
  username: string | null;
  profilePictureUrl: string | null;
  status: InstagramIntegrationStatus | null;
}

/**
 * Lê `instagram_integrations` em lote para os `tenant_id` informados
 * (research.md § D3) e nunca lança: uma falha na leitura remota marca todos
 * os clientes do lote como indisponíveis (`status: null`) em vez de
 * interromper a listagem local (FR-023, OBS-001).
 */
export async function fetchIntegrationsByTenantIds(
  admin: SupabaseClient,
  tenantIds: string[],
): Promise<Map<string, IntegrationLookupResult>> {
  if (tenantIds.length === 0) return new Map();

  try {
    const integrations = await ConnexInsightsRemoteRepository.listIntegrationsByTenantIds(
      admin,
      tenantIds,
    );

    return new Map(
      integrations.map((integration) => [
        integration.tenantId,
        {
          username: integration.username,
          profilePictureUrl: integration.profilePictureUrl,
          status: integration.status,
        },
      ]),
    );
  } catch (err) {
    console.error(
      JSON.stringify({
        scope: "instagram-reports-service",
        reason: "remote_integrations_batch_failed",
        tenantIds,
        errorMessage: err instanceof Error ? err.message : String(err),
      }),
    );
    return new Map();
  }
}
