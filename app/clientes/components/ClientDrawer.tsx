import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Client } from "@/lib/types";
import { CLIENTE_SOURCES_OPTIONS, CLIENTE_SERVICOS_OPTIONS } from "@/lib/constants/clientes";

import ArquivosTab from "./ArquivosTab";
import ContatosTab from "./ContatosTab";
import HistoricoTab from "./HistoricoTab";
import StatusBadge from "./StatusBadge";
import NotasInternasSection from "./NotasInternasSection";

import {
  X,
  DollarSign,
  Mail,
  Phone,
  Globe,
  Building2,
  Calendar,
  RefreshCw,
} from "lucide-react";

export default function ClientDrawer({
  client,
  onClose,
  onClientUpdate,
}: {
  client: Client;
  onClose: () => void;
  onClientUpdate?: (updated: Client) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="relative flex w-full max-w-2xl flex-col bg-card shadow-2xl border border-border rounded-2xl overflow-hidden"
        style={{ maxHeight: "calc(100vh - 2rem)" }}
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
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        defaultValue="visao-geral"
        className="flex flex-1 flex-col overflow-hidden min-h-0"
      >
        <div className="border-b border-border px-5 pt-3">
          <TabsList className="h-auto gap-0 rounded-none bg-transparent p-0">
            {[
              { value: "visao-geral", label: "Geral" },
              { value: "contatos", label: "Contatos" },
              { value: "arquivos", label: "Arquivos" },
              { value: "historico", label: "Histórico" },
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

        <div className="overflow-y-auto px-5 py-4" style={{ maxHeight: "60vh" }}>
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

            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Origem & Serviços
              </h3>
              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Origem</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {CLIENTE_SOURCES_OPTIONS.find((o) => o.value === client.source)
                        ?.label || client.source}
                    </span>
                    {client.source === "indicacao" && client.sourceReferrer && (
                      <Badge variant="outline" className="text-[10px] py-0 h-4">
                        {client.sourceReferrer}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-muted-foreground">Serviços</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(client.servicos ?? []).length > 0 ? (
                      (client.servicos ?? []).map((s) => (
                        <Badge
                          key={s}
                          variant="secondary"
                          className="text-[10px] bg-primary/5 text-primary border-primary/10"
                        >
                          {CLIENTE_SERVICOS_OPTIONS.find((o) => o.value === s)
                            ?.label || s}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        Nenhum serviço registrado
                      </span>
                    )}
                  </div>
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
            <HistoricoTab clienteId={client.id} />
          </TabsContent>
        </div>
      </Tabs>
      </motion.div>
    </div>
  );
}
