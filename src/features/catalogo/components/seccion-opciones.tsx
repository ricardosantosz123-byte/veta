import { useMutation } from '@tanstack/react-query'
import { ListPlus, MoreHorizontal, Plus, SlidersHorizontal } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useEmpresaActiva, usePuedeEditar } from '@/app/empresa-activa'
import { CampoMonto } from '@/components/campo-monto'
import { EstadoVacio } from '@/components/estado-vacio'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  actualizarGrupo,
  actualizarOpcion,
  borrarGrupo,
  borrarOpcion,
  crearGrupo,
  crearOpciones,
  reordenar,
  type Grupo,
  type Opcion,
} from '@/features/catalogo/api'
import { DialogoNombre } from '@/features/catalogo/components/editar-nombre'
import { ListaOrdenable } from '@/features/catalogo/components/lista-ordenable'
import { useGrupos, useRefrescarCatalogo } from '@/features/catalogo/hooks'
import { mensajeError } from '@/lib/errores'
import { moneda } from '@/lib/formato'

/** "Encino, Nogal\nParota" → ["Encino", "Nogal", "Parota"] sin repetidos ni vacíos. */
function separarNombres(texto: string) {
  return [...new Set(texto.split(/[\n,]/).map((t) => t.trim()).filter(Boolean))]
}

