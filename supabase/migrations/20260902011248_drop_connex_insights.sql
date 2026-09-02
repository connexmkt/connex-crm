-- Remove todos os objetos de banco do Connex Insights:
--   * Relatórios de Instagram (tabelas, view, triggers, policies)
--   * Provisionamento / gestão de usuários do Connex Insights
--   * Trilha de auditoria (audit_log) — só tinha consumidores no Insights
--
-- As migrations de criação correspondentes foram removidas do repositório
-- junto com o código da feature.

-- Relatórios de Instagram -----------------------------------------------------
DROP VIEW  IF EXISTS public.instagram_client_report_summary;
DROP TABLE IF EXISTS public.instagram_report_views    CASCADE;
DROP TABLE IF EXISTS public.instagram_report_posts    CASCADE;
DROP TABLE IF EXISTS public.instagram_weekly_reports  CASCADE;
DROP TABLE IF EXISTS public.instagram_monthly_reports CASCADE;

-- Auditoria -----------------------------------------------------------------
DROP TABLE IF EXISTS public.audit_log CASCADE;

-- Provisionamento / gestão de usuários do Connex Insights ------------------
DROP TABLE IF EXISTS public.insights_user_management_actions    CASCADE;
DROP TABLE IF EXISTS public.insights_user_provisioning_requests CASCADE;

DROP FUNCTION IF EXISTS set_insights_user_provisioning_requests_updated_at() CASCADE;

DROP TYPE IF EXISTS "InsightsUserActionStatus";
DROP TYPE IF EXISTS "InsightsUserActionType";
DROP TYPE IF EXISTS "ProvisioningStatus";
