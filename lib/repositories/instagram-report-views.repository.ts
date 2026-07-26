import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Repository de `instagram_report_views` — rastreia a última vez que cada
 * usuário do CRM visualizou os relatórios de um cliente, usado apenas para
 * o indicador de "novo" (FR-004). RLS restringe leitura/escrita a
 * `user_id = auth.uid()` — ver data-model.md § RLS.
 */
export const InstagramReportViewsRepository = {
  async getLastViewedAt(
    supabase: SupabaseClient,
    userId: string,
    clienteId: string,
  ): Promise<string | null> {
    const { data, error } = await supabase
      .from("instagram_report_views")
      .select("last_viewed_at")
      .eq("user_id", userId)
      .eq("cliente_id", clienteId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return (data as { last_viewed_at: string }).last_viewed_at;
  },

  async upsertViewedNow(
    supabase: SupabaseClient,
    userId: string,
    clienteId: string,
  ): Promise<void> {
    const { error } = await supabase.from("instagram_report_views").upsert(
      {
        user_id: userId,
        cliente_id: clienteId,
        last_viewed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,cliente_id" },
    );

    if (error) throw error;
  },
};
