"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

import {
  Home,
  Users,
  Kanban,
  Megaphone,
  Calendar,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  TrendingUp,
  LayoutGrid,
} from "lucide-react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  SidebarNavItem,
  hasActiveChild,
  type SidebarNavItemData,
} from "@/components/layout/sidebar-nav-item";

import type { User } from "@/lib/types";
import packageJson from "@/package.json";

const navItems: SidebarNavItemData[] = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/pipeline-comercial", label: "Pipeline Comercial", icon: TrendingUp },
  { href: "/conteudo", label: "Agenda", icon: Calendar },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
  { href: "/aplicacoes", label: "Aplicações", icon: LayoutGrid },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // Guarda apenas os toggles manuais do usuário; a rota ativa continua
  // determinando o padrão (derivado no render, sem sincronizar via efeito).
  const [manualExpanded, setManualExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data: User } | null) => {
        if (json?.data) setCurrentUser(json.data);
      })
      .catch(() => null);
  }, []);

  function isItemExpanded(item: SidebarNavItemData): boolean {
    const override = manualExpanded[item.href];
    if (override !== undefined) return override;
    return hasActiveChild(item, pathname);
  }

  function toggleExpanded(item: SidebarNavItemData) {
    setManualExpanded((prev) => ({ ...prev, [item.href]: !isItemExpanded(item) }));
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="fixed left-0 top-0 z-40 flex h-screen flex-col bg-sidebar-bg border-r border-sidebar-border"
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative h-8 w-8 shrink-0">
              <Image
                src="/claro.jpeg"
                alt="Connex"
                fill
                className="rounded-lg object-contain dark:hidden"
                priority
              />
              <Image
                src="/escuro.jpeg"
                alt="Connex"
                fill
                className="hidden rounded-lg object-contain dark:block"
                priority
              />
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="font-heading text-lg font-semibold text-sidebar-text-active"
                >
                  Connex
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-8 w-8 text-sidebar-text hover:bg-sidebar-item-hover hover:text-sidebar-text-active"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navItems.map((item) => (
            <SidebarNavItem
              key={item.href}
              item={item}
              pathname={pathname}
              collapsed={collapsed}
              isExpanded={isItemExpanded(item)}
              onToggleExpand={() => toggleExpanded(item)}
            />
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 shrink-0">
              {currentUser ? (
                <>
                  <AvatarImage
                    src={currentUser.avatar}
                    alt={currentUser.name}
                  />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {currentUser.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </>
              ) : (
                  <AvatarFallback className="bg-sidebar-skeleton" />
              )}
            </Avatar>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex flex-1 items-center justify-between overflow-hidden"
                >
                  {currentUser ? (
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-sidebar-text-active">
                        {currentUser.name}
                      </p>
                      <p className="truncate text-xs text-sidebar-text">
                        {currentUser.role}
                      </p>
                      <p className="truncate text-[10px] text-sidebar-text/60">
                        Versão {packageJson.version}
                      </p>
                    </div>
                  ) : (
                    <div className="min-w-0 space-y-1.5">
                      <div className="h-3 w-24 animate-pulse rounded bg-sidebar-skeleton" />
                      <div className="h-2 w-14 animate-pulse rounded bg-sidebar-skeleton" />
                    </div>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleLogout}
                        className="h-8 w-8 shrink-0 text-sidebar-text hover:bg-sidebar-item-hover hover:text-sidebar-text-active"
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Sair</TooltipContent>
                  </Tooltip>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}
