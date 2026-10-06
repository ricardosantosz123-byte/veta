import { zodResolver } from '@hookform/resolvers/zod'
import { MailCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { Campo } from '@/components/campo'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/features/auth/auth-provider'
import { MarcoAuth } from '@/features/auth/components/marco-auth'
import {
  enlaceSchema,
  entrarSchema,
  recuperarSchema,
  registroSchema,
  restablecerSchema,
} from '@/features/auth/schemas'
import { mensajeError } from '@/lib/errores'
import { supabase } from '@/lib/supabase'
import type { z } from 'zod'

// Solo rutas internas: evita que ?siguiente= mande a otro sitio.
function destinoSeguro(siguiente: string | null) {
  return siguiente && siguiente.startsWith('/') && !siguiente.startsWith('//') ? siguiente : '/'
}

function CorreoEnviado({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <Alert>
      <MailCheck aria-hidden />
      <AlertTitle>{titulo}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}

// ───────────────────────────── Entrar ─────────────────────────────

function FormContrasena({ email, alEntrar }: { email: string; alEntrar: () => void }) {
  const form = useForm<z.input<typeof entrarSchema>, unknown, z.output<typeof entrarSchema>>({
    resolver: zodResolver(entrarSchema),
    defaultValues: { email, password: '' },
  })
  const { errors, isSubmitting } = form.formState

  const enviar = form.handleSubmit(async ({ email, password }) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return form.setError('root', { message: mensajeError(error) })
    alEntrar()
  })

  return (
    <form onSubmit={enviar} className="grid gap-4" noValidate>
      <Campo id="entrar-email" etiqueta="Correo" error={errors.email?.message}>
        <Input id="entrar-email" type="email" autoComplete="email" aria-describedby="entrar-email-nota" aria-invalid={!!errors.email} {...form.register('email')} />
      </Campo>
      <Campo id="entrar-password" etiqueta="Contraseña" error={errors.password?.message}>
        <Input id="entrar-password" type="password" autoComplete="current-password" aria-describedby="entrar-password-nota" aria-invalid={!!errors.password} {...form.register('password')} />
      </Campo>
      {errors.root && <p role="alert" className="text-sm text-destructive">{errors.root.message}</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Entrando…' : 'Entrar'}
      </Button>
      <Link to="/recuperar" className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline">
        Olvidé mi contraseña
      </Link>
    </form>
  )
}

function FormEnlace({ email, siguiente }: { email: string; siguiente: string }) {
  const [enviadoA, setEnviadoA] = useState<string | null>(null)
  const form = useForm<z.input<typeof enlaceSchema>, unknown, z.output<typeof enlaceSchema>>({
    resolver: zodResolver(enlaceSchema),
    defaultValues: { email },
  })
  const { errors, isSubmitting } = form.formState

  const enviar = form.handleSubmit(async ({ email }) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}${siguiente}` },
    })
    if (error) return form.setError('root', { message: mensajeError(error) })
    setEnviadoA(email)
  })

  if (enviadoA) {
    return (
      <CorreoEnviado titulo="Revisa tu correo">
        Enviamos un enlace para entrar a <strong>{enviadoA}</strong>. Ábrelo en este mismo dispositivo.
      </CorreoEnviado>
    )
  }

  return (
    <form onSubmit={enviar} className="grid gap-4" noValidate>
      <Campo id="enlace-email" etiqueta="Correo" error={errors.email?.message} ayuda="Te enviamos un enlace para entrar sin contraseña.">
        <Input id="enlace-email" type="email" autoComplete="email" aria-describedby="enlace-email-nota" aria-invalid={!!errors.email} {...form.register('email')} />
      </Campo>
      {errors.root && <p role="alert" className="text-sm text-destructive">{errors.root.message}</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Enviando…' : 'Enviarme el enlace'}
      </Button>
    </form>
  )
}

export function PaginaEntrar() {
  const { user, cargando } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const siguiente = destinoSeguro(params.get('siguiente'))
  const email = params.get('email') ?? ''

  if (!cargando && user) return <Navigate to={siguiente} replace />

  return (
    <MarcoAuth
      titulo="Entrar"
      descripcion="Usa el correo con el que te registraste o te invitaron."
      pie={
        <>
          ¿No tienes cuenta?{' '}
          <Link to={`/registro${email ? `?email=${encodeURIComponent(email)}` : ''}`} className="font-medium text-foreground underline-offset-4 hover:underline">
            Regístrate
          </Link>
        </>
      }
    >
      <Tabs defaultValue="contrasena">
        <TabsList className="mb-4 grid w-full grid-cols-2">
          <TabsTrigger value="contrasena">Con contraseña</TabsTrigger>
          <TabsTrigger value="enlace">Con enlace</TabsTrigger>
        </TabsList>
        <TabsContent value="contrasena">
          <FormContrasena email={email} alEntrar={() => navigate(siguiente, { replace: true })} />
        </TabsContent>
        <TabsContent value="enlace">
          <FormEnlace email={email} siguiente={siguiente} />
        </TabsContent>
      </Tabs>
    </MarcoAuth>
  )
}

// ───────────────────────────── Registro ─────────────────────────────

export function PaginaRegistro() {
  const { user, cargando } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [confirmarEn, setConfirmarEn] = useState<string | null>(null)
  const form = useForm<z.input<typeof registroSchema>, unknown, z.output<typeof registroSchema>>({
    resolver: zodResolver(registroSchema),
    defaultValues: { email: params.get('email') ?? '', password: '', confirmar: '' },
  })
  const { errors, isSubmitting } = form.formState

  if (!cargando && user) return <Navigate to="/" replace />

  const enviar = form.handleSubmit(async ({ email, password }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) return form.setError('root', { message: mensajeError(error) })
    // Con "Confirm email" encendido no hay sesión todavía: hay que confirmar el correo.
    if (!data.session) return setConfirmarEn(email)
    toast.success('Cuenta creada')
    navigate('/', { replace: true })
  })

  return (
    <MarcoAuth
      titulo="Crea tu cuenta"
      descripcion="14 días de prueba, sin tarjeta. Si te invitaron, usa el mismo correo de la invitación."
      pie={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link to="/entrar" className="font-medium text-foreground underline-offset-4 hover:underline">
            Entra
          </Link>
        </>
      }
    >
      {confirmarEn ? (
        <CorreoEnviado titulo="Confirma tu correo">
          Enviamos un enlace de confirmación a <strong>{confirmarEn}</strong>. Ábrelo para activar tu cuenta.
        </CorreoEnviado>
      ) : (
        <form onSubmit={enviar} className="grid gap-4" noValidate>
          <Campo id="reg-email" etiqueta="Correo" error={errors.email?.message}>
            <Input id="reg-email" type="email" autoComplete="email" aria-describedby="reg-email-nota" aria-invalid={!!errors.email} {...form.register('email')} />
          </Campo>
          <Campo id="reg-password" etiqueta="Contraseña" error={errors.password?.message} ayuda="Al menos 8 caracteres.">
            <Input id="reg-password" type="password" autoComplete="new-password" aria-describedby="reg-password-nota" aria-invalid={!!errors.password} {...form.register('password')} />
          </Campo>
          <Campo id="reg-confirmar" etiqueta="Confirma la contraseña" error={errors.confirmar?.message}>
            <Input id="reg-confirmar" type="password" autoComplete="new-password" aria-describedby="reg-confirmar-nota" aria-invalid={!!errors.confirmar} {...form.register('confirmar')} />
          </Campo>
          {errors.root && <p role="alert" className="text-sm text-destructive">{errors.root.message}</p>}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}
          </Button>
        </form>
      )}
    </MarcoAuth>
  )
}

// ───────────────────────────── Recuperar ─────────────────────────────

export function PaginaRecuperar() {
  const [enviadoA, setEnviadoA] = useState<string | null>(null)
  const form = useForm<z.input<typeof recuperarSchema>, unknown, z.output<typeof recuperarSchema>>({
    resolver: zodResolver(recuperarSchema),
    defaultValues: { email: '' },
  })
  const { errors, isSubmitting } = form.formState

  const enviar = form.handleSubmit(async ({ email }) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/restablecer`,
    })
    if (error) return form.setError('root', { message: mensajeError(error) })
    setEnviadoA(email)
  })

  return (
    <MarcoAuth
      titulo="Recupera tu contraseña"
      descripcion="Te enviamos un enlace para elegir una contraseña nueva."
      pie={
        <Link to="/entrar" className="font-medium text-foreground underline-offset-4 hover:underline">
          Volver a entrar
        </Link>
      }
    >
      {enviadoA ? (
        <CorreoEnviado titulo="Revisa tu correo">
          Si <strong>{enviadoA}</strong> tiene una cuenta, te llegará un enlace para restablecer tu contraseña.
        </CorreoEnviado>
      ) : (
        <form onSubmit={enviar} className="grid gap-4" noValidate>
          <Campo id="rec-email" etiqueta="Correo" error={errors.email?.message}>
            <Input id="rec-email" type="email" autoComplete="email" aria-describedby="rec-email-nota" aria-invalid={!!errors.email} {...form.register('email')} />
          </Campo>
          {errors.root && <p role="alert" className="text-sm text-destructive">{errors.root.message}</p>}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Enviando…' : 'Enviar enlace'}
          </Button>
        </form>
      )}
    </MarcoAuth>
  )
}

