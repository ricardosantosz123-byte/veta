import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, CreditCard, MessageCircle, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { useEmpresaActiva, usePuede, usePuedeEditar } from '@/app/empresa-activa'
import { CampoMonto } from '@/components/campo-monto'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cancelarLinkPago, crearLinkPago, leerConexionMp, leerLinksPago, type LinkPago } from '@/features/pedidos/api'
import { mensajeError } from '@/lib/errores'
import { fecha, moneda } from '@/lib/formato'
import { enlaceWhatsApp } from '@/lib/whatsapp'

interface PedidoLink {
  id: string
  folio: number | null
  estado: string | null
  saldo: number | string | null
  anticipo_faltante: number | string | null
  cliente_nombre: string | null
  cliente_telefono: string | null
}

const CONCEPTO: Record<string, string> = { anticipo: 'el anticipo', saldo: 'el saldo', otro: 'un pago' }
const ESTADO: Record<string, string> = { activo: 'Activo', pagado: 'Pagado', expirado: 'Expirado', cancelado: 'Cancelado' }

function DialogoGenerar({ pedido, onCerrar, onCreado }: { pedido: PedidoLink; onCerrar: () => void; onCreado: () => Promise<unknown> }) {
  const saldo = Number(pedido.saldo)
  const anticipo = Number(pedido.anticipo_faltante)
  const conAnticipo = pedido.estado === 'anticipo_pendiente' && anticipo > 0 && anticipo < saldo
  const [opcion, setOpcion] = useState<'anticipo' | 'saldo' | 'otro'>(conAnticipo ? 'anticipo' : 'saldo')
  const [otro, setOtro] = useState<number | null>(null)
  const monto = opcion === 'anticipo' ? anticipo : opcion === 'saldo' ? saldo : otro

  const generar = useMutation({
    mutationFn: () => {
      if (!monto || monto <= 0) throw new Error('Escribe el monto.')
      if (monto > saldo) throw new Error(`El monto no puede ser mayor que el saldo (${moneda(saldo)}).`)
      return crearLinkPago(pedido.id, monto)
    },
    onSuccess: async (r) => {
      await onCreado()
      try {
        await navigator.clipboard?.writeText(r.url)
        toast.success('Link de pago creado y copiado')
      } catch {
        toast.success('Link de pago creado')
      }
      onCerrar()
    },
  })

  return (
    <Dialog open onOpenChange={(o) => !o && !generar.isPending && onCerrar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link de pago · P-{pedido.folio}</DialogTitle>
          <DialogDescription>El cliente paga con tarjeta, OXXO o saldo de Mercado Pago. El pago se registra solo en el pedido.</DialogDescription>
        </DialogHeader>
        <RadioGroup value={opcion} onValueChange={(v) => setOpcion(v as typeof opcion)} className="grid gap-2" aria-label="Monto del link">
          {conAnticipo && (
            <Label htmlFor="lp-anticipo" className="flex min-h-11 items-center gap-3 rounded-xl border p-3 font-normal">
              <RadioGroupItem id="lp-anticipo" value="anticipo" />
              <span className="flex-1">Anticipo que falta</span>
              <span className="font-medium tabular">{moneda(anticipo)}</span>
            </Label>
          )}
          <Label htmlFor="lp-saldo" className="flex min-h-11 items-center gap-3 rounded-xl border p-3 font-normal">
            <RadioGroupItem id="lp-saldo" value="saldo" />
            <span className="flex-1">Saldo completo</span>
            <span className="font-medium tabular">{moneda(saldo)}</span>
          </Label>
          <Label htmlFor="lp-otro" className="flex min-h-11 items-center gap-3 rounded-xl border p-3 font-normal">
            <RadioGroupItem id="lp-otro" value="otro" />
            <span className="flex-1">Otro monto</span>
          </Label>
        </RadioGroup>
        {opcion === 'otro' && <CampoMonto valor={otro} onConfirmar={setOtro} aria-label="Otro monto" autoFocus placeholder="$0.00" />}
        {generar.isError && (
          <p role="alert" className="text-sm text-destructive">
            {mensajeError(generar.error)}
          </p>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onCerrar} disabled={generar.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => generar.mutate()} disabled={generar.isPending}>
            {generar.isPending ? 'Creando en Mercado Pago…' : `Generar link${monto ? ` de ${moneda(monto)}` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Tarjeta "Link de pago" de la ficha del pedido (Fase 8). */
export function LinkPagoPedido({ pedido }: { pedido: PedidoLink }) {
  const { empresa } = useEmpresaActiva()
  const queryClient = useQueryClient()
  const generarPermitido = usePuedeEditar('registrar_cobro')
  const verCobros = usePuede('ver_pedidos')
  const esAdmin = usePuede('configurar_empresa')
  const conexion = useQuery({ queryKey: ['mercado-pago', empresa!.id], queryFn: () => leerConexionMp(empresa!.id) })
  const links = useQuery({ queryKey: ['pedidos', empresa!.id, pedido.id, 'links'], queryFn: () => leerLinksPago(pedido.id) })
  const [generando, setGenerando] = useState(false)

  const refrescar = () => queryClient.invalidateQueries({ queryKey: ['pedidos', empresa!.id] })
  const cancelar = useMutation({
    mutationFn: (l: LinkPago) => cancelarLinkPago(l.id),
    onSuccess: async () => {
      await refrescar()
      toast.success('Link cancelado')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })

  if (!verCobros || conexion.isPending || links.isPending) return null
  const saldo = Number(pedido.saldo)
  const abierto = !!pedido.estado && !['cancelado', 'entregado'].includes(pedido.estado)
  const activo = links.data?.find((l) => l.estado === 'activo')
  const anteriores = (links.data ?? []).filter((l) => l.estado !== 'activo').slice(0, 3)
  const conectado = !!conexion.data?.mp_conectado
  if (!conectado && !links.data?.length) {
    if (!esAdmin || !abierto || saldo <= 0) return null
    return (
      <Card>
        <CardHeader>
          <CardTitle>Link de pago</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Cobra el anticipo o el saldo con tarjeta.{' '}
          <Link to="/ajustes?seccion=cobros" className="font-medium text-foreground underline underline-offset-4">
            Conecta Mercado Pago
          </Link>
          .
        </CardContent>
      </Card>
    )
  }

  const mensaje = (l: LinkPago) =>
    `Hola ${pedido.cliente_nombre ?? ''}, este es tu link para pagar ${CONCEPTO[l.concepto] ?? 'tu pedido'} (${moneda(l.monto)}) del pedido P-${pedido.folio} con ${empresa!.nombre}: ${l.url}`

  return (
    <Card>
      <CardHeader>
        <CardTitle>Link de pago</CardTitle>
        {conectado && generarPermitido && abierto && saldo > 0 && (
          <CardAction>
            <Button variant="outline" size="sm" onClick={() => setGenerando(true)}>
              <CreditCard aria-hidden /> {activo ? 'Nuevo' : 'Generar'}
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {activo ? (
          <div className="grid gap-2 rounded-xl border p-3">
            <p className="flex items-center justify-between gap-2">
              <span>
                <span className="font-medium tabular">{moneda(activo.monto)}</span> · {CONCEPTO[activo.concepto] ?? 'pago'}
              </span>
              <Badge variant="secondary">Activo</Badge>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(activo.url)
                    toast.success('Link copiado')
                  } catch {
                    toast.error('No se pudo copiar. Mantén presionado el enlace para copiarlo.')
                  }
                }}
              >
                <Copy aria-hidden /> Copiar
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={enlaceWhatsApp(mensaje(activo), pedido.cliente_telefono)} target="_blank" rel="noreferrer">
                  <MessageCircle aria-hidden /> WhatsApp
                </a>
              </Button>
              {generarPermitido && (
                <Button size="sm" variant="ghost" onClick={() => cancelar.mutate(activo)} disabled={cancelar.isPending}>
                  <XCircle aria-hidden /> Cancelar
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Si registras un pago manual, este link se desactiva solo.</p>
          </div>
        ) : (
          <p className="text-muted-foreground">{saldo > 0 && abierto ? 'Sin link activo.' : 'No hay saldo por cobrar.'}</p>
        )}
        {anteriores.length > 0 && (
          <ul className="divide-y text-xs text-muted-foreground">
            {anteriores.map((l) => (
              <li key={l.id} className="flex justify-between py-1.5">
                <span>
                  {fecha(l.created_at)} · {ESTADO[l.estado] ?? l.estado}
                </span>
                <span className="tabular">{moneda(l.monto)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      {generando && <DialogoGenerar pedido={pedido} onCerrar={() => setGenerando(false)} onCreado={refrescar} />}
    </Card>
  )
}
