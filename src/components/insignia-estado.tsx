import { claseTono, estadoCotizacion, estadoPedido } from '@/lib/estados'
import type { Enum } from '@/lib/supabase'
import { cn } from '@/lib/utils'

type Props =
  | { tipo: 'cotizacion'; estado: Enum<'estado_cotizacion'> }
  | { tipo: 'pedido'; estado: Enum<'estado_pedido'> }

export function InsigniaEstado(props: Props) {
  const { nombre, tono } = props.tipo === 'cotizacion' ? estadoCotizacion[props.estado] : estadoPedido[props.estado]
  return (
    <span className={cn('inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap', claseTono[tono])}>
      {nombre}
    </span>
  )
}
