import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, LayoutDashboard } from 'lucide-react'
import { Link } from 'react-router'
import { useEmpresaActiva } from '@/app/empresa-activa'
import { EstadoVacio } from '@/components/estado-vacio'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { unidad } from '@/features/insumos/api'
import { leerTablero, type Tablero } from '@/features/tablero/api'
import { mensajeError } from '@/lib/errores'
import { cantidad, fecha, moneda, porcentaje } from '@/lib/formato'
import { estadoPedido } from '@/lib/estados'
import { cn } from '@/lib/utils'

const MES = new Intl.DateTimeFormat('es-MX', { month: 'short', timeZone: 'UTC' })
const mesCorto = (iso: string) => MES.format(new Date(`${iso}T00:00:00Z`)).replace('.', '')
const MES_LARGO = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' })

function Indicador({ titulo, valor, nota, alerta }: { titulo: string; valor: string; nota?: string; alerta?: boolean }) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="px-4">
        <p className="text-sm text-muted-foreground">{titulo}</p>
        <p className={cn('text-2xl font-semibold tracking-tight tabular', alerta && 'text-aviso')}>{valor}</p>
        {nota && <p className="text-xs text-muted-foreground">{nota}</p>}
      </CardContent>
    </Card>
  )
}

/** Barras verticales de una sola serie (sin leyenda: el título la nombra). Tooltip por barra y tabla para lectores de pantalla. */
function BarrasMes({ titulo, datos, campo }: { titulo: string; datos: Tablero['serie']; campo: 'ventas' | 'cobrado' }) {
  const max = Math.max(...datos.map((d) => Number(d[campo])), 1)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
        <CardDescription>Últimos 6 meses, con IVA</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-40 items-end gap-3 border-b border-border" aria-hidden>
          {datos.map((d) => {
            const v = Number(d[campo])
            return (
              <div key={d.mes} className="group relative flex h-full flex-1 flex-col justify-end">
                <div className="w-full rounded-t-[4px] bg-foreground/80 transition-colors group-hover:bg-foreground" style={{ height: `${Math.max((v / max) * 100, v > 0 ? 2 : 0)}%` }} />
                <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 rounded-md border bg-popover px-2 py-0.5 text-xs whitespace-nowrap text-popover-foreground shadow-sm group-hover:block tabular">
                  {moneda(v)}
                </span>
              </div>
            )
          })}
        </div>
        <div className="mt-1.5 flex gap-3 text-xs text-muted-foreground" aria-hidden>
          {datos.map((d) => (
            <span key={d.mes} className="flex-1 text-center">
              {mesCorto(d.mes)}
            </span>
          ))}
        </div>
        <table className="sr-only">
          <caption>{titulo}</caption>
          <tbody>
            {datos.map((d) => (
              <tr key={d.mes}>
                <th scope="row">{MES_LARGO.format(new Date(`${d.mes}T00:00:00Z`))}</th>
                <td>{moneda(d[campo])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

/** Barras horizontales con el valor escrito (la identidad va en texto, no en color). */
function BarrasHorizontales({ filas }: { filas: { etiqueta: string; valor: number; detalle?: string }[] }) {
  const max = Math.max(...filas.map((f) => f.valor), 1)
  return (
    <ul className="grid gap-2.5">
      {filas.map((f) => (
        <li key={f.etiqueta} className="grid grid-cols-[8rem_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate text-muted-foreground">{f.etiqueta}</span>
          <span className="h-2 rounded-full bg-muted">
            <span className="block h-2 rounded-full bg-foreground/80" style={{ width: `${(f.valor / max) * 100}%` }} />
          </span>
          <span className="text-right font-medium tabular" title={f.detalle}>
            {f.valor}
          </span>
        </li>
      ))}
    </ul>
  )
}

export default function PaginaTablero() {
  const { empresa } = useEmpresaActiva()
  const tablero = useQuery({ queryKey: ['tablero', empresa!.id], queryFn: () => leerTablero(empresa!.id), staleTime: 60_000 })

  if (tablero.isPending)
    return (
      <div className="mx-auto grid w-full max-w-6xl gap-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  if (tablero.error) return <p className="text-sm text-destructive">{mensajeError(tablero.error)}</p>

  const t = tablero.data
  const sinDatos = t.serie.every((m) => Number(m.ventas) === 0 && Number(m.cobrado) === 0) && t.conversion.cotizaciones === 0 && Object.keys(t.por_estado).length === 0
  const conversion = t.conversion.cotizaciones ? t.conversion.vendidas / t.conversion.cotizaciones : null
  const estados = (Object.keys(estadoPedido) as (keyof typeof estadoPedido)[])
    .filter((e) => e !== 'cancelado')
    .map((e) => ({ etiqueta: estadoPedido[e].nombre, valor: Number(t.por_estado[e] ?? 0) }))
  const etapas = t.por_etapa.map((e) => ({ etiqueta: e.etapa, valor: Number(e.pendientes) + Number(e.en_proceso), detalle: `${e.pendientes} por empezar · ${e.en_proceso} en proceso` }))

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tablero</h1>
        <p className="text-sm text-muted-foreground">
          {t.completo ? 'Toda la empresa' : 'Tus cotizaciones y pedidos'} · {MES_LARGO.format(new Date(`${t.mes}T00:00:00Z`))}
        </p>
      </div>

      {sinDatos ? (
        <EstadoVacio icono={LayoutDashboard} titulo="Tu tablero está listo" descripcion="Aquí verás ventas, cobranza, producción y margen en cuanto registres tu primera cotización." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Indicador titulo="Ventas del mes" valor={moneda(t.ventas_mes)} nota={`${t.pedidos_mes} ${t.pedidos_mes === 1 ? 'pedido' : 'pedidos'}, con IVA`} />
            <Indicador titulo="Cobrado del mes" valor={moneda(t.cobrado_mes)} />
            <Indicador titulo="Por cobrar" valor={moneda(t.por_cobrar)} nota={t.anticipos_pendientes ? `${t.anticipos_pendientes} esperando anticipo` : 'Saldo de pedidos abiertos'} alerta={Number(t.por_cobrar) > 0} />
            <Indicador
              titulo="Conversión"
              valor={conversion === null ? '—' : porcentaje(conversion)}
              nota={`${t.conversion.vendidas} de ${t.conversion.cotizaciones} cotizaciones, últimos 90 días`}
            />
          </div>

          {t.completo && t.margen_mes && (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Indicador
                titulo="Margen operativo del mes"
                valor={t.margen_mes.pct === null ? '—' : `${Number(t.margen_mes.pct).toLocaleString('es-MX')}%`}
                nota={`${moneda(t.margen_mes.margen)} · No incluye material de insumos`}
              />
              <Indicador titulo="Costo de producción del mes" valor={moneda(t.margen_mes.costo)} nota="Órdenes a proveedores" />
              <Indicador titulo="Por pagar a proveedores" valor={moneda(t.destajistas?.por_pagar)} nota="Órdenes terminadas" alerta={Number(t.destajistas?.por_pagar) > 0} />
              <Indicador titulo="Comprometido con proveedores" valor={moneda(t.destajistas?.comprometido)} nota="Órdenes en curso, menos adelantos" />
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <BarrasMes titulo="Ventas por mes" datos={t.serie} campo="ventas" />
            <BarrasMes titulo="Cobrado por mes" datos={t.serie} campo="cobrado" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pedidos por estado</CardTitle>
              </CardHeader>
              <CardContent>
                <BarrasHorizontales filas={estados} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Producción por etapa</CardTitle>
                <CardDescription>Órdenes abiertas (por empezar + en proceso)</CardDescription>
              </CardHeader>
              <CardContent>{etapas.length ? <BarrasHorizontales filas={etapas} /> : <p className="text-sm text-muted-foreground">No hay órdenes abiertas.</p>}</CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cotizaciones por vencer</CardTitle>
                <CardDescription>Enviadas que vencen en los próximos 3 días</CardDescription>
              </CardHeader>
              <CardContent>
                {t.por_vencer.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Ninguna por vencer.</p>
                ) : (
                  <ul className="divide-y text-sm">
                    {t.por_vencer.map((c) => (
                      <li key={c.id}>
                        <Link to={`/cotizaciones/${c.id}`} className="flex justify-between gap-3 py-2 outline-none hover:underline focus-visible:underline">
                          <span className="min-w-0 truncate">
                            C-{c.folio} · {c.cliente}
                          </span>
                          <span className="whitespace-nowrap text-muted-foreground tabular">
                            {moneda(c.total)} · vence {fecha(c.vigencia_hasta)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {t.completo && t.insumos_bajo_minimo && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Insumos bajo mínimo</CardTitle>
                </CardHeader>
                <CardContent>
                  {t.insumos_bajo_minimo.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Todo en orden.</p>
                  ) : (
                    <ul className="divide-y text-sm">
                      {t.insumos_bajo_minimo.map((i) => (
                        <li key={i.id}>
                          <Link to={`/insumos/${i.id}`} className="flex justify-between gap-3 py-2 outline-none hover:underline focus-visible:underline">
                            <span className="flex min-w-0 items-center gap-2">
                              <AlertTriangle className="size-4 shrink-0 text-destructive" aria-hidden />
                              <span className="truncate">{i.nombre}</span>
                            </span>
                            <span className="whitespace-nowrap text-muted-foreground tabular">
                              {cantidad(i.existencia)} de {cantidad(i.minimo)} {unidad(i.unidad)}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {t.completo && t.margen_pedidos && t.margen_pedidos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Margen operativo por pedido</CardTitle>
                <CardDescription>Venta sin IVA menos el costo de las órdenes. No incluye material de insumos.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[32rem] text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="py-2 font-medium">Pedido</th>
                      <th className="py-2 text-right font-medium">Venta sin IVA</th>
                      <th className="py-2 text-right font-medium">Proveedores</th>
                      <th className="py-2 text-right font-medium">Margen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {t.margen_pedidos.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2">
                          <Link to={`/pedidos/${p.id}`} className="hover:underline">
                            P-{p.folio}
                          </Link>{' '}
                          <span className="text-muted-foreground">{p.cliente}</span>
                        </td>
                        <td className="py-2 text-right tabular">{moneda(p.venta_sin_iva)}</td>
                        <td className="py-2 text-right tabular">{moneda(p.costo_produccion)}</td>
                        <td className="py-2 text-right font-medium tabular">
                          {moneda(p.margen_bruto)}
                          {p.margen_pct !== null && <span className="ml-1 text-muted-foreground">({Number(p.margen_pct).toLocaleString('es-MX')}%)</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
