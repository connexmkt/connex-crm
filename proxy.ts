import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Aplica o proxy em todas as rotas EXCETO:
     * - _next/static  (assets estáticos)
     * - _next/image   (otimização de imagens)
     * - favicon.ico   (ícone do site)
     * - arquivos públicos com extensão (png, svg, etc.)
     * - /auth/*       (rotas de autenticação — liberadas pelo updateSession)
     * - /api/auth/*   (rotas de API de autenticação — sem sessão necessária)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
