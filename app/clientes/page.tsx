"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Activity, Campaign, Client } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Search,
  Plus,
  Eye,
  Edit2,
  Trash2,
  X,
  LayoutGrid,
  List,
  Mail,
  Phone,
  Globe,
  Calendar,
  Building2,
  DollarSign,
  Loader2,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { toast } from "sonner";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const novoClienteSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres").max(100),
  segment: z.string().min(1, "Segmento é obrigatório"),
  status: z.enum(["Ativo", "Lead", "Inativo", "Em risco"], {
    required_error: "Selecione um status",
  }),
  plan: z.string().min(1, "Plano é obrigatório"),
  contractValue: z.coerce
    .number({ invalid_type_error: "Insira um valor válido" })
    .positive("Valor deve ser maior que zero"),
  contact: z.object({
    email: z.string().email("E-mail inválido"),
    phone: z.string().min(8, "Telefone deve ter ao menos 8 dígitos"),
    website: z
      .string()
      .url("URL inválida")
      .optional()
      .or(z.literal("")),
  }),
});

type NovoClienteForm = z.infer<typeof novoClienteSchema>;

// ─── Status config ────────────────────────────────────────────────────────────

const statusConfig = {
  Ativo: {
    label: "Ativo",
    className: "bg-success/10 text-success border-success/20",
  },
  Lead: {
    label: "Lead",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  Inativo: {
    label: "Inativo",
    className: "bg-muted text-muted-foreground border-border",
  },
  "Em risco": {
    label: "Em risco",
    className: "bg-warning/10 text-warning border-warning/20",
  },
};

function StatusBadge({ status }: { status: Client["status"] }) {
  const config = statusConfig[status];
  return (
    <Badge variant="outline" className={cn("text-xs", config.className)}>
      {config.label}
    </Badge>
  );
}

// ─── Novo Cliente Dialog ──────────────────────────────────────────────────────

function NovoClienteDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (client: Client) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<NovoClienteForm>({
    resolver: zodResolver(novoClienteSchema),
    defaultValues: {
      name: "",
      segment: "",
      status: "Lead",
      plan: "",
      contractValue: 0,
      contact: { email: "", phone: "", website: "" },
    },
  });

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  const onSubmit = async (values: NovoClienteForm) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          contact: {
            ...values.contact,
            website: values.contact.website || undefined,
          },
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        const msg =
          json?.details?.formErrors?.[0] ??
          json?.error ??
          "Erro ao criar cliente";
        toast.error(msg);
        return;
      }

      toast.success(`Cliente "${values.name}" criado com sucesso!`);
      onCreated(json.data as Client);
      handleClose();
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">
            Novo Cliente
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-2"
          >
            {/* Nome */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da empresa</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Acme Ltda" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Segmento */}
              <FormField
                control={form.control}
                name="segment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Segmento</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: E-commerce" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Ativo">Ativo</SelectItem>
                        <SelectItem value="Lead">Lead</SelectItem>
                        <SelectItem value="Inativo">Inativo</SelectItem>
                        <SelectItem value="Em risco">Em risco</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Plano */}
              <FormField
                control={form.control}
                name="plan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plano</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Premium" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Valor do contrato */}
              <FormField
                control={form.control}
                name="contractValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor mensal (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="0,00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="pt-1">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Contato
              </p>
              <div className="space-y-3">
                {/* E-mail */}
                <FormField
                  control={form.control}
                  name="contact.email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="contato@empresa.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Telefone */}
                <FormField
                  control={form.control}
                  name="contact.phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input placeholder="(11) 99999-9999" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Website */}
                <FormField
                  control={form.control}
                  name="contact.website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Website{" "}
                        <span className="text-muted-foreground font-normal">
                          (opcional)
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="https://empresa.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Criar Cliente"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Client Drawer ────────────────────────────────────────────────────────────

