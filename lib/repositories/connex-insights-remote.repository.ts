import type { SupabaseClient } from "@supabase/supabase-js";
import { slugify } from "@/lib/utils/slugify";

export interface ConnexInsightsTenant {
  id: string;
  name: string;
}

export interface ConnexInsightsUserRow {
  id: string;
  displayName: string;
  role: string;
  status: string;
  tenantId: string;
  tenantName: string;
  createdAt: string;
}

interface ProfileWithTenantRow {
  id: string;
  display_name: string;
  role: string;
  status: string;
  tenant_id: string;
  created_at: string;
  tenants: { name: string } | null;
}

/**
 * Repository de acesso ao Supabase do Connex Insights (Service Role,
 * `@supabase/supabase-js`) — nunca migrado pelo connex-crm. Ver
 * specs/002-provisionamento-usuarios-insights/research.md § D1.
 */
export const ConnexInsightsRemoteRepository = {
  async countUsers(admin: SupabaseClient): Promise<number> {
    const { count, error } = await admin
      .from("profiles")
      .select("*", { count: "exact", head: true });

    if (error) throw error;
    return count ?? 0;
  },

  /**
   * Garante que exista, no Supabase do Connex Insights, um tenant com o
   * mesmo `id` do cliente do CRM (`clientes.id`), criando-o se necessário
   * ou atualizando o nome/slug quando já existir. A lista de clientes em
   * `/clientes` é a única fonte de verdade sobre quais tenants existem —
   * este método é o único ponto que escreve na tabela remota `tenants`.
   */
  async upsertTenant(
    admin: SupabaseClient,
    input: { id: string; name: string },
  ): Promise<ConnexInsightsTenant> {
    const slug = `${slugify(input.name)}-${input.id.slice(0, 8)}`;

    const { data, error } = await admin
      .from("tenants")
      .upsert({ id: input.id, name: input.name, slug }, { onConflict: "id" })
      .select("id, name")
      .single();

    if (error) throw error;
    return data as ConnexInsightsTenant;
  },

  async listUsers(
    admin: SupabaseClient,
    page: number,
    pageSize: number,
  ): Promise<{ items: ConnexInsightsUserRow[]; total: number }> {
    const from = (page - 1) * pageSize;
    const { data, error, count } = await admin
      .from("profiles")
      .select("id, display_name, role, status, tenant_id, created_at, tenants(name)", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const rows = (data ?? []) as unknown as ProfileWithTenantRow[];
    const items: ConnexInsightsUserRow[] = rows.map((row) => ({
      id: row.id,
      displayName: row.display_name,
      role: row.role,
      status: row.status,
      tenantId: row.tenant_id,
      tenantName: row.tenants?.name ?? "—",
      createdAt: row.created_at,
    }));

    return { items, total: count ?? 0 };
  },

  /**
   * Cria o usuário no Supabase Auth do Connex Insights. Passo 1 do saga de
   * 2 etapas (research.md § D2) — se falhar, nenhum efeito colateral.
   */
  async createAuthUser(
    admin: SupabaseClient,
    input: { email: string; password: string; tenantId: string },
  ): Promise<{ authUserId: string }> {
    const { data, error } = await admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      app_metadata: { tenant_id: input.tenantId, status: "INACTIVE" },
    });

    if (error || !data.user) {
      throw error ?? new Error("Falha ao criar usuário no Connex Insights");
    }

    return { authUserId: data.user.id };
  },

  /**
   * Passo 2 do saga: INSERT em `profiles`. Uma única instrução SQL via
   * PostgREST já é atômica por natureza (Postgres garante atomicidade por
   * statement); não há necessidade de BEGIN/COMMIT explícito para um único
   * INSERT. Violações de UNIQUE (ex.: `login` duplicado) surgem como erro
   * Postgres 23505, mapeado pelo service para 409 Conflict.
   *
   * NOTA: a coluna `login` depende da extensão de schema do connex-insights
   * documentada como dependência bloqueante externa (ver spec.md § Impacto
   * Cross-Repo). Enquanto ausente, este INSERT falha.
   */
  async insertProfile(
    admin: SupabaseClient,
    input: {
      authUserId: string;
      tenantId: string;
      displayName: string;
      login: string;
    },
  ): Promise<{ profileId: string }> {
    const { data, error } = await admin
      .from("profiles")
      .insert({
        id: input.authUserId,
        tenant_id: input.tenantId,
        display_name: input.displayName,
        login: input.login,
        role: "MEMBER",
        status: "INACTIVE",
      })
      .select("id")
      .single();

    if (error) throw error;
    return { profileId: (data as { id: string }).id };
  },

  /** Compensação (research.md § D2, passo 3): remove o Auth user "fantasma"
   * quando o INSERT em `profiles` falha. */
  async deleteAuthUser(admin: SupabaseClient, authUserId: string): Promise<void> {
    const { error } = await admin.auth.admin.deleteUser(authUserId);
    if (error) throw error;
  },
};
