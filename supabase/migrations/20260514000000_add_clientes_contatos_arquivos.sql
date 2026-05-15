-- Migration: add_clientes_contatos_arquivos
-- Adds contract dates, internal notes to clientes;
-- creates cliente_contatos and cliente_arquivos tables;
-- creates storage bucket for client files.

-- ── 1. Extend clientes table ─────────────────────────────────────────────────

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS contract_start_date    date,
  ADD COLUMN IF NOT EXISTS contract_renewal_date  date,
  ADD COLUMN IF NOT EXISTS internal_notes         text;

-- ── 2. cliente_contatos ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cliente_contatos (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id        uuid        NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  name              text        NOT NULL,
  role              text        NOT NULL,
  email             text,
  whatsapp          text,
  preferred_channel text        CHECK (preferred_channel = ANY (ARRAY['email','whatsapp','phone','outro'])),
  type              text        NOT NULL CHECK (type = ANY (ARRAY['decisor','financeiro','operacional','outro'])),
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cliente_contatos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users can read clientes contatos"
  ON public.cliente_contatos FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated users can insert clientes contatos"
  ON public.cliente_contatos FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated users can update clientes contatos"
  ON public.cliente_contatos FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated users can delete clientes contatos"
  ON public.cliente_contatos FOR DELETE TO authenticated USING (true);

-- ── 3. cliente_arquivos ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cliente_arquivos (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id  uuid        NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  file_path   text        NOT NULL,
  file_type   text        NOT NULL CHECK (file_type = ANY (ARRAY['contrato_assinado','briefing','proposta','outro'])),
  file_size   bigint,
  mime_type   text,
  uploaded_by uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cliente_arquivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users can read clientes arquivos"
  ON public.cliente_arquivos FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated users can insert clientes arquivos"
  ON public.cliente_arquivos FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated users can delete clientes arquivos"
  ON public.cliente_arquivos FOR DELETE TO authenticated USING (true);

-- ── 4. Storage bucket ────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cliente-arquivos',
  'cliente-arquivos',
  false,
  52428800, -- 50 MB
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "authenticated can upload client files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cliente-arquivos');

CREATE POLICY "authenticated can read client files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'cliente-arquivos');

CREATE POLICY "authenticated can delete client files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'cliente-arquivos');
