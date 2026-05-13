"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ptBR } from "date-fns/locale";
import { AppShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { contentItems, clients, teamMembers } from "@/lib/seed-data";
import { cn } from "@/lib/utils";
import { ContentItem } from "@/lib/types";

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
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const platformIcons: Record<string, any> = {
  Instagram: Instagram,
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

export default function ConteudoPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [filterClient, setFilterClient] = useState("all");

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const handleItemClick = (item: ContentItem) => {
    setSelectedItem(item);
    setIsSheetOpen(true);
  };

  const handleAddNew = (day: Date) => {
    setSelectedItem({
      id: "new",
      client: clients[0],
      platform: "Instagram",
      type: "Feed",
      title: "",
      publishDate: day,
      status: "Rascunho",
      responsible: teamMembers[0],
    });
    setIsSheetOpen(true);
  };

  const filteredItems = contentItems.filter(
    (item) => filterClient === "all" || item.client.id === filterClient,
  );

  return (
    <AppShell title="Calendário Editorial">
      <div className="space-y-6">
        {/* Calendar Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-foreground capitalize">
              {format(currentDate, "MMMM yyyy", { locale: ptBR })}
            </h2>
            <div className="flex items-center gap-1 rounded-lg border border-border p-1 bg-card">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={prevMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs px-3"
                onClick={goToToday}
              >
                Hoje
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={nextMonth}
              >
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
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="h-9 gap-2 text-xs font-semibold"
              onClick={() => handleAddNew(new Date())}
            >
              <Plus className="h-4 w-4" /> Novo Conteúdo
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

          {/* Days Grid */}
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
                    "relative border-r border-b border-border p-2 transition-colors hover:bg-secondary/10",
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
                      onClick={() => handleAddNew(day)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="space-y-1 overflow-y-auto max-h-[calc(100%-24px)] scrollbar-hide">
                    {dayItems.map((item) => {
                      const Icon = platformIcons[item.platform] || FileText;
                      return (
                        <motion.div
                          key={item.id}
                          layoutId={item.id}
                          onClick={() => handleItemClick(item)}
                          className={cn(
                            "group cursor-pointer rounded border p-1.5 transition-all hover:shadow-sm",
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
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Side Panel (Sheet) */}
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent className="sm:max-w-[450px] overflow-y-auto">
            <SheetHeader className="pb-6 border-b">
              <SheetTitle className="flex items-center gap-2">
                {selectedItem?.id === "new" ? (
                  <>
                    <Plus className="h-5 w-5 text-primary" /> Novo Conteúdo
                  </>
                ) : (
                  <>
                    <FileEdit className="h-5 w-5 text-primary" /> Editar
                    Conteúdo
                  </>
                )}
              </SheetTitle>
              <SheetDescription>
                {selectedItem?.id === "new"
                  ? "Preencha as informações para agendar um novo post."
                  : "Atualize os detalhes do conteúdo agendado."}
              </SheetDescription>
            </SheetHeader>

            <div className="py-6 space-y-6">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select defaultValue={selectedItem?.client.id}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Plataforma</Label>
                  <Select defaultValue={selectedItem?.platform}>
                    <SelectTrigger>
                      <SelectValue placeholder="Plataforma" />
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
                  <Select defaultValue={selectedItem?.type}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo" />
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

              <div className="space-y-2">
                <Label htmlFor="title">Título do Post</Label>
                <Input
                  id="title"
                  defaultValue={selectedItem?.title}
                  placeholder="Ex: Dicas de Verão"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="caption">Legenda / Descrição</Label>
                <Textarea
                  id="caption"
                  defaultValue={selectedItem?.caption}
                  placeholder="Escreva a legenda aqui..."
                  className="min-h-[120px] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Data de Publicação</Label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="date"
                      type="date"
                      className="pl-10"
                      defaultValue={
                        selectedItem?.publishDate
                          ? format(
                              new Date(selectedItem.publishDate),
                              "yyyy-MM-dd",
                            )
                          : ""
                      }
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
                      defaultValue="10:00"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Responsável</Label>
                <Select defaultValue={selectedItem?.responsible.id}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select defaultValue={selectedItem?.status}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Rascunho">Rascunho</SelectItem>
                    <SelectItem value="Aguardando aprovação">
                      Aguardando aprovação
                    </SelectItem>
                    <SelectItem value="Aprovado">Aprovado</SelectItem>
                    <SelectItem value="Publicado">Publicado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Mídia (Placeholder)</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center gap-2 bg-secondary/20 hover:bg-secondary/30 transition-colors cursor-pointer">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    Clique para fazer upload de imagem ou vídeo
                  </p>
                </div>
              </div>
            </div>

            <SheetFooter className="pt-6 border-t flex flex-row gap-2 sm:gap-0">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsSheetOpen(false)}
              >
                Cancelar
              </Button>
              <Button className="flex-1 gap-2">
                <Send className="h-4 w-4" /> Salvar Conteúdo
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </AppShell>
  );
}
