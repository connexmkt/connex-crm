"use client";

import { Loader2, ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ConnexInsightsUserRow } from "@/lib/repositories/connex-insights-remote.repository";

interface UsersTableProps {
  items: ConnexInsightsUserRow[];
  total: number;
  page: number;
  limit: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onDeactivate?: (user: ConnexInsightsUserRow) => void;
  onReactivate?: (user: ConnexInsightsUserRow) => void;
  onResetPassword?: (user: ConnexInsightsUserRow) => void;
  actionInProgressUserId?: string | null;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  ACTIVE: "default",
  INACTIVE: "secondary",
  SUSPENDED: "outline",
};

export function UsersTable({
  items,
  total,
  page,
  limit,
  isLoading,
  onPageChange,
  onDeactivate,
  onReactivate,
  onResetPassword,
  actionInProgressUserId,
}: UsersTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="rounded-lg border border-border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Tenant</th>
              <th className="px-4 py-3 font-medium">Papel</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            )}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
            {!isLoading &&
              items.map((user) => (
                <tr key={user.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">{user.displayName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{user.tenantName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{user.role}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[user.status] ?? "outline"}>{user.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={actionInProgressUserId === user.id}
                        >
                          {actionInProgressUserId === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                          <span className="sr-only">Ações do usuário</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {user.status === "SUSPENDED" ? (
                          <DropdownMenuItem onSelect={() => onReactivate?.(user)}>
                            Reativar
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onSelect={() => onDeactivate?.(user)}>
                            Inativar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onSelect={() => onResetPassword?.(user)}>
                          Resetar senha
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
        <span>
          Página {page} de {totalPages} · {total} usuário(s)
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page <= 1 || isLoading}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page >= totalPages || isLoading}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
