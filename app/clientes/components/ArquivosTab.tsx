import {
  AlertDialogHeader,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ClientArquivo, ClientArquivoType } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@radix-ui/react-alert-dialog";
import { Dialog, DialogContent, DialogTitle } from "@radix-ui/react-dialog";
import {
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@radix-ui/react-select";
import { motion } from "framer-motion";
import {
  Upload,
  Loader2,
  Paperclip,
  FileText,
  Download,
  Trash2,
} from "lucide-react";
import { useState, useId, useCallback, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { arquivoTypeLabels } from "../constants/arquivo-labels";
import { Select } from "@/components/ui/select";

export default function ArquivosTab({ clienteId }: { clienteId: string }) {
  const [arquivos, setArquivos] = useState<ClientArquivo[]>([]);
  const [isLoading, startLoadingTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClientArquivo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const [uploadName, setUploadName] = useState("");
  const [uploadType, setUploadType] = useState<ClientArquivoType>("outro");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const uploadInputId = useId();

  const fetchArquivos = useCallback(() => {
    startLoadingTransition(async () => {
      try {
        const res = await fetch(`/api/clientes/${clienteId}/arquivos`);
        if (!res.ok) throw new Error();
        const json = await res.json();
        setArquivos(json.data ?? []);
      } catch {
        toast.error("Falha ao carregar arquivos");
      }
    });
  }, [clienteId]);

  useEffect(() => {
    fetchArquivos();
  }, [fetchArquivos]);

  const handleUpload = async () => {
    if (!uploadFile || !uploadName.trim()) {
      toast.error("Selecione um arquivo e informe o nome");
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("name", uploadName.trim());
      formData.append("fileType", uploadType);

      const res = await fetch(`/api/clientes/${clienteId}/arquivos`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error ?? "Erro ao fazer upload");
        return;
      }
      setArquivos((prev) => [json.data as ClientArquivo, ...prev]);
      toast.success(`"${uploadName}" enviado com sucesso!`);
      setUploadOpen(false);
      setUploadName("");
      setUploadType("outro");
      setUploadFile(null);
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/clientes/${clienteId}/arquivos/${deleteTarget.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error();
      setArquivos((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      toast.success("Arquivo removido");
    } catch {
      toast.error("Falha ao remover arquivo");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const arquivoTypeColors: Record<ClientArquivoType, string> = {
    contrato_assinado: "bg-success/10 text-success border-success/20",
    proposta: "bg-primary/10 text-primary border-primary/20",
    briefing: "bg-warning/10 text-warning border-warning/20",
    outro: "bg-muted text-muted-foreground border-border",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Arquivos anexos
        </h3>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 text-xs"
          onClick={() => setUploadOpen(true)}
        >
          <Upload className="h-3 w-3" /> Enviar
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : arquivos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8 text-center">
          <Paperclip className="h-8 w-8 text-muted-foreground/30" />
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhum arquivo anexado
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {arquivos.map((arquivo) => (
            <motion.div
              key={arquivo.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 rounded-lg border border-border bg-secondary/20 p-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-sm font-medium text-foreground">
                    {arquivo.name}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1.5 py-0",
                      arquivoTypeColors[arquivo.fileType],
                    )}
                  >
                    {arquivoTypeLabels[arquivo.fileType]}
                  </Badge>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  {arquivo.fileSize && (
                    <span>{formatBytes(arquivo.fileSize)}</span>
                  )}
                  <span>
                    {new Date(arquivo.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {arquivo.signedUrl && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label="Baixar arquivo"
                    asChild
                  >
                    <a
                      href={arquivo.signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-danger hover:bg-danger/10 hover:text-danger"
                  aria-label="Excluir arquivo"
                  onClick={() => setDeleteTarget(arquivo)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog
        open={uploadOpen}
        onOpenChange={(o) => {
          if (!isUploading) {
            setUploadOpen(o);
            if (!o) {
              setUploadFile(null);
              setUploadName("");
              setUploadType("outro");
              setIsDragging(false);
            }
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading text-base">
              Enviar arquivo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {/* Drop zone via label — não precisa de ref */}
            <div>
              <p className="mb-1.5 text-sm font-medium text-foreground">
                Arquivo
              </p>
              <label
                htmlFor={uploadInputId}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-5 transition-colors",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-secondary/30",
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) {
                    setUploadFile(f);
                    if (!uploadName)
                      setUploadName(f.name.replace(/\.[^/.]+$/, ""));
                  }
                }}
              >
                {uploadFile ? (
                  <div className="text-center">
                    <FileText className="mx-auto h-7 w-7 text-primary" />
                    <p className="mt-1.5 text-sm font-medium text-foreground">
                      {uploadFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(uploadFile.size)}
                    </p>
                    <p className="mt-1 text-xs text-primary">
                      Clique para trocar
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="mx-auto h-7 w-7 text-muted-foreground" />
                    <p className="mt-1.5 text-sm text-foreground">
                      Arraste ou{" "}
                      <span className="text-primary font-medium">
                        clique para selecionar
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      PDF, Word, Excel, imagens — máx. 50 MB
                    </p>
                  </div>
                )}
              </label>
              <input
                id={uploadInputId}
                type="file"
                className="sr-only"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setUploadFile(f);
                    if (!uploadName)
                      setUploadName(f.name.replace(/\.[^/.]+$/, ""));
                  }
                  e.target.value = "";
                }}
              />
            </div>

            <div>
              <label
                htmlFor="upload-display-name"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Nome de exibição
              </label>
              <Input
                id="upload-display-name"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="Ex: Contrato 2025"
              />
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium text-foreground">Tipo</p>
              <Select
                value={uploadType}
                onValueChange={(v) => setUploadType(v as ClientArquivoType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contrato_assinado">
                    Contrato Assinado
                  </SelectItem>
                  <SelectItem value="briefing">Briefing</SelectItem>
                  <SelectItem value="proposta">Proposta</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUploadOpen(false)}
              disabled={isUploading}
            >
              Cancelar
            </Button>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleUpload}
              disabled={isUploading || !uploadFile}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Enviar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover arquivo?</AlertDialogTitle>
            <AlertDialogDescription>
              O arquivo <strong>{deleteTarget?.name}</strong> será removido
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger text-white hover:bg-danger/90"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
