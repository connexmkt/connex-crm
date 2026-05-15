import type { SupabaseClient } from '@supabase/supabase-js'
import type { ClientArquivo, ClientArquivoType } from '@/lib/types'

// ── DB row shape ──────────────────────────────────────────────────────────────

interface ArquivoRow {
  id: string
  cliente_id: string
  name: string
  file_path: string
  file_type: ClientArquivoType
  file_size: number | null
  mime_type: string | null
  uploaded_by: string | null
  created_at: string
}

// ── Mapping helpers ───────────────────────────────────────────────────────────

function rowToArquivo(row: ArquivoRow): ClientArquivo {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    name: row.name,
    filePath: row.file_path,
    fileType: row.file_type,
    fileSize: row.file_size ?? undefined,
    mimeType: row.mime_type ?? undefined,
    uploadedBy: row.uploaded_by ?? undefined,
    createdAt: new Date(row.created_at),
  }
}

// ── Input types ───────────────────────────────────────────────────────────────

export type InsertArquivoInput = Omit<ClientArquivo, 'id' | 'createdAt' | 'signedUrl'>

// ── Repository ────────────────────────────────────────────────────────────────

export const ArquivosRepository = {
  async findByClienteId(supabase: SupabaseClient, clienteId: string): Promise<ClientArquivo[]> {
    const { data, error } = await supabase
      .from('cliente_arquivos')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data as ArquivoRow[]).map(rowToArquivo)
  },

  async findById(supabase: SupabaseClient, id: string): Promise<ClientArquivo> {
    const { data, error } = await supabase
      .from('cliente_arquivos')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return rowToArquivo(data as ArquivoRow)
  },

  async insert(supabase: SupabaseClient, input: InsertArquivoInput): Promise<ClientArquivo> {
    const { data, error } = await supabase
      .from('cliente_arquivos')
      .insert({
        cliente_id: input.clienteId,
        name: input.name,
        file_path: input.filePath,
        file_type: input.fileType,
        file_size: input.fileSize ?? null,
        mime_type: input.mimeType ?? null,
        uploaded_by: input.uploadedBy ?? null,
      })
      .select()
      .single()

    if (error) throw error
    return rowToArquivo(data as ArquivoRow)
  },

  async delete(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase.from('cliente_arquivos').delete().eq('id', id)
    if (error) throw error
  },
}