function ClientDrawer({
  client,
  onClose,
}: {
  client: Client;
  onClose: () => void;
}) {
  const allActivities: Activity[] = [];
  const allCampaigns: Campaign[] = [];
  const clientActivities = allActivities.filter((a) => a.client?.id === client.id);
  const clientCampaigns = allCampaigns.filter((c) => c.client.id === client.id);

  return (
    <motion.div
      initial={{ x: 420, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 420, opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 280 }}
      className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[440px] flex-col bg-card shadow-2xl border-l border-border"
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-2xl font-bold text-primary">
            {client.name[0]}
          </div>
          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground">
              {client.name}
            </h2>
            <p className="text-sm text-muted-foreground">{client.segment}</p>
            <StatusBadge status={client.status} />
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Contract value badge */}
      <div className="border-b border-border px-6 py-3">
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="h-4 w-4 text-success" />
          <span className="font-semibold text-foreground">
            R$ {client.contractValue.toLocaleString("pt-BR")}
          </span>
          <span className="text-muted-foreground">/mês</span>
          <Badge variant="secondary" className="ml-auto text-xs">
            {client.plan}
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        defaultValue="visao-geral"
        className="flex flex-1 flex-col overflow-hidden"
      >
        <TabsList className="mx-6 mt-4 grid w-auto grid-cols-4">
          <TabsTrigger value="visao-geral" className="text-xs">
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="historico" className="text-xs">
            Histórico
          </TabsTrigger>
          <TabsTrigger value="campanhas" className="text-xs">
            Campanhas
          </TabsTrigger>
          <TabsTrigger value="notas" className="text-xs">
            Notas
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <TabsContent value="visao-geral" className="mt-0 space-y-4">
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Informações de Contato
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">
                    {client.contact.email}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">
                    {client.contact.phone}
                  </span>
                </div>
                {client.contact.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-primary">
                      {client.contact.website}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Detalhes
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" /> Segmento
                  </span>
                  <span className="font-medium text-foreground">
                    {client.segment}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Onboarding
                  </span>
                  <span className="font-medium text-foreground">
                    {new Date(client.onboardingDate).toLocaleDateString(
                      "pt-BR",
                    )}
                  </span>
                </div>
                {client.responsible && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Responsável</span>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={client.responsible.avatar} />
                        <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                          {client.responsible.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-foreground">
                        {client.responsible.name.split(" ")[0]}
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Última Atividade
                  </span>
                  <span className="font-medium text-foreground">
                    {new Date(client.lastActivity).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="historico" className="mt-0">
            {clientActivities.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma atividade registrada
              </p>
            ) : (
              <div className="relative space-y-4 pl-4 before:absolute before:left-1.5 before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-border">
                {clientActivities.map((activity) => (
                  <div key={activity.id} className="relative flex gap-3">
                    <div className="absolute -left-[13px] top-1 h-2.5 w-2.5 rounded-full border-2 border-primary bg-card" />
                    <div>
                      <p className="text-sm text-foreground">
                        {activity.description}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleDateString(
                          "pt-BR",
                          {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="campanhas" className="mt-0 space-y-3">
            {clientCampaigns.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma campanha vinculada
              </p>
            ) : (
              clientCampaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="rounded-lg border border-border bg-secondary/30 p-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {campaign.name}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {campaign.platforms.map((p) => (
                          <Badge
                            key={p}
                            variant="secondary"
                            className="text-[10px] px-1"
                          >
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        campaign.status === "Ativa"
                          ? "bg-success/10 text-success border-success/20"
                          : campaign.status === "Pausada"
                            ? "bg-warning/10 text-warning border-warning/20"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {campaign.status}
                    </Badge>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    R$ {campaign.budget.spent.toLocaleString("pt-BR")} / R${" "}
                    {campaign.budget.total.toLocaleString("pt-BR")}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="notas" className="mt-0">
            <NotasTab clientId={client.id} />
          </TabsContent>
        </div>
      </Tabs>
    </motion.div>
  );
}

function NotasTab({ clientId }: { clientId: string }) {
  const [notes, setNotes] = useState<
    { id: string; text: string; createdAt: Date }[]
  >([]);
  const [noteText, setNoteText] = useState("");

  const addNote = () => {
    if (!noteText.trim()) return;
    setNotes((prev) => [
      {
        id: Date.now().toString(),
        text: noteText.trim(),
        createdAt: new Date(),
      },
      ...prev,
    ]);
    setNoteText("");
  };

  // clientId is intentionally unused here — notes are stored locally per session
  void clientId;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Escreva uma nota sobre este cliente..."
          className="w-full rounded-lg border border-border bg-secondary/50 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          rows={3}
        />
        <Button
          size="sm"
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={addNote}
          disabled={!noteText.trim()}
        >
          Salvar Nota
        </Button>
      </div>
      {notes.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-4">
          Nenhuma nota ainda
        </p>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-lg border border-border bg-secondary/30 p-3"
            >
              <p className="text-sm text-foreground">{note.text}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {note.createdAt.toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const statusFilters = [
  "Todos",
  "Ativo",
  "Lead",
  "Inativo",
  "Em risco",
] as const;

export default function ClientesPage() {
  const [clientList, setClientList] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Todos");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [novoClienteOpen, setNovoClienteOpen] = useState(false);

  const fetchClientes = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: "1", limit: "100" });
      if (statusFilter !== "Todos") params.set("status", statusFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/clientes?${params}`);
      if (!res.ok) throw new Error("Falha ao carregar clientes");

      const json = await res.json();
      setClientList(json.data?.items ?? []);
    } catch {
      // Fallback to empty list — toast handled by the component if needed
      setClientList([]);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  const handleClientCreated = (newClient: Client) => {
    setClientList((prev) => [newClient, ...prev]);
  };

  const filtered = clientList.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.segment.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "Todos" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
              onClick={() => setNovoClienteOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Novo Cliente
            </Button>
          </div>
        </div>

        {/* Loading skeleton */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : viewMode === "table" ? (
          /* Table view */
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
                  {filtered.map((client) => (
                    <motion.tr
                      key={client.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="group relative cursor-pointer border-b border-border/50 transition-all hover:bg-primary/5"
                      onClick={() => setSelectedClient(client)}
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
                          <span className="text-sm text-muted-foreground">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm text-muted-foreground">
                          {new Date(client.lastActivity).toLocaleDateString(
                            "pt-BR",
                          )}
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
                            onClick={() => setSelectedClient(client)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-danger hover:bg-danger/10 hover:text-danger"
                            aria-label="Excluir"
                            onClick={() => setDeleteTarget(client)}
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
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Building2 className="h-10 w-10 text-muted-foreground/30" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhum cliente encontrado
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Grid view */
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((client) => (
              <motion.div
                key={client.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setSelectedClient(client)}
                className="cursor-pointer rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
                    {client.name[0]}
                  </div>
                  <StatusBadge status={client.status} />
                </div>
                <div className="mt-3">
                  <h3 className="font-semibold text-foreground">
                    {client.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {client.segment}
                  </p>
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
            {filtered.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                <Building2 className="h-10 w-10 text-muted-foreground/30" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhum cliente encontrado
                </p>
              </div>
            )}
          </div>
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
            />
          </>
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O cliente{" "}
              <strong>{deleteTarget?.name}</strong> será removido
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger text-white hover:bg-danger/90"
              onClick={() => setDeleteTarget(null)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Novo Cliente Dialog */}
      <NovoClienteDialog
        open={novoClienteOpen}
        onOpenChange={setNovoClienteOpen}
        onCreated={handleClientCreated}
      />
    </AppShell>
  );
}
