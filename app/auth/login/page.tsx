'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type FieldErrors = {
  email?: string[]
  password?: string[]
  message?: string
}

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [globalError, setGlobalError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setGlobalError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const json = await res.json()

      if (res.status === 400) {
        setErrors(json.details?.fieldErrors ?? {})
        return
      }

      if (res.status === 401) {
        setGlobalError('E-mail ou senha incorretos. Verifique suas credenciais.')
        return
      }

      if (!res.ok) {
        setGlobalError('Ocorreu um erro inesperado. Tente novamente.')
        return
      }

      router.replace('/')
    } catch {
      setGlobalError('Não foi possível conectar ao servidor. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      {/* Background decorativo */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative w-full max-w-sm"
      >
        {/* Logo / marca */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <span className="font-heading text-2xl font-bold text-primary">C</span>
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Connex CRM
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Entre com sua conta para continuar
          </p>
        </div>

        {/* Card do formulário */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-xl shadow-black/20">
          {/* Erro global */}
          {globalError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-5 flex items-start gap-2.5 rounded-lg border border-danger/20 bg-danger/10 px-4 py-3"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
              <p className="text-sm text-danger">{globalError}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Campo e-mail */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                E-mail
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="voce@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className={cn(
                  errors.email && 'border-danger focus-visible:ring-danger/50',
                )}
              />
              {errors.email && (
                <p className="text-xs text-danger">{errors.email[0]}</p>
              )}
            </div>

            {/* Campo senha */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-sm font-medium text-foreground"
              >
                Senha
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className={cn(
                    'pr-10',
                    errors.password && 'border-danger focus-visible:ring-danger/50',
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-danger">{errors.password[0]}</p>
              )}
            </div>

            {/* Botão de login */}
            <Button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  Entrando…
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Entrar
                </>
              )}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Não possui conta?{' '}
          <span className="text-primary">
            Entre em contato com o administrador.
          </span>
        </p>
      </motion.div>
    </div>
  )
}
