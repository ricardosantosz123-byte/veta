import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useEmpresaActiva } from '@/app/empresa-activa'
import { Campo } from '@/components/campo'
import { CampoMonto } from '@/components/campo-monto'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ResultadoPrecio, SelectoresOpciones } from '@/features/catalogo/components/configurador-modelo'
import { useGrupos, useModelo, useModelos } from '@/features/catalogo/hooks'
import { faltantes, gruposDelModelo, type Seleccion } from '@/features/catalogo/use-precio'
import { agregarRenglon, actualizarRenglon, type Renglon } from '@/features/cotizaciones/api'
import { mensajeError } from '@/lib/errores'

interface Props {
  abierto: boolean
  onCerrar: () => void
  cotizacionId: string
  listaId: string | null
  /** Para editar; sin él, agrega uno nuevo al final. */
  renglon?: Renglon | null
  siguienteOrden: number
  onGuardado: () => Promise<unknown>
}

/** Reconstruye grupo → opción a partir de las opciones guardadas en el renglón. */
function seleccionDe(opcionIds: string[], grupos: { id: string; opciones: { id: string }[] }[]): Seleccion {
  const sel: Seleccion = {}
  for (const g of grupos) {
    const o = g.opciones.find((x) => opcionIds.includes(x.id))
    if (o) sel[g.id] = o.id
  }
  return sel
}

