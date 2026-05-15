"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { AppShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, LayoutGrid, List, Loader2 } from "lucide-react";

// ─── Components ─────────────────────────────────────────────────────────────
import ClienteFormDialog from "./components/ClienteFormDialog";
import ClientDrawer from "./components/ClientDrawer";
import TableView from "./components/TableView";
import GridView from "./components/GridView";
import DeleteModal from "./components/DeleteModal";

// ─── Constants ──────────────────────────────────────────────────────────────
import { statusFilters } from "./constants/status-filters";

// ─── Hooks ──────────────────────────────────────────────────────────────────
import { useClientes } from "./hooks/useClientes";

// ─── Types ───────────────────────────────────────────────────────────────────
import type { Client } from "@/lib/types";

export default function ClientesPage() {
  const [statusFilter, setStatusFilter] = useState<string>("Todos");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Client | null>(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const { clientList, isLoading, upsertClient, updateClient } = useClientes(debouncedSearch, statusFilter);

  const filtered = clientList;

  return (
    <AppShell title="Clientes">
      <div className="space-y-5">
        {/* Top bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar clientes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-1">
              {statusFilters.map((s) => (
                <Button
                  key={s}
                  variant={statusFilter === s ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "text-xs",
                    statusFilter === s
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setStatusFilter(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() =>
                setViewMode(viewMode === "table" ? "grid" : "table")
              }
              aria-label="Alternar visualização"
            >
              {viewMode === "table" ? (
                <LayoutGrid className="h-4 w-4" />
              ) : (
                <List className="h-4 w-4" />
              )}
            </Button>
            <Button
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => {
                setEditTarget(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Novo Cliente
            </Button>
          </div>
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : viewMode === "table" ? (
          <TableView
            clients={filtered}
            onView={setSelectedClient}
            onEdit={(client) => {
              setEditTarget(client);
              setFormOpen(true);
            }}
            onDelete={setDeleteTarget}
          />
        ) : (
          <GridView clients={filtered} onView={setSelectedClient} />
        )}
      </div>

      {/* Overlay for drawer */}
      <AnimatePresence>
        {selectedClient && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedClient(null)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            />
            <ClientDrawer
              client={selectedClient}
              onClose={() => setSelectedClient(null)}
              onClientUpdate={(updated) => {
                updateClient(updated);
                setSelectedClient(updated);
              }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <DeleteModal />

      {/* Cliente Form Dialog */}
      <ClienteFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={(client) => {
          upsertClient(client, !!editTarget);
          setEditTarget(null);
        }}
        mode={editTarget ? "edit" : "create"}
        initialData={editTarget ?? undefined}
      />
    </AppShell>
  );
}
