"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  criarUsuarioSchema,
  type CriarUsuarioInput,
} from "@/app/aplicacoes/schemas/criar-usuario.schema";
import type { ConnexInsightsTenant } from "@/lib/repositories/connex-insights-remote.repository";
import { CreateUserErrorModal } from "./CreateUserErrorModal";

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenants: ConnexInsightsTenant[];
  onCreated: (temporaryPassword: string) => void;
}

const DEFAULT_VALUES: CriarUsuarioInput = { name: "", email: "", login: "", tenantId: "" };

export function CreateUserDialog({ open, onOpenChange, tenants, onCreated }: CreateUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  const form = useForm<CriarUsuarioInput>({
    resolver: zodResolver(criarUsuarioSchema),
    defaultValues: DEFAULT_VALUES,
  });

  async function onSubmit(values: CriarUsuarioInput) {
    // Idempotência do lado do cliente: ignora cliques duplicados enquanto a
    // requisição está em andamento (FR-019/T038 — double-click, retries).
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorStatus(null);

    try {
      const res = await fetch("/api/aplicacoes/connex-insights/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setErrorStatus(res.status);
        return;
      }

      form.reset(DEFAULT_VALUES);
      onCreated(json?.data?.temporaryPassword ?? "");
    } catch {
      setErrorStatus(502);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar usuário do Connex Insights</DialogTitle>
          <DialogDescription>
            O usuário receberá uma senha temporária para o primeiro acesso.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {errorStatus !== null && <CreateUserErrorModal status={errorStatus} />}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="usuario@empresa.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="login"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Login</FormLabel>
                  <FormControl>
                    <Input placeholder="login.usuario" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tenantId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tenant</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione um tenant" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tenants.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Criar usuário
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
