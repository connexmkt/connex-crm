"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CreateUserSuccessModalProps {
  temporaryPassword: string | null;
  onClose: () => void;
}

/**
 * Exibe a senha temporária uma única vez (FR-014, FR-015). Nunca é
 * possível reabrir este modal com a mesma senha — ao fechar, o estado é
 * descartado pelo componente pai.
 */
export function CreateUserSuccessModal({ temporaryPassword, onClose }: CreateUserSuccessModalProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!temporaryPassword) return;
    await navigator.clipboard.writeText(temporaryPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={temporaryPassword !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Usuário criado com sucesso</DialogTitle>
          <DialogDescription>
            Compartilhe a senha temporária abaixo com o usuário — ela será exibida apenas
            desta vez e será exigida na primeira ativação de conta no Connex Insights.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3">
          <code className="flex-1 font-mono text-sm">{temporaryPassword}</code>
          <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Entendi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
