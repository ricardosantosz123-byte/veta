import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MailCheck, MailWarning, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { useEmpresaActiva } from '@/app/empresa-activa'
import { Campo } from '@/components/campo'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { crearDestajista, invitar, leerDestajistas, type ResultadoInvitacion } from '@/features/ajustes/api'
import { textoInvitacion } from '@/features/ajustes/invitacion'
import { mensajeError } from '@/lib/errores'
import { descripcionRol, nombreRol, ROLES, type Rol } from '@/lib/permisos'
import { enlaceWhatsApp } from '@/lib/whatsapp'

const NUEVO = '__nuevo__'

const schema = z
  .object({
    email: z.string().trim().min(1, 'Escribe el correo.').pipe(z.email('Ese correo no es válido.')).transform((v) => v.toLowerCase()),
    rol: z.enum(['admin', 'vendedor', 'produccion', 'destajista', 'contador']),
    destajista: z.string(),
    nuevo_nombre: z.string().trim().max(80, 'Usa como máximo 80 caracteres.'),
    nuevo_telefono: z.string().trim().max(30, 'Usa como máximo 30 caracteres.'),
    nuevo_especialidad: z.string().trim().max(80, 'Usa como máximo 80 caracteres.'),
  })
  .superRefine((v, ctx) => {
    if (v.rol !== 'destajista') return
    if (!v.destajista) ctx.addIssue({ code: 'custom', path: ['destajista'], message: 'Elige el proveedor o crea uno nuevo.' })
    if (v.destajista === NUEVO && v.nuevo_nombre.length < 2)
      ctx.addIssue({ code: 'custom', path: ['nuevo_nombre'], message: 'Escribe el nombre del proveedor.' })
  })
type Entrada = z.input<typeof schema>
type Salida = z.output<typeof schema>

interface Props {
  abierto: boolean
  onCerrar: () => void
}

