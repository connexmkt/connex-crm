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

/** Espelha o enum `UserStatus` do Prisma do connex-insights (não migrado
 * neste repositório — ver cabeçalho de `prisma/schema.prisma`). */
export type ConnexInsightsUserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

/** Chave correta do `app_metadata` esperada pelo middleware do Connex
 * Insights — ver `PROFILE_STATUS_METADATA_KEY` em
 * `connex-insights/lib/auth/profile-metadata.ts`. */
const PROFILE_STATUS_METADATA_KEY = "profile_status";

export interface ConnexInsightsUserDetail {
  id: string;
  displayName: string;
  status: ConnexInsightsUserStatus;
  tenantId: string;
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
      .upsert(
        {
          id: input.id,
          name: input.name,
          slug,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      )
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
      .select(
        "id, display_name, role, status, tenant_id, created_at, tenants(name)",
        {
          count: "exact",
        },
      )
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
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) throw error;
    return { profileId: (data as { id: string }).id };
  },

  async deleteAuthUser(
    admin: SupabaseClient,
    authUserId: string,
  ): Promise<void> {
    const { error } = await admin.auth.admin.deleteUser(authUserId);
    if (error) throw error;
  },

  /**
   * Busca um usuário do Connex Insights por `id` para validar existência e
   * status atual antes de inativar/reativar/resetar senha. Retorna `null`
   * se não encontrado (mapeado pelo service para 404).
   */
  async getUserById(
    admin: SupabaseClient,
    userId: string,
  ): Promise<ConnexInsightsUserDetail | null> {
    const { data, error } = await admin
      .from("profiles")
      .select("id, display_name, status, tenant_id")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const row = data as {
      id: string;
      display_name: string;
      status: string;
      tenant_id: string;
    };

    return {
      id: row.id,
      displayName: row.display_name,
      status: row.status as ConnexInsightsUserStatus,
      tenantId: row.tenant_id,
    };
  },

  /**
   * Atualiza o status do usuário em 2 escritas sequenciais: Auth
   * (`app_metadata.profile_status`, efeito imediato no middleware — ver
   * `lib/supabase/middleware.ts` do connex-insights) e depois `profiles.status`
   * (DB). Se a 2ª falhar após a 1ª ter sucesso, o acesso já está
   * corretamente bloqueado/liberado (falha segura); o erro deve ser
   * reportado pelo chamador como `FAILED_ERROR` — a ação é idempotente e
   * permite nova tentativa.
   */
  async setUserStatus(
    admin: SupabaseClient,
    userId: string,
    status: ConnexInsightsUserStatus,
  ): Promise<void> {
    const { error: authError } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: { [PROFILE_STATUS_METADATA_KEY]: status },
    });
    if (authError) throw authError;

    const { error: dbError } = await admin
      .from("profiles")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (dbError) throw dbError;
  },

  /**
   * Reseta a senha do usuário e força o fluxo `/ativar-conta` (troca de
   * senha obrigatória), reaproveitando o mesmo caminho usado na criação de
   * usuário: uma única chamada ao Auth (senha + `app_metadata.profile_status`)
   * seguida do `UPDATE profiles.status`.
   */
  async resetUserPassword(
    admin: SupabaseClient,
    userId: string,
    newPassword: string,
  ): Promise<void> {
    const { error: authError } = await admin.auth.admin.updateUserById(userId, {
      password: newPassword,
      app_metadata: { [PROFILE_STATUS_METADATA_KEY]: "INACTIVE" },
    });
    if (authError) throw authError;

    const { error: dbError } = await admin
      .from("profiles")
      .update({ status: "INACTIVE", updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (dbError) throw dbError;
  },
};
