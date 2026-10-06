import { useMutation } from '@tanstack/react-query'
import { Info } from 'lucide-react'
import { useEmpresaActiva, usePuede, usePuedeEditar } from '@/app/empresa-activa'
import { CampoMonto } from '@/components/campo-monto'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { guardarCosto, guardarMarkup, type Costo, type Etapa, type Grupo } from '@/features/catalogo/api'
import { useCostos, useEtapas, useMarkup, useRefrescarCatalogo } from '@/features/catalogo/hooks'
import { mensajeError } from '@/lib/errores'
import { moneda, porcentaje } from '@/lib/formato'

interface Props {
  modeloId: string
  grupos: Grupo[]
}

function Celda({ valor, editar, etiqueta, onGuardar, ajuste }: { valor: number | null; editar: boolean; etiqueta: string; onGuardar: (v: number | null) => void; ajuste: boolean }) {
  if (!editar) {
    return (
      <span className="block text-right tabular">
        {valor === null ? <span className="text-muted-foreground">—</span> : `${ajuste && valor > 0 ? '+' : ''}${moneda(valor)}`}
      </span>
    )
  }
  return (
    <CampoMonto
      valor={valor}
      onConfirmar={onGuardar}
      permitirNegativo={ajuste}
      placeholder={ajuste ? '0' : '—'}
      className="h-8 min-w-24"
      aria-label={etiqueta}
    />
  )
}

/** Tabla etapa × costo (método componentes). Admin edita; Producción y Contador consultan. */
export function CosteoModelo({ modeloId, grupos }: Props) {
  const { empresa } = useEmpresaActiva()
  const editar = usePuedeEditar('editar_catalogo')
  const verMarkup = usePuede('ver_margen') // Admin y Contador; solo el Admin lo edita
  const refrescar = useRefrescarCatalogo()
  const etapas = useEtapas()
  const costos = useCostos(modeloId, true)
  const markup = useMarkup(modeloId, verMarkup)

  const guardar = useMutation({
    mutationFn: (a: { existente: Costo | undefined; etapaId: string; opcionId: string | null; costo: number | null }) =>
      guardarCosto(empresa!.id, modeloId, a.existente, a.etapaId, a.opcionId, a.costo),
    onSuccess: refrescar,
    onError: (e) => {
      toast.error(mensajeError(e))
      void refrescar()
    },
  })
  const guardarMk = useMutation({
    mutationFn: (m: number) => guardarMarkup(empresa!.id, modeloId, m),
    onSuccess: refrescar,
    onError: (e) => toast.error(mensajeError(e)),
  })

  if (etapas.isPending || costos.isPending) return <Skeleton className="h-64 rounded-xl" />

  const lista = costos.data ?? []
  const buscar = (etapaId: string, opcionId: string | null) => lista.find((c) => c.etapa_id === etapaId && c.opcion_id === opcionId)
  // Etapas activas y las inactivas que aún tienen costos capturados (para no esconder dinero).
  const columnas: Etapa[] = (etapas.data ?? []).filter((e) => e.activo || lista.some((c) => c.etapa_id === e.id))
  const valor = (etapaId: string, opcionId: string | null) => {
    const c = buscar(etapaId, opcionId)
    return c ? Number(c.costo) : null
  }
  const celda = (etapaId: string, opcionId: string | null, etiqueta: string) => (
    <Celda
      valor={valor(etapaId, opcionId)}
      editar={editar}
      ajuste={opcionId !== null}
      etiqueta={etiqueta}
      onGuardar={(v) => guardar.mutate({ existente: buscar(etapaId, opcionId), etapaId, opcionId, costo: v })}
    />
  )

  const markupActual = markup.data === null || markup.data === undefined ? null : Number(markup.data)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Costeo por etapas</CardTitle>
        <CardDescription>
          Lo que te cuesta cada etapa del mueble. Los ajustes por opción se suman solo si el cliente elige esa opción.
          {editar && ' Se guarda al salir de cada campo.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="-mx-2 overflow-x-auto px-2">
          <table className="w-full min-w-[32rem] border-separate border-spacing-y-1 text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th scope="col" className="w-48 pr-3 font-medium">
                  Concepto
                </th>
                {columnas.map((e) => (
                  <th key={e.id} scope="col" className="px-1 text-right font-medium">
                    {e.nombre}
                    {!e.activo && <span className="block text-xs font-normal">(inactiva)</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row" className="pr-3 text-left font-medium">
                  Costo base
                </th>
                {columnas.map((e) => (
                  <td key={e.id} className="px-1">
                    {celda(e.id, null, `Costo base de ${e.nombre}`)}
                  </td>
                ))}
              </tr>
              {grupos.map((g) => [
                <tr key={g.id}>
                  <th scope="rowgroup" colSpan={columnas.length + 1} className="pt-4 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {g.nombre}
                  </th>
                </tr>,
                ...g.opciones.map((o) => (
                  <tr key={o.id}>
                    <th scope="row" className="truncate pr-3 text-left font-normal">
                      {o.nombre}
                    </th>
                    {columnas.map((e) => (
                      <td key={e.id} className="px-1">
                        {celda(e.id, o.id, `Ajuste de ${o.nombre} en ${e.nombre}`)}
                      </td>
                    ))}
                  </tr>
                )),
              ])}
            </tbody>
          </table>
        </div>
        {grupos.length === 0 && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="size-4" aria-hidden /> Asigna grupos de opciones al modelo para capturar ajustes por opción.
          </p>
        )}

        {verMarkup && (
          <div className="grid max-w-xs gap-2">
            <Label htmlFor="markup">Markup</Label>
            {editar ? (
              <CampoMonto
                id="markup"
                // Se captura en % (100 = el doble del costo); la base lo guarda como 1.0.
                valor={markupActual === null ? null : Math.round(markupActual * 1000) / 10}
                onConfirmar={(v) => guardarMk.mutate((v ?? 100) / 100)}
                placeholder="100"
                aria-describedby="markup-nota"
              />
            ) : (
              <p className="text-lg font-medium tabular">{porcentaje(markupActual ?? 1)}</p>
            )}
            <p id="markup-nota" className="text-sm text-muted-foreground">
              En %: 100 = precio al doble del costo. {markupActual === null && 'Sin capturar se usa 100 %.'}
              {!editar && ' Solo el Admin lo edita.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
