import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Ban,
  Check,
  Factory,
  KeyRound,
  MessageCircle,
  FileText,
  MoreHorizontal,
  PackageCheck,
  Paperclip,
  Plus,
  Receipt,
  Share2,
} from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { useEmpresaActiva, usePuede, usePuedeEditar } from '@/app/empresa-activa'
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  actualizarPedido,
  anularPago,
  cancelarPedido,
  leerPagos,
  leerPedido,
  leerRenglonesPedido,
  marcarEntregado,
  nombreMetodo,
  subirPrivado,
  urlPrivada,
  type Pago,
} from '@/features/pedidos/api'
import { DialogoMotivo } from '@/features/pedidos/components/dialogo-motivo'
import { DialogoPago } from '@/features/pedidos/components/dialogo-pago'
import { DialogoRecibo } from '@/features/pedidos/components/dialogo-recibo'
import { Semaforo } from '@/features/pedidos/components/semaforo'
import { autorizarInicio } from '@/features/produccion/api'
import { DialogoMandarProduccion } from '@/features/produccion/components/dialogo-mandar-produccion'
import { mensajeError } from '@/lib/errores'
import { fecha, fechaHora, moneda, porcentaje } from '@/lib/formato'
import { cn } from '@/lib/utils'
import { enlaceWhatsApp } from '@/lib/whatsapp'

const estadoRenglon = { pendiente: 'Pendiente', en_proceso: 'En proceso', terminado: 'Terminado' } as const

/**
 * Abre la pestaña en el mismo clic y luego le pone la URL firmada: si se abre después de un await,
 * Safari la bloquea como ventana emergente.
 */
async function abrirPrivado(ruta: string) {
  const ventana = window.open('', '_blank')
  try {
    const url = await urlPrivada(ruta)
    if (ventana) {
      ventana.opener = null
      ventana.location.href = url
    } else window.location.href = url
  } catch (e) {
    ventana?.close()
    toast.error(mensajeError(e))
  }
}

function Hito({ hecho, titulo, cuando, ultimo }: { hecho: boolean; titulo: string; cuando: string | null; ultimo?: boolean }) {
  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      {!ultimo && <span className={cn('absolute top-6 left-3 h-[calc(100%-1.25rem)] w-px', hecho ? 'bg-primary' : 'bg-border')} aria-hidden />}
      <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-full border', hecho ? 'border-primary bg-primary text-primary-foreground' : 'bg-background')}>
        {hecho && <Check className="size-3.5" aria-hidden />}
      </span>
      <div className="grid leading-tight">
        <span className={hecho ? 'font-medium' : 'text-muted-foreground'}>{titulo}</span>
        {cuando && <span className="text-sm text-muted-foreground">{cuando}</span>}
      </div>
    </li>
  )
}

