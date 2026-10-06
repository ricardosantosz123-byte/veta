import { useQuery } from '@tanstack/react-query'
import { Check, CreditCard, MessageCircle, PackageSearch, Search } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorPortal, leerPedidoPortal, type PortalPedido } from '@/features/portal/api'
import { MarcoPortal } from '@/features/portal/components/marco-portal'
import { colorMarca, textoSobre } from '@/lib/color'
import { fecha, moneda } from '@/lib/formato'
import { cn } from '@/lib/utils'
import { enlaceWhatsApp } from '@/lib/whatsapp'

type Pedido = PortalPedido['pedido']

const METODO: Record<PortalPedido['pagos'][number]['metodo'], string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  mercado_pago: 'Mercado Pago',
  otro: 'Otro',
}

const ETAPA: Record<PortalPedido['items'][number]['etapas'][number]['estado'], string> = {
  pendiente: 'Por empezar',
  en_proceso: 'En proceso',
  terminada: 'Lista',
  cancelada: 'Cancelada',
}

function estadoGrande(p: Pedido): { titulo: string; detalle: string } {
  switch (p.estado) {
    case 'anticipo_pendiente':
      return {
        titulo: 'Esperando tu anticipo',
        detalle: p.anticipo_faltante > 0 ? `Para empezar a fabricar falta cubrir ${moneda(p.anticipo_faltante)} de anticipo.` : 'En cuanto se registre tu anticipo empezamos a fabricar.',
      }
    case 'en_produccion':
      return { titulo: 'En producción', detalle: p.fecha_compromiso ? `Estamos fabricando tus muebles. Entrega estimada: ${fecha(p.fecha_compromiso)}.` : 'Estamos fabricando tus muebles.' }
    case 'terminado':
      return { titulo: '¡Tus muebles están listos!', detalle: `Para entregarlos falta liquidar ${moneda(p.saldo)}.` }
    case 'liquidado':
      return { titulo: 'Listo para entregar', detalle: 'Tu pedido está pagado. Coordinemos la entrega.' }
    case 'entregado':
      return { titulo: 'Entregado', detalle: '¡Gracias por tu compra!' }
    default:
      return { titulo: 'Pedido', detalle: '' }
  }
}

function LineaTiempo({ p }: { p: Pedido }) {
  const pasos = [
    { nombre: 'Pedido confirmado', cuando: p.fecha },
    { nombre: 'Anticipo cubierto, en producción', cuando: p.en_produccion_at },
    { nombre: 'Terminado', cuando: p.terminado_at },
    { nombre: 'Liquidado', cuando: p.liquidado_at },
    { nombre: 'Entregado', cuando: p.entregado_at },
  ]
  return (
    <ol className="grid gap-3" aria-label="Avance del pedido">
      {pasos.map((s, i) => {
        const hecho = !!s.cuando
        return (
          <li key={s.nombre} className="flex items-center gap-3 text-sm">
            <span
              className={cn('flex size-6 shrink-0 items-center justify-center rounded-full border', hecho ? 'border-foreground bg-foreground text-background' : 'text-muted-foreground')}
              aria-hidden
            >
              {hecho ? <Check className="size-3.5" /> : <span className="text-xs">{i + 1}</span>}
            </span>
            <span className={cn('flex-1', !hecho && 'text-muted-foreground')}>
              {s.nombre}
              <span className="sr-only">{hecho ? ' (hecho)' : ' (pendiente)'}</span>
            </span>
            {hecho && <span className="text-muted-foreground tabular">{fecha(s.cuando)}</span>}
          </li>
        )
      })}
    </ol>
  )
}

function Renglon({ r }: { r: PortalPedido['items'][number] }) {
  const total = r.etapas.length
  const listas = r.etapas.filter((e) => e.estado === 'terminada').length
  const pct = total ? Math.round((listas / total) * 100) : 0
  return (
    <li className="grid gap-3 py-4 first:pt-0 last:pb-0">
      <div>
        <p className="font-medium">
          {r.cantidad} × {r.descripcion}
        </p>
        {r.opciones && <p className="text-sm text-muted-foreground">{r.opciones}</p>}
      </div>
      {total === 0 ? (
        <p className="text-sm text-muted-foreground">{r.estado === 'terminado' ? 'Listo.' : 'Aún sin programar en el taller.'}</p>
      ) : (
        <>
          <div className="grid gap-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Avance</span>
              <span className="tabular">
                {listas} de {total} etapas
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`Avance de ${r.descripcion}`}>
              <div className="h-full origin-left rounded-full bg-foreground transition-transform duration-500 ease-out motion-reduce:transition-none" style={{ transform: `scaleX(${pct / 100})` }} />
            </div>
          </div>
          <ul className="flex flex-wrap gap-2">
            {r.etapas.map((e, i) => (
              <li
                key={`${e.etapa}-${i}`}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs',
                  e.estado === 'terminada' ? 'border-foreground font-medium' : e.estado === 'en_proceso' ? 'border-foreground/40' : 'text-muted-foreground',
                )}
              >
                {e.etapa}: {ETAPA[e.estado]}
              </li>
            ))}
          </ul>
        </>
      )}
    </li>
  )
}

