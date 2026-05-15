"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { AppShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import type {
  Activity,
  Campaign,
  Client,
  ClientContato,
  ClientArquivo,
  ClientContatoType,
  ClientContatoChannel,
  ClientArquivoType,
} from "@/lib/types";

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
  MessageSquare,
  FileText,
  Upload,
  Download,
  Users,
  Paperclip,
  RefreshCw,
  StickyNote,
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
    website: z.string().url("URL inválida").optional().or(z.literal("")),
  }),
  contractStartDate: z.string().optional().or(z.literal("")),
  contractRenewalDate: z.string().optional().or(z.literal("")),
  internalNotes: z.string().max(5000).optional(),
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

// ─── Cliente Form Dialog ──────────────────────────────────────────────────────

function ClienteFormDialog({
  open,
  onOpenChange,
  onSuccess,
  mode = "create",
  initialData,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (client: Client) => void;
  mode?: "create" | "edit";
  initialData?: Client;
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
      contractStartDate: "",
      contractRenewalDate: "",
      internalNotes: "",
    },
  });

  useEffect(() => {
    if (open && mode === "edit" && initialData) {
      form.reset({
        name: initialData.name,
        segment: initialData.segment,
        status: initialData.status,
        plan: initialData.plan,
        contractValue: initialData.contractValue,
        contact: {
          email: initialData.contact.email,
          phone: initialData.contact.phone,
          website: initialData.contact.website || "",
        },
        contractStartDate: initialData.contractStartDate
          ? new Date(initialData.contractStartDate).toISOString().split("T")[0]
          : "",
        contractRenewalDate: initialData.contractRenewalDate
          ? new Date(initialData.contractRenewalDate)
              .toISOString()
              .split("T")[0]
          : "",
        internalNotes: initialData.internalNotes || "",
      });
    } else if (open && mode === "create") {
      form.reset({
        name: "",
        segment: "",
        status: "Lead",
        plan: "",
        contractValue: 0,
        contact: { email: "", phone: "", website: "" },
        contractStartDate: "",
        contractRenewalDate: "",
        internalNotes: "",
      });
    }
  }, [open, mode, initialData, form]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const onSubmit = async (values: NovoClienteForm) => {
    setIsSubmitting(true);
    try {
      const url =
        mode === "create"
          ? "/api/clientes"
          : `/api/clientes/${initialData?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          contact: {
            ...values.contact,
            website: values.contact.website || undefined,
          },
          contractStartDate: values.contractStartDate || undefined,
          contractRenewalDate: values.contractRenewalDate || undefined,
          internalNotes: values.internalNotes || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        const msg =
          json?.details?.formErrors?.[0] ??
          json?.error ??
          `Erro ao ${mode === "create" ? "criar" : "atualizar"} cliente`;
        toast.error(msg);
        return;
      }

      toast.success(
        `Cliente "${values.name}" ${
          mode === "create" ? "criado" : "atualizado"
        } com sucesso!`,
      );
      onSuccess(json.data as Client);
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
            {mode === "create" ? "Novo Cliente" : "Editar Cliente"}
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
                    <Select onValueChange={field.onChange} value={field.value}>
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

            <div className="pt-1">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Contrato
              </p>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="contractStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de início</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contractRenewalDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de renovação</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="internalNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Observações internas{" "}
                    <span className="text-muted-foreground font-normal">
                      (opcional)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Anotações internas sobre o cliente..."
                      rows={3}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                ) : mode === "create" ? (
                  "Criar Cliente"
                ) : (
                  "Salvar Alterações"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Type label maps ─────────────────────────────────────────────────────────

const contatoTypeLabels: Record<ClientContatoType, string> = {
  decisor: "Decisor",
  financeiro: "Financeiro",
  operacional: "Operacional",
  outro: "Outro",
};

const contatoChannelLabels: Record<ClientContatoChannel, string> = {
  email: "E-mail",
  whatsapp: "WhatsApp",
  phone: "Telefone",
  outro: "Outro",
};

const arquivoTypeLabels: Record<ClientArquivoType, string> = {
  contrato_assinado: "Contrato Assinado",
  briefing: "Briefing",
  proposta: "Proposta",
  outro: "Outro",
};

// ─── Contatos Tab ─────────────────────────────────────────────────────────────

const contatoSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  role: z.string().min(1, "Cargo é obrigatório").max(100),
  type: z.enum(["decisor", "financeiro", "operacional", "outro"], {
    required_error: "Selecione o tipo",
  }),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  whatsapp: z
    .string()
    .min(8, "WhatsApp deve ter ao menos 8 dígitos")
    .optional()
    .or(z.literal("")),
  preferredChannel: z.enum(["email", "whatsapp", "phone", "outro"]).optional(),
});

type ContatoForm = z.infer<typeof contatoSchema>;

function ContatoFormDialog({
  open,
  onOpenChange,
  clienteId,
  onSuccess,
  mode,
  initialData,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string;
  onSuccess: (contato: ClientContato) => void;
  mode: "create" | "edit";
  initialData?: ClientContato;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ContatoForm>({
    resolver: zodResolver(contatoSchema),
    defaultValues: {
      name: "",
      role: "",
      type: "decisor",
      email: "",
      whatsapp: "",
      preferredChannel: undefined,
    },
  });

  useEffect(() => {
    if (open && mode === "edit" && initialData) {
      form.reset({
        name: initialData.name,
        role: initialData.role,
        type: initialData.type,
        email: initialData.email || "",
        whatsapp: initialData.whatsapp || "",
        preferredChannel: initialData.preferredChannel,
      });
    } else if (open && mode === "create") {
      form.reset({
        name: "",
        role: "",
        type: "decisor",
        email: "",
        whatsapp: "",
        preferredChannel: undefined,
      });
    }
  }, [open, mode, initialData, form]);

  const onSubmit = async (values: ContatoForm) => {
    setIsSubmitting(true);
    try {
      const url =
        mode === "create"
          ? `/api/clientes/${clienteId}/contatos`
          : `/api/clientes/${clienteId}/contatos/${initialData?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          email: values.email || undefined,
          whatsapp: values.whatsapp || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(
          json?.details?.formErrors?.[0] ??
            json?.error ??
            "Erro ao salvar contato",
        );
        return;
      }

      toast.success(
        `Contato "${values.name}" ${mode === "create" ? "adicionado" : "atualizado"} com sucesso!`,
      );
      onSuccess(json.data as ClientContato);
      onOpenChange(false);
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-base">
            {mode === "create" ? "Novo Contato" : "Editar Contato"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-3 py-1"
          >
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="João Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cargo</FormLabel>
                    <FormControl>
                      <Input placeholder="Diretor" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="decisor">Decisor</SelectItem>
                        <SelectItem value="financeiro">Financeiro</SelectItem>
                        <SelectItem value="operacional">Operacional</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="preferredChannel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Canal preferido</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="email">E-mail</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="phone">Telefone</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    E-mail{" "}
                    <span className="text-muted-foreground font-normal">
                      (opcional)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="joao@empresa.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="whatsapp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    WhatsApp{" "}
                    <span className="text-muted-foreground font-normal">
                      (opcional)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="(11) 99999-9999" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
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
                ) : mode === "create" ? (
                  "Adicionar"
                ) : (
                  "Salvar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ContatosTab({ clienteId }: { clienteId: string }) {
  const [contatos, setContatos] = useState<ClientContato[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ClientContato | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClientContato | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchContatos = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/clientes/${clienteId}/contatos`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setContatos(json.data ?? []);
    } catch {
      toast.error("Falha ao carregar contatos");
    } finally {
      setIsLoading(false);
    }
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

// ─── Arquivos Tab ─────────────────────────────────────────────────────────────

function ArquivosTab({ clienteId }: { clienteId: string }) {
  const [arquivos, setArquivos] = useState<ClientArquivo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClientArquivo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const [uploadName, setUploadName] = useState("");
  const [uploadType, setUploadType] = useState<ClientArquivoType>("outro");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const uploadInputId = useRef(`upload-${clienteId}`);

  const fetchArquivos = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/clientes/${clienteId}/arquivos`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setArquivos(json.data ?? []);
    } catch {
      toast.error("Falha ao carregar arquivos");
    } finally {
      setIsLoading(false);
    }
  }, [clienteId]);

  useEffect(() => {
    fetchArquivos();
  }, [fetchArquivos]);

  const handleUpload = async () => {
    if (!uploadFile || !uploadName.trim()) {
      toast.error("Selecione um arquivo e informe o nome");
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("name", uploadName.trim());
      formData.append("fileType", uploadType);

      const res = await fetch(`/api/clientes/${clienteId}/arquivos`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error ?? "Erro ao fazer upload");
        return;
      }
      setArquivos((prev) => [json.data as ClientArquivo, ...prev]);
      toast.success(`"${uploadName}" enviado com sucesso!`);
      setUploadOpen(false);
      setUploadName("");
      setUploadType("outro");
      setUploadFile(null);
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/clientes/${clienteId}/arquivos/${deleteTarget.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error();
      setArquivos((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      toast.success("Arquivo removido");
    } catch {
      toast.error("Falha ao remover arquivo");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const arquivoTypeColors: Record<ClientArquivoType, string> = {
    contrato_assinado: "bg-success/10 text-success border-success/20",
    proposta: "bg-primary/10 text-primary border-primary/20",
    briefing: "bg-warning/10 text-warning border-warning/20",
    outro: "bg-muted text-muted-foreground border-border",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Arquivos anexos
        </h3>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 text-xs"
          onClick={() => setUploadOpen(true)}
        >
          <Upload className="h-3 w-3" /> Enviar
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : arquivos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8 text-center">
          <Paperclip className="h-8 w-8 text-muted-foreground/30" />
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhum arquivo anexado
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {arquivos.map((arquivo) => (
            <motion.div
              key={arquivo.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 rounded-lg border border-border bg-secondary/20 p-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-sm font-medium text-foreground">
                    {arquivo.name}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1.5 py-0",
                      arquivoTypeColors[arquivo.fileType],
                    )}
                  >
                    {arquivoTypeLabels[arquivo.fileType]}
                  </Badge>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  {arquivo.fileSize && (
                    <span>{formatBytes(arquivo.fileSize)}</span>
                  )}
                  <span>
                    {new Date(arquivo.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {arquivo.signedUrl && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label="Baixar arquivo"
                    asChild
                  >
                    <a
                      href={arquivo.signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-danger hover:bg-danger/10 hover:text-danger"
                  aria-label="Excluir arquivo"
                  onClick={() => setDeleteTarget(arquivo)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog
        open={uploadOpen}
        onOpenChange={(o) => {
          if (!isUploading) {
            setUploadOpen(o);
            if (!o) {
              setUploadFile(null);
              setUploadName("");
              setUploadType("outro");
              setIsDragging(false);
            }
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading text-base">
              Enviar arquivo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {/* Drop zone via label — não precisa de ref */}
            <div>
              <p className="mb-1.5 text-sm font-medium text-foreground">Arquivo</p>
              <label
                htmlFor={uploadInputId.current}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-5 transition-colors",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-secondary/30",
                )}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) {
                    setUploadFile(f);
                    if (!uploadName) setUploadName(f.name.replace(/\.[^/.]+$/, ""));
                  }
                }}
              >
                {uploadFile ? (
                  <div className="text-center">
                    <FileText className="mx-auto h-7 w-7 text-primary" />
                    <p className="mt-1.5 text-sm font-medium text-foreground">{uploadFile.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(uploadFile.size)}</p>
                    <p className="mt-1 text-xs text-primary">Clique para trocar</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="mx-auto h-7 w-7 text-muted-foreground" />
                    <p className="mt-1.5 text-sm text-foreground">
                      Arraste ou <span className="text-primary font-medium">clique para selecionar</span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      PDF, Word, Excel, imagens — máx. 50 MB
                    </p>
                  </div>
                )}
              </label>
              <input
                id={uploadInputId.current}
                type="file"
                className="sr-only"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setUploadFile(f);
                    if (!uploadName) setUploadName(f.name.replace(/\.[^/.]+$/, ""));
                  }
                  e.target.value = "";
                }}
              />
            </div>

            <div>
              <label
                htmlFor="upload-display-name"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Nome de exibição
              </label>
              <Input
                id="upload-display-name"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="Ex: Contrato 2025"
              />
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium text-foreground">Tipo</p>
              <Select
                value={uploadType}
                onValueChange={(v) => setUploadType(v as ClientArquivoType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contrato_assinado">Contrato Assinado</SelectItem>
                  <SelectItem value="briefing">Briefing</SelectItem>
                  <SelectItem value="proposta">Proposta</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUploadOpen(false)}
              disabled={isUploading}
            >
              Cancelar
            </Button>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleUpload}
              disabled={isUploading || !uploadFile}
            >
              {isUploading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</>
              ) : (
                <><Upload className="mr-2 h-4 w-4" />Enviar</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover arquivo?</AlertDialogTitle>
            <AlertDialogDescription>
              O arquivo <strong>{deleteTarget?.name}</strong> será removido
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

// ─── Client Drawer ────────────────────────────────────────────────────────────

function ClientDrawer({
  client,
  onClose,
  onClientUpdate,
}: {
  client: Client;
  onClose: () => void;
  onClientUpdate?: (updated: Client) => void;
}) {
  const allActivities: Activity[] = [];
  const allCampaigns: Campaign[] = [];
  const clientActivities = allActivities.filter(
    (a) => a.client?.id === client.id,
  );
  const clientCampaigns = allCampaigns.filter((c) => c.client.id === client.id);

  return (
    <motion.div
      initial={{ x: 440, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 440, opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 280 }}
      className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[480px] flex-col bg-card shadow-2xl border-l border-border"
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl font-bold text-primary">
            {client.name[0]}
          </div>
          <div>
            <h2 className="font-heading text-base font-semibold text-foreground leading-tight">
              {client.name}
            </h2>
            <p className="text-sm text-muted-foreground">{client.segment}</p>
            <div className="mt-1">
              <StatusBadge status={client.status} />
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 shrink-0"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Contract value badge */}
      <div className="border-b border-border px-5 py-2.5">
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
        <div className="border-b border-border px-5 pt-3">
          <TabsList className="h-auto gap-0 rounded-none bg-transparent p-0">
            {[
              { value: "visao-geral", label: "Geral" },
              { value: "contatos", label: "Contatos" },
              { value: "arquivos", label: "Arquivos" },
              { value: "historico", label: "Histórico" },
              { value: "campanhas", label: "Campanhas" },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-none border-b-2 border-transparent px-3 pb-2.5 pt-0 text-xs font-medium text-muted-foreground transition-colors data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Visão Geral */}
          <TabsContent value="visao-geral" className="mt-0 space-y-4">
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Contato principal
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-foreground">
                    {client.contact.email}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-foreground">
                    {client.contact.phone}
                  </span>
                </div>
                {client.contact.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <a
                      href={client.contact.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-primary hover:underline"
                    >
                      {client.contact.website}
                    </a>
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
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" /> Segmento
                  </span>
                  <span className="font-medium text-foreground">
                    {client.segment}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" /> Onboarding
                  </span>
                  <span className="font-medium text-foreground">
                    {new Date(client.onboardingDate).toLocaleDateString(
                      "pt-BR",
                    )}
                  </span>
                </div>
                {client.contractStartDate && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" /> Início contrato
                    </span>
                    <span className="font-medium text-foreground">
                      {new Date(client.contractStartDate).toLocaleDateString(
                        "pt-BR",
                      )}
                    </span>
                  </div>
                )}
                {client.contractRenewalDate && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <RefreshCw className="h-3.5 w-3.5" /> Renovação
                    </span>
                    <span className="font-medium text-foreground">
                      {new Date(client.contractRenewalDate).toLocaleDateString(
                        "pt-BR",
                      )}
                    </span>
                  </div>
                )}
                {client.responsible && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Responsável</span>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={client.responsible.avatar} />
                        <AvatarFallback className="bg-primary/10 text-[9px] text-primary">
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

            {/* Observações internas */}
            <NotasInternasSection
              client={client}
              onClientUpdate={onClientUpdate}
            />
          </TabsContent>

          {/* Contatos */}
          <TabsContent value="contatos" className="mt-0">
            <ContatosTab clienteId={client.id} />
          </TabsContent>

          {/* Arquivos */}
          <TabsContent value="arquivos" className="mt-0">
            <ArquivosTab clienteId={client.id} />
          </TabsContent>

          {/* Histórico */}
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

          {/* Campanhas */}
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
                            className="px-1 text-[10px]"
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
        </div>
      </Tabs>
    </motion.div>
  );
}

function NotasInternasSection({
  client,
  onClientUpdate,
}: {
  client: Client;
  onClientUpdate?: (updated: Client) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(client.internalNotes ?? "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setNotes(client.internalNotes ?? "");
  }, [client.internalNotes]);

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
  const debouncedSearch = useDebouncedValue(search, 300);
  const [statusFilter, setStatusFilter] = useState<string>("Todos");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Client | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchClientes = useCallback(
    async (currentSearch: string, currentStatus: string) => {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      try {
        const params = new URLSearchParams({ page: "1", limit: "100" });
        if (currentStatus !== "Todos") params.set("status", currentStatus);
        if (currentSearch) params.set("search", currentSearch);

        const res = await fetch(`/api/clientes?${params}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Falha ao carregar clientes");

        const json = await res.json();
        setClientList(json.data?.items ?? []);
      } catch (err: any) {
        if (err.name === "AbortError") return;
        // Fallback to empty list — toast handled by the component if needed
        setClientList([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    fetchClientes(debouncedSearch, statusFilter);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [debouncedSearch, statusFilter, fetchClientes]);

  const handleClientSuccess = (client: Client) => {
    if (editTarget) {
      setClientList((prev) =>
        prev.map((c) => (c.id === client.id ? client : c)),
      );
    } else {
      setClientList((prev) => [client, ...prev]);
    }
    setEditTarget(null);
  };

  const filtered = clientList; // Now using backend-filtered list directly

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
                            onClick={() => {
                              setEditTarget(client);
                              setFormOpen(true);
                            }}
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
              onClientUpdate={(updated) => {
                setClientList((prev) =>
                  prev.map((c) => (c.id === updated.id ? updated : c)),
                );
                setSelectedClient(updated);
              }}
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
              onClick={async () => {
                if (!deleteTarget) return;
                try {
                  const res = await fetch(`/api/clientes/${deleteTarget.id}`, {
                    method: "DELETE",
                  });
                  if (!res.ok) throw new Error();
                  setClientList((prev) =>
                    prev.filter((c) => c.id !== deleteTarget.id),
                  );
                  if (selectedClient?.id === deleteTarget.id)
                    setSelectedClient(null);
                  toast.success(`Cliente "${deleteTarget.name}" excluído`);
                } catch {
                  toast.error("Falha ao excluir cliente. Tente novamente.");
                } finally {
                  setDeleteTarget(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cliente Form Dialog */}
      <ClienteFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={handleClientSuccess}
        mode={editTarget ? "edit" : "create"}
        initialData={editTarget ?? undefined}
      />
    </AppShell>
  );
}
