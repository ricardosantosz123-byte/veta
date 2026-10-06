import { PackagePlus } from 'lucide-react'
import { useState } from 'react'
import { usePuedeEditar } from '@/app/empresa-activa'
import { Button } from '@/components/ui/button'
import { unidad, type MaterialEntregado } from '@/features/insumos/api'
import { DialogoMovimiento } from '@/features/insumos/components/dialogo-movimiento'
import { useMaterialEntregado } from '@/features/insumos/hooks'
import { mensajeError } from '@/lib/errores'
import { cantidad, fecha, moneda } from '@/lib/formato'

export function ListaMaterial({ material, conValor }: { material: MaterialEntregado[]; conValor?: boolean }) {
  return (
    <ul className="divide-y text-sm">
      {material.map((m) => (
        <li key={m.movimiento_id} className="flex justify-between gap-3 py-1.5">
          <span className="min-w-0">
            <span className="font-medium tabular">
              {cantidad(m.cantidad)} {unidad(m.unidad)}
            </span>{' '}
            {m.insumo}
            <span className="block text-xs text-muted-foreground">
              {fecha(m.entregado_at)}
              {m.nota && ` · ${m.nota}`}
            </span>
          </span>
          {conValor && m.valor !== null && <span className="whitespace-nowrap tabular">{moneda(m.valor)}</span>}
        </li>
      ))}
    </ul>
  )
}

interface Props {
  orden: { id: string; folio: number | null; estado: string; etapa?: { nombre: string } | null; destajista?: { nombre: string } | null }
}

/** Sección "Material entregado" de la ficha de la orden (Admin, Producción y Contador). */
export function MaterialEntregadoOrden({ orden }: Props) {
  const entregar = usePuedeEditar('editar_insumos')
  const material = useMaterialEntregado([orden.id])
  const [abierto, setAbierto] = useState(false)

  return (
    <section className="grid gap-3 border-t pt-4" aria-labelledby="ord-material">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="ord-material" className="font-medium">
          Material entregado
        </h3>
        {entregar && orden.estado !== 'cancelada' && (
          <Button variant="outline" size="sm" onClick={() => setAbierto(true)}>
            <PackagePlus aria-hidden /> Entregar material
          </Button>
        )}
      </div>
      {material.isPending ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : material.error ? (
        <p className="text-sm text-destructive">{mensajeError(material.error)}</p>
      ) : material.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin material entregado. Registra aquí la tela, piel o herrajes que le das al proveedor.</p>
      ) : (
        <>
          <ListaMaterial material={material.data} conValor />
          <p className="text-xs text-muted-foreground">Valor al costo promedio del día de la entrega. No se descuenta del pago al proveedor.</p>
        </>
      )}
      {abierto && (
        <DialogoMovimiento
          tipo="salida"
          orden={{ id: orden.id, folio: orden.folio, etapa: orden.etapa?.nombre, destajista: orden.destajista?.nombre }}
          onCerrar={() => setAbierto(false)}
        />
      )}
    </section>
  )
}
