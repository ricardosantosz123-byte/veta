import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageCircle, Plus, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { useEmpresaActiva, usePuede, usePuedeEditar } from '@/app/empresa-activa'
import { Campo } from '@/components/campo'
import { EstadoVacio } from '@/components/estado-vacio'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { invitar } from '@/features/ajustes/api'
import { textoInvitacion } from '@/features/ajustes/invitacion'
import { telefonoValido } from '@/features/clientes/schemas'
import { guardarDestajista, leerDestajista, leerSaldosDestajo, type SaldoDestajista } from '@/features/produccion/api'
import { mensajeError } from '@/lib/errores'
import { moneda } from '@/lib/formato'
import { telefonoLegible } from '@/lib/telefono'
import { enlaceWhatsApp } from '@/lib/whatsapp'

const schema = z.object({
  nombre: z.string().trim().min(2, 'Escribe el nombre.').max(80, 'Usa como máximo 80 caracteres.'),
  especialidad: z.string().trim().max(80).transform((v) => v || null),
  tipo: z.enum(['externo', 'interno']),
  telefono: z
    .string()
    .trim()
    .refine((v) => v === '' || telefonoValido(v), 'Escribe 10 dígitos.')
    .transform((v) => v.replace(/\D/g, '') || null),
  email: z
    .string()
    .trim()
    .refine((v) => v === '' || z.email().safeParse(v).success, 'Ese correo no es válido.')
    .transform((v) => v.toLowerCase() || null),
  activo: z.boolean(),
})
type Entrada = z.input<typeof schema>
type Salida = z.output<typeof schema>

type Registro = Awaited<ReturnType<typeof leerDestajista>>

/** Para editar se lee el registro completo (la vista de saldos no trae correo ni notas). */
function DialogoDestajista({ d, onCerrar }: { d: SaldoDestajista | 'nuevo'; onCerrar: () => void }) {
  const registro = useQuery({ queryKey: ['destajista', d === 'nuevo' ? null : d.destajista_id], queryFn: () => leerDestajista((d as SaldoDestajista).destajista_id!), enabled: d !== 'nuevo' })
  if (d !== 'nuevo' && !registro.data) return null
  return <FormularioDestajista registro={d === 'nuevo' ? null : registro.data!} onCerrar={onCerrar} />
}

