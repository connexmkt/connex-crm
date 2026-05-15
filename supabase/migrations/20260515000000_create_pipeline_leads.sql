-- Migration: create_pipeline_leads
-- Creates the pipeline_leads table for tracking the commercial sales funnel.
-- Stages: novo_lead → em_contato → reuniao_agendada → proposta_enviada → negociacao → fechado | perdido

-- ── 1. pipeline_leads ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pipeline_leads (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Lead identification
  company_name      text          NOT NULL,
  contact_name      text          NOT NULL,
  contact_email     text,
  contact_phone     text,

  -- Funnel
  estimated_value   numeric(12,2) NOT NULL DEFAULT 0 CHECK (estimated_value >= 0),
  stage             text          NOT NULL DEFAULT 'novo_lead'
                                  CHECK (stage = ANY (ARRAY[
                                    'novo_lead',
                                    'em_contato',
                                    'reuniao_agendada',
                                    'proposta_enviada',
                                    'negociacao',
                                    'fechado',
                                    'perdido'
                                  ])),

  -- Responsible commercial rep (denormalized for read performance)
  responsible       jsonb         NOT NULL,

  -- Engagement tracking
  last_contact_at   timestamptz,
  next_action       text,
  next_action_date  date,

  -- Stage-specific fields
  meeting_date      date,                    -- visible when stage = reuniao_agendada
  lost_reason       text,                    -- required when stage = perdido

  -- Origin
  source            text          NOT NULL DEFAULT 'prospeccao'
                                  CHECK (source = ANY (ARRAY['site','indicacao','prospeccao'])),

  -- Staleness: card turns red after this many days without a stage change
  stale_after_days  integer       NOT NULL DEFAULT 7 CHECK (stale_after_days > 0),

  -- Tracks when the lead entered the current stage (reset on every stage change)
  stage_entered_at  timestamptz   NOT NULL DEFAULT now(),

  notes             text,

  -- Linked client record when stage = fechado
  cliente_id        uuid          REFERENCES public.clientes(id) ON DELETE SET NULL,

  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);

-- ── 2. Auto-update updated_at trigger ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER pipeline_leads_updated_at
  BEFORE UPDATE ON public.pipeline_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 3. Performance indexes ────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_pipeline_leads_stage
  ON public.pipeline_leads (stage);

CREATE INDEX IF NOT EXISTS idx_pipeline_leads_stage_entered_at
  ON public.pipeline_leads (stage_entered_at);

CREATE INDEX IF NOT EXISTS idx_pipeline_leads_cliente_id
  ON public.pipeline_leads (cliente_id);

CREATE INDEX IF NOT EXISTS idx_pipeline_leads_company_name
  ON public.pipeline_leads USING gin (to_tsvector('portuguese', company_name));

-- ── 4. Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE public.pipeline_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users can read pipeline leads"
  ON public.pipeline_leads FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated users can insert pipeline leads"
  ON public.pipeline_leads FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated users can update pipeline leads"
  ON public.pipeline_leads FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated users can delete pipeline leads"
  ON public.pipeline_leads FOR DELETE TO authenticated USING (true);
