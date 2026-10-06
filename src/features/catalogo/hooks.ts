import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useEmpresaActiva } from '@/app/empresa-activa'
import {
  leerCategorias,
  leerCostos,
  leerEtapas,
  leerGrupos,
  leerListas,
  leerMargenVenta,
  leerModelo,
  leerModelos,
} from '@/features/catalogo/api'

// Todas las claves cuelgan de ['catalogo', empresaId] para invalidarlas juntas.
export const claves = {
  todo: (e: string) => ['catalogo', e] as const,
  categorias: (e: string) => ['catalogo', e, 'categorias'] as const,
  etapas: (e: string) => ['catalogo', e, 'etapas'] as const,
  grupos: (e: string) => ['catalogo', e, 'grupos'] as const,
  modelos: (e: string) => ['catalogo', e, 'modelos'] as const,
  modelo: (e: string, id: string) => ['catalogo', e, 'modelo', id] as const,
  costos: (e: string, id: string) => ['catalogo', e, 'costos', id] as const,
  margenVenta: (e: string, id: string) => ['catalogo', e, 'margen-venta', id] as const,
  listas: (e: string) => ['catalogo', e, 'listas'] as const,
  precio: (e: string) => ['catalogo', e, 'precio'] as const,
}

function useEmpresaId() {
  const { empresa } = useEmpresaActiva()
  return empresa!.id
}

export function useCategorias() {
  const e = useEmpresaId()
  return useQuery({ queryKey: claves.categorias(e), queryFn: () => leerCategorias(e) })
}
export function useEtapas() {
  const e = useEmpresaId()
  return useQuery({ queryKey: claves.etapas(e), queryFn: () => leerEtapas(e) })
}
export function useGrupos() {
  const e = useEmpresaId()
  return useQuery({ queryKey: claves.grupos(e), queryFn: () => leerGrupos(e) })
}
export function useModelos() {
  const e = useEmpresaId()
  return useQuery({ queryKey: claves.modelos(e), queryFn: () => leerModelos(e) })
}
export function useModelo(id: string) {
  const e = useEmpresaId()
  return useQuery({ queryKey: claves.modelo(e, id), queryFn: () => leerModelo(id), enabled: !!id })
}
export function useCostos(id: string, habilitado: boolean) {
  const e = useEmpresaId()
  return useQuery({ queryKey: claves.costos(e, id), queryFn: () => leerCostos(id), enabled: habilitado })
}
export function useMargenVenta(id: string, habilitado: boolean) {
  const e = useEmpresaId()
  return useQuery({ queryKey: claves.margenVenta(e, id), queryFn: () => leerMargenVenta(id), enabled: habilitado })
}
export function useListas() {
  const e = useEmpresaId()
  return useQuery({ queryKey: claves.listas(e), queryFn: () => leerListas(e) })
}

/** Invalida todo el catálogo de la empresa activa (lecturas y precios calculados). */
export function useRefrescarCatalogo() {
  const e = useEmpresaId()
  const queryClient = useQueryClient()
  return useCallback(() => queryClient.invalidateQueries({ queryKey: claves.todo(e) }), [queryClient, e])
}
