"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import {
  Building2,
  Users,
  Link as LinkIcon,
  Bell,
  CreditCard,
  Upload,
  Plus,
  ExternalLink,
  Shield,
  Smartphone,
  Globe,
} from "lucide-react";

export default function ConfiguracoesPage() {
  const [teamMembers, setTeamMembers] = useState<User[]>([]);

  useEffect(() => {
    fetch("/api/team")
      .then((r) => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((json) => setTeamMembers(json.data as User[]))
      .catch((err) => console.error("[configuracoes] falha ao carregar time:", err));
  }, []);

  return (
    <AppShell title="Configurações">
      <div className="max-w-5xl mx-auto">
        <Tabs defaultValue="agencia" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-12 bg-secondary/30 p-1">
            <TabsTrigger value="agencia" className="gap-2 text-xs sm:text-sm">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Agência</span>
            </TabsTrigger>
            <TabsTrigger value="usuarios" className="gap-2 text-xs sm:text-sm">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Usuários</span>
            </TabsTrigger>
            <TabsTrigger
              value="integracoes"
              className="gap-2 text-xs sm:text-sm"
            >
              <LinkIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Integrações</span>
            </TabsTrigger>
            <TabsTrigger
              value="notificacoes"
              className="gap-2 text-xs sm:text-sm"
            >
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notificações</span>
            </TabsTrigger>
          </TabsList>

          {/* Agência Tab */}
          <TabsContent value="agencia">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Perfil da Agência</CardTitle>
                  <CardDescription>
                    Informações básicas e identidade visual
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                    <div className="relative">
                      <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/10 border-2 border-dashed border-primary/30">
                        <Building2 className="h-10 w-10 text-primary/40" />
                      </div>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full shadow-lg"
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-medium">Logo da Agência</h3>
                      <p className="text-sm text-muted-foreground">
                        Recomendado: 512x512px. Formatos: PNG, JPG ou SVG.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="agency-name">Nome da Agência</Label>
                      <Input id="agency-name" defaultValue="Connex Digital" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="agency-cnpj">CNPJ</Label>
                      <Input
                        id="agency-cnpj"
                        defaultValue="00.000.000/0001-00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="agency-email">E-mail de Contato</Label>
                      <Input
                        id="agency-email"
                        defaultValue="contato@connex.com.br"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="agency-phone">Telefone</Label>
                      <Input id="agency-phone" defaultValue="(11) 99999-9999" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="agency-address">Endereço</Label>
                    <Input
                      id="agency-address"
                      defaultValue="Av. Paulista, 1000 - São Paulo, SP"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                    <Button variant="outline">Cancelar</Button>
                    <Button className="bg-primary text-primary-foreground">
                      Salvar Alterações
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Personalização</CardTitle>
                  <CardDescription>
                    Cores e tema do seu workspace
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Cor Primária</Label>
                      <p className="text-sm text-muted-foreground">
                        Cor principal usada em botões e links
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary border border-border" />
                      <span className="text-sm font-mono">#5B5FE8</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Modo Escuro</Label>
                      <p className="text-sm text-muted-foreground">
                        Alternar entre tema claro e escuro
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Usuários Tab */}
          <TabsContent value="usuarios">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Membros do Time</h2>
                  <p className="text-sm text-muted-foreground">
                    Gerencie quem tem acesso ao CRM
                  </p>
                </div>
                <Button className="gap-2 bg-primary text-primary-foreground">
                  <Plus className="h-4 w-4" />
                  Convidar Membro
                </Button>
              </div>

              <Card className="bg-card border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30">
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Usuário
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          E-mail
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Cargo
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {teamMembers.map((member: User) => (
                        <tr
                          key={member.id}
                          className="hover:bg-secondary/20 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={member.avatar}
                                  alt={member.name}
                                />
                                <AvatarFallback className="bg-primary/10 text-xs text-primary">
                                  {member.name
                                    .split(" ")
                                    .map((n: string) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium text-foreground">
                                {member.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-muted-foreground">
                              {member.email}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-[10px] px-2 py-0",
                                member.role === "Admin"
                                  ? "bg-primary/10 text-primary border-primary/20"
                                  : member.role === "Gestor"
                                    ? "bg-chart-2/10 text-chart-2 border-chart-2/20"
                                    : "bg-muted text-muted-foreground",
                              )}
                            >
                              {member.role}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs"
                            >
                              Editar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Integrações Tab */}
          <TabsContent value="integracoes">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <IntegrationCard
                  name="Meta Business"
                  description="Conecte suas contas de Facebook e Instagram Ads"
                  icon="/placeholder.svg"
                  connected={true}
                />
                <IntegrationCard
                  name="Google Ads"
                  description="Importe métricas e gerencie campanhas de busca"
                  icon="/placeholder.svg"
                  connected={true}
                />
                <IntegrationCard
                  name="RD Station"
                  description="Sincronize leads e eventos de conversão"
                  icon="/placeholder.svg"
                  connected={false}
                />
                <IntegrationCard
                  name="WhatsApp API"
                  description="Envie notificações automáticas para seus clientes"
                  icon="/placeholder.svg"
                  connected={false}
                />
                <IntegrationCard
                  name="Zapier"
                  description="Conecte o Connex com mais de 5.000 apps"
                  icon="/placeholder.svg"
                  connected={true}
                />
                <IntegrationCard
                  name="LinkedIn Ads"
                  description="Gerencie campanhas B2B e captação de leads"
                  icon="/placeholder.svg"
                  connected={false}
                />
              </div>
            </motion.div>
          </TabsContent>

          {/* Notificações Tab */}
          <TabsContent value="notificacoes">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Preferências de Notificação</CardTitle>
                  <CardDescription>
                    Escolha como e quando você quer ser notificado
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                      E-mail
                    </h3>
                    <NotificationToggle
                      title="Novos Leads"
                      description="Receba um e-mail sempre que um novo lead for capturado"
                      defaultChecked={true}
                    />
                    <NotificationToggle
                      title="Relatórios Semanais"
                      description="Resumo de performance da agência toda segunda-feira"
                      defaultChecked={true}
                    />
                    <NotificationToggle
                      title="Alertas de Clientes em Risco"
                      description="Notificações urgentes sobre clientes sem atividade"
                      defaultChecked={true}
                    />
                  </div>

                  <div className="pt-6 border-t border-border space-y-4">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                      Sistema (Push)
                    </h3>
                    <NotificationToggle
                      title="Atividades do Time"
                      description="Acompanhe as ações dos membros da sua equipe"
                      defaultChecked={false}
                    />
                    <NotificationToggle
                      title="Mensagens de Clientes"
                      description="Novas interações via chat ou integrações"
                      defaultChecked={true}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function IntegrationCard({
  name,
  description,
  connected,
}: {
  name: string;
  description: string;
  icon: string;
  connected: boolean;
}) {
  return (
    <Card className="bg-card border-border hover:border-primary/30 transition-all group">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="h-12 w-12 rounded-xl bg-secondary/50 flex items-center justify-center">
            <div className="h-8 w-8 rounded bg-muted animate-pulse" />
          </div>
          <Badge
            variant={connected ? "default" : "outline"}
            className={cn(
              "text-[10px] px-1.5",
              connected
                ? "bg-success/10 text-success border-success/20 hover:bg-success/20"
                : "text-muted-foreground",
            )}
          >
            {connected ? "Conectado" : "Disponível"}
          </Badge>
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
            {name}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {description}
          </p>
        </div>
        <Button
          variant={connected ? "outline" : "default"}
          size="sm"
          className={cn(
            "w-full text-xs h-8",
            !connected && "bg-primary text-primary-foreground",
          )}
        >
          {connected ? "Configurar" : "Conectar"}
        </Button>
      </CardContent>
    </Card>
  );
}

function NotificationToggle({
  title,
  description,
  defaultChecked,
}: {
  title: string;
  description: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{title}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}
