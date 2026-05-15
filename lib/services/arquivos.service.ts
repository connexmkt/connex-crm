import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ArquivosRepository,
} from '@/lib/repositories/arquivos.repository'
import { ClientesRepository } from '@/lib/repositories/clientes.repository'
import type { ClientArquivo, ClientArquivoType } from '@/lib/types'

const STORAGE_BUCKET = 'cliente-arquivos'
const SIGNED_URL_EXPIRES_IN = 3600 // 1 hour

export type UploadArquivoInput = {
  clienteId: string
  name: string
  fileType: ClientArquivoType
  file: File
  uploadedBy: string
}

export const ArquivosService = {
  async listByCliente(
    supabase: SupabaseClient,
    clienteId: string,
  ): Promise<ClientArquivo[]> {
    await ClientesRepository.findById(supabase, clienteId)

    const arquivos = await ArquivosRepository.findByClienteId(supabase, clienteId)

    // Generate signed URLs for all files
    const withUrls = await Promise.all(
      arquivos.map(async (arquivo) => {
        const { data } = await supabase.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(arquivo.filePath, SIGNED_URL_EXPIRES_IN)

        return { ...arquivo, signedUrl: data?.signedUrl }
      }),
    )

    return withUrls
  },

  async upload(
    supabase: SupabaseClient,
    input: UploadArquivoInput,
  ): Promise<ClientArquivo> {
    await ClientesRepository.findById(supabase, input.clienteId)

    const ext = input.file.name.split('.').pop() ?? ''
    const filePath = `${input.clienteId}/${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, input.file, {
        contentType: input.file.type,
        upsert: false,
      })

    if (uploadError) throw uploadError

    const arquivo = await ArquivosRepository.insert(supabase, {
      clienteId: input.clienteId,
      name: input.name,
      filePath,
      fileType: input.fileType,
      fileSize: input.file.size,
      mimeType: input.file.type,
      uploadedBy: input.uploadedBy,
    })

    const { data: signedData } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(filePath, SIGNED_URL_EXPIRES_IN)

    return { ...arquivo, signedUrl: signedData?.signedUrl }
  },

  async delete(supabase: SupabaseClient, id: string): Promise<void> {
    const arquivo = await ArquivosRepository.findById(supabase, id)

    // Delete from storage first
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([arquivo.filePath])

    if (storageError) throw storageError

    await ArquivosRepository.delete(supabase, id)
  },
}