function Tarjeta({ titulo, children }: { titulo?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 rounded-2xl border bg-card p-5 shadow-xs" aria-label={titulo}>
      {titulo && <h2 className="font-semibold">{titulo}</h2>}
      {children}
    </section>
  )
}

export function VistaPedido({ datos, slug }: { datos: PortalPedido; slug: string }) {
  const { empresa, pedido: p, items, pagos, link_pago } = datos
  const acento = colorMarca(empresa.color)
  const grande = estadoGrande(p)
  return (
    <MarcoPortal empresa={empresa}>
      <Tarjeta>
        <div className="grid gap-1">
          <p className="text-sm text-muted-foreground">
            {p.cliente ? `Hola, ${p.cliente} · ` : ''}Pedido P-{p.folio} · {fecha(p.fecha)}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">{grande.titulo}</h1>
          {grande.detalle && <p className="text-muted-foreground">{grande.detalle}</p>}
        </div>
        {link_pago && p.saldo > 0 && (
          <Button asChild size="lg" className="h-12 text-base" style={{ background: acento, color: textoSobre(acento) }}>
            <a href={link_pago} target="_blank" rel="noreferrer">
              <CreditCard aria-hidden /> Pagar {p.estado === 'anticipo_pendiente' && p.anticipo_faltante > 0 ? 'anticipo' : 'saldo'}
            </a>
          </Button>
        )}
        <LineaTiempo p={p} />
      </Tarjeta>

      <Tarjeta titulo="Tus muebles">
        {items.length === 0 ? <p className="text-sm text-muted-foreground">Sin renglones.</p> : <ul className="divide-y">{items.map((r, i) => <Renglon key={i} r={r} />)}</ul>}
      </Tarjeta>

      <Tarjeta titulo="Pagos">
        <dl className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Total</dt>
            <dd className="font-medium tabular">{moneda(p.total)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Pagado</dt>
            <dd className="font-medium tabular">{moneda(p.pagado)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Saldo</dt>
            <dd className="text-lg font-semibold tabular">{moneda(Math.max(p.saldo, 0))}</dd>
          </div>
        </dl>
        {pagos.length > 0 ? (
          <ul className="divide-y border-t text-sm">
            {pagos.map((g, i) => (
              <li key={i} className="flex justify-between py-2">
                <span className="text-muted-foreground">
                  {fecha(g.fecha)} · {METODO[g.metodo]}
                </span>
                <span className="tabular">{moneda(g.monto)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Aún no hay pagos registrados.</p>
        )}
      </Tarjeta>

      <div className="grid gap-2">
        {empresa.telefono && (
          <Button asChild variant="outline" size="lg" className="h-12">
            <a href={enlaceWhatsApp(`Hola, tengo una duda sobre mi pedido P-${p.folio}.`, empresa.telefono)} target="_blank" rel="noreferrer">
              <MessageCircle aria-hidden /> ¿Dudas? Escríbenos por WhatsApp
            </a>
          </Button>
        )}
        <Button asChild variant="ghost" size="lg" className="h-12">
          <Link to={`/${slug}/seguimiento`}>
            <Search aria-hidden /> Buscar otro pedido
          </Link>
        </Button>
      </div>
    </MarcoPortal>
  )
}

export default function PaginaPedidoPortal() {
  const { slug = '', token = '' } = useParams()
  const consulta = useQuery({
    queryKey: ['portal', slug, token],
    queryFn: () => leerPedidoPortal(slug, token),
    retry: (n, e) => !(e instanceof ErrorPortal && e.tipo !== 'error') && n < 2,
    staleTime: 60_000,
  })

  if (consulta.isPending)
    return (
      <MarcoPortal>
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </MarcoPortal>
    )
  if (consulta.error) {
    const e = consulta.error
    return (
      <MarcoPortal>
        <section className="grid justify-items-center gap-3 rounded-2xl border bg-card p-8 text-center">
          <PackageSearch className="size-10 text-muted-foreground" aria-hidden />
          <h1 className="text-xl font-semibold">{e instanceof ErrorPortal && e.tipo === 'no_encontrado' ? 'No encontramos este pedido' : 'No pudimos mostrar tu pedido'}</h1>
          <p className="text-sm text-muted-foreground">
            {e instanceof ErrorPortal && e.tipo === 'no_encontrado' ? 'Revisa que el enlace esté completo o búscalo con tu folio y apellidos.' : e.message}
          </p>
          <Button asChild>
            <Link to={`/${slug}/seguimiento`}>Buscar mi pedido</Link>
          </Button>
        </section>
      </MarcoPortal>
    )
  }
  return <VistaPedido datos={consulta.data} slug={slug} />
}
