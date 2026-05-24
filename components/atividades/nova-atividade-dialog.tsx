'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Loader2, Phone, Mail, MessageSquare, Video, FileText, FileSignature } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Atividade, AtividadeTipo, User } from '@/lib/types'

// ── Schema ────────────────────────────────────────────────────────────────────

const atividadeSchema = z.object({
  tipo: z.enum(['reuniao', 'ligacao', 'email', 'mensagem', 'proposta', 'contrato']),
  associacaoTipo: z.enum(['cliente', 'lead']),
  associacaoId: z.string().min(1, 'Selecione um cliente ou lead'),
  responsavelId: z.string().uuid('Selecione um responsável'),
  ocorridoEm: z.string().min(1, 'Informe a data e hora'),
  descricao: z.string().min(3, 'Descreva a atividade'),
  resultado: z.string().optional(),
  proximoPasso: z.string().optional(),
})

type AtividadeFormValues = z.infer<typeof atividadeSchema>

// ── Helpers ───────────────────────────────────────────────────────────────────

const TIPO_CONFIG: Record<AtividadeTipo, { label: string; icon: React.ElementType }> = {
  reuniao:  { label: 'Reunião',   icon: Video },
  ligacao:  { label: 'Ligação',   icon: Phone },
  email:    { label: 'E-mail',    icon: Mail },
  mensagem: { label: 'Mensagem',  icon: MessageSquare },
  proposta: { label: 'Proposta',  icon: FileText },
  contrato: { label: 'Contrato',  icon: FileSignature },
}

function nowLocalDatetime() {
  const now = new Date()
  now.setSeconds(0, 0)
  return now.toISOString().slice(0, 16)
}

// ── Componente ────────────────────────────────────────────────────────────────

interface NovaAtividadeDialogProps {
  onAtividadeCriada: (atividade: Atividade) => void
  /** Se já soubermos o contexto (ex: dentro de um card de cliente) */
  defaultAssociacaoTipo?: 'cliente' | 'lead'
  defaultAssociacaoId?: string
  defaultAssociacaoNome?: string
  trigger?: React.ReactNode
}

type AssocOption = { id: string; nome: string }

export function NovaAtividadeDialog({
  onAtividadeCriada,
  defaultAssociacaoTipo,
  defaultAssociacaoId,
  defaultAssociacaoNome,
  trigger,
}: NovaAtividadeDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [team, setTeam] = useState<User[]>([])
  const [assocOptions, setAssocOptions] = useState<AssocOption[]>([])
  const [assocLoading, setAssocLoading] = useState(false)

  const form = useForm<AtividadeFormValues>({
    resolver: zodResolver(atividadeSchema),
    defaultValues: {
      tipo: 'reuniao',
      associacaoTipo: defaultAssociacaoTipo ?? 'cliente',
      associacaoId: defaultAssociacaoId ?? '',
      responsavelId: '',
      ocorridoEm: nowLocalDatetime(),
      descricao: '',
      resultado: '',
      proximoPasso: '',
    },
  })

  const associacaoTipo = form.watch('associacaoTipo')

  // Busca equipe ao abrir
  useEffect(() => {
    if (!open) return
    fetch('/api/team')
      .then((r) => r.json())
      .then((j) => setTeam(j.data ?? []))
      .catch(console.error)
  }, [open])

  // Busca clientes ou leads ao trocar o tipo de associação
  const fetchAssocOptions = useCallback(async (tipo: 'cliente' | 'lead') => {
    setAssocLoading(true)
    try {
      const url = tipo === 'cliente' ? '/api/clientes' : '/api/pipeline'
      const res = await fetch(url)
      const json = await res.json()
      const items: AssocOption[] = (json.data ?? []).map(
        (item: { id: string; name?: string; companyName?: string }) => ({
          id: item.id,
          nome: item.name ?? item.companyName ?? item.id,
        }),
      )
      setAssocOptions(items)
    } catch {
      setAssocOptions([])
    } finally {
      setAssocLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    if (defaultAssociacaoId && defaultAssociacaoNome) {
      setAssocOptions([{ id: defaultAssociacaoId, nome: defaultAssociacaoNome }])
      return
    }
    fetchAssocOptions(associacaoTipo)
  }, [open, associacaoTipo, defaultAssociacaoId, defaultAssociacaoNome, fetchAssocOptions])

  // Se o tipo de associação mudar, limpar a seleção
  useEffect(() => {
    if (!defaultAssociacaoId) {
      form.setValue('associacaoId', '')
    }
  }, [associacaoTipo, defaultAssociacaoId, form])

  async function onSubmit(values: AtividadeFormValues) {
    const assocNome =
      defaultAssociacaoNome ??
      assocOptions.find((o) => o.id === values.associacaoId)?.nome ??
      ''

    setLoading(true)
    try {
      const res = await fetch('/api/atividades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          associacaoNome: assocNome,
          ocorridoEm: new Date(values.ocorridoEm).toISOString(),
          resultado: values.resultado || undefined,
          proximoPasso: values.proximoPasso || undefined,
        }),
      })

      if (!res.ok) throw new Error('Erro ao registrar atividade')

      const { data: nova } = await res.json()
      onAtividadeCriada(nova)
      toast.success('Atividade registrada!')
      setOpen(false)
      form.reset({
        tipo: 'reuniao',
        associacaoTipo: defaultAssociacaoTipo ?? 'cliente',
        associacaoId: defaultAssociacaoId ?? '',
        responsavelId: '',
        ocorridoEm: nowLocalDatetime(),
        descricao: '',
        resultado: '',
        proximoPasso: '',
      })
    } catch (err) {
      console.error(err)
      toast.error('Não foi possível registrar a atividade.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="h-8 gap-1">
            <Plus className="h-4 w-4" />
            Nova Atividade
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Registrar Atividade</DialogTitle>
          <DialogDescription>
            Documente uma interação com um cliente ou lead.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* Tipo da atividade */}
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.entries(TIPO_CONFIG) as [AtividadeTipo, typeof TIPO_CONFIG[AtividadeTipo]][]).map(
                      ([value, { label, icon: Icon }]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => field.onChange(value)}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                            field.value === value
                              ? 'border-primary bg-primary/10 text-primary font-medium'
                              : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground'
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {label}
                        </button>
                      ),
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Associação */}
            {!defaultAssociacaoId && (
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="associacaoTipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de associação</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cliente">Cliente</SelectItem>
                          <SelectItem value="lead">Lead</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="associacaoId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {associacaoTipo === 'cliente' ? 'Cliente' : 'Lead'}
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={assocLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={assocLoading ? 'Carregando…' : 'Selecione'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {assocOptions.map((opt) => (
                            <SelectItem key={opt.id} value={opt.id}>
                              {opt.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Responsável + Data/hora */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="responsavelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {team.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ocorridoEm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data e hora</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Descrição */}
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o que aconteceu nessa atividade…"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Resultado + Próximo passo */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="resultado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resultado <span className="text-muted-foreground text-xs">(opcional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Cliente interessado" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="proximoPasso"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Próximo passo <span className="text-muted-foreground text-xs">(opcional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Enviar proposta" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
