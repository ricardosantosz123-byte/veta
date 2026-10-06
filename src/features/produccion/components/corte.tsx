import { useMutation, useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Download, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useEmpresaActiva } from '@/app/empresa-activa'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { descargar } from '@/features/cotizaciones/pdf/preparar'
import { leerCorte, type FilaCorte } from '@/features/produccion/api'
import { mensajeError } from '@/lib/errores'
import { fecha, hoyMx, moneda } from '@/lib/formato'
import { enlaceWhatsApp } from '@/lib/whatsapp'

const DIA = 86_400_000
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10)

/** Lunes a domingo de la semana de `base` (fechas de calendario de la Ciudad de México). */
function semana(base: string) {
  const t = Date.parse(`${base}T00:00:00Z`)
  const dia = (new Date(t).getUTCDay() + 6) % 7 // 0 = lunes
  const lunes = t - dia * DIA
  return { desde: iso(lunes), hasta: iso(lunes + 6 * DIA) }
}

export function Corte() {
  const { empresa } = useEmpresaActiva()
  const [base, setBase] = useState(hoyMx())
  const { desde, hasta } = semana(base)
  const esActual = hasta >= hoyMx()
  const corte = useQuery({ queryKey: ['produccion', empresa!.id, 'corte', desde, hasta], queryFn: () => leerCorte(empresa!.id, desde, hasta) })
  const filas = (corte.data ?? []).filter((f) => Number(f.terminado_periodo) > 0 || Number(f.pagado_periodo) > 0 || Number(f.por_pagar) > 0 || Number(f.comprometido) > 0)
  const mover = (dias: number) => setBase(iso(Date.parse(`${desde}T00:00:00Z`) + dias * DIA))

  const pdf = useMutation({
    mutationFn: async () => {
      const { generarPdfCorte } = await import('@/features/produccion/pdf/generar-corte')
      const blob = await generarPdfCorte({
        empresa: { nombre: empresa!.nombre, color_marca: empresa!.color_marca },
        desde,
        hasta,
        filas: filas.map((f) => ({
          nombre: f.nombre,
          terminado: Number(f.terminado_periodo),
          ordenes: f.ordenes_terminadas_periodo,
          pagado: Number(f.pagado_periodo),
          por_pagar: Number(f.por_pagar),
          comprometido: Number(f.comprometido),
        })),
      })
      descargar(blob, `Corte-proveedores-${desde}-a-${hasta}.pdf`)
    },
    onError: (e) => toast.error(`No se pudo generar el PDF: ${mensajeError(e)}`),
  })

  const mensaje = (f: FilaCorte) =>
    [
      `Hola ${f.nombre}, este es tu corte de ${empresa!.nombre} del ${fecha(desde)} al ${fecha(hasta)}:`,
      `Trabajo terminado: ${moneda(f.terminado_periodo)} (${f.ordenes_terminadas_periodo} órdenes)`,
      `Pagado en la semana: ${moneda(f.pagado_periodo)}`,
      `Por pagar: ${moneda(f.por_pagar)}`,
      Number(f.comprometido) > 0 ? `En curso (comprometido): ${moneda(f.comprometido)}` : null,
    ]
      .filter(Boolean)
      .join('\n')

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => mover(-7)} aria-label="Semana anterior">
          <ChevronLeft aria-hidden />
        </Button>
        <p className="min-w-56 text-center font-medium">
          {fecha(desde)} – {fecha(hasta)}
        </p>
        <Button variant="outline" size="icon" onClick={() => mover(7)} disabled={esActual} aria-label="Semana siguiente">
          <ChevronRight aria-hidden />
        </Button>
        {!esActual && (
          <Button variant="ghost" size="sm" onClick={() => setBase(hoyMx())}>
            Esta semana
          </Button>
        )}
        <span className="flex-1" />
        <Button variant="outline" onClick={() => pdf.mutate()} disabled={pdf.isPending || filas.length === 0}>
          <Download aria-hidden /> {pdf.isPending ? 'Generando…' : 'Exportar PDF'}
        </Button>
      </div>

      {corte.isPending ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : corte.error ? (
        <p className="text-sm text-destructive">{mensajeError(corte.error)}</p>
      ) : filas.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Sin trabajo ni pagos en esta semana.</p>
      ) : (
        <Card className="overflow-x-auto py-0">
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="text-left text-xs tracking-wide text-muted-foreground uppercase">
              <tr className="border-b">
                <th className="px-4 py-2.5 font-medium">Proveedor</th>
                <th className="px-2 py-2.5 text-right font-medium">Terminado</th>
                <th className="px-2 py-2.5 text-right font-medium">Pagado</th>
                <th className="px-2 py-2.5 text-right font-medium">Por pagar</th>
                <th className="px-2 py-2.5 text-right font-medium">Comprometido</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filas.map((f) => (
                <tr key={f.destajista_id}>
                  <td className="px-4 py-3 font-medium">{f.nombre}</td>
                  <td className="px-2 py-3 text-right tabular">
                    {moneda(f.terminado_periodo)}
                    <span className="block text-xs text-muted-foreground">{f.ordenes_terminadas_periodo} órdenes</span>
                  </td>
                  <td className="px-2 py-3 text-right tabular">{moneda(f.pagado_periodo)}</td>
                  <td className="px-2 py-3 text-right font-semibold tabular">{moneda(f.por_pagar)}</td>
                  <td className="px-2 py-3 text-right text-muted-foreground tabular">{moneda(f.comprometido)}</td>
                  <td className="pr-2">
                    <Button variant="ghost" size="icon" asChild aria-label={`Mandar el corte a ${f.nombre} por WhatsApp`}>
                      <a href={enlaceWhatsApp(mensaje(f), f.telefono)} target="_blank" rel="noreferrer">
                        <MessageCircle aria-hidden />
                      </a>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <p className="text-xs text-muted-foreground">
        <strong>Terminado</strong> y <strong>Pagado</strong>: de esta semana. <strong>Por pagar</strong>: terminadas menos lo pagado, al día de hoy.{' '}
        <strong>Comprometido</strong>: pendientes y en proceso menos los adelantos.
      </p>
    </div>
  )
}