export function FichaPedido() {
  const { id = '' } = useParams()
  const { empresa, rol, puedeEscribir } = useEmpresaActiva()
  const queryClient = useQueryClient()
  const cobrar = usePuedeEditar('registrar_cobro')
  const esAdmin = usePuede('anular_pago')
  const programar = usePuedeEditar('gestionar_produccion')
  const editarEntrega = puedeEscribir && (rol === 'admin' || rol === 'vendedor' || rol === 'produccion')

  const pedido = useQuery({ queryKey: ['pedidos', empresa!.id, id], queryFn: () => leerPedido(id) })
  const renglones = useQuery({ queryKey: ['pedidos', empresa!.id, id, 'renglones'], queryFn: () => leerRenglonesPedido(id) })
  const pagos = useQuery({ queryKey: ['pedidos', empresa!.id, id, 'pagos'], queryFn: () => leerPagos(id) })

  const [pagando, setPagando] = useState(false)
  const [recibo, setRecibo] = useState<Pago | null>(null)
  const [anulando, setAnulando] = useState<Pago | null>(null)
  const [cancelando, setCancelando] = useState(false)
  const [entregando, setEntregando] = useState(false)
  const [mandando, setMandando] = useState(false)
  const [autorizando, setAutorizando] = useState(false)
  const factura = useRef<HTMLInputElement>(null)

  const refrescar = useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pedidos', empresa!.id] }),
        queryClient.invalidateQueries({ queryKey: ['clientes', empresa!.id] }),
      ]),
    [queryClient, empresa],
  )

  const cambiar = useMutation({
    mutationFn: (c: Parameters<typeof actualizarPedido>[1]) => actualizarPedido(id, c),
    onSuccess: refrescar,
    onError: (e) => {
      toast.error(mensajeError(e))
      void refrescar()
    },
  })
  const entregar = useMutation({
    mutationFn: () => marcarEntregado(id),
    onSuccess: async () => {
      await refrescar()
      toast.success('Pedido entregado')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
  const autorizar = useMutation({
    mutationFn: () => autorizarInicio(id),
    onSuccess: async () => {
      await refrescar()
      toast.success('Inicio autorizado: los destajistas ya pueden empezar')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
  const subirFactura = useMutation({
    mutationFn: async (f: File) => {
      const ruta = await subirPrivado(empresa!.id, 'pedidos', id, f, f.name)
      await actualizarPedido(id, { factura_path: ruta, facturado: true })
    },
    onSuccess: async () => {
      await refrescar()
      toast.success('Factura adjunta')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })

  if (pedido.isPending) return <Skeleton className="mx-auto h-96 w-full max-w-5xl rounded-xl" />
  if (pedido.error || !pedido.data)
    return (
      <div className="mx-auto w-full max-w-5xl text-sm text-muted-foreground">
        {pedido.error ? mensajeError(pedido.error) : 'Este pedido no existe.'}{' '}
        <Link to="/pedidos" className="underline">
          Volver
        </Link>
      </div>
    )

  const p = pedido.data
  const cancelado = p.estado === 'cancelado'
  const saldo = Number(p.saldo)
  const aFavor = Number(p.saldo_a_favor)
  const cliente = [p.cliente_nombre, p.cliente_apellidos].filter(Boolean).join(' ')
  const enlacePortal = `${window.location.origin}/${empresa!.slug}/p/${p.token_portal}`
  const puedeEntregar = p.estado === 'liquidado'
  const motivoNoEntrega =
    p.estado === 'entregado'
      ? null
      : cancelado
        ? 'El pedido está cancelado.'
        : saldo > 0
          ? `No se puede entregar: falta cobrar ${moneda(saldo)}. Registra el finiquito primero.`
          : p.estado !== 'liquidado'
            ? 'Se entrega cuando la producción está terminada y el pedido liquidado.'
            : null

  async function compartir() {
    const texto = `Hola ${p.cliente_nombre ?? ''}, aquí puedes ver el avance de tu pedido P-${p.folio} con ${empresa!.nombre}: ${enlacePortal}`
    // La copia empieza antes de abrir la pestaña (después la página pierde el foco) y la pestaña
    // se abre en el mismo clic para que no la bloqueen.
    const copia = navigator.clipboard?.writeText(enlacePortal)
    const ventana = window.open('', '_blank')
    try {
      await copia
      toast.success('Enlace de seguimiento copiado')
    } catch {
      // sin portapapeles: igual se abre WhatsApp con el enlace
    }
    const wa = enlaceWhatsApp(texto, p.cliente_telefono)
    if (ventana) {
      ventana.opener = null
      ventana.location.href = wa
    } else window.open(wa, '_blank', 'noopener')
  }

  const mensajeFiniquito = [
    `Hola ${p.cliente_nombre ?? ''}, ¡tu pedido P-${p.folio} de ${empresa!.nombre} está terminado!`,
    `Para coordinar la entrega queda un saldo de ${moneda(saldo)}.`,
    '',
    `Puedes ver el detalle aquí: ${enlacePortal}`,
  ].join('\n')

  const hitos = [
    { hecho: true, titulo: 'Pedido creado', cuando: fechaHora(p.created_at) },
    ...(p.inicio_autorizado_at ? [{ hecho: true, titulo: 'Inicio autorizado sin anticipo', cuando: fechaHora(p.inicio_autorizado_at) }] : []),
    { hecho: !!p.en_produccion_at, titulo: 'Anticipo cubierto · en producción', cuando: p.en_produccion_at ? fechaHora(p.en_produccion_at) : null },
    { hecho: !!p.terminado_at, titulo: 'Producción terminada', cuando: p.terminado_at ? fechaHora(p.terminado_at) : null },
    { hecho: !!p.liquidado_at, titulo: 'Liquidado', cuando: p.liquidado_at ? fechaHora(p.liquidado_at) : null },
    { hecho: !!p.entregado_at, titulo: 'Entregado', cuando: p.entregado_at ? fechaHora(p.entregado_at) : null },
  ]

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" asChild aria-label="Volver a pedidos">
          <Link to="/pedidos">
            <ArrowLeft aria-hidden />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight tabular">Pedido P-{p.folio}</h1>
            {p.estado && <InsigniaEstado tipo="pedido" estado={p.estado} />}
            {p.facturado && <Badge variant="outline">Facturado</Badge>}
          </div>
          <Link to={`/clientes/${p.cliente_id}`} className="text-sm text-muted-foreground underline-offset-4 hover:underline">
            {cliente}
            {p.empresa_cliente && ` · ${p.empresa_cliente}`}
          </Link>
          {!cancelado && !p.cliente_apellidos?.trim() && (
            <p className="text-xs text-muted-foreground">Sin apellidos: el buscador del portal no encontrará este pedido. Comparte el enlace de seguimiento.</p>
          )}
        </div>
        {!cancelado && (
          <Button variant="outline" onClick={compartir}>
            <Share2 aria-hidden /> Compartir seguimiento
          </Button>
        )}
        {programar && (p.estado === 'anticipo_pendiente' || p.estado === 'en_produccion') && (
          <Button variant="outline" onClick={() => setMandando(true)}>
            <Factory aria-hidden /> Mandar a producción
          </Button>
        )}
        {cobrar && !cancelado && saldo > 0 && (
          <Button onClick={() => setPagando(true)}>
            <Plus aria-hidden /> Registrar pago
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Más acciones">
              <MoreHorizontal aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={`/clientes/${p.cliente_id}/estado-de-cuenta`}>Estado de cuenta del cliente</Link>
            </DropdownMenuItem>
            {p.cotizacion_id && (
              <DropdownMenuItem asChild>
                <Link to={`/cotizaciones/${p.cotizacion_id}`}>Ver cotización</Link>
              </DropdownMenuItem>
            )}
            {esAdmin && puedeEscribir && p.estado === 'anticipo_pendiente' && !p.inicio_autorizado_at && (
              <DropdownMenuItem onSelect={() => setAutorizando(true)}>
                <KeyRound aria-hidden /> Autorizar inicio sin anticipo
              </DropdownMenuItem>
            )}
            {esAdmin && puedeEscribir && !cancelado && p.estado !== 'entregado' && (
              <DropdownMenuItem variant="destructive" onSelect={() => setCancelando(true)}>
                <Ban aria-hidden /> Cancelar pedido
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {cancelado && (
        <div role="status" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="font-medium">Pedido cancelado el {fecha(p.cancelado_at)}</p>
          {p.motivo_cancelacion && <p className="text-muted-foreground">Motivo: {p.motivo_cancelacion}</p>}
          <p className="mt-1">
            Cobrado antes de cancelar: <span className="font-medium tabular">{moneda(p.pagado)}</span>
          </p>
        </div>
      )}

      {p.estado === 'terminado' && saldo > 0 && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
          <PackageCheck className="size-5 shrink-0" aria-hidden />
          <p className="flex-1">
            <strong className="font-semibold">Producción terminada.</strong> Avisa al cliente para cobrar el finiquito de <span className="tabular">{moneda(saldo)}</span> y coordinar la entrega.
          </p>
          <Button size="sm" asChild>
            <a href={enlaceWhatsApp(mensajeFiniquito, p.cliente_telefono)} target="_blank" rel="noreferrer">
              <MessageCircle aria-hidden /> Avisar por WhatsApp
            </a>
          </Button>
        </div>
      )}
      {p.estado === 'anticipo_pendiente' && p.inicio_autorizado_at && (
        <p role="status" className="rounded-xl border p-3 text-sm text-muted-foreground">
          <KeyRound className="mr-1 inline size-4" aria-hidden /> Inicio autorizado sin anticipo el {fechaHora(p.inicio_autorizado_at)}: los destajistas ya pueden empezar.
        </p>
      )}

      {/* Resumen de dinero */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { etiqueta: 'Total', valor: moneda(p.total) },
          { etiqueta: 'Pagado', valor: moneda(p.pagado) },
          aFavor > 0
            ? { etiqueta: esAdmin ? 'Saldo a favor del cliente' : 'Saldo', valor: esAdmin ? moneda(aFavor) : 'Liquidado', resaltar: true }
            : { etiqueta: 'Saldo', valor: moneda(saldo), resaltar: saldo > 0 && !cancelado },
          {
            etiqueta: 'Anticipo requerido',
            valor: moneda(p.anticipo_requerido),
            nota: Number(p.anticipo_faltante) > 0 && !cancelado ? `Faltan ${moneda(p.anticipo_faltante)}` : 'Cubierto',
          },
        ].map((d) => (
          <Card key={d.etiqueta} className="gap-1 py-4">
            <CardContent className="px-4">
              <p className="text-sm text-muted-foreground">{d.etiqueta}</p>
              <p className={cn('text-xl font-semibold tracking-tight tabular', 'resaltar' in d && d.resaltar && 'text-amber-700 dark:text-amber-400')}>{d.valor}</p>
              {'nota' in d && d.nota && <p className="text-xs text-muted-foreground">{d.nota}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="grid gap-6">
          {/* Renglones */}
          <Card>
            <CardHeader>
              <CardTitle>Muebles</CardTitle>
            </CardHeader>
            <CardContent>
              {renglones.isPending ? (
                <Skeleton className="h-20" />
              ) : (
                <ul className="divide-y">
                  {renglones.data?.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          {r.cantidad} × {r.descripcion}
                        </p>
                        {r.opciones_texto && <p className="text-sm text-muted-foreground">{r.opciones_texto}</p>}
                      </div>
                      <Badge variant={r.estado_produccion === 'terminado' ? 'secondary' : 'outline'}>{estadoRenglon[r.estado_produccion]}</Badge>
                      <span className="w-28 text-right font-medium tabular">{moneda(r.importe)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <dl className="mt-3 ml-auto grid max-w-xs gap-1 border-t pt-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="tabular">{moneda(p.subtotal)}</dd>
                </div>
                {Number(p.descuento_pct) > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Descuento {porcentaje(Number(p.descuento_pct) / 100)}</dt>
                    <dd className="tabular">−{moneda(p.descuento_monto)}</dd>
                  </div>
                )}
                {Number(p.envio) > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Envío</dt>
                    <dd className="tabular">{moneda(p.envio)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{p.precios_con_iva ? 'IVA incluido' : 'IVA'}</dt>
                  <dd className="tabular">{moneda(p.iva)}</dd>
                </div>
                <div className="flex justify-between font-medium">
                  <dt>Total</dt>
                  <dd className="tabular">{moneda(p.total)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Pagos */}
          <Card>
            <CardHeader>
              <CardTitle>Pagos</CardTitle>
              {cobrar && !cancelado && saldo > 0 && (
                <CardAction>
                  <Button variant="outline" size="sm" onClick={() => setPagando(true)}>
                    <Plus aria-hidden /> Registrar
                  </Button>
                </CardAction>
              )}
            </CardHeader>
            <CardContent>
              {pagos.isPending ? (
                <Skeleton className="h-16" />
              ) : pagos.data?.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aún no hay pagos. El pedido pasa a producción en cuanto se cubre el anticipo.</p>
              ) : (
                <ul className="divide-y">
                  {pagos.data?.map((g) => (
                    <li key={g.id} className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 py-3', g.anulado && 'text-muted-foreground')}>
                      <div className="min-w-0 flex-1">
                        <p className={cn('font-medium', g.anulado && 'line-through')}>
                          R-{g.folio} · {nombreMetodo[g.metodo!]}
                          {g.referencia && <span className="font-normal text-muted-foreground"> · {g.referencia}</span>}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {fecha(g.fecha)}
                          {g.anulado && ` · Anulado: ${g.motivo_anulacion}`}
                        </p>
                      </div>
                      {g.comprobante_path && (
                        <Button variant="ghost" size="sm" onClick={() => abrirPrivado(g.comprobante_path!)}>
                          <Paperclip aria-hidden /> Comprobante
                        </Button>
                      )}
                      <span className={cn('w-28 text-right font-medium tabular', g.anulado && 'line-through')}>{moneda(g.monto)}</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Acciones para el pago R-${g.folio}`}>
                            <MoreHorizontal aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setRecibo(g)}>
                            <Receipt aria-hidden /> Recibo
                          </DropdownMenuItem>
                          {esAdmin && puedeEscribir && !g.anulado && p.estado !== 'entregado' && (
                            <DropdownMenuItem variant="destructive" onSelect={() => setAnulando(g)}>
                              Anular pago
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid content-start gap-6">
          {/* Línea de tiempo */}
          <Card>
            <CardHeader>
              <CardTitle>Avance</CardTitle>
            </CardHeader>
            <CardContent>
              <ol>
                {hitos.map((h, i) => (
                  <Hito key={h.titulo} {...h} ultimo={i === hitos.length - 1} />
                ))}
              </ol>
              {p.estado !== 'entregado' && !cancelado && (
                <div className="mt-5 grid gap-2">
                  <Button variant={puedeEntregar ? 'default' : 'outline'} disabled={!puedeEntregar || !editarEntrega} onClick={() => setEntregando(true)} aria-describedby="nota-entrega">
                    <PackageCheck aria-hidden /> Marcar entregado
                  </Button>
                  {motivoNoEntrega && (
                    <p id="nota-entrega" className="text-sm text-muted-foreground">
                      {motivoNoEntrega}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Entrega y factura */}
          <Card>
            <CardHeader>
              <CardTitle>Entrega</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="ped-compromiso">Fecha compromiso</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="ped-compromiso"
                    type="date"
                    key={`fc-${p.fecha_compromiso}`}
                    defaultValue={p.fecha_compromiso ?? ''}
                    disabled={!editarEntrega || cancelado}
                    onBlur={(e) => (e.target.value || null) !== p.fecha_compromiso && cambiar.mutate({ fecha_compromiso: e.target.value || null })}
                  />
                  <Semaforo semaforo={p.semaforo} dias={p.dias_para_compromiso} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ped-direccion">Dirección de entrega</Label>
                <Textarea
                  id="ped-direccion"
                  rows={2}
                  key={`dir-${p.direccion_entrega}`}
                  defaultValue={p.direccion_entrega ?? ''}
                  disabled={!editarEntrega}
                  onBlur={(e) => e.target.value.trim() !== (p.direccion_entrega ?? '') && cambiar.mutate({ direccion_entrega: e.target.value.trim() || null })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ped-notas">Notas internas</Label>
                <Textarea
                  id="ped-notas"
                  rows={3}
                  key={`not-${p.notas}`}
                  defaultValue={p.notas ?? ''}
                  disabled={!editarEntrega}
                  onBlur={(e) => e.target.value.trim() !== (p.notas ?? '') && cambiar.mutate({ notas: e.target.value.trim() || null })}
                />
              </div>
              <div className="grid gap-2 border-t pt-4">
                <label className="flex items-center justify-between gap-2 text-sm font-medium">
                  Facturado
                  <Switch checked={!!p.facturado} disabled={!editarEntrega} onCheckedChange={(v) => cambiar.mutate({ facturado: v })} />
                </label>
                {p.factura_path ? (
                  <Button variant="outline" size="sm" onClick={() => abrirPrivado(p.factura_path!)}>
                    <FileText aria-hidden /> Ver CFDI
                  </Button>
                ) : null}
                {editarEntrega && (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => factura.current?.click()} disabled={subirFactura.isPending}>
                      <Paperclip aria-hidden /> {subirFactura.isPending ? 'Subiendo…' : p.factura_path ? 'Reemplazar CFDI' : 'Adjuntar CFDI (PDF)'}
                    </Button>
                    <input
                      ref={factura}
                      type="file"
                      accept="application/pdf,image/png,image/jpeg"
                      className="sr-only"
                      tabIndex={-1}
                      aria-hidden
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        e.target.value = ''
                        if (!f) return
                        if (f.size > 10 * 1024 * 1024) return toast.error('El archivo pesa más de 10 MB.')
                        subirFactura.mutate(f)
                      }}
                    />
                  </>
                )}
                <p className="text-xs text-muted-foreground">El CFDI se timbra fuera de Veta; aquí solo se adjunta.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {mandando && <DialogoMandarProduccion abierto pedido={{ id: p.id!, folio: p.folio, fecha_compromiso: p.fecha_compromiso }} onCerrar={() => setMandando(false)} />}
      <AlertDialog open={autorizando} onOpenChange={setAutorizando}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Autorizar el inicio de P-{p.folio} sin anticipo?</AlertDialogTitle>
            <AlertDialogDescription>
              Los destajistas podrán empezar sus órdenes aunque falten {moneda(p.anticipo_faltante)} del anticipo. Queda registrado quién lo autorizó y cuándo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={() => autorizar.mutate()}>Autorizar inicio</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {pagando && <DialogoPago abierto pedido={p} onCerrar={() => setPagando(false)} onRegistrado={refrescar} />}
      {recibo && <DialogoRecibo abierto pedido={p} pago={recibo} onCerrar={() => setRecibo(null)} />}
      {anulando && (
        <DialogoMotivo
          abierto
          onCerrar={() => setAnulando(null)}
          titulo={`¿Anular el pago R-${anulando.folio}?`}
          descripcion={`${moneda(anulando.monto)} dejará de contar como pagado. El registro se conserva tachado.`}
          textoBoton="Anular pago"
          onConfirmar={async (motivo) => {
            await anularPago(anulando.id!, motivo)
            await refrescar()
            toast.success('Pago anulado')
          }}
        />
      )}
      {cancelando && (
        <DialogoMotivo
          abierto
          onCerrar={() => setCancelando(false)}
          titulo={`¿Cancelar el pedido P-${p.folio}?`}
          descripcion="Las órdenes de producción pendientes se cancelan; las que están en proceso o terminadas se quedan. Los pagos se conservan."
          textoBoton="Cancelar pedido"
          onConfirmar={async (motivo) => {
            await cancelarPedido(id, motivo)
            await refrescar()
            toast.success('Pedido cancelado')
          }}
        />
      )}
      <AlertDialog open={entregando} onOpenChange={setEntregando}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Marcar P-{p.folio} como entregado?</AlertDialogTitle>
            <AlertDialogDescription>Ya no se podrán anular sus pagos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={() => entregar.mutate()}>Marcar entregado</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
