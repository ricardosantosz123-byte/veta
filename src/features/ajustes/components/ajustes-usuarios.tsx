import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageCircle, MoreHorizontal, RotateCw, UserPlus, Users, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { useEmpresaActiva, usePuedeEditar } from '@/app/empresa-activa'
import { EstadoVacio } from '@/components/estado-vacio'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/auth-provider'
import {
  cambiarActivo,
  cambiarRol,
  cancelarInvitacion,
  invitar,
  leerDestajistas,
  leerInvitacionesPendientes,
  leerMiembros,
  type Invitacion,
  type Miembro,
} from '@/features/ajustes/api'
import { DialogoInvitar } from '@/features/ajustes/components/dialogo-invitar'
import { leerUsoPlan } from '@/features/suscripcion/api'
import { textoInvitacion } from '@/features/ajustes/invitacion'
import { mensajeError } from '@/lib/errores'
import { fecha } from '@/lib/formato'
import { descripcionRol, nombreRol, ROLES, type Rol } from '@/lib/permisos'
import { enlaceWhatsApp } from '@/lib/whatsapp'

function DialogoRol({ miembro, onCerrar }: { miembro: Miembro | null; onCerrar: () => void }) {
  const { empresa } = useEmpresaActiva()
  const queryClient = useQueryClient()
  const [rol, setRol] = useState<Rol>(miembro?.rol ?? 'vendedor')
  const [destajista, setDestajista] = useState<string>(miembro?.destajista_id ?? '')

  const destajistas = useQuery({
    queryKey: ['destajistas', empresa?.id],
    queryFn: () => leerDestajistas(empresa!.id),
    enabled: !!miembro && rol === 'destajista',
  })

  const guardar = useMutation({
    mutationFn: () => cambiarRol(miembro!.id, rol, rol === 'destajista' ? destajista : null),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['miembros', empresa!.id] }),
        queryClient.invalidateQueries({ queryKey: ['uso-plan', empresa!.id] }),
      ])
      toast.success('Rol actualizado')
      onCerrar()
    },
  })

  const faltaDestajista = rol === 'destajista' && !destajista

  return (
    <Dialog open={!!miembro} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar rol</DialogTitle>
          <DialogDescription>{miembro?.nombre}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="rol-nuevo">Rol</Label>
          <Select value={rol} onValueChange={(v) => setRol(v as Rol)}>
            <SelectTrigger id="rol-nuevo" className="w-full">
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
          <p className="text-sm text-muted-foreground">{descripcionRol[rol]}</p>
        </div>
        {rol === 'destajista' && (
          <div className="grid gap-2">
            <Label htmlFor="rol-destajista">Proveedor</Label>
            <Select value={destajista} onValueChange={setDestajista}>
              <SelectTrigger id="rol-destajista" className="w-full">
                <SelectValue placeholder={destajistas.isPending ? 'Cargando…' : 'Elige un proveedor'} />
              </SelectTrigger>
              <SelectContent>
                {destajistas.data?.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {destajistas.data?.length === 0 && (
              <p className="text-sm text-muted-foreground">No hay proveedores. Créalo al invitar a un proveedor nuevo.</p>
            )}
          </div>
        )}
        {guardar.isError && (
          <p role="alert" className="text-sm text-destructive">
            {mensajeError(guardar.error)}
          </p>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button onClick={() => guardar.mutate()} disabled={faltaDestajista || guardar.isPending}>
            {guardar.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FilaMiembro({ m, esYo, habilitado, onCambiarRol }: { m: Miembro; esYo: boolean; habilitado: boolean; onCambiarRol: () => void }) {
  const { empresa } = useEmpresaActiva()
  const queryClient = useQueryClient()
  const activar = useMutation({
    mutationFn: () => cambiarActivo(m.id, !m.activo),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['miembros', empresa!.id] }),
        queryClient.invalidateQueries({ queryKey: ['uso-plan', empresa!.id] }),
      ])
      toast.success(m.activo ? 'Usuario desactivado' : 'Usuario reactivado')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {m.nombre ?? 'Sin nombre'}
          {esYo && <span className="ml-2 text-sm font-normal text-muted-foreground">(tú)</span>}
        </p>
        <p className="text-sm text-muted-foreground">
          Desde {fecha(m.created_at)}
          {m.destajista && ` · ${m.destajista.nombre}`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {!m.activo && <Badge variant="outline">Desactivado</Badge>}
        <Badge variant="secondary">{nombreRol[m.rol]}</Badge>
        {esYo ? (
          <span className="size-9" aria-hidden />
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={`Acciones para ${m.nombre ?? 'el usuario'}`} disabled={!habilitado}>
                <MoreHorizontal aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onCambiarRol}>Cambiar rol</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => activar.mutate()} variant={m.activo ? 'destructive' : 'default'}>
                {m.activo ? 'Desactivar' : 'Reactivar'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </li>
  )
}

function FilaInvitacion({ inv, habilitado }: { inv: Invitacion; habilitado: boolean }) {
  const { empresa } = useEmpresaActiva()
  const queryClient = useQueryClient()
  const refrescar = () =>
    Promise.all([queryClient.invalidateQueries({ queryKey: ['invitaciones', empresa!.id] }), queryClient.invalidateQueries({ queryKey: ['uso-plan', empresa!.id] })])

  const cancelar = useMutation({
    mutationFn: () => cancelarInvitacion(inv.id),
    onSuccess: async () => {
      await refrescar()
      toast.success('Invitación cancelada')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
  const reenviar = useMutation({
    mutationFn: () =>
      invitar({ empresa_id: empresa!.id, email: inv.email, rol: inv.rol, destajista_id: inv.destajista_id }),
    onSuccess: async (r) => {
      await refrescar()
      if (r.correo === 'enviado') toast.success('Invitación reenviada por correo')
      else toast.info('El correo aún no está configurado. Avísale por WhatsApp.')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{inv.email}</p>
        <p className="text-sm text-muted-foreground">
          Invitado el {fecha(inv.created_at)}
          {inv.destajista && ` · ${inv.destajista.nombre}`}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Badge variant="outline">{nombreRol[inv.rol]}</Badge>
        <Button variant="ghost" size="icon" asChild aria-label={`Avisar a ${inv.email} por WhatsApp`}>
          <a href={enlaceWhatsApp(textoInvitacion(empresa!.nombre, inv.rol, inv.email, inv.destajista?.nombre))} target="_blank" rel="noreferrer">
            <MessageCircle aria-hidden />
          </a>
        </Button>
        <Button variant="ghost" size="icon" aria-label={`Reenviar invitación a ${inv.email}`} disabled={!habilitado || reenviar.isPending} onClick={() => reenviar.mutate()}>
          <RotateCw aria-hidden className={reenviar.isPending ? 'animate-spin' : undefined} />
        </Button>
        <Button variant="ghost" size="icon" aria-label={`Cancelar invitación a ${inv.email}`} disabled={!habilitado || cancelar.isPending} onClick={() => cancelar.mutate()}>
          <X aria-hidden />
        </Button>
      </div>
    </li>
  )
}

export function AjustesUsuarios({ empresaId }: { empresaId: string }) {
  const { user } = useAuth()
  const habilitado = usePuedeEditar('gestionar_usuarios')
  const [invitando, setInvitando] = useState(false)
  const [editando, setEditando] = useState<Miembro | null>(null)

  const miembros = useQuery({ queryKey: ['miembros', empresaId], queryFn: () => leerMiembros(empresaId) })
  const uso = useQuery({ queryKey: ['uso-plan', empresaId], queryFn: () => leerUsoPlan(empresaId) })
  const invitaciones = useQuery({ queryKey: ['invitaciones', empresaId], queryFn: () => leerInvitacionesPendientes(empresaId) })

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Miembros</CardTitle>
          <CardDescription>
            Quién entra a esta empresa y con qué rol.
            {uso.data && (
              <span className="mt-1 block tabular">
                Oficina {uso.data.oficina} de {uso.data.oficina_incluidos} · Proveedores {uso.data.proveedores} de {uso.data.proveedores_incluidos}
                {uso.data.extra > 0 && ` · ${uso.data.extra_usados} de ${uso.data.extra} adicionales`} ·{' '}
                <Link to="/suscripcion" className="underline underline-offset-4 hover:text-foreground">
                  Ver plan
                </Link>
              </span>
            )}
          </CardDescription>
          <CardAction>
            <Button onClick={() => setInvitando(true)} disabled={!habilitado}>
              <UserPlus aria-hidden />
              Invitar
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {miembros.isPending ? (
            <div className="grid gap-3">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : miembros.error ? (
            <p className="text-sm text-destructive">{mensajeError(miembros.error)}</p>
          ) : (
            <ul className="divide-y">
              {miembros.data.map((m) => (
                <FilaMiembro key={m.id} m={m} esYo={m.user_id === user?.id} habilitado={habilitado} onCambiarRol={() => setEditando(m)} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invitaciones pendientes</CardTitle>
          <CardDescription>Se aceptan solas cuando la persona entra con ese correo.</CardDescription>
        </CardHeader>
        <CardContent>
          {invitaciones.isPending ? (
            <Skeleton className="h-12" />
          ) : invitaciones.error ? (
            <p className="text-sm text-destructive">{mensajeError(invitaciones.error)}</p>
          ) : invitaciones.data.length === 0 ? (
            <EstadoVacio
              icono={Users}
              titulo="Sin invitaciones pendientes"
              descripcion="Invita a tu equipo: vendedores, producción, proveedores o tu contador."
              accion="Invitar a alguien"
              onAccion={() => setInvitando(true)}
              accionDeshabilitada={!habilitado}
            />
          ) : (
            <ul className="divide-y">
              {invitaciones.data.map((inv) => (
                <FilaInvitacion key={inv.id} inv={inv} habilitado={habilitado} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <DialogoInvitar abierto={invitando} onCerrar={() => setInvitando(false)} />
      <DialogoRol key={editando?.id ?? 'ninguno'} miembro={editando} onCerrar={() => setEditando(null)} />
    </div>
  )
}