function FormularioDestajista({ registro: d, onCerrar }: { registro: Registro | null; onCerrar: () => void }) {
  const { empresa } = useEmpresaActiva()
  const queryClient = useQueryClient()
  const nuevo = d === null
  const form = useForm<Entrada, unknown, Salida>({
    resolver: zodResolver(schema),
    defaultValues: nuevo
      ? { nombre: '', especialidad: '', tipo: 'externo', telefono: '', email: '', activo: true }
      : { nombre: d.nombre, especialidad: d.especialidad ?? '', tipo: d.tipo === 'interno' ? 'interno' : 'externo', telefono: d.telefono ? telefonoLegible(d.telefono) : '', email: d.email ?? '', activo: d.activo },
  })
  const { errors } = form.formState
  const guardar = useMutation({
    mutationFn: (v: Salida) => guardarDestajista(empresa!.id, nuevo ? null : d.id, { ...v, telefono: v.telefono && v.telefono.length === 10 ? `52${v.telefono}` : v.telefono }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['produccion', empresa!.id] })
      toast.success(nuevo ? 'Destajista agregado' : 'Destajista actualizado')
      onCerrar()
    },
  })

  return (
    <Dialog open onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={form.handleSubmit((v) => guardar.mutate(v))} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{nuevo ? 'Nuevo destajista' : `Editar ${d.nombre}`}</DialogTitle>
            <DialogDescription>Quien produce una etapa por pieza: carpintero, laqueador, tapicero…</DialogDescription>
          </DialogHeader>
          <Campo id="des-nombre" etiqueta="Nombre" error={errors.nombre?.message}>
            <Input id="des-nombre" autoFocus aria-invalid={!!errors.nombre} {...form.register('nombre')} />
          </Campo>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id="des-esp" etiqueta="Especialidad">
              <Input id="des-esp" placeholder="Tapicería" {...form.register('especialidad')} />
            </Campo>
            <Campo id="des-tipo" etiqueta="Tipo">
              <Controller
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="des-tipo" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="externo">Externo (taller propio)</SelectItem>
                      <SelectItem value="interno">Interno (a destajo en tu taller)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Campo>
            <Campo id="des-tel" etiqueta="WhatsApp" error={errors.telefono?.message}>
              <Input id="des-tel" type="tel" placeholder="33 1234 5678" aria-invalid={!!errors.telefono} {...form.register('telefono')} />
            </Campo>
            <Campo id="des-email" etiqueta="Correo (opcional)" error={errors.email?.message}>
              <Input id="des-email" type="email" aria-invalid={!!errors.email} {...form.register('email')} />
            </Campo>
          </div>
          {!nuevo && (
            <Controller
              control={form.control}
              name="activo"
              render={({ field }) => (
                <label className="flex items-center justify-between rounded-xl border p-3 text-sm font-medium">
                  Activo (aparece al asignar órdenes)
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </label>
              )}
            />
          )}
          {guardar.isError && (
            <p role="alert" className="text-sm text-destructive">
              {mensajeError(guardar.error)}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardar.isPending}>
              {guardar.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DialogoInvitarDestajista({ d, onCerrar }: { d: SaldoDestajista; onCerrar: () => void }) {
  const { empresa } = useEmpresaActiva()
  const [email, setEmail] = useState('')
  const [lista, setLista] = useState<string | null>(null)
  const enviar = useMutation({
    mutationFn: () => {
      if (!z.email().safeParse(email.trim()).success) throw new Error('Escribe un correo válido.')
      return invitar({ empresa_id: empresa!.id, email: email.trim().toLowerCase(), rol: 'destajista', destajista_id: d.destajista_id! })
    },
    onSuccess: (r) => setLista(r.correo),
  })
  return (
    <Dialog open onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invitar a {d.nombre} a la app</DialogTitle>
          <DialogDescription>Verá solo sus órdenes, podrá marcar "Empecé" y "Terminé" y consultar lo que se le debe. Es opcional: funciona igual con el PDF por WhatsApp.</DialogDescription>
        </DialogHeader>
        {lista === null ? (
          <>
            <Campo id="inv-des-email" etiqueta="Correo con el que entrará">
              <Input id="inv-des-email" type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
            </Campo>
            {enviar.isError && (
              <p role="alert" className="text-sm text-destructive">
                {mensajeError(enviar.error)}
              </p>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={onCerrar}>
                Cancelar
              </Button>
              <Button onClick={() => enviar.mutate()} disabled={enviar.isPending}>
                {enviar.isPending ? 'Invitando…' : 'Invitar'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <p className="text-sm">{lista === 'enviado' ? 'Le enviamos un correo para entrar.' : 'Invitación lista. Avísale por WhatsApp para que cree su cuenta con ese correo.'}</p>
            <DialogFooter>
              <Button variant="outline" asChild>
                <a href={enlaceWhatsApp(textoInvitacion(empresa!.nombre, 'destajista', email.trim().toLowerCase(), d.nombre), d.telefono)} target="_blank" rel="noreferrer">
                  <MessageCircle aria-hidden /> Avisar por WhatsApp
                </a>
              </Button>
              <Button onClick={onCerrar}>Listo</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function Destajistas() {
  const { empresa } = useEmpresaActiva()
  const editar = usePuedeEditar('gestionar_produccion')
  const verCostos = usePuede('ver_costos')
  const esAdmin = usePuedeEditar('gestionar_usuarios')
  const saldos = useQuery({ queryKey: ['produccion', empresa!.id, 'destajistas'], queryFn: () => leerSaldosDestajo(empresa!.id) })
  const [editando, setEditando] = useState<SaldoDestajista | 'nuevo' | null>(null)
  const [invitando, setInvitando] = useState<SaldoDestajista | null>(null)

  if (saldos.isPending) return <Skeleton className="h-64 rounded-xl" />
  if (saldos.error) return <p className="text-sm text-destructive">{mensajeError(saldos.error)}</p>

  return (
    <div className="grid gap-4">
      {editar && (
        <div className="flex justify-end">
          <Button onClick={() => setEditando('nuevo')}>
            <Plus aria-hidden /> Nuevo destajista
          </Button>
        </div>
      )}
      {saldos.data.length === 0 ? (
        <EstadoVacio icono={Users} titulo="Aún no hay destajistas" descripcion="Da de alta a quienes producen cada etapa para asignarles órdenes." />
      ) : (
        <Card className="py-0">
          <ul className="divide-y">
            {saldos.data.map((d) => (
              <li key={d.destajista_id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => editar && setEditando(d)} disabled={!editar}>
                  <span className="flex flex-wrap items-center gap-2 font-medium">
                    {d.nombre}
                    {!d.activo && <Badge variant="outline">Inactivo</Badge>}
                    <Badge variant="secondary">{d.tipo === 'interno' ? 'Interno' : 'Externo'}</Badge>
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {[d.especialidad, d.telefono && telefonoLegible(d.telefono), `${d.ordenes_abiertas} órdenes abiertas`].filter(Boolean).join(' · ')}
                  </span>
                </button>
                {verCostos && (
                  <dl className="flex gap-6 text-right text-sm">
                    <div>
                      <dt className="text-muted-foreground">Por pagar</dt>
                      <dd className="font-medium tabular">{moneda(d.por_pagar)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Comprometido</dt>
                      <dd className="tabular">{moneda(d.comprometido)}</dd>
                    </div>
                  </dl>
                )}
                {esAdmin && d.activo && (
                  <Button variant="ghost" size="sm" onClick={() => setInvitando(d)}>
                    <UserPlus aria-hidden /> Invitar a la app
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
      {verCostos && (
        <p className="text-xs text-muted-foreground">
          <strong>Por pagar</strong>: órdenes terminadas menos lo pagado. <strong>Comprometido</strong>: órdenes pendientes o en proceso menos los adelantos.
        </p>
      )}
      {editando && <DialogoDestajista d={editando} onCerrar={() => setEditando(null)} />}
      {invitando && <DialogoInvitarDestajista d={invitando} onCerrar={() => setInvitando(null)} />}
    </div>
  )
}
