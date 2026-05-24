import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Client } from "@/lib/types";
import { CLIENTE_SOURCES_OPTIONS, CLIENTE_SERVICOS_OPTIONS } from "@/lib/constants/clientes";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

// ─── Schemas ─────────────────────────────────────────────────────────────────
import { novoClienteSchema, type NovoClienteForm } from "../schemas/cliente.schema";

export default function ClienteFormDialog({
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
      source: "prospeccao",
      sourceReferrer: "",
      servicos: [],
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
        source: initialData.source,
        sourceReferrer: initialData.sourceReferrer || "",
        servicos: initialData.servicos || [],
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
        source: "prospeccao",
        sourceReferrer: "",
        servicos: [],
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
              {/* Origem */}
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origem</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CLIENTE_SOURCES_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

            {/* Referrer condicional */}
            {form.watch("source") === "indicacao" && (
              <FormField
                control={form.control}
                name="sourceReferrer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quem indicou?</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome da pessoa ou empresa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Serviços */}
            <FormField
              control={form.control}
              name="servicos"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel>Serviços Contratados</FormLabel>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {CLIENTE_SERVICOS_OPTIONS.map((servico) => (
                      <FormField
                        key={servico.value}
                        control={form.control}
                        name="servicos"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={servico.value}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(servico.value)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([
                                          ...field.value,
                                          servico.value,
                                        ])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value: string) =>
                                              value !== servico.value,
                                          ),
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">
                                {servico.label}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

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
