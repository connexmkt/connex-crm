-- Migration: audit_log_allow_any_authenticated_insert
-- A checagem de papel `Admin` do CRM para acionar o fluxo de criação de
-- usuários do Connex Insights foi removida (qualquer usuário autenticado no
-- CRM pode criar acessos — ver specs/002-provisionamento-usuarios-insights).
-- A policy de INSERT do `audit_log` ainda exigia `profiles.role = 'Admin'`,
-- o que bloqueava silenciosamente (erro capturado e apenas logado) o
-- registro de auditoria para usuários não-Admin. Substituída por uma
-- checagem de posse: qualquer usuário autenticado pode inserir, desde que
-- `actor_profile_id` seja o próprio usuário (nunca em nome de terceiros).

DROP POLICY IF EXISTS "audit_log_insert_admin_only" ON public.audit_log;

CREATE POLICY "audit_log_insert_own_actor"
  ON public.audit_log FOR INSERT
  WITH CHECK (actor_profile_id = auth.uid());

-- A policy de SELECT permanece restrita a Admin: não há, até o momento,
-- nenhuma funcionalidade que leia o histórico de auditoria via sessão de
-- usuário comum, e a leitura do log geral do CRM continua sendo tratada
-- como uma capacidade administrativa.
