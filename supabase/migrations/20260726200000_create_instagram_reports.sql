-- Migration: create_instagram_reports
-- Feature 003-relatorios-instagram-crm
-- 4 tabelas + view + RLS + triggers moddatetime

CREATE EXTENSION IF NOT EXISTS moddatetime WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- instagram_weekly_reports
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.instagram_weekly_reports (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id        uuid          NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  source_report_id  text          NOT NULL,
  reference_year    smallint      NOT NULL,
  reference_month   smallint      NOT NULL CHECK (reference_month BETWEEN 1 AND 12),
  reference_week    smallint      NOT NULL CHECK (reference_week BETWEEN 1 AND 5),
  period_start      date          NOT NULL,
  period_end        date          NOT NULL,
  generated_at      timestamptz   NOT NULL,
  status            text          NOT NULL DEFAULT 'AVAILABLE'
                                  CHECK (status IN ('AVAILABLE', 'PARTIAL')),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT instagram_weekly_reports_period_check
    CHECK (period_start <= period_end),
  CONSTRAINT instagram_weekly_reports_source_report_id_key
    UNIQUE (source_report_id),
  CONSTRAINT instagram_weekly_reports_cliente_ref_key
    UNIQUE (cliente_id, reference_year, reference_month, reference_week)
);

CREATE INDEX IF NOT EXISTS idx_instagram_weekly_reports_cliente_period
  ON public.instagram_weekly_reports (cliente_id, reference_year DESC, reference_month DESC);

CREATE TRIGGER handle_updated_at_instagram_weekly_reports
  BEFORE UPDATE ON public.instagram_weekly_reports
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- ---------------------------------------------------------------------------
-- instagram_monthly_reports
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.instagram_monthly_reports (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id            uuid          NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  source_report_id      text          NOT NULL,
  reference_year        smallint      NOT NULL,
  reference_month       smallint      NOT NULL CHECK (reference_month BETWEEN 1 AND 12),
  generated_at          timestamptz   NOT NULL,
  status                text          NOT NULL DEFAULT 'AVAILABLE'
                                      CHECK (status IN ('AVAILABLE', 'PARTIAL')),
  followers_gained      integer       NULL,
  followers_start       integer       NULL,
  followers_end         integer       NULL,
  followers_growth_pct  numeric(6,2)  NULL,
  accounts_reached      integer       NULL,
  created_at            timestamptz   NOT NULL DEFAULT now(),
  updated_at            timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT instagram_monthly_reports_source_report_id_key
    UNIQUE (source_report_id),
  CONSTRAINT instagram_monthly_reports_cliente_ref_key
    UNIQUE (cliente_id, reference_year, reference_month)
);

CREATE INDEX IF NOT EXISTS idx_instagram_monthly_reports_cliente_period
  ON public.instagram_monthly_reports (cliente_id, reference_year DESC, reference_month DESC);

CREATE TRIGGER handle_updated_at_instagram_monthly_reports
  BEFORE UPDATE ON public.instagram_monthly_reports
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- ---------------------------------------------------------------------------
-- instagram_report_posts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.instagram_report_posts (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type           text          NOT NULL CHECK (report_type IN ('WEEKLY', 'MONTHLY')),
  weekly_report_id      uuid          NULL REFERENCES public.instagram_weekly_reports(id) ON DELETE CASCADE,
  monthly_report_id     uuid          NULL REFERENCES public.instagram_monthly_reports(id) ON DELETE CASCADE,
  role                  text          NOT NULL
                                      CHECK (role IN ('BEST', 'WORST', 'TOP_1', 'TOP_2', 'TOP_3')),
  instagram_media_id    text          NOT NULL,
  permalink             text          NULL,
  thumbnail_url         text          NULL,
  content_type          text          NULL,
  published_at          timestamptz   NULL,
  primary_metric_name   text          NULL,
  primary_metric_value  numeric       NULL,
  metrics               jsonb         NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz   NOT NULL DEFAULT now(),
  updated_at            timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT instagram_report_posts_fk_check CHECK (
    (report_type = 'WEEKLY' AND weekly_report_id IS NOT NULL AND monthly_report_id IS NULL)
    OR
    (report_type = 'MONTHLY' AND monthly_report_id IS NOT NULL AND weekly_report_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_instagram_report_posts_weekly_role
  ON public.instagram_report_posts (weekly_report_id, role)
  WHERE weekly_report_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_instagram_report_posts_monthly_role
  ON public.instagram_report_posts (monthly_report_id, role)
  WHERE monthly_report_id IS NOT NULL;

CREATE TRIGGER handle_updated_at_instagram_report_posts
  BEFORE UPDATE ON public.instagram_report_posts
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- ---------------------------------------------------------------------------
-- instagram_report_views
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.instagram_report_views (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cliente_id      uuid          NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  last_viewed_at  timestamptz   NOT NULL DEFAULT now(),
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT instagram_report_views_user_cliente_key
    UNIQUE (user_id, cliente_id)
);

CREATE TRIGGER handle_updated_at_instagram_report_views
  BEFORE UPDATE ON public.instagram_report_views
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- ---------------------------------------------------------------------------
-- VIEW: instagram_client_report_summary (security_invoker = true)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.instagram_client_report_summary
WITH (security_invoker = true)
AS
WITH weekly AS (
  SELECT
    cliente_id,
    MAX(period_end)::date AS last_ref_date,
    MAX(generated_at) AS last_generated_at,
    TRUE AS has_weekly
  FROM public.instagram_weekly_reports
  GROUP BY cliente_id
),
monthly AS (
  SELECT
    cliente_id,
    MAX(
      (make_date(reference_year::int, reference_month::int, 1)
        + INTERVAL '1 month - 1 day')::date
    ) AS last_ref_date,
    MAX(generated_at) AS last_generated_at,
    TRUE AS has_monthly
  FROM public.instagram_monthly_reports
  GROUP BY cliente_id
),
combined AS (
  SELECT cliente_id, last_ref_date, last_generated_at, has_weekly, FALSE AS has_monthly
  FROM weekly
  UNION ALL
  SELECT cliente_id, last_ref_date, last_generated_at, FALSE AS has_weekly, has_monthly
  FROM monthly
)
SELECT
  cliente_id,
  MAX(last_ref_date) AS last_report_reference_date,
  MAX(last_generated_at) AS last_generated_at,
  BOOL_OR(has_weekly) AS has_weekly_reports,
  BOOL_OR(has_monthly) AS has_monthly_reports
FROM combined
GROUP BY cliente_id;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.instagram_weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_report_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_report_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "instagram_weekly_reports_select_authenticated"
  ON public.instagram_weekly_reports FOR SELECT
  TO authenticated
  USING (auth.role() = 'authenticated');

CREATE POLICY "instagram_monthly_reports_select_authenticated"
  ON public.instagram_monthly_reports FOR SELECT
  TO authenticated
  USING (auth.role() = 'authenticated');

CREATE POLICY "instagram_report_posts_select_authenticated"
  ON public.instagram_report_posts FOR SELECT
  TO authenticated
  USING (auth.role() = 'authenticated');

CREATE POLICY "instagram_report_views_select_own"
  ON public.instagram_report_views FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "instagram_report_views_insert_own"
  ON public.instagram_report_views FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "instagram_report_views_update_own"
  ON public.instagram_report_views FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
