import { AlertDialogHeader, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { ClientContato, ClientContatoType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@radix-ui/react-alert-dialog";
import { motion } from "framer-motion";
import { Plus, Loader2, Users, Mail, MessageSquare, Edit2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useCallback, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ContatoFormDialog from "./ContatoFormDialog";
import { contatoTypeLabels } from "../constants/contato-type";
import { contatoChannelLabels } from "../constants/contato-labels";

export default function ContatosTab({ clienteId }: { clienteId: string }) {
  const [contatos, setContatos] = useState<ClientContato[]>([]);
  const [isLoading, startLoadingTransition] = useTransition();
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ClientContato | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClientContato | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchContatos = useCallback(() => {
    startLoadingTransition(async () => {
      try {
        const res = await fetch(`/api/clientes/${clienteId}/contatos`);
        if (!res.ok) throw new Error();
        const json = await res.json();
        setContatos(json.data ?? []);
      } catch {
        toast.error("Falha ao carregar contatos");
      }
    });
  }, [clienteId]);

  useEffect(() => {
    fetchContatos();
  }, [fetchContatos]);

  const handleSuccess = (contato: ClientContato) => {
    if (editTarget) {
      setContatos((prev) =>
        prev.map((c) => (c.id === contato.id ? contato : c)),
      );
    } else {
      setContatos((prev) => [contato, ...prev]);
    }
    setEditTarget(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/clientes/${clienteId}/contatos/${deleteTarget.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error();
      setContatos((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      toast.success("Contato removido");
    } catch {
      toast.error("Falha ao remover contato");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const contatoTypeColors: Record<ClientContatoType, string> = {
    decisor: "bg-primary/10 text-primary border-primary/20",
    financeiro: "bg-success/10 text-success border-success/20",
    operacional: "bg-warning/10 text-warning border-warning/20",
    outro: "bg-muted text-muted-foreground border-border",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Contatos do cliente
        </h3>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 text-xs"
          onClick={() => {
            setEditTarget(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-3 w-3" /> Adicionar
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : contatos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8 text-center">
          <Users className="h-8 w-8 text-muted-foreground/30" />
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhum contato cadastrado
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {contatos.map((contato) => (
            <motion.div
              key={contato.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-border bg-secondary/20 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {contato.name}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-1.5 py-0",
                        contatoTypeColors[contato.type],
                      )}
                    >
                      {contatoTypeLabels[contato.type]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {contato.role}
                  </p>
                  <div className="mt-1.5 flex flex-col gap-1">
                    {contato.email && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{contato.email}</span>
                      </div>
                    )}
                    {contato.whatsapp && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MessageSquare className="h-3 w-3 shrink-0" />
                        <span>{contato.whatsapp}</span>
                      </div>
                    )}
                    {contato.preferredChannel && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="text-[10px] uppercase tracking-wider">
                          Canal:
                        </span>
                        <span>
                          {contatoChannelLabels[contato.preferredChannel]}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label="Editar contato"
                    onClick={() => {
                      setEditTarget(contato);
                      setFormOpen(true);
                    }}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-danger hover:bg-danger/10 hover:text-danger"
                    aria-label="Excluir contato"
                    onClick={() => setDeleteTarget(contato)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <ContatoFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        clienteId={clienteId}
        onSuccess={handleSuccess}
        mode={editTarget ? "edit" : "create"}
        initialData={editTarget ?? undefined}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover contato?</AlertDialogTitle>
            <AlertDialogDescription>
              O contato <strong>{deleteTarget?.name}</strong> será removido
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger text-white hover:bg-danger/90"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
