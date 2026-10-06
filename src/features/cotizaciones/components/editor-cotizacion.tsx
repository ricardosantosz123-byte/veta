import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Copy,
  Download,
  FileCheck2,
  MoreHorizontal,
  Pencil,
  Plus,
  Send,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { useEmpresaActiva, usePuede, usePuedeEditar } from '@/app/empresa-activa'
import { CampoMonto } from '@/components/campo-monto'
import { InsigniaEstado } from '@/components/insignia-estado'
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
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useListas } from '@/features/catalogo/hooks'
import { nombreCompleto } from '@/features/clientes/api'
import { BuscadorCliente } from '@/features/clientes/components/buscador-cliente'
import {
  actualizarCotizacion,
  borrarCotizacion,
  borrarRenglon,
  duplicarCotizacion,
  leerCotizacion,
  leerRenglones,
  recalcularPrecios,
  type CotizacionEditable,
  type Renglon,
} from '@/features/cotizaciones/api'
import { DialogoConvertir } from '@/features/cotizaciones/components/dialogo-convertir'
import { DialogoEnviar } from '@/features/cotizaciones/components/dialogo-enviar'
import { DialogoRenglon } from '@/features/cotizaciones/components/dialogo-renglon'
import { descargar, nombreArchivo, prepararPdfCotizacion } from '@/features/cotizaciones/pdf/preparar'
import { mensajeError } from '@/lib/errores'
import { fecha, moneda, porcentaje } from '@/lib/formato'
import { cn } from '@/lib/utils'

const esMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

function FilaRenglon({ r, editable, verSugerido, onEditar, onBorrar }: { r: Renglon; editable: boolean; verSugerido: boolean; onEditar: () => void; onBorrar: () => void }) {
  const sugerido = r.precio_sugerido === null ? null : Number(r.precio_sugerido)
  const precio = Number(r.precio_unitario ?? 0)
  const diferencia = sugerido ? (precio - sugerido) / sugerido : null

  return (
    <li className={cn('grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-1 py-3 sm:grid-cols-[1fr_4rem_8rem_8rem_auto]', r.vendido && 'opacity-70')}>
      <div className="min-w-0">
        <p className="font-medium">{r.descripcion}</p>
        {r.opciones_texto && <p className="text-sm text-muted-foreground">{r.opciones_texto}</p>}
        <div className="mt-1 flex flex-wrap gap-1.5">
          {r.vendido && <Badge variant="secondary">Vendido</Badge>}
          {r.precio_manual && (
            <Badge variant="outline" className="border-amber-300 text-amber-800 dark:border-amber-800 dark:text-amber-300">
              Precio a mano
            </Badge>
          )}
          {verSugerido && r.precio_manual && sugerido !== null && (
            <span className="text-xs text-muted-foreground tabular">
              Sugerido {moneda(sugerido)}
              {diferencia !== null && Math.abs(diferencia) >= 0.0005 && ` · ${diferencia > 0 ? '+' : '−'}${porcentaje(Math.abs(diferencia))}`}
            </span>
          )}
        </div>
      </div>
      <span className="text-right text-sm text-muted-foreground tabular sm:pt-0.5">× {r.cantidad}</span>
      <span className="hidden text-right tabular sm:block sm:pt-0.5">{moneda(r.precio_unitario)}</span>
      <span className="col-start-2 text-right font-medium tabular sm:col-start-auto sm:pt-0.5">{moneda(r.importe)}</span>
      <div className="col-start-2 row-start-1 flex justify-end sm:col-start-auto sm:row-start-auto">
        {editable && !r.vendido ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={`Acciones para ${r.descripcion}`}>
                <MoreHorizontal aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onEditar}>
                <Pencil aria-hidden /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={onBorrar}>
                <Trash2 aria-hidden /> Quitar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span className="size-9" aria-hidden />
        )}
      </div>
    </li>
  )
}

