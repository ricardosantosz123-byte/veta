import {
  Boxes,
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

// Módulos de la barra lateral (docs/PRD.md §5). En la Fase 1 cada uno se filtra por rol con lib/permisos.ts.
export interface Modulo {
  ruta: string
  nombre: string
  icono: LucideIcon
  grupo: 'operacion' | 'cuenta'
  vacio: { titulo: string; descripcion: string; accion: string }
}

export const modulos: Modulo[] = [
  {
    ruta: '/tablero',
    nombre: 'Tablero',
    icono: LayoutDashboard,
    grupo: 'operacion',
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
    vacio: {
      titulo: 'No hay órdenes de producción',
      descripcion: 'Asigna cada etapa a un destajista y sigue el avance en un tablero.',
      accion: 'Crea una orden',
    },
  },
  {
    ruta: '/insumos',
    nombre: 'Insumos',
    icono: Boxes,
    grupo: 'operacion',
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
    vacio: {
      titulo: 'Tu suscripción',
      descripcion: 'Consulta tu periodo de prueba, elige un plan y administra tu método de pago.',
      accion: 'Ver planes',
    },
  },
]
