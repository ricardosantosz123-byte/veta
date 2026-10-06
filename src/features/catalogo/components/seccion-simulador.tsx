import { useState } from 'react'
import { useEmpresaActiva, usePuede } from '@/app/empresa-activa'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ResultadoPrecio, SelectoresOpciones } from '@/features/catalogo/components/configurador-modelo'
import { useGrupos, useListas, useModelo, useModelos } from '@/features/catalogo/hooks'
import { gruposDelModelo, type Seleccion } from '@/features/catalogo/use-precio'

export function SeccionSimulador({ modeloInicial }: { modeloInicial?: string }) {
  const { empresa } = useEmpresaActiva()
  const conCosto = usePuede('ver_costos')
  const modelos = useModelos()
  const listas = useListas()
  const grupos = useGrupos()
  const [modeloId, setModeloId] = useState<string | null>(modeloInicial ?? null)
  const [listaElegida, setListaElegida] = useState<string | null>(null)
  const [seleccion, setSeleccion] = useState<Seleccion>({})
  const modelo = useModelo(modeloId ?? '')

  const activas = listas.data?.filter((l) => l.activo) ?? []
  const listaId = listaElegida ?? activas.find((l) => l.predeterminada)?.id ?? activas[0]?.id ?? null
  const gruposModelo = modeloId && modelo.data ? gruposDelModelo(grupos.data, modelo.data.modelo_grupos.map((m) => m.grupo_id)) : []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Simulador de precio</CardTitle>
        <CardDescription>Elige un modelo, sus opciones y una lista: el precio lo calcula el servidor, igual que en el cotizador.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="sim-modelo">Modelo</Label>
            <Select
              value={modeloId ?? ''}
              onValueChange={(v) => {
                setModeloId(v)
                setSeleccion({})
              }}
            >
              <SelectTrigger id="sim-modelo" className="w-full">
                <SelectValue placeholder={modelos.isPending ? 'Cargando…' : 'Elige un modelo'} />
              </SelectTrigger>
              <SelectContent>
                {modelos.data
                  ?.filter((m) => m.activo)
                  .map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nombre}
                      {m.sobre_diseno && <span className="text-muted-foreground"> · sobre diseño</span>}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sim-lista">Lista de precios</Label>
            <Select value={listaId ?? ''} onValueChange={setListaElegida}>
              <SelectTrigger id="sim-lista" className="w-full">
                <SelectValue placeholder="Elige una lista" />
              </SelectTrigger>
              <SelectContent>
                {activas.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.nombre}
                    {l.incluye_iva && <span className="text-muted-foreground"> · IVA incluido</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {modeloId && modelo.data && (
          <SelectoresOpciones
            idPrefix="sim"
            grupos={gruposModelo}
            seleccion={seleccion}
            onCambiar={setSeleccion}
            mostrarAjuste={empresa?.metodo_precio === 'base_ajustes'}
          />
        )}

        <ResultadoPrecio
          modeloId={modeloId && modelo.data ? modeloId : null}
          grupos={gruposModelo}
          seleccion={seleccion}
          listaId={listaId}
          sobreDiseno={!!modelo.data?.sobre_diseno}
          conCosto={conCosto}
        />
      </CardContent>
    </Card>
  )
}
