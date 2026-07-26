-- Migration: instagram_reports_rls_perf_fixes
-- Ajustes de performance nas policies RLS de instagram_* (advisor
-- auth_rls_initplan — auth.<function>() reavaliado por linha) e índice
-- ausente na FK de instagram_report_views.cliente_id (advisor
-- unindexed_foreign_keys). Ver Constitution X.

DROP POLICY IF EXISTS "instagram_weekly_reports_select_authenticated" ON public.instagram_weekly_reports;
CREATE POLICY "instagram_weekly_reports_select_authenticated"
  ON public.instagram_weekly_reports FOR SELECT
  TO authenticated
  USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "instagram_monthly_reports_select_authenticated" ON public.instagram_monthly_reports;
CREATE POLICY "instagram_monthly_reports_select_authenticated"
  ON public.instagram_monthly_reports FOR SELECT
  TO authenticated
  USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "instagram_report_posts_select_authenticated" ON public.instagram_report_posts;
CREATE POLICY "instagram_report_posts_select_authenticated"
  ON public.instagram_report_posts FOR SELECT
  TO authenticated
  USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "instagram_report_views_select_own" ON public.instagram_report_views;
CREATE POLICY "instagram_report_views_select_own"
  ON public.instagram_report_views FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "instagram_report_views_insert_own" ON public.instagram_report_views;
CREATE POLICY "instagram_report_views_insert_own"
  ON public.instagram_report_views FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "instagram_report_views_update_own" ON public.instagram_report_views;
CREATE POLICY "instagram_report_views_update_own"
  ON public.instagram_report_views FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE INDEX IF NOT EXISTS idx_instagram_report_views_cliente_id
  ON public.instagram_report_views (cliente_id);
