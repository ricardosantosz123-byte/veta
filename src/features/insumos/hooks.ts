import { useQuery } from '@tanstack/react-query'
import { useEmpresaActiva } from '@/app/empresa-activa'
import { leerMaterialEntregado } from '@/features/insumos/api'

/** Material entregado de una o varias órdenes en una sola consulta. */
export function useMaterialEntregado(ordenIds: string[]) {
  const { empresa } = useEmpresaActiva()
  return useQuery({
    queryKey: ['produccion', empresa!.id, 'material', ordenIds],
    queryFn: () => leerMaterialEntregado(ordenIds),
    enabled: ordenIds.length > 0,
  })
}
