-- CreateEnum
CREATE TYPE "InsightsUserActionType" AS ENUM ('DEACTIVATE', 'REACTIVATE', 'RESET_PASSWORD');

-- CreateEnum
CREATE TYPE "InsightsUserActionStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED_ERROR');

-- CreateTable
CREATE TABLE "insights_user_management_actions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requested_by_profile_id" UUID NOT NULL,
    "insights_user_id" UUID NOT NULL,
    "action_type" "InsightsUserActionType" NOT NULL,
    "status" "InsightsUserActionStatus" NOT NULL DEFAULT 'PENDING',
    "previous_status" TEXT,
    "temporary_password_issued" BOOLEAN NOT NULL DEFAULT false,
    "failure_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "insights_user_management_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "insights_user_management_actions_insights_user_id_created_idx" ON "insights_user_management_actions"("insights_user_id", "created_at" DESC);

-- Trigger: manter updated_at sincronizado a cada UPDATE feito pelo Service
-- Role (nenhum papel `authenticated` tem policy de UPDATE — ver abaixo).
-- `search_path` fixo desde a criação (evita o warning "Function Search Path
-- Mutable" do linter de segurança do Supabase — ver migration
-- 20260722203216_harden_insights_provisioning_trigger_search_path).
CREATE OR REPLACE FUNCTION set_insights_user_management_actions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_insights_user_management_actions_updated_at
BEFORE UPDATE ON "insights_user_management_actions"
FOR EACH ROW
EXECUTE FUNCTION set_insights_user_management_actions_updated_at();

-- RLS (Constituição do CRM, Princípio X — ver data-model.md § RLS e
-- research.md § D8 para a nota de enforcement: estas policies protegem
-- contra acesso direto/fora da aplicação; as queries do Route Handler via
-- Prisma usam um papel privilegiado e não são filtradas por RLS — a
-- autorização de aplicação é a linha de defesa primária).
--
-- Modelo de autorização: qualquer usuário autenticado no CRM pode acionar
-- estas ações (mesmo modelo adotado para o provisionamento — ver migration
-- 20260722211500_insights_provisioning_allow_any_authenticated).
ALTER TABLE "insights_user_management_actions" ENABLE ROW LEVEL SECURITY;

-- SELECT: apenas o próprio solicitante
CREATE POLICY "insights_user_management_actions_select_own"
  ON "insights_user_management_actions" FOR SELECT
  USING (requested_by_profile_id = auth.uid());

-- INSERT: qualquer autenticado, desde que o solicitante seja ele mesmo
CREATE POLICY "insights_user_management_actions_insert_authenticated"
  ON "insights_user_management_actions" FOR INSERT
  WITH CHECK (requested_by_profile_id = auth.uid());

-- Nenhuma policy de UPDATE/DELETE para `authenticated`: transições de
-- status são feitas exclusivamente pelo Route Handler (Service Role/Prisma);
-- tabela append-only, mesma filosofia do `audit_log` da Constituição.
