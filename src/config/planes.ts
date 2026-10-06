// Planes que muestra la landing. Los precios se definen después (PRD §10): mientras sean null,
// la landing dice "Precio por anunciar". El cobro real usa los precios de Stripe (STRIPE_PRICE_*);
// al decidir el precio, escríbelo aquí Y en Stripe con el mismo monto.
export const planes = {
  diasPrueba: 14,
  mensual: { nombre: 'Mensual', precio: null as number | null, periodo: 'al mes' },
  anual: { nombre: 'Anual', precio: null as number | null, periodo: 'al año' },
  incluye: [
    'Usuarios ilimitados con roles (Admin, Vendedor, Producción, Proveedor, Contador)',
    'Cotizador con tus listas de precios y PDF con tu logo',
    'Pedidos, anticipos, saldos y recibos',
    'Producción por etapa con proveedores',
    'Portal de seguimiento para tus clientes',
    'Cobro con link de Mercado Pago a tu propia cuenta',
    'Insumos con existencias y alertas',
  ],
} as const
