"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ptBR } from "date-fns/locale";
import { AppShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ContentItem, User, Client } from "@/lib/types";

import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";

import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Instagram,
  Linkedin,
  Youtube,
  FileText,
  Clock,
  Image as ImageIcon,
  FileEdit,
  Send,
  Loader2,
  Trash2,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// ── Constantes ────────────────────────────────────────────────────────────────

const platformIcons: Record<string, React.ElementType> = {
  Instagram,
  LinkedIn: Linkedin,
  YouTube: Youtube,
  Blog: FileText,
};

const statusColors: Record<string, string> = {
  Rascunho: "bg-muted text-muted-foreground border-border",
  "Aguardando aprovação": "bg-warning/10 text-warning border-warning/20",
  Aprovado: "bg-primary/10 text-primary border-primary/20",
  Publicado: "bg-success/10 text-success border-success/20",
};

// ── Tipo local (ContentItem + publishTime + ownerId) ──────────────────────────

type ConteudoItem = ContentItem & { publishTime: string; ownerId: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDateInput(date: Date | string): string {
  return format(new Date(date), "yyyy-MM-dd");
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function ConteudoPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [items, setItems] = useState<ConteudoItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [team, setTeam] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedItem, setSelectedItem] = useState<ConteudoItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [filterClient, setFilterClient] = useState("all");

  // Form state
  const [formClientId, setFormClientId] = useState("");
  const [formPlatform, setFormPlatform] = useState<ContentItem["platform"]>("Instagram");
  const [formType, setFormType] = useState<ContentItem["type"]>("Feed");
  const [formTitle, setFormTitle] = useState("");
  const [formCaption, setFormCaption] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("10:00");
  const [formStatus, setFormStatus] = useState<ContentItem["status"]>("Rascunho");
  const [formResponsibleId, setFormResponsibleId] = useState("");

  // ── Busca de dados ──────────────────────────────────────────────────────────

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const from = format(monthStart, "yyyy-MM-dd");
      const to = format(monthEnd, "yyyy-MM-dd");
      const res = await fetch(`/api/conteudo?from=${from}&to=${to}&limit=200`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setItems(json.data ?? []);
    } catch {
      toast.error("Erro ao carregar o calendário editorial");
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    fetch("/api/clientes?limit=100")
      .then((r) => r.json())
      .then((j) => setClients(j.data?.items ?? []))
      .catch(console.error);

    fetch("/api/team")
      .then((r) => r.json())
      .then((j) => setTeam(j.data ?? []))
      .catch(console.error);
  }, []);

  // ── Calendário ──────────────────────────────────────────────────────────────

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const filteredItems = items.filter(
    (item) => filterClient === "all" || item.client.id === filterClient,
  );

  // ── Sheet helpers ───────────────────────────────────────────────────────────

  function openForNew(day: Date) {
    setSelectedItem(null);
    setFormClientId(clients[0]?.id ?? "");
    setFormPlatform("Instagram");
    setFormType("Feed");
    setFormTitle("");
    setFormCaption("");
    setFormDate(format(day, "yyyy-MM-dd"));
    setFormTime("10:00");
    setFormStatus("Rascunho");
    setFormResponsibleId(team[0]?.id ?? "");
    setIsSheetOpen(true);
  }

  function openForEdit(item: ConteudoItem) {
    setSelectedItem(item);
    setFormClientId(item.client.id);
    setFormPlatform(item.platform);
    setFormType(item.type);
    setFormTitle(item.title);
    setFormCaption(item.caption ?? "");
    setFormDate(toDateInput(item.publishDate));
    setFormTime(item.publishTime ?? "10:00");
    setFormStatus(item.status);
    setFormResponsibleId(item.responsible.id);
    setIsSheetOpen(true);
  }

  // ── Salvar (criar ou atualizar) ─────────────────────────────────────────────

  async function handleSave() {
    if (!formClientId || !formTitle.trim() || !formResponsibleId) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        clientId: formClientId,
        platform: formPlatform,
        type: formType,
        title: formTitle.trim(),
        caption: formCaption.trim() || undefined,
        publishDate: formDate,
        publishTime: formTime,
        status: formStatus,
        responsibleId: formResponsibleId,
      };

      if (selectedItem) {
        // Atualizar
        const res = await fetch(`/api/conteudo/${selectedItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        const { data: updated } = await res.json();
        setItems((prev) =>
          prev.map((i) => (i.id === updated.id ? updated : i)),
        );
        toast.success("Conteúdo atualizado!");
      } else {
        // Criar
        const res = await fetch("/api/conteudo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        const { data: novo } = await res.json();
        setItems((prev) => [...prev, novo]);
        toast.success("Conteúdo agendado!");
      }

      setIsSheetOpen(false);
    } catch {
      toast.error("Erro ao salvar o conteúdo");
    } finally {
      setSaving(false);
    }
  }

  // ── Deletar ─────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/conteudo/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((i) => i.id !== id));
      setIsSheetOpen(false);
      toast.success("Conteúdo removido");
    } catch {
      toast.error("Erro ao remover o conteúdo");
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <AppShell title="Calendário Editorial">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-foreground capitalize">
              {format(currentDate, "MMMM yyyy", { locale: ptBR })}
            </h2>
            <div className="flex items-center gap-1 rounded-lg border border-border p-1 bg-card">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs px-3" onClick={goToToday}>
                Hoje
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 mr-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger className="h-9 w-[180px] text-xs">
                  <SelectValue placeholder="Filtrar por cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="h-9 gap-2 text-xs font-semibold"
              onClick={() => openForNew(new Date())}
            >
              <Plus className="h-4 w-4" /> Novo Compromisso
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          {/* Weekdays Header */}
          <div className="grid grid-cols-7 border-b border-border bg-secondary/30">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
              <div
                key={day}
                className="py-3 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 auto-rows-[120px] md:auto-rows-[160px]">
            {calendarDays.map((day, i) => {
              const dayItems = filteredItems.filter((item) =>
                isSameDay(new Date(item.publishDate), day),
              );
              const isCurrentMonth = isSameMonth(day, monthStart);

              return (
                <div
                  key={day.toString()}
                  className={cn(
                    "relative group border-r border-b border-border p-2 transition-colors hover:bg-secondary/10",
                    !isCurrentMonth && "bg-secondary/20 opacity-40",
                    i % 7 === 6 && "border-r-0",
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center text-xs font-medium rounded-full",
                        isToday(day)
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => openForNew(day)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="space-y-1 overflow-y-auto max-h-[calc(100%-28px)] scrollbar-hide">
                    {loading && isCurrentMonth && dayItems.length === 0 ? null : (
                      dayItems.map((item) => {
                        const Icon = platformIcons[item.platform] ?? FileText;
                        return (
                          <motion.div
                            key={item.id}
                            layoutId={item.id}
                            onClick={() => openForEdit(item)}
                            className={cn(
                              "group/item cursor-pointer rounded border p-1.5 transition-all hover:shadow-sm",
                              statusColors[item.status],
                            )}
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              <Icon className="h-3 w-3 shrink-0" />
                              <span className="text-[9px] font-bold uppercase truncate">
                                {item.type}
                              </span>
                            </div>
                            <p className="text-[10px] font-medium leading-tight line-clamp-2 text-foreground">
                              {item.title}
                            </p>
                            <p className="mt-1 text-[8px] text-muted-foreground truncate">
                              {item.client.name}
                            </p>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dialog centralizado de criação / edição */}
        <Dialog open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-4 border-b">
              <DialogTitle className="flex items-center gap-2 text-lg">
                {selectedItem ? (
                  <>
                    <FileEdit className="h-5 w-5 text-primary" /> Editar Conteúdo
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5 text-primary" /> Novo Compromisso
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {selectedItem
                  ? "Atualize os detalhes do conteúdo agendado."
                  : "Preencha as informações para agendar um novo post."}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-5">
              {/* Cliente */}
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={formClientId} onValueChange={setFormClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.length === 0 ? (
                      <SelectItem value="" disabled>
                        Nenhum cliente encontrado
                      </SelectItem>
                    ) : (
                      clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Plataforma + Tipo */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Plataforma</Label>
                  <Select
                    value={formPlatform}
                    onValueChange={(v) => setFormPlatform(v as ContentItem["platform"])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Instagram">Instagram</SelectItem>
                      <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                      <SelectItem value="YouTube">YouTube</SelectItem>
                      <SelectItem value="Blog">Blog</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={formType}
                    onValueChange={(v) => setFormType(v as ContentItem["type"])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Feed">Feed</SelectItem>
                      <SelectItem value="Stories">Stories</SelectItem>
                      <SelectItem value="Reels">Reels</SelectItem>
                      <SelectItem value="Artigo">Artigo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Título */}
              <div className="space-y-2">
                <Label htmlFor="title">Título do Post</Label>
                <Input
                  id="title"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex: Dicas de Verão"
                />
              </div>

              {/* Legenda */}
              <div className="space-y-2">
                <Label htmlFor="caption">Legenda / Descrição</Label>
                <Textarea
                  id="caption"
                  value={formCaption}
                  onChange={(e) => setFormCaption(e.target.value)}
                  placeholder="Escreva a legenda aqui..."
                  className="min-h-[100px] resize-none"
                />
              </div>

              {/* Data + Horário */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Data de Publicação</Label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="date"
                      type="date"
                      className="pl-10"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Horário</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="time"
                      type="time"
                      className="pl-10"
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Responsável + Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Responsável</Label>
                  <Select value={formResponsibleId} onValueChange={setFormResponsibleId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      {team.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formStatus}
                    onValueChange={(v) => setFormStatus(v as ContentItem["status"])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Rascunho">Rascunho</SelectItem>
                      <SelectItem value="Aguardando aprovação">Aguardando aprovação</SelectItem>
                      <SelectItem value="Aprovado">Aprovado</SelectItem>
                      <SelectItem value="Publicado">Publicado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Mídia (placeholder) */}
              <div className="space-y-2">
                <Label>Mídia</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center gap-2 bg-secondary/20 hover:bg-secondary/30 transition-colors cursor-pointer">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    Clique para fazer upload de imagem ou vídeo
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t flex flex-row gap-2 sm:gap-2">
              {selectedItem && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="icon" className="text-danger border-danger/30 hover:bg-danger/10 hover:text-danger shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover conteúdo</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-danger hover:bg-danger/90"
                        onClick={() => handleDelete(selectedItem.id)}
                      >
                        Remover
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsSheetOpen(false)}
              >
                Cancelar
              </Button>
              <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {selectedItem ? "Atualizar" : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