// ───────────────────────────── Restablecer ─────────────────────────────

export function PaginaRestablecer() {
  const { user, cargando } = useAuth()
  const navigate = useNavigate()
  const form = useForm<z.input<typeof restablecerSchema>, unknown, z.output<typeof restablecerSchema>>({
    resolver: zodResolver(restablecerSchema),
    defaultValues: { password: '', confirmar: '' },
  })
  const { errors, isSubmitting } = form.formState

  const enviar = form.handleSubmit(async ({ password }) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return form.setError('root', { message: mensajeError(error) })
    toast.success('Contraseña actualizada')
    navigate('/', { replace: true })
  })

  if (!cargando && !user) {
    return (
      <MarcoAuth titulo="Enlace no válido" descripcion="El enlace expiró o ya se usó.">
        <Button asChild className="w-full">
          <Link to="/recuperar">Pedir otro enlace</Link>
        </Button>
      </MarcoAuth>
    )
  }

  return (
    <MarcoAuth titulo="Elige tu contraseña nueva">
      <form onSubmit={enviar} className="grid gap-4" noValidate>
        <Campo id="res-password" etiqueta="Contraseña nueva" error={errors.password?.message} ayuda="Al menos 8 caracteres.">
          <Input id="res-password" type="password" autoComplete="new-password" aria-describedby="res-password-nota" aria-invalid={!!errors.password} {...form.register('password')} />
        </Campo>
        <Campo id="res-confirmar" etiqueta="Confirma la contraseña" error={errors.confirmar?.message}>
          <Input id="res-confirmar" type="password" autoComplete="new-password" aria-describedby="res-confirmar-nota" aria-invalid={!!errors.confirmar} {...form.register('confirmar')} />
        </Campo>
        {errors.root && <p role="alert" className="text-sm text-destructive">{errors.root.message}</p>}
        <Button type="submit" disabled={isSubmitting || cargando}>
          {isSubmitting ? 'Guardando…' : 'Guardar contraseña'}
        </Button>
      </form>
    </MarcoAuth>
  )
}
