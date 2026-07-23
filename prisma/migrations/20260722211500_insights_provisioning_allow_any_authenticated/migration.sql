-- A checagem de papel `Admin` do CRM para o fluxo de provisionamento de
-- usuários do Connex Insights foi removida (qualquer usuário autenticado no
-- CRM pode acionar a criação — ver specs/002-provisionamento-usuarios-insights).
-- Estas policies protegiam apenas contra acesso direto/fora da aplicação
-- (o Route Handler de produção usa Prisma com um papel Postgres privilegiado
-- que não é filtrado por RLS — ver data-model.md § RLS). Atualizadas para
-- refletir o novo modelo de autorização: qualquer usuário autenticado.

DROP POLICY IF EXISTS "insights_provisioning_select_own_or_admin" ON "insights_user_provisioning_requests";

CREATE POLICY "insights_provisioning_select_own"
  ON "insights_user_provisioning_requests" FOR SELECT
  USING (requested_by_profile_id = auth.uid());

DROP POLICY IF EXISTS "insights_provisioning_insert_admin_only" ON "insights_user_provisioning_requests";

CREATE POLICY "insights_provisioning_insert_authenticated"
  ON "insights_user_provisioning_requests" FOR INSERT
  WITH CHECK (requested_by_profile_id = auth.uid());
