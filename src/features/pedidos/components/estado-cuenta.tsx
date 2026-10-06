import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Printer } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { useEmpresaActiva } from '@/app/empresa-activa'
import { InsigniaEstado } from '@/components/insignia-estado'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { leerCliente, nombreCompleto } from '@/features/clientes/api'
import { leerEstadoCuenta, nombreMetodo } from '@/features/pedidos/api'
import { mensajeError } from '@/lib/errores'
import { fecha, fechaHora, moneda } from '@/lib/formato'
import { telefonoLegible } from '@/lib/telefono'
import { cn } from '@/lib/utils'

/** Estado de cuenta del cliente: pedidos, pagos y saldo total (todo calculado por la base). Imprimible. */
export function EstadoCuenta() {
  const { id = '' } = useParams()
  const { empresa } = useEmpresaActiva()
  const cliente = useQuery({ queryKey: ['clientes', empresa!.id, id], queryFn: () => leerCliente(id) })
  const cuenta = useQuery({ queryKey: ['clientes', empresa!.id, id, 'estado-cuenta'], queryFn: () => leerEstadoCuenta(id) })

  if (cliente.isPending || cuenta.isPending) return <Skeleton className="mx-auto h-96 w-full max-w-4xl rounded-xl" />
  if (cliente.error || cuenta.error || !cliente.data)
    return <p className="mx-auto w-full max-w-4xl text-sm text-destructive">{mensajeError(cliente.error ?? cuenta.error) || 'Cliente no encontrado.'}</p>

  const c = cliente.data
  const { pedidos, pagos } = cuenta.data!
  const vigentes = pedidos.filter((p) => p.estado !== 'cancelado')

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6 print:max-w-none print:gap-4">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Button variant="ghost" size="icon" asChild aria-label="Volver al cliente">
          <Link to={`/clientes/${id}`}>
            <ArrowLeft aria-hidden />
          </Link>
        </Button>
        <span className="flex-1" />
        <Button variant="outline" onClick={() => window.print()}>
          <Printer aria-hidden /> Imprimir o guardar PDF
        </Button>
      </div>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{empresa!.nombre} · Estado de cuenta</p>
          <h1 className="text-2xl font-semibold tracking-tight">{nombreCompleto({ nombre: c.nombre ?? '', apellidos: c.apellidos })}</h1>
          <p className="text-sm text-muted-foreground">
            {[c.empresa_cliente, c.telefono && telefonoLegible(c.telefono), c.email].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Saldo total</p>
          <p className="text-3xl font-semibold tracking-tight tabular">{moneda(c.saldo)}</p>
          <p className="text-xs text-muted-foreground">Al {fechaHora(new Date(cuenta.dataUpdatedAt))}</p>
        </div>
      </header>

      <Card className="print:border-0 print:shadow-none">
        <CardHeader className="print:px-0">
          <CardTitle>Pedidos</CardTitle>
        </CardHeader>
        <CardContent className="print:px-0">
          {pedidos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin pedidos.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs tracking-wide text-muted-foreground uppercase">
                <tr className="border-b">
                  <th className="py-2 font-medium">Pedido</th>
                  <th className="py-2 font-medium">Fecha</th>
                  <th className="py-2 font-medium">Estado</th>
                  <th className="py-2 text-right font-medium">Total</th>
                  <th className="py-2 text-right font-medium">Pagado</th>
                  <th className="py-2 text-right font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pedidos.map((p) => (
                  <tr key={p.id} className={cn(p.estado === 'cancelado' && 'text-muted-foreground')}>
                    <td className="py-2 font-medium tabular">
                      <Link to={`/pedidos/${p.id}`} className="underline-offset-4 hover:underline print:no-underline">
                        P-{p.folio}
                      </Link>
                    </td>
                    <td className="py-2">{fecha(p.created_at)}</td>
                    <td className="py-2">{p.estado && <InsigniaEstado tipo="pedido" estado={p.estado} />}</td>
                    <td className="py-2 text-right tabular">{moneda(p.total)}</td>
                    <td className="py-2 text-right tabular">{moneda(p.pagado)}</td>
                    <td className="py-2 text-right font-medium tabular">
                      {p.estado === 'cancelado' ? '—' : Number(p.saldo_a_favor) > 0 ? `A favor ${moneda(p.saldo_a_favor)}` : moneda(p.saldo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {vigentes.length !== pedidos.length && <p className="mt-2 text-xs text-muted-foreground">Los pedidos cancelados no cuentan en el saldo.</p>}
        </CardContent>
      </Card>

      <Card className="print:border-0 print:shadow-none">
        <CardHeader className="print:px-0">
          <CardTitle>Pagos</CardTitle>
        </CardHeader>
        <CardContent className="print:px-0">
          {pagos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin pagos.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs tracking-wide text-muted-foreground uppercase">
                <tr className="border-b">
                  <th className="py-2 font-medium">Recibo</th>
                  <th className="py-2 font-medium">Fecha</th>
                  <th className="py-2 font-medium">Pedido</th>
                  <th className="py-2 font-medium">Forma de pago</th>
                  <th className="py-2 text-right font-medium">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pagos.map((g) => (
                  <tr key={g.id} className={cn(g.anulado && 'text-muted-foreground line-through')}>
                    <td className="py-2 tabular">R-{g.folio}</td>
                    <td className="py-2">{fecha(g.fecha)}</td>
                    <td className="py-2 tabular">P-{g.pedido_folio}</td>
                    <td className="py-2">
                      {nombreMetodo[g.metodo!]}
                      {g.anulado && ' (anulado)'}
                    </td>
                    <td className="py-2 text-right tabular">{moneda(g.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