export function DialogoInvitar({ abierto, onCerrar }: Props) {
  const { empresa } = useEmpresaActiva()
  const queryClient = useQueryClient()
  const [resultado, setResultado] = useState<(ResultadoInvitacion & { email: string; rol: Rol; nombre: string | null; telefono: string | null }) | null>(null)

  const form = useForm<Entrada, unknown, Salida>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', rol: 'vendedor', destajista: '', nuevo_nombre: '', nuevo_telefono: '', nuevo_especialidad: '' },
  })
  const { errors } = form.formState
  const rol = useWatch({ control: form.control, name: 'rol' })
  const destajista = useWatch({ control: form.control, name: 'destajista' })

  const destajistas = useQuery({
    queryKey: ['destajistas', empresa?.id],
    queryFn: () => leerDestajistas(empresa!.id),
    enabled: abierto && rol === 'destajista' && !!empresa,
  })

  const enviar = useMutation({
    mutationFn: async (v: Salida) => {
      let destajista_id: string | null = null
      let nombre: string | null = null
      let telefono: string | null = null
      if (v.rol === 'destajista') {
        if (v.destajista === NUEVO) {
          destajista_id = await crearDestajista(empresa!.id, {
            nombre: v.nuevo_nombre,
            telefono: v.nuevo_telefono || null,
            especialidad: v.nuevo_especialidad || null,
            email: v.email,
          })
          // Si después falla la invitación, el proveedor ya existe: que aparezca en la lista al reintentar.
          form.setValue('destajista', destajista_id)
          nombre = v.nuevo_nombre
          telefono = v.nuevo_telefono || null
          await queryClient.invalidateQueries({ queryKey: ['destajistas', empresa!.id] })
        } else {
          destajista_id = v.destajista
          const d = destajistas.data?.find((x) => x.id === v.destajista)
          nombre = d?.nombre ?? null
          telefono = d?.telefono ?? null
        }
      }
      const r = await invitar({ empresa_id: empresa!.id, email: v.email, rol: v.rol, destajista_id })
      return { ...r, email: v.email, rol: v.rol, nombre, telefono }
    },
    onSuccess: async (r) => {
      setResultado(r)
      await queryClient.invalidateQueries({ queryKey: ['invitaciones', empresa!.id] })
    },
  })

  function cerrar() {
    onCerrar()
    // Limpia después de la animación de cierre.
    setTimeout(() => {
      setResultado(null)
      enviar.reset()
      form.reset()
    }, 200)
  }

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && cerrar()}>
      <DialogContent className="sm:max-w-md">
        {resultado ? (
          <>
            <DialogHeader>
              <DialogTitle>{resultado.reenviada ? 'Invitación actualizada' : 'Invitación lista'}</DialogTitle>
              <DialogDescription>
                {resultado.email} entrará como <strong>{nombreRol[resultado.rol]}</strong> en cuanto inicie sesión con ese correo.
              </DialogDescription>
            </DialogHeader>
            {resultado.correo === 'enviado' ? (
              <Alert>
                <MailCheck aria-hidden />
                <AlertTitle>Correo enviado</AlertTitle>
                <AlertDescription>Le llegó un enlace para entrar sin contraseña.</AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <MailWarning aria-hidden />
                <AlertTitle>{resultado.correo === 'error' ? 'No se pudo enviar el correo' : 'Avísale por WhatsApp'}</AlertTitle>
                <AlertDescription>
                  {resultado.correo === 'error'
                    ? 'La invitación quedó guardada. Mándale el aviso por WhatsApp.'
                    : 'El envío de correos aún no está configurado. Mándale el aviso por WhatsApp para que cree su cuenta con ese correo.'}
                </AlertDescription>
              </Alert>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" asChild>
                <a
                  href={enlaceWhatsApp(textoInvitacion(empresa!.nombre, resultado.rol, resultado.email, resultado.nombre), resultado.telefono)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle aria-hidden />
                  Avisar por WhatsApp
                </a>
              </Button>
              <Button onClick={cerrar}>Listo</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={form.handleSubmit((v) => enviar.mutate(v))} noValidate className="grid gap-5">
            <DialogHeader>
              <DialogTitle>Invitar usuario</DialogTitle>
              <DialogDescription>Entrará a {empresa?.nombre} con el rol que elijas.</DialogDescription>
            </DialogHeader>

            <Campo id="inv-email" etiqueta="Correo" error={errors.email?.message}>
              <Input id="inv-email" type="email" autoComplete="off" autoFocus aria-describedby="inv-email-nota" aria-invalid={!!errors.email} {...form.register('email')} />
            </Campo>

            <Campo id="inv-rol" etiqueta="Rol" ayuda={descripcionRol[rol]}>
              <Controller
                control={form.control}
                name="rol"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="inv-rol" className="w-full" aria-describedby="inv-rol-nota">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {nombreRol[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Campo>

            {rol === 'destajista' && (
              <>
                <Campo id="inv-destajista" etiqueta="Proveedor" error={errors.destajista?.message} ayuda="Sus órdenes y pagos quedarán ligados a esta cuenta.">
                  <Controller
                    control={form.control}
                    name="destajista"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="inv-destajista" className="w-full" aria-describedby="inv-destajista-nota" aria-invalid={!!errors.destajista}>
                          <SelectValue placeholder={destajistas.isPending ? 'Cargando…' : 'Elige un proveedor'} />
                        </SelectTrigger>
                        <SelectContent>
                          {destajistas.data?.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.nombre}
                              {d.especialidad ? ` · ${d.especialidad}` : ''}
                            </SelectItem>
                          ))}
                          <SelectItem value={NUEVO}>+ Crear proveedor nuevo</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Campo>
                {destajista === NUEVO && (
                  <div className="grid gap-4 rounded-xl border p-4">
                    <Campo id="inv-nuevo-nombre" etiqueta="Nombre del proveedor" error={errors.nuevo_nombre?.message}>
                      <Input id="inv-nuevo-nombre" aria-describedby="inv-nuevo-nombre-nota" aria-invalid={!!errors.nuevo_nombre} {...form.register('nuevo_nombre')} />
                    </Campo>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Campo id="inv-nuevo-tel" etiqueta="WhatsApp (opcional)" error={errors.nuevo_telefono?.message}>
                        <Input id="inv-nuevo-tel" type="tel" aria-describedby="inv-nuevo-tel-nota" {...form.register('nuevo_telefono')} />
                      </Campo>
                      <Campo id="inv-nuevo-esp" etiqueta="Especialidad (opcional)" error={errors.nuevo_especialidad?.message}>
                        <Input id="inv-nuevo-esp" placeholder="Tapicería" aria-describedby="inv-nuevo-esp-nota" {...form.register('nuevo_especialidad')} />
                      </Campo>
                    </div>
                  </div>
                )}
              </>
            )}

            {enviar.isError && (
              <p role="alert" className="text-sm text-destructive">
                {mensajeError(enviar.error)}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={cerrar}>
                Cancelar
              </Button>
              <Button type="submit" disabled={enviar.isPending}>
                {enviar.isPending ? 'Invitando…' : 'Invitar'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
