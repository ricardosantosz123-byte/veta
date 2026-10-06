import {
  Boxes,
  ClipboardList,
  CreditCard,
  Factory,
  FileText,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { puede, type Capacidad, type Rol } from '@/lib/permisos'

// Módulos de la barra lateral (docs/PRD.md §5). Cada uno se muestra solo a los roles con su capacidad (PRD §4).
export interface Modulo {
  ruta: string
  nombre: string
  icono: LucideIcon
  grupo: 'operacion' | 'cuenta'
  permiso: Capacidad
  vacio: { titulo: string; descripcion: string; accion: string }
}

export const modulos: Modulo[] = [
  {
    ruta: '/tablero',
    nombre: 'Tablero',
    icono: LayoutDashboard,
    grupo: 'operacion',
    permiso: 'ver_tablero',
    vacio: {
      titulo: 'Tu tablero está listo',
      descripcion: 'Aquí verás ventas, cobranza, producción y margen en cuanto registres tu primera cotización.',
      accion: 'Crea tu primera cotización',
    },
  },
  {
    ruta: '/cotizaciones',
    nombre: 'Cotizaciones',
    icono: FileText,
    grupo: 'operacion',
    permiso: 'ver_cotizaciones',
    vacio: {
      titulo: 'Aún no hay cotizaciones',
      descripcion: 'Cotiza en minutos con tu lista de precios y envíala por correo o WhatsApp.',
      accion: 'Crea tu primera cotización',
    },
  },
  {
    ruta: '/pedidos',
    nombre: 'Pedidos',
    icono: ShoppingBag,
    grupo: 'operacion',
    permiso: 'ver_pedidos',
    vacio: {
      titulo: 'Aún no hay pedidos',
      descripcion: 'Los pedidos nacen de una cotización aceptada. Aquí llevarás anticipos, saldos y entregas.',
      accion: 'Convierte una cotización',
    },
  },
  {
    ruta: '/clientes',
    nombre: 'Clientes',
    icono: Users,
    grupo: 'operacion',
    permiso: 'ver_clientes',
    vacio: {
      titulo: 'Aún no hay clientes',
      descripcion: 'Registra a tus clientes para cotizarles y ver su historial y saldo.',
      accion: 'Agrega tu primer cliente',
    },
  },
  {
    ruta: '/catalogo',
    nombre: 'Catálogo',
    icono: Package,
    grupo: 'operacion',
    permiso: 'ver_catalogo',
    vacio: {
      titulo: 'Tu catálogo está vacío',
      descripcion: 'Da de alta tus modelos con sus opciones y costos para cotizar al instante.',
      accion: 'Crea tu primer modelo',
    },
  },
  {
    ruta: '/produccion',
    nombre: 'Producción',
    icono: Factory,
    grupo: 'operacion',
    permiso: 'ver_produccion',
    vacio: {
      titulo: 'No hay órdenes de producción',
      descripcion: 'Asigna cada etapa a un destajista y sigue el avance en un tablero.',
      accion: 'Crea una orden',
    },
  },
  {
    ruta: '/mis-ordenes',
    nombre: 'Mis órdenes',
    icono: ClipboardList,
    grupo: 'operacion',
    permiso: 'mis_ordenes',
    vacio: {
      titulo: 'No tienes órdenes asignadas',
      descripcion: 'Cuando te asignen trabajo, aquí verás qué hacer, para cuándo y cuánto te pagan.',
      accion: 'Ver mis pagos',
    },
  },
  {
    ruta: '/insumos',
    nombre: 'Insumos',
    icono: Boxes,
    grupo: 'operacion',
    permiso: 'ver_insumos',
    vacio: {
      titulo: 'Aún no hay insumos',
      descripcion: 'Lleva existencias de madera, tela, espuma y herrajes, con alertas bajo el mínimo.',
      accion: 'Agrega tu primer insumo',
    },
  },
  {
    ruta: '/ajustes',
    nombre: 'Ajustes',
    icono: Settings,
    grupo: 'cuenta',
    permiso: 'configurar_empresa',
    vacio: {
      titulo: 'Ajustes de tu empresa',
      descripcion: 'Datos de la empresa, IVA, vigencia, anticipo, usuarios y cobros en línea.',
      accion: 'Configura tu empresa',
    },
  },
  {
    ruta: '/suscripcion',
    nombre: 'Suscripción',
    icono: CreditCard,
    grupo: 'cuenta',
    permiso: 'gestionar_suscripcion',
    vacio: {
      titulo: 'Tu suscripción',
      descripcion: 'Consulta tu periodo de prueba, elige un plan y administra tu método de pago.',
      accion: 'Ver planes',
    },
  },
]

export function modulosDe(rol: Rol | null): Modulo[] {
  return modulos.filter((m) => puede(rol, m.permiso))
}
