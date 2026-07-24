import { Textarea } from "@/components/ui/textarea";
import { Client } from "@/lib/types";
import { StickyNote, Edit2, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function NotasInternasSection({
  client,
  onClientUpdate,
}: {
  client: Client;
  onClientUpdate?: (updated: Client) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(client.internalNotes ?? "");
  const [isSaving, setIsSaving] = useState(false);

  // Ajusta o estado durante o render (em vez de um Effect) quando o cliente
  // muda: evita um ciclo extra de renderização causado por setState no Effect.
  const [prevInternalNotes, setPrevInternalNotes] = useState(
    client.internalNotes,
  );
  if (client.internalNotes !== prevInternalNotes) {
    setPrevInternalNotes(client.internalNotes);
    setNotes(client.internalNotes ?? "");
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/clientes/${client.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internalNotes: notes }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error ?? "Erro ao salvar observações");
        return;
      }
      toast.success("Observações salvas");
      onClientUpdate?.(json.data as Client);
      setIsEditing(false);
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <StickyNote className="h-3.5 w-3.5" /> Observações internas
        </h3>
        {!isEditing && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setIsEditing(true)}
          >
            <Edit2 className="mr-1 h-3 w-3" /> Editar
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Escreva observações internas sobre este cliente..."
            rows={4}
            className="resize-none text-sm"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setIsEditing(false);
                setNotes(client.internalNotes ?? "");
              }}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="h-7 bg-primary text-primary-foreground text-xs hover:bg-primary/90"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : null}
              Salvar
            </Button>
          </div>
        </div>
      ) : notes ? (
        <p className="rounded-lg border border-border bg-secondary/20 p-3 text-sm text-foreground whitespace-pre-wrap">
          {notes}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground italic">
          Nenhuma observação registrada.
        </p>
      )}
    </div>
  );
}