export function DialogoRenglon({ abierto, onCerrar, cotizacionId, listaId, renglon, siguienteOrden, onGuardado }: Props) {
  const { empresa } = useEmpresaActiva()
  const modelos = useModelos()
  const grupos = useGrupos()
  const [tipo, setTipo] = useState<'catalogo' | 'libre'>(renglon && !renglon.modelo_id ? 'libre' : 'catalogo')
  const [modeloId, setModeloId] = useState<string | null>(renglon?.modelo_id ?? null)
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null)
  const [descripcion, setDescripcion] = useState(renglon?.descripcion ?? '')
  const [cantidad, setCantidad] = useState(String(renglon?.cantidad ?? 1))
  const [manual, setManual] = useState(renglon?.precio_manual ?? false)
  const [precio, setPrecio] = useState<number | null>(renglon?.precio_manual ? Number(renglon.precio_unitario) : null)
  const [error, setError] = useState<string | null>(null)
  const modelo = useModelo(modeloId ?? '')

  const gruposModelo = modelo.data ? gruposDelModelo(grupos.data, modelo.data.modelo_grupos.map((m) => m.grupo_id)) : []
  // La selección se arma la primera vez que llegan los grupos del modelo guardado.
  const sel: Seleccion = seleccion ?? (renglon?.modelo_id === modeloId && modelo.data ? seleccionDe(renglon?.opcion_ids ?? [], gruposModelo) : {})
  const sobreDiseno = tipo === 'libre' || !!modelo.data?.sobre_diseno
  const precioManual = sobreDiseno || manual
  const activos = modelos.data?.filter((m) => m.activo || m.id === renglon?.modelo_id) ?? []

  const guardar = useMutation({
    mutationFn: async () => {
      const n = Number(cantidad)
      if (!Number.isInteger(n) || n < 1) throw new Error('La cantidad debe ser un número entero mayor que 0.')
      if (tipo === 'catalogo' && !modeloId) throw new Error('Elige un modelo.')
      if (tipo === 'libre' && descripcion.trim().length < 2) throw new Error('Describe el mueble sobre diseño.')
      const pendientes = tipo === 'catalogo' && !sobreDiseno ? faltantes(gruposModelo, sel) : []
      if (pendientes.length) throw new Error(`Elige ${pendientes.map((g) => g.nombre.toLowerCase()).join(', ')}.`)
      if (precioManual && (precio === null || Number.isNaN(precio))) throw new Error('Escribe el precio.')

      const datos = {
        modelo_id: tipo === 'catalogo' ? modeloId : null,
        opcion_ids: tipo === 'catalogo' ? gruposModelo.map((g) => sel[g.id]).filter((x): x is string => !!x) : [],
        // Vacío en un renglón del catálogo: la base pone el nombre del modelo.
        descripcion: tipo === 'catalogo' && renglon?.modelo_id !== modeloId ? '' : descripcion.trim(),
        cantidad: n,
        precio_manual: precioManual,
        precio_unitario: precioManual ? precio : null,
      }
      if (renglon) await actualizarRenglon(renglon.id, datos)
      else await agregarRenglon(empresa!.id, cotizacionId, datos, siguienteOrden)
    },
    onSuccess: async () => {
      await onGuardado()
      onCerrar()
    },
    onError: (e) => setError(mensajeError(e)),
  })

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="sm:max-w-xl">
        <form
          noValidate
          className="grid gap-5"
          onSubmit={(e) => {
            e.preventDefault()
            setError(null)
            guardar.mutate()
          }}
        >
          <DialogHeader>
            <DialogTitle>{renglon ? 'Editar renglón' : 'Agregar renglón'}</DialogTitle>
            <DialogDescription>El precio automático lo calcula el servidor con la lista de la cotización.</DialogDescription>
          </DialogHeader>

          <Tabs value={tipo} onValueChange={(v) => setTipo(v as 'catalogo' | 'libre')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="catalogo">Del catálogo</TabsTrigger>
              <TabsTrigger value="libre">Sobre diseño</TabsTrigger>
            </TabsList>
          </Tabs>

          {tipo === 'catalogo' ? (
            <>
              <div className="grid gap-2">
                <Label htmlFor="ren-modelo">Modelo</Label>
                <Select
                  value={modeloId ?? ''}
                  onValueChange={(v) => {
                    setModeloId(v)
                    setSeleccion({})
                  }}
                >
                  <SelectTrigger id="ren-modelo" className="w-full">
                    <SelectValue placeholder={modelos.isPending ? 'Cargando…' : 'Elige un modelo'} />
                  </SelectTrigger>
                  <SelectContent>
                    {activos.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nombre}
                        {m.sobre_diseno && <span className="text-muted-foreground"> · sobre diseño</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {modeloId && modelo.data && (
                <SelectoresOpciones idPrefix="ren" grupos={gruposModelo} seleccion={sel} onCambiar={setSeleccion} mostrarAjuste={empresa?.metodo_precio === 'base_ajustes'} />
              )}
              {renglon?.modelo_id === modeloId && (
                <Campo id="ren-desc" etiqueta="Descripción en la cotización">
                  <Input id="ren-desc" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
                </Campo>
              )}
            </>
          ) : (
            <Campo id="ren-libre" etiqueta="Descripción del mueble" ayuda="Medidas, materiales y acabados. Aparece tal cual en el PDF.">
              <Textarea id="ren-libre" rows={3} placeholder="Mesa de comedor 2.40 × 1.00 m en parota, acabado natural" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} aria-describedby="ren-libre-nota" />
            </Campo>
          )}

          <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
            <Campo id="ren-cant" etiqueta="Cantidad">
              <Input id="ren-cant" type="number" inputMode="numeric" min={1} step={1} value={cantidad} onChange={(e) => setCantidad(e.target.value)} className="tabular" />
            </Campo>
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="ren-precio">Precio unitario</Label>
                {!sobreDiseno && (
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Switch checked={manual} onCheckedChange={setManual} aria-label="Precio a mano" />A mano
                  </label>
                )}
              </div>
              {precioManual ? (
                <CampoMonto id="ren-precio" valor={precio} onConfirmar={setPrecio} placeholder="0.00" />
              ) : (
                <p className="flex h-9 items-center text-sm text-muted-foreground">Automático (lo calcula el servidor)</p>
              )}
            </div>
          </div>

          {tipo === 'catalogo' && modeloId && modelo.data && !modelo.data.sobre_diseno && (
            <ResultadoPrecio
              modeloId={modeloId}
              grupos={gruposModelo}
              seleccion={sel}
              listaId={listaId}
              sobreDiseno={false}
              conCosto={false}
              className="py-3"
            />
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardar.isPending}>
              {guardar.isPending ? 'Guardando…' : renglon ? 'Guardar' : 'Agregar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
