"use client";

import { useCallback, useState } from "react";
import type { ConnexInsightsUserRow } from "@/lib/repositories/connex-insights-remote.repository";

export interface UsersPage {
  items: ConnexInsightsUserRow[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Busca/paginação/refetch da listagem de usuários do Connex Insights.
 * Também usado pela US3 para atualizar a lista após uma criação bem
 * sucedida (FR-018).
 */
export function useConnexInsightsUsers(initial: UsersPage) {
  const [data, setData] = useState<UsersPage>(initial);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async (page: number, limit = data.limit) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      const res = await fetch(`/api/aplicacoes/connex-insights/usuarios?${params}`);
      if (!res.ok) throw new Error("Falha ao carregar usuários");
      const json = (await res.json()) as { data: UsersPage };
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setIsLoading(false);
    }
  }, [data.limit]);

  const refetch = useCallback(() => fetchPage(data.page), [fetchPage, data.page]);

  return { ...data, isLoading, error, fetchPage, refetch };
}
