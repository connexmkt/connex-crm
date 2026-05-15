import { useState } from "react";
import { useClientes } from "../hooks/useClientes";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Client } from "@/lib/types";

import {
  AlertDialogHeader,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@radix-ui/react-alert-dialog";

export default function DeleteModal() {
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const search = "";
  const statusFilter = "Todos";
  const debouncedSearch = useDebouncedValue(search, 300);
  const { deleteCliente } = useClientes(debouncedSearch, statusFilter);

  return (
    <AlertDialog
      open={!!deleteTarget}
      onOpenChange={(open) => !open && setDeleteTarget(null)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. O cliente{" "}
            <strong>{deleteTarget?.name}</strong> será removido permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-danger text-white hover:bg-danger/90"
            onClick={async () => {
              if (!deleteTarget) return;
              const success = await deleteCliente(deleteTarget);
              if (success && selectedClient?.id === deleteTarget.id) {
                setSelectedClient(null);
              }
              setDeleteTarget(null);
            }}
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
