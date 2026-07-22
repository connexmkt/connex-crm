-- CreateEnum
CREATE TYPE "ProvisioningStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED_DUPLICATE', 'FAILED_ERROR');

-- CreateTable
CREATE TABLE "insights_user_provisioning_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requested_by_profile_id" UUID NOT NULL,
    "insights_tenant_id" UUID NOT NULL,
    "insights_tenant_name_snapshot" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "status" "ProvisioningStatus" NOT NULL DEFAULT 'PENDING',
    "insights_auth_user_id" UUID,
    "insights_profile_id" UUID,
    "temporary_password_issued" BOOLEAN NOT NULL DEFAULT false,
    "failure_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "insights_user_provisioning_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "insights_user_provisioning_requests_email_key" ON "insights_user_provisioning_requests"("email");

-- CreateIndex
CREATE UNIQUE INDEX "insights_user_provisioning_requests_login_key" ON "insights_user_provisioning_requests"("login");

-- CreateIndex
CREATE INDEX "insights_user_provisioning_requests_insights_tenant_id_cr_idx" ON "insights_user_provisioning_requests"("insights_tenant_id", "created_at" DESC);

-- Trigger: manter updated_at sincronizado a cada UPDATE feito pelo Service
-- Role (nenhum papel `authenticated` tem policy de UPDATE — ver abaixo).
CREATE OR REPLACE FUNCTION set_insights_user_provisioning_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_insights_user_provisioning_requests_updated_at
BEFORE UPDATE ON "insights_user_provisioning_requests"
FOR EACH ROW
EXECUTE FUNCTION set_insights_user_provisioning_requests_updated_at();

-- RLS (Constituição do CRM, Princípio X — ver data-model.md § RLS e
-- research.md § D8 para a nota de enforcement: estas policies protegem
-- contra acesso direto/fora da aplicação; as queries do Route Handler via
-- Prisma usam um papel privilegiado e não são filtradas por RLS — a
-- autorização de aplicação, role === 'Admin', é a linha de defesa primária).
ALTER TABLE "insights_user_provisioning_requests" ENABLE ROW LEVEL SECURITY;

-- SELECT: o próprio solicitante ou qualquer Admin do CRM
CREATE POLICY "insights_provisioning_select_own_or_admin"
  ON "insights_user_provisioning_requests" FOR SELECT
  USING (
    requested_by_profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
    )
  );

-- INSERT: somente Admin do CRM
CREATE POLICY "insights_provisioning_insert_admin_only"
  ON "insights_user_provisioning_requests" FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
    )
  );

-- Nenhuma policy de UPDATE/DELETE para `authenticated`: transições de
-- status são feitas exclusivamente pelo Route Handler (Service Role/Prisma);
-- tabela append-only, mesma filosofia do `audit_log` da Constituição.
