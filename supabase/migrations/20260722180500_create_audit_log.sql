-- Migration: create_audit_log
-- Tabela genérica de auditoria de ações administrativas do CRM
-- (Constitution Principle VIII). Append-only: nenhuma policy de
-- UPDATE/DELETE é criada para o papel `authenticated`.
--
-- Primeiro consumidor: ação `CREATE_CONNEX_INSIGHTS_USER`, registrada pelo
-- fluxo de provisionamento de usuários do Connex Insights (ver
-- specs/002-provisionamento-usuarios-insights/tasks.md T048).

CREATE TABLE IF NOT EXISTS public.audit_log (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_profile_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  action            text        NOT NULL,
  entity_type       text        NOT NULL,
  entity_id         text,
  metadata          jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_action_created_at
  ON public.audit_log (action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor_profile_id
  ON public.audit_log (actor_profile_id);

-- RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Somente Admin pode ler o histórico de auditoria.
CREATE POLICY "audit_log_select_admin_only"
  ON public.audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
    )
  );

-- Inserção somente por Admin (a aplicação sempre insere no contexto do
-- próprio usuário autenticado que executou a ação).
CREATE POLICY "audit_log_insert_admin_only"
  ON public.audit_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
    )
  );

-- Nenhuma policy de UPDATE/DELETE: tabela append-only.
