-- Migration: leads_clientes_expansion
-- Expands clientes and pipeline_leads with new fields and creates lead interactions.

-- 1. Clientes expansion
ALTER TABLE public.clientes
  DROP COLUMN IF EXISTS plan,
  ADD COLUMN IF NOT EXISTS source          text NOT NULL DEFAULT 'prospeccao' 
    CHECK (source IN ('indicacao','instagram','site','prospeccao','evento')),
  ADD COLUMN IF NOT EXISTS source_referrer text,
  ADD COLUMN IF NOT EXISTS servicos        text[] NOT NULL DEFAULT '{}';

-- 2. Pipeline leads expansion
ALTER TABLE public.pipeline_leads
  ADD COLUMN IF NOT EXISTS temperature     text NOT NULL DEFAULT 'morno'
    CHECK (temperature IN ('quente','morno','frio')),
  ADD COLUMN IF NOT EXISTS source_referrer text;

-- Expand source check for pipeline_leads
-- First drop the existing constraint
ALTER TABLE public.pipeline_leads
  DROP CONSTRAINT IF EXISTS pipeline_leads_source_check;

-- Add the new constraint
ALTER TABLE public.pipeline_leads
  ADD CONSTRAINT pipeline_leads_source_check
    CHECK (source = ANY (ARRAY['site','indicacao','instagram','prospeccao','evento']));

-- 3. Lead interactions table
CREATE TABLE IF NOT EXISTS public.pipeline_lead_interactions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     uuid        NOT NULL REFERENCES public.pipeline_leads(id) ON DELETE CASCADE,
  kind        text        NOT NULL CHECK (kind IN ('whatsapp','email','ligacao','reuniao','outro')),
  description text        NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_by  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_lead_interactions_lead_id_occurred_at
  ON public.pipeline_lead_interactions (lead_id, occurred_at DESC);

-- RLS for lead interactions
ALTER TABLE public.pipeline_lead_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users can read lead interactions"
  ON public.pipeline_lead_interactions FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated users can insert lead interactions"
  ON public.pipeline_lead_interactions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated users can delete lead interactions"
  ON public.pipeline_lead_interactions FOR DELETE TO authenticated USING (true);

-- 4. Trigger to update last_contact_at in pipeline_leads
CREATE OR REPLACE FUNCTION public.update_lead_last_contact()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.pipeline_leads
  SET last_contact_at = NEW.occurred_at
  WHERE id = NEW.lead_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_update_lead_last_contact ON public.pipeline_lead_interactions;
CREATE TRIGGER tr_update_lead_last_contact
  AFTER INSERT ON public.pipeline_lead_interactions
  FOR EACH ROW EXECUTE FUNCTION public.update_lead_last_contact();
