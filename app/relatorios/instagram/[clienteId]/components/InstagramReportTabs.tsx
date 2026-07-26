"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TabValue = "semanais" | "mensais";

const DEFAULT_TAB: TabValue = "semanais";

interface InstagramReportTabsProps {
  clienteId: string;
  weeklyContent: React.ReactNode;
  monthlyContent: React.ReactNode;
}

function storageKey(clienteId: string): string {
  return `instagram-report-tab:${clienteId}`;
}

function isTabValue(value: string): value is TabValue {
  return value === "semanais" || value === "mensais";
}

/**
 * Tabs Semanais/Mensais da página do cliente (FR-007/FR-008) — persiste a
 * tab ativa em `sessionStorage`, chaveada por `clienteId`, durante a sessão
 * do navegador (research.md § D9). O conteúdo de cada tab é renderizado no
 * servidor (`MonthGrid`) e passado como children/props — este componente
 * apenas controla qual dos dois é exibido.
 */
export function InstagramReportTabs({ clienteId, weeklyContent, monthlyContent }: InstagramReportTabsProps) {
  const [tab, setTab] = useState<TabValue>(DEFAULT_TAB);

  useEffect(() => {
    // Adiado para fora do corpo síncrono do efeito, evitando o disparo de
    // renders em cascata (react-hooks/set-state-in-effect).
    void Promise.resolve().then(() => {
      const stored = window.sessionStorage.getItem(storageKey(clienteId));
      if (stored && isTabValue(stored)) setTab(stored);
    });
  }, [clienteId]);

  function handleTabChange(value: string): void {
    const next: TabValue = isTabValue(value) ? value : DEFAULT_TAB;
    setTab(next);
    window.sessionStorage.setItem(storageKey(clienteId), next);
  }

  return (
    <Tabs value={tab} onValueChange={handleTabChange}>
      <TabsList>
        <TabsTrigger value="semanais">Semanais</TabsTrigger>
        <TabsTrigger value="mensais">Mensais</TabsTrigger>
      </TabsList>
      <TabsContent value="semanais" className="pt-4">
        {weeklyContent}
      </TabsContent>
      <TabsContent value="mensais" className="pt-4">
        {monthlyContent}
      </TabsContent>
    </Tabs>
  );
}
