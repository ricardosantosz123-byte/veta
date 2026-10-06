import { useQuery } from '@tanstack/react-query'
import { useEmpresaActiva } from '@/app/empresa-activa'
import { calcularPrecio, costearModelo, type Grupo } from '@/features/catalogo/api'
import { claves } from '@/features/catalogo/hooks'
import { useRetraso } from '@/hooks/use-retraso'

/** grupo_id → opcion_id elegida */
export type Seleccion = Record<string, string>

/** Grupos que aplican al modelo, en orden, con solo sus opciones activas. */
export function gruposDelModelo(todos: Grupo[] | undefined, gruposModelo: string[]) {
  return (todos ?? [])
    .filter((g) => gruposModelo.includes(g.id))
    .map((g) => ({ ...g, opciones: g.opciones.filter((o) => o.activo) }))
}

/** Grupos obligatorios que aún no tienen opción elegida. */
export function faltantes(grupos: Grupo[], seleccion: Seleccion) {
  return grupos.filter((g) => g.obligatorio && g.opciones.length > 0 && !seleccion[g.id])
}

interface Opciones {
  modeloId: string | null
  grupos: Grupo[]
  seleccion: Seleccion
  listaId: string | null
  sobreDiseno: boolean
  /** true si el rol puede ver costos: usa costear_modelo (costo + precio); si no, calcular_precio. */
  conCosto: boolean
}

/**
 * Precio (y costo, si el rol lo ve) de una combinación. Siempre lo calcula la base:
 * calcular_precio para todos, costear_modelo para Admin, Producción y Contador.
 */
export function usePrecioModelo({ modeloId, grupos, seleccion, listaId, sobreDiseno, conCosto }: Opciones) {
  const { empresa } = useEmpresaActiva()
  const opciones = grupos.map((g) => seleccion[g.id]).filter((x): x is string => !!x)
  const pendientes = faltantes(grupos, seleccion)
  const clave = useRetraso(JSON.stringify([modeloId, opciones, listaId, conCosto]), 150)

  const consulta = useQuery({
    queryKey: [...claves.precio(empresa!.id), clave],
    queryFn: async () => {
      if (conCosto) return costearModelo(modeloId!, opciones, listaId)
      return { costo: null, precio: await calcularPrecio(modeloId!, opciones, listaId) }
    },
    enabled: !!modeloId && pendientes.length === 0 && (!sobreDiseno || conCosto),
    staleTime: 0,
    retry: false,
  })

  return { ...consulta, pendientes }
}