function DialogoOpciones({ grupo, onCerrar }: { grupo: Grupo | null; onCerrar: () => void }) {
  const { empresa } = useEmpresaActiva()
  const refrescar = useRefrescarCatalogo()
  const [texto, setTexto] = useState('')
  const [error, setError] = useState<string | null>(null)
  const agregar = useMutation({
    mutationFn: async () => {
      const existentes = new Set(grupo!.opciones.map((o) => o.nombre.toLowerCase()))
      const nuevas = separarNombres(texto).filter((n) => !existentes.has(n.toLowerCase()))
      if (nuevas.length === 0) throw new Error('Escribe al menos una opción nueva.')
      await crearOpciones(empresa!.id, grupo!.id, nuevas, grupo!.opciones.length + 1)
      return nuevas.length
    },
    onSuccess: async (n) => {
      await refrescar()
      toast.success(n === 1 ? 'Opción agregada' : `${n} opciones agregadas`)
      onCerrar()
    },
    onError: (e) => setError(mensajeError(e)),
  })

  return (
    <Dialog open={!!grupo} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="sm:max-w-md">
        <form
          noValidate
          className="grid gap-4"
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            agregar.mutate()
          }}
        >
          <DialogHeader>
            <DialogTitle>Agregar opciones a {grupo?.nombre}</DialogTitle>
            <DialogDescription>Una por línea o separadas por comas.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="nuevas-opciones">Opciones</Label>
            <Textarea
              id="nuevas-opciones"
              autoFocus
              rows={5}
              placeholder={'Encino\nNogal\nParota'}
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value)
                setError(null)
              }}
              aria-invalid={!!error}
            />
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={agregar.isPending}>
              {agregar.isPending ? 'Agregando…' : 'Agregar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FilaOpcion({ o, editar, conAjuste, alRenombrar, alBorrar }: { o: Opcion; editar: boolean; conAjuste: boolean; alRenombrar: () => void; alBorrar: () => void }) {
  const refrescar = useRefrescarCatalogo()
  const guardar = useMutation({
    mutationFn: (c: Parameters<typeof actualizarOpcion>[1]) => actualizarOpcion(o.id, c),
    onSuccess: refrescar,
    onError: (e) => {
      toast.error(mensajeError(e))
      void refrescar()
    },
  })

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={o.activo ? 'min-w-24 flex-1 truncate' : 'min-w-24 flex-1 truncate text-muted-foreground line-through'}>{o.nombre}</span>
      {!o.activo && <Badge variant="outline">Inactiva</Badge>}
      {conAjuste &&
        (editar ? (
          <CampoMonto
            valor={Number(o.ajuste_precio)}
            permitirNegativo
            onConfirmar={(v) => guardar.mutate({ ajuste_precio: v ?? 0 })}
            className="h-8 w-28"
            aria-label={`Ajuste de precio de ${o.nombre}`}
          />
        ) : (
          <span className="w-28 text-right text-sm tabular">{Number(o.ajuste_precio) > 0 ? '+' : ''}{moneda(o.ajuste_precio)}</span>
        ))}
      {editar && (
        <>
          <Switch checked={o.activo} onCheckedChange={(v) => guardar.mutate({ activo: v })} aria-label={`${o.activo ? 'Desactivar' : 'Activar'} ${o.nombre}`} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={`Acciones para ${o.nombre}`}>
                <MoreHorizontal aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={alRenombrar}>Renombrar</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={alBorrar}>
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </div>
  )
}

function TarjetaGrupo({ g, editar, conAjuste, alAgregar, alRenombrar, alBorrar, alRenombrarOpcion, alBorrarOpcion }: {
  g: Grupo
  editar: boolean
  conAjuste: boolean
  alAgregar: () => void
  alRenombrar: () => void
  alBorrar: () => void
  alRenombrarOpcion: (o: Opcion) => void
  alBorrarOpcion: (o: Opcion) => void
}) {
  const refrescar = useRefrescarCatalogo()
  const obligatorio = useMutation({
    mutationFn: (v: boolean) => actualizarGrupo(g.id, { obligatorio: v }),
    onSuccess: refrescar,
    onError: (e) => toast.error(mensajeError(e)),
  })
  const reordenarOp = useMutation({
    mutationFn: (ids: string[]) => reordenar('opciones', ids),
    onSettled: refrescar,
    onError: (e) => toast.error(mensajeError(e)),
  })

  return (
    <div className="grid gap-2 py-1">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-medium">{g.nombre}</span>
        <span className="text-sm text-muted-foreground tabular">{g.opciones.length} opciones</span>
        <span className="flex-1" />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={g.obligatorio} disabled={!editar} onCheckedChange={(v) => obligatorio.mutate(v)} />
          Obligatorio
        </label>
        {editar && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={`Acciones para el grupo ${g.nombre}`}>
                <MoreHorizontal aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={alAgregar}>Agregar opciones</DropdownMenuItem>
              <DropdownMenuItem onSelect={alRenombrar}>Renombrar grupo</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={alBorrar}>
                Eliminar grupo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div className="rounded-xl border px-3">
        {g.opciones.length === 0 ? (
          <div className="flex items-center justify-between gap-2 py-3 text-sm text-muted-foreground">
            Sin opciones todavía.
            {editar && (
              <Button variant="outline" size="sm" onClick={alAgregar}>
                <ListPlus aria-hidden /> Agregar opciones
              </Button>
            )}
          </div>
        ) : (
          <ListaOrdenable
            items={g.opciones}
            nombre={(o) => o.nombre}
            deshabilitado={!editar}
            onReordenar={(ids) => reordenarOp.mutateAsync(ids)}
            render={(o) => (
              <FilaOpcion o={o} editar={editar} conAjuste={conAjuste} alRenombrar={() => alRenombrarOpcion(o)} alBorrar={() => alBorrarOpcion(o)} />
            )}
          />
        )}
      </div>
    </div>
  )
}

type Dialogo = { tipo: 'nuevo-grupo' } | { tipo: 'renombrar-grupo'; grupo: Grupo } | { tipo: 'renombrar-opcion'; opcion: Opcion } | null
type Borrado = { tipo: 'grupo'; grupo: Grupo } | { tipo: 'opcion'; opcion: Opcion } | null

export function SeccionOpciones() {
  const { empresa } = useEmpresaActiva()
  const editar = usePuedeEditar('editar_catalogo')
  const conAjuste = empresa?.metodo_precio === 'base_ajustes'
  const refrescar = useRefrescarCatalogo()
  const grupos = useGrupos()
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const [agregarA, setAgregarA] = useState<Grupo | null>(null)
  const [borrando, setBorrando] = useState<Borrado>(null)

  const reordenarGr = useMutation({
    mutationFn: (ids: string[]) => reordenar('grupos_opcion', ids),
    onSettled: refrescar,
    onError: (e) => toast.error(mensajeError(e)),
  })
  const borrar = useMutation({
    mutationFn: async (b: NonNullable<Borrado>) => (b.tipo === 'grupo' ? borrarGrupo(b.grupo.id) : borrarOpcion(b.opcion.id)),
    onSuccess: async (_, b) => {
      await refrescar()
      toast.success(b.tipo === 'grupo' ? 'Grupo eliminado' : 'Opción eliminada')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grupos de opciones</CardTitle>
        <CardDescription>
          Lo que el cliente elige de cada mueble: Madera, Recubrimiento, Medida…
          {conAjuste ? ' El ajuste se suma (o resta) al precio base del modelo.' : ' Los costos de cada opción se capturan en el costeo del modelo.'}
        </CardDescription>
        {editar && (
          <CardAction>
            <Button variant="outline" size="sm" onClick={() => setDialogo({ tipo: 'nuevo-grupo' })}>
              <Plus aria-hidden /> Nuevo grupo
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {grupos.isPending ? (
          <Skeleton className="h-48" />
        ) : grupos.data?.length === 0 ? (
          <EstadoVacio
            icono={SlidersHorizontal}
            titulo="Aún no hay grupos de opciones"
            descripcion="Crea grupos como Madera o Recubrimiento y sus opciones para configurar tus modelos."
            accion={editar ? 'Crea tu primer grupo' : undefined}
            onAccion={() => setDialogo({ tipo: 'nuevo-grupo' })}
          />
        ) : (
          <ListaOrdenable
            items={grupos.data ?? []}
            nombre={(g) => `el grupo ${g.nombre}`}
            deshabilitado={!editar}
            onReordenar={(ids) => reordenarGr.mutateAsync(ids)}
            className="divide-y-0 [&>li]:items-start"
            render={(g) => (
              <TarjetaGrupo
                g={g}
                editar={editar}
                conAjuste={conAjuste}
                alAgregar={() => setAgregarA(g)}
                alRenombrar={() => setDialogo({ tipo: 'renombrar-grupo', grupo: g })}
                alBorrar={() => setBorrando({ tipo: 'grupo', grupo: g })}
                alRenombrarOpcion={(o) => setDialogo({ tipo: 'renombrar-opcion', opcion: o })}
                alBorrarOpcion={(o) => setBorrando({ tipo: 'opcion', opcion: o })}
              />
            )}
          />
        )}
      </CardContent>

      {dialogo && (
        <DialogoNombre
          abierto
          titulo={dialogo.tipo === 'nuevo-grupo' ? 'Nuevo grupo de opciones' : 'Renombrar'}
          descripcion={dialogo.tipo === 'nuevo-grupo' ? 'Por ejemplo: Madera, Recubrimiento, Tela/Color, Medida.' : undefined}
          etiqueta="Nombre"
          valorInicial={dialogo.tipo === 'renombrar-grupo' ? dialogo.grupo.nombre : dialogo.tipo === 'renombrar-opcion' ? dialogo.opcion.nombre : ''}
          textoBoton={dialogo.tipo === 'nuevo-grupo' ? 'Crear' : 'Guardar'}
          onCerrar={() => setDialogo(null)}
          onGuardar={async (nombre) => {
            if (dialogo.tipo === 'nuevo-grupo') {
              await crearGrupo(empresa!.id, nombre, true, (grupos.data?.length ?? 0) + 1)
              toast.success('Grupo creado. Ahora agrégale opciones.')
            }
            if (dialogo.tipo === 'renombrar-grupo') await actualizarGrupo(dialogo.grupo.id, { nombre })
            if (dialogo.tipo === 'renombrar-opcion') await actualizarOpcion(dialogo.opcion.id, { nombre })
            await refrescar()
          }}
        />
      )}
      <DialogoOpciones key={agregarA?.id ?? 'ninguno'} grupo={agregarA} onCerrar={() => setAgregarA(null)} />

      <AlertDialog open={!!borrando} onOpenChange={(o) => !o && setBorrando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {borrando?.tipo === 'grupo' ? `¿Eliminar el grupo ${borrando.grupo.nombre}?` : `¿Eliminar la opción ${borrando?.opcion.nombre}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {borrando?.tipo === 'grupo'
                ? 'Se eliminan también sus opciones y los costos capturados para ellas en todos los modelos. Si solo quieres dejar de ofrecer una opción, mejor desactívala.'
                : 'Se eliminan también sus costos en todos los modelos. Si solo quieres dejar de ofrecerla, mejor desactívala.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => borrando && borrar.mutate(borrando)}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
