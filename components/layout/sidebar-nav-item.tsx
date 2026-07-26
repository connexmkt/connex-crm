"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface SidebarNavChild {
  href: string;
  label: string;
}

export interface SidebarNavItemData {
  href: string;
  label: string;
  icon: LucideIcon;
  children?: SidebarNavChild[];
}

interface SidebarNavItemProps {
  item: SidebarNavItemData;
  pathname: string;
  collapsed: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function hasActiveChild(item: SidebarNavItemData, pathname: string): boolean {
  return item.children?.some((child) => pathname.startsWith(child.href)) ?? false;
}

/** Um item da navegação da sidebar, com suporte opcional a submenu (`children`). */
export function SidebarNavItem({
  item,
  pathname,
  collapsed,
  isExpanded,
  onToggleExpand,
}: SidebarNavItemProps) {
  const hasChildren = Boolean(item.children?.length);
  const isActive = pathname === item.href || hasActiveChild(item, pathname);
  const Icon = item.icon;

  const linkContent = (
    <Link
      href={item.href}
      className={cn(
        "group relative flex flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-primary/20 text-sidebar-text-active"
          : "text-sidebar-text hover:bg-sidebar-item-hover hover:text-sidebar-text-active",
      )}
    >
      {isActive && (
        <motion.div
          layoutId="activeIndicator"
          className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-primary"
        />
      )}
      <Icon
        className={cn(
          "h-5 w-5 shrink-0 transition-colors",
          isActive ? "text-primary" : "text-sidebar-text group-hover:text-sidebar-text-active",
        )}
      />
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            className="truncate"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  if (!hasChildren) {
    return <div>{linkContent}</div>;
  }

  return (
    <div>
      <div className="flex items-center">
        {linkContent}
        <button
          type="button"
          onClick={onToggleExpand}
          aria-label={isExpanded ? "Recolher submenu" : "Expandir submenu"}
          aria-expanded={isExpanded}
          className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sidebar-text hover:bg-sidebar-item-hover hover:text-sidebar-text-active"
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              isExpanded && "rotate-180",
            )}
          />
        </button>
      </div>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden pl-6"
          >
            {item.children!.map((child) => {
              const isChildActive = pathname.startsWith(child.href);
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={cn(
                    "block truncate rounded-lg px-3 py-2 text-sm transition-colors duration-200",
                    isChildActive
                      ? "text-sidebar-text-active bg-primary/10"
                      : "text-sidebar-text hover:bg-sidebar-item-hover hover:text-sidebar-text-active",
                  )}
                >
                  {child.label}
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
