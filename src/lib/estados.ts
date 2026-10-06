import type { Enum } from '@/lib/supabase'

type Tono = 'neutro' | 'info' | 'exito' | 'aviso' | 'peligro'

export const estadoCotizacion: Record<Enum<'estado_cotizacion'>, { nombre: string; tono: Tono }> = {
  borrador: { nombre: 'Borrador', tono: 'neutro' },
  enviada: { nombre: 'Enviada', tono: 'info' },
  parcial: { nombre: 'Parcial', tono: 'aviso' },
  aceptada: { nombre: 'Aceptada', tono: 'exito' },
  vencida: { nombre: 'Vencida', tono: 'peligro' },
  cancelada: { nombre: 'Cancelada', tono: 'neutro' },
}

export const estadoPedido: Record<Enum<'estado_pedido'>, { nombre: string; tono: Tono }> = {
  anticipo_pendiente: { nombre: 'Anticipo pendiente', tono: 'aviso' },
  en_produccion: { nombre: 'En producción', tono: 'info' },
  terminado: { nombre: 'Terminado', tono: 'exito' },
  liquidado: { nombre: 'Liquidado', tono: 'exito' },
  entregado: { nombre: 'Entregado', tono: 'neutro' },
  cancelado: { nombre: 'Cancelado', tono: 'neutro' },
}

export const claseTono: Record<Tono, string> = {
  neutro: 'bg-muted text-muted-foreground',
  info: 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200',
  exito: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
  aviso: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  peligro: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200',
}
