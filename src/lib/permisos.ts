import type { Enum } from '@/lib/supabase'

// Espejo de la matriz de docs/PRD.md §4. Solo sirve para mostrar u ocultar cosas en la interfaz:
// la seguridad real la imponen RLS y las funciones de la base de datos.
// El Comprador tiene lo de Producción más la lectura del Contador (igual que tiene_rol en la base).
export type Rol = Enum<'rol_miembro'>

export const ROLES: Rol[] = ['admin', 'vendedor', 'comprador', 'produccion', 'destajista', 'contador']

export const nombreRol: Record<Rol, string> = {
  admin: 'Admin',
  vendedor: 'Vendedor',
  comprador: 'Comprador',
  produccion: 'Producción',
  destajista: 'Proveedor (fabricante)',
  contador: 'Contador',
}

export const descripcionRol: Record<Rol, string> = {
  admin: 'Todo: empresa, usuarios, catálogo, costos, márgenes y suscripción.',
  vendedor: 'Clientes, cotizaciones, pedidos y cobros. No ve costos ni márgenes.',
  comprador: 'Asigna pedidos a proveedores, les paga y compra insumos. Ve todo, con costos y márgenes; no edita ventas, catálogo ni cobros.',
  produccion: 'Órdenes, proveedores, costos por etapa e insumos. No ve clientes.',
  destajista: 'Solo sus órdenes, sus avances y sus pagos.',
  contador: 'Consulta todo en solo lectura, con costos y márgenes.',
}

const matriz = {
  configurar_empresa: ['admin'],
  ver_catalogo: ['admin', 'vendedor', 'produccion', 'contador', 'comprador'],
  editar_catalogo: ['admin'],
  ver_costos: ['admin', 'produccion', 'contador', 'comprador'],
  ver_margen: ['admin', 'contador', 'comprador'],
  ver_clientes: ['admin', 'vendedor', 'contador', 'comprador'],
  editar_clientes: ['admin', 'vendedor'],
  ver_cotizaciones: ['admin', 'vendedor', 'contador', 'comprador'],
  editar_cotizaciones: ['admin', 'vendedor'],
  ver_pedidos: ['admin', 'vendedor', 'contador', 'comprador'],
  convertir_pedido: ['admin', 'vendedor'],
  registrar_cobro: ['admin', 'vendedor'],
  anular_pago: ['admin'],
  ver_produccion: ['admin', 'produccion', 'contador', 'comprador'],
  gestionar_produccion: ['admin', 'produccion', 'comprador'],
  pagar_destajos: ['admin', 'produccion', 'comprador'],
  mis_ordenes: ['destajista'],
  ver_insumos: ['admin', 'produccion', 'contador', 'comprador'],
  editar_insumos: ['admin', 'produccion', 'comprador'],
  ver_bitacora: ['admin'],
  ver_tablero: ['admin', 'vendedor', 'contador', 'comprador'],
  gestionar_usuarios: ['admin'],
  gestionar_suscripcion: ['admin'],
} as const satisfies Record<string, readonly Rol[]>

export type Capacidad = keyof typeof matriz

export function puede(rol: Rol | null | undefined, capacidad: Capacidad): boolean {
  return !!rol && (matriz[capacidad] as readonly Rol[]).includes(rol)
}
