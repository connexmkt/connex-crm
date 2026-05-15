import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Building2, Edit2, Eye, Trash2 } from "lucide-react";
import type { Client } from "@/lib/types";
import StatusBadge from "./StatusBadge";

interface TableViewProps {
  clients: Client[];
  onView: (client: Client) => void;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
}

export default function TableView({ clients, onView, onEdit, onDelete }: TableViewProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Cliente
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Segmento
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Responsável
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Última Atividade
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Contrato
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <motion.tr
                key={client.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="group relative cursor-pointer border-b border-border/50 transition-all hover:bg-primary/5"
                onClick={() => onView(client)}
                style={{ position: "relative" }}
              >
                <td className="relative px-4 py-3.5">
                  <div className="absolute left-0 top-0 h-full w-[3px] scale-y-0 rounded-r bg-primary transition-transform group-hover:scale-y-100" />
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                      {client.name[0]}
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {client.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-sm text-muted-foreground">
                    {client.segment}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <StatusBadge status={client.status} />
                </td>
                <td className="px-4 py-3.5">
                  {client.responsible ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={client.responsible.avatar} />
                        <AvatarFallback className="bg-primary/10 text-[9px] text-primary">
                          {client.responsible.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-foreground">
                        {client.responsible.name.split(" ")[0]}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-sm text-muted-foreground">
                    {new Date(client.lastActivity).toLocaleDateString("pt-BR")}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-sm font-medium text-foreground">
                    R$ {client.contractValue.toLocaleString("pt-BR")}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <div
                    className="flex items-center justify-end gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Ver detalhes"
                      onClick={() => onView(client)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Editar"
                      onClick={() => onEdit(client)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-danger hover:bg-danger/10 hover:text-danger"
                      aria-label="Excluir"
                      onClick={() => onDelete(client)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      {clients.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhum cliente encontrado
          </p>
        </div>
      )}
    </div>
  );
}