export function EditorCotizacion() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { empresa } = useEmpresaActiva()
  const queryClient = useQueryClient()
  const puedeEditar = usePuedeEditar('editar_cotizaciones')
  const puedeVender = usePuedeEditar('convertir_pedido')
  const verSugerido = usePuede('ver_margen')
  const esAdmin = usePuede('configurar_empresa')
  const listas = useListas()

  const cot = useQuery({ queryKey: ['cotizaciones', empresa!.id, id], queryFn: () => leerCotizacion(id) })
  const renglones = useQuery({ queryKey: ['cotizaciones', empresa!.id, id, 'renglones'], queryFn: () => leerRenglones(id) })

  const [renglonDialogo, setRenglonDialogo] = useState<Renglon | 'nuevo' | null>(null)
  const [listaPendiente, setListaPendiente] = useState<string | null>(null)
  const [quitando, setQuitando] = useState<Renglon | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [convirtiendo, setConvirtiendo] = useState(false)
  const [borrando, setBorrando] = useState(false)
  const [guardadoEn, setGuardadoEn] = useState<Date | null>(null)

  const refrescar = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['cotizaciones', empresa!.id] }),
      queryClient.invalidateQueries({ queryKey: ['clientes', empresa!.id] }),
    ])
    setGuardadoEn(new Date())
  }, [queryClient, empresa])

  const cambiar = useMutation({
    mutationFn: (c: CotizacionEditable) => actualizarCotizacion(id, c),
    onSuccess: refrescar,
    onError: (e) => {
      toast.error(mensajeError(e))
      void refrescar()
    },
  })
  const cambiarLista = useMutation({
    mutationFn: async (listaId: string) => {
      await actualizarCotizacion(id, { lista_id: listaId })
      await recalcularPrecios(id)
    },
    onSuccess: async () => {
      await refrescar()
      toast.success('Precios recalculados con la lista nueva')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
  const quitar = useMutation({
    mutationFn: (r: Renglon) => borrarRenglon(r.id),
    onSuccess: refrescar,
    onError: (e) => toast.error(mensajeError(e)),
  })
  const pdf = useMutation({
    mutationFn: async () => {
      const blob = await prepararPdfCotizacion(cot.data!, renglones.data ?? [])
      descargar(blob, nombreArchivo(cot.data!.folio!, cot.data!.cliente ? nombreCompleto(cot.data!.cliente) : ''))
    },
    onError: (e) => toast.error(`No se pudo generar el PDF: ${mensajeError(e)}`),
  })
  const duplicar = useMutation({
    mutationFn: () => duplicarCotizacion(id),
    onSuccess: async (nueva) => {
      await refrescar()
      toast.success('Cotización duplicada')
      navigate(`/cotizaciones/${nueva}`)
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
  const borrar = useMutation({
    mutationFn: () => borrarCotizacion(id),
    onSuccess: async () => {
      await refrescar()
      toast.success('Borrador eliminado')
      navigate('/cotizaciones', { replace: true })
    },
    onError: (e) => toast.error(mensajeError(e)),
  })

  const c = cot.data
  const editable = puedeEditar && !!c && c.estado !== 'cancelada'
  const lista = renglones.data ?? []
  const pendientes = lista.filter((r) => !r.vendido).length

  // Atajos: Alt+N agrega renglón; ⌘/Ctrl+S confirma el campo activo (todo se guarda solo).
  useEffect(() => {
    function alTeclear(e: KeyboardEvent) {
      if (e.altKey && e.code === 'KeyN' && editable) {
        e.preventDefault()
        setRenglonDialogo('nuevo')
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        ;(document.activeElement as HTMLElement | null)?.blur?.()
        toast.success('Todo está guardado')
      }
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [editable])

  if (cot.isPending) {
    return (
      <div className="mx-auto grid w-full max-w-5xl gap-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }
  if (cot.error || !c) {
    return (
      <div className="mx-auto w-full max-w-5xl text-sm text-muted-foreground">
        {cot.error ? mensajeError(cot.error) : 'Esta cotización no existe.'}{' '}
        <Link to="/cotizaciones" className="underline">
          Volver
        </Link>
      </div>
    )
  }

  const listasActivas = listas.data?.filter((l) => l.activo || l.id === c.lista_id) ?? []

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" asChild aria-label="Volver a cotizaciones">
          <Link to="/cotizaciones">
            <ArrowLeft aria-hidden />
          </Link>
        </Button>
        <div className="min-w-0 flex-1 basis-56">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight tabular">Cotización C-{c.folio}</h1>
            {c.estado_efectivo && <InsigniaEstado tipo="cotizacion" estado={c.estado_efectivo} />}
          </div>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {guardadoEn ? 'Guardado' : 'Se guarda automáticamente'}
          </p>
        </div>
        <Button variant="outline" onClick={() => pdf.mutate()} disabled={pdf.isPending || lista.length === 0}>
          <Download aria-hidden /> {pdf.isPending ? 'Generando…' : 'PDF'}
        </Button>
        {puedeEditar && (
          <Button variant="outline" onClick={() => setEnviando(true)} disabled={lista.length === 0 || c.estado === 'cancelada'}>
            <Send aria-hidden /> Enviar
          </Button>
        )}
        {puedeVender && pendientes > 0 && c.estado !== 'cancelada' && (
          <Button onClick={() => setConvirtiendo(true)}>
            <FileCheck2 aria-hidden /> Convertir en pedido
          </Button>
        )}
        {puedeEditar && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Más acciones">
                <MoreHorizontal aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => duplicar.mutate()}>
                <Copy aria-hidden /> Duplicar
              </DropdownMenuItem>
              {['borrador', 'enviada'].includes(c.estado!) && (
                <DropdownMenuItem onSelect={() => cambiar.mutate({ estado: 'cancelada' })}>Cancelar cotización</DropdownMenuItem>
              )}
              {c.estado === 'cancelada' && <DropdownMenuItem onSelect={() => cambiar.mutate({ estado: 'borrador' })}>Reactivar</DropdownMenuItem>}
              {esAdmin && c.estado === 'borrador' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => setBorrando(true)}>
                    <Trash2 aria-hidden /> Eliminar borrador
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Datos generales */}
      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-2 lg:col-span-2">
            <Label htmlFor="cot-cliente">Cliente</Label>
            <BuscadorCliente id="cot-cliente" valor={c.cliente_id} disabled={!editable || c.estado === 'parcial' || c.estado === 'aceptada'} onCambiar={(cliente_id) => cambiar.mutate({ cliente_id })} />
          </div>
          <div className="grid gap-2 lg:col-span-2">
            <Label htmlFor="cot-lista">Lista de precios</Label>
            <Select value={c.lista_id ?? ''} onValueChange={(v) => v !== c.lista_id && setListaPendiente(v)} disabled={!editable}>
              <SelectTrigger id="cot-lista" className="w-full">
                <SelectValue placeholder="Sin lista" />
              </SelectTrigger>
              <SelectContent>
                {listasActivas.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.nombre}
                    {l.incluye_iva && <span className="text-muted-foreground"> · IVA incluido</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cot-fecha">Fecha</Label>
            <Input id="cot-fecha" type="date" defaultValue={c.fecha ?? ''} key={`f-${c.fecha}`} disabled={!editable} onBlur={(e) => e.target.value && e.target.value !== c.fecha && cambiar.mutate({ fecha: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cot-vigencia">Válida hasta</Label>
            <Input id="cot-vigencia" type="date" defaultValue={c.vigencia_hasta ?? ''} key={`v-${c.vigencia_hasta}`} disabled={!editable} onBlur={(e) => e.target.value && e.target.value !== c.vigencia_hasta && cambiar.mutate({ vigencia_hasta: e.target.value })} />
          </div>
          <div className="flex items-end text-sm text-muted-foreground sm:col-span-2">
            {c.estado_efectivo === 'vencida' ? `Venció el ${fecha(c.vigencia_hasta)}. Cambia la vigencia para reactivarla.` : `Vigente hasta el ${fecha(c.vigencia_hasta)}.`}
          </div>
        </CardContent>
      </Card>

      {/* Renglones */}
      <Card>
        <CardHeader>
          <CardTitle>Muebles</CardTitle>
          {editable && (
            <CardAction>
              <Button variant="outline" size="sm" onClick={() => setRenglonDialogo('nuevo')}>
                <Plus aria-hidden /> Agregar
                <kbd className="ml-1 hidden rounded border px-1 text-[10px] text-muted-foreground sm:inline">{esMac ? '⌥N' : 'Alt+N'}</kbd>
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          {renglones.isPending ? (
            <Skeleton className="h-24" />
          ) : lista.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-10 text-center">
              <p className="text-sm text-muted-foreground">Agrega el primer mueble: del catálogo o sobre diseño.</p>
              {editable && (
                <Button onClick={() => setRenglonDialogo('nuevo')}>
                  <Plus aria-hidden /> Agregar mueble
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="hidden grid-cols-[1fr_4rem_8rem_8rem_auto] gap-x-4 border-b pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase sm:grid">
                <span>Descripción</span>
                <span className="text-right">Cant.</span>
                <span className="text-right">Precio</span>
                <span className="text-right">Importe</span>
                <span className="w-9" />
              </div>
              <ul className="divide-y">
                {lista.map((r) => (
                  <FilaRenglon key={r.id} r={r} editable={editable} verSugerido={verSugerido} onEditar={() => setRenglonDialogo(r)} onBorrar={() => setQuitando(r)} />
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pie y totales */}
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Card>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="cot-desc">Descuento (%)</Label>
              <CampoMonto id="cot-desc" valor={Number(c.descuento_pct)} disabled={!editable} onConfirmar={(v) => cambiar.mutate({ descuento_pct: Math.min(100, Math.max(0, v ?? 0)) })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cot-envio">Envío</Label>
              <CampoMonto id="cot-envio" valor={Number(c.envio)} disabled={!editable} onConfirmar={(v) => cambiar.mutate({ envio: v ?? 0 })} />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="cot-notas">Notas para el cliente</Label>
              <Textarea
                id="cot-notas"
                rows={3}
                defaultValue={c.notas ?? ''}
                key={`n-${c.notas}`}
                disabled={!editable}
                placeholder="Tiempo de entrega, colores a confirmar…"
                onBlur={(e) => e.target.value.trim() !== (c.notas ?? '') && cambiar.mutate({ notas: e.target.value.trim() || null })}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular">{moneda(c.subtotal)}</dd>
              </div>
              {Number(c.descuento_pct) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Descuento {porcentaje(Number(c.descuento_pct) / 100)}</dt>
                  <dd className="tabular">−{moneda(c.descuento_monto)}</dd>
                </div>
              )}
              {Number(c.envio) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Envío</dt>
                  <dd className="tabular">{moneda(c.envio)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{c.precios_con_iva ? 'IVA incluido' : 'IVA'}</dt>
                <dd className="tabular">{moneda(c.iva)}</dd>
              </div>
              <div className="mt-2 flex items-baseline justify-between border-t pt-3">
                <dt className="font-medium">Total</dt>
                <dd className="text-2xl font-semibold tracking-tight tabular">{moneda(c.total)}</dd>
              </div>
              {c.precios_con_iva && <p className="text-right text-xs text-muted-foreground">Precios con IVA incluido</p>}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Diálogos */}
      {renglonDialogo && (
        <DialogoRenglon
          key={renglonDialogo === 'nuevo' ? 'nuevo' : renglonDialogo.id}
          abierto
          onCerrar={() => setRenglonDialogo(null)}
          cotizacionId={id}
          listaId={c.lista_id}
          renglon={renglonDialogo === 'nuevo' ? null : renglonDialogo}
          siguienteOrden={lista.length + 1}
          onGuardado={refrescar}
        />
      )}
      {enviando && <DialogoEnviar abierto onCerrar={() => setEnviando(false)} cotizacion={c} renglones={lista} onEnviada={refrescar} />}
      {convirtiendo && <DialogoConvertir abierto onCerrar={() => setConvirtiendo(false)} cotizacion={c} renglones={lista} onConvertida={refrescar} />}

      <AlertDialog open={!!listaPendiente} onOpenChange={(o) => !o && setListaPendiente(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cambiar a la lista {listas.data?.find((l) => l.id === listaPendiente)?.nombre}?</AlertDialogTitle>
            <AlertDialogDescription>Se recalculan los precios automáticos. Los precios a mano y los renglones vendidos no cambian.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => listaPendiente && cambiarLista.mutate(listaPendiente)}>Cambiar y recalcular</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!quitando} onOpenChange={(o) => !o && setQuitando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar {quitando?.descripcion}?</AlertDialogTitle>
            <AlertDialogDescription>Se quita de la cotización y se recalculan los totales.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => quitando && quitar.mutate(quitando)}>
              Quitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={borrando} onOpenChange={setBorrando}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar el borrador C-{c.folio}?</AlertDialogTitle>
            <AlertDialogDescription>Se borra con todos sus renglones. El folio no se vuelve a usar.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => borrar.mutate()}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
