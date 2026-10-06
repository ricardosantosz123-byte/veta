# Reglas de negocio

> Cada regla debe estar garantizada en la base y cubierta por una prueba en `supabase/tests/01_flujo_completo.sql`.

## Dinero
- IVA 16% por defecto, configurable por empresa.
- Anticipo 60% por defecto: al cubrirlo, el pedido pasa solo a *en producción*.
- **Nada sale del taller sin estar liquidado:** *entregado* está bloqueado mientras haya saldo.
- El finiquito se cobra contra aviso de producto terminado.
- Totales, pagado, saldo y anticipo los calcula la base; el navegador no puede alterarlos.

## Precios
- Método A: `precio = Σ(costo base por etapa + ajustes de opciones) ÷ (1 − margen de venta)`. 30 % → costo ÷ 0.70; sin capturar, 50 %; tope 90 %.
- Método B: `precio = precio base + Σ ajustes de opciones`.
- Listas: factor, IVA incluido o no, redondeo hacia arriba. Ejemplo: General (sin IVA) y Expo (IVA incluido, a la centena).
- Mueble sobre diseño = precio manual.

## Cotizaciones
- Vigencia de 15 días por defecto; se muestra "vencida" al pasar la fecha.
- Venta por partes: se eligen renglones; los vendidos quedan bloqueados.

## Estados del pedido
`anticipo_pendiente → en_produccion → terminado → liquidado → entregado` · `cancelado` (solo Admin, con motivo).

## Visibilidad
| Rol | Ve | No ve |
|---|---|---|
| Vendedor | catálogo, precios, clientes, cotizaciones, pedidos | costos, margen de venta, márgenes |
| Producción | costos por etapa, órdenes, insumos | margen de venta, clientes |
| Destajista | solo sus órdenes y sus pagos | todo lo demás |
| Contador | todo en lectura, márgenes | no edita |
| Cliente final | su pedido en el portal | costos, destajistas, notas |
