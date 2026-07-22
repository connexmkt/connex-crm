-- Hardening: fixa search_path da função de trigger para evitar o warning
-- "Function Search Path Mutable" do linter de segurança do Supabase
-- (https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable).
CREATE OR REPLACE FUNCTION set_insights_user_provisioning_requests_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
