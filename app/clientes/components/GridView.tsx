import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Building2, Trash2 } from "lucide-react";
import type { Client } from "@/lib/types";
import StatusBadge from "./StatusBadge";

interface GridViewProps {
  clients: Client[];
  onView: (client: Client) => void;
  onDelete: (client: Client) => void;
}

export default function GridView({ clients, onView, onDelete }: GridViewProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {clients.map((client) => (
        <motion.div
          key={client.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => onView(client)}
          className="group cursor-pointer rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
              {client.name[0]}
            </div>
            <div className="flex items-center gap-1">
              <StatusBadge status={client.status} />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-danger hover:bg-danger/10 hover:text-danger"
                aria-label="Excluir"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(client);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="mt-3">
            <h3 className="font-semibold text-foreground">{client.name}</h3>
            <p className="text-sm text-muted-foreground">{client.segment}</p>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm font-medium text-foreground">
              R$ {client.contractValue.toLocaleString("pt-BR")}/mês
            </span>
            {client.responsible && (
              <Avatar className="h-6 w-6">
                <AvatarImage src={client.responsible.avatar} />
                <AvatarFallback className="bg-primary/10 text-[9px] text-primary">
                  {client.responsible.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </motion.div>
      ))}
      {clients.length === 0 && (
        <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhum cliente encontrado
          </p>
        </div>
      )}
    </div>
  );
}
