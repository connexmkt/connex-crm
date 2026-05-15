import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Client } from "@/lib/types";

export function useClientes(debouncedSearch: string, statusFilter: string) {
  const [clientList, setClientList] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchClientes = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: "1", limit: "100" });
      if (statusFilter !== "Todos") params.set("status", statusFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);

      const res = await fetch(`/api/clientes?${params}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("Falha ao carregar clientes");

      const json = await res.json();
      setClientList(json.data?.items ?? []);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setClientList([]);
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchClientes();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchClientes]);

  const upsertClient = useCallback((client: Client, isEdit: boolean) => {
    if (isEdit) {
      setClientList((prev) => prev.map((c) => (c.id === client.id ? client : c)));
    } else {
      setClientList((prev) => [client, ...prev]);
    }
  }, []);

  const updateClient = useCallback((updated: Client) => {
    setClientList((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }, []);

  const deleteCliente = useCallback(async (client: Client): Promise<boolean> => {
    try {
      const res = await fetch(`/api/clientes/${client.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setClientList((prev) => prev.filter((c) => c.id !== client.id));
      toast.success(`Cliente "${client.name}" excluído`);
      return true;
    } catch {
      toast.error("Falha ao excluir cliente. Tente novamente.");
      return false;
    }
  }, []);

  return { clientList, isLoading, upsertClient, updateClient, deleteCliente };
}
