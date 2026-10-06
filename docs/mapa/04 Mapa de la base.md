# Mapa de la base de datos

> Claude Code: mantén esta nota al día con cada migración nueva (nombre, qué agrega y sus pruebas).
> Última revisión contra veta-dev: 2026-10-05. Pruebas: `supabase/tests/01_flujo_completo.sql` (153).

## Migraciones (`supabase/migrations/`)
| Archivo | Contenido |
|---|---|
| `20261005000001_init.sql` | Esquema base: 29 tablas, RLS, triggers de totales y estados, RPCs y portal |
| `20261005000002_storage.sql` | Buckets `publico` (lectura pública) y `privado` (solo miembros), por `{empresa_id}/…` |
| `20261006000001_fase1.sql` | `slug_disponible`, `_slug_reservado`; `crear_empresa` con errores en español |
| `20261006000002_fase1_storage.sql` | Política `publico_select` (reemplazar o borrar el logo) |
| `20261006000003_fase1_validaciones.sql` | Destajista de la misma empresa en invitaciones y miembros |
| `20261007000001_fase2_catalogo.sql` | `_validar_opciones`; `calcular_precio` (+Contador, rechaza sobre diseño); `costear_modelo`; `reordenar_catalogo`; una sola lista predeterminada |
| `20261008000001_fase3_cotizador.sql` | Precio automático siempre de la base; grupos obligatorios; `precio_sugerido`; columnas protegidas; estados derivados; teléfono a 52+10; `v_cotizaciones`, `v_clientes`; `duplicar_cotizacion`; `nombres_equipo`; `empresas.logo_pdf_path` |
| `20261008000002_fase3_importes.sql` | Columnas generadas `importe` (renglones) y `descuento_monto` (cotización y pedido) |
| `20261009000001_fase4_pedidos.sql` | `hoy_mx()`; estados del pedido (manual solo entregado/cancelado); pagos con folio R-n, solo anulables; Mercado Pago con saldo a favor; cancelar con motivo; `v_pedidos`, `v_pagos` |
| `20261010000001_fase5_produccion.sql` | Órdenes protegidas; reglas de avance; inicio sin anticipo autorizado; adelantos; `sugerir_ordenes`, `v_destajo_saldos`, `corte_destajistas` |
| `20261010000002_fase5_v_pedidos.sql` | Recrea `v_pedidos` para incluir `inicio_autorizado_*` |

> Ojo: una vista creada con `p.*` no ve columnas agregadas después; hay que recrearla (pasó con `v_cotizaciones` y `v_pedidos`).

## Tablas por módulo
- **Núcleo:** empresas, empresa_secretos, miembros, invitaciones, folios, portal_intentos, bitacora
- **Catálogo:** etapas, categorias, modelos, modelo_costeo (markup), grupos_opcion, opciones, modelo_grupos, costos_modelo, listas_precios
- **Ventas:** clientes, cotizaciones, cotizacion_items, cotizacion_item_costos
- **Pedidos:** pedidos, pedido_items, pagos_cliente, links_pago
- **Producción:** destajistas, ordenes_produccion, pagos_destajista
- **Insumos:** insumos, movimientos_insumo

## Funciones que llama la app (RPC)
| Función | Quién | Para qué |
|---|---|---|
| `crear_empresa` | usuario con sesión | Alta de empresa; quien la crea queda como Admin |
| `slug_disponible` | usuario con sesión | Validar el slug en vivo |
| `aceptar_invitaciones` | usuario con sesión | Al iniciar sesión, convierte invitaciones en membresías |
| `nombres_equipo` | miembros | Nombres del equipo (filtro por vendedor) |
| `calcular_precio` | Admin, Vendedor, Producción, Contador | Precio sin exponer costos |
| `costear_modelo` | Admin, Producción, Contador | Costo + precio de una combinación |
| `reordenar_catalogo` | Admin | Orden arrastrable de etapas, categorías, grupos y opciones |
| `recalcular_precios_cotizacion` | Admin, Vendedor | Al cambiar de lista |
| `duplicar_cotizacion` | Admin, Vendedor | Copia como borrador nuevo |
| `crear_pedido_desde_cotizacion` | Admin, Vendedor | Venta total o por partes |
| `autorizar_inicio_sin_anticipo` | Admin | Permite "Empecé" sin anticipo en un pedido |
| `sugerir_ordenes` | Admin, Producción | Etapas y costo sugerido por renglón |
| `marcar_avance_orden` | Destajista (solo avanza las suyas), Producción, Admin | Avance de producción |
| `corte_destajistas` | Admin, Producción, Contador | Corte del periodo por destajista |
| `hoy_mx` | todos | "Hoy" en America/Mexico_City |
| `portal_pedido` / `portal_buscar` | solo service_role (Edge Function `portal`, Fase 7) | Portal público |

## Vistas (todas `security_invoker`: aplican el RLS de quien consulta)
| Vista | Para qué |
|---|---|
| `v_cotizaciones` | Cotización + cliente + `estado_efectivo` (vencida con `hoy_mx`) |
| `v_clientes` | Cliente + número de cotizaciones/pedidos + saldo |
| `v_pedidos` | Pedido + cliente + anticipo faltante, saldo a favor, semáforo |
| `v_pagos` | Pago + pagado acumulado + saldo después (recibos) |
| `v_destajo_saldos` | Por destajista: por pagar, comprometido, adelantos |
| `v_pedido_resumen` | Margen bruto por pedido (Admin y Contador) |

## Edge Functions
| Función | Para qué |
|---|---|
| `invitar` | Guarda la invitación (RLS) y, con Resend, manda el enlace mágico solo al invitado |
| `notificar` | `cotizacion_enviada` y `pago_recibido` con PDF adjunto (responde `no_configurado` sin Resend) |

## Helpers de seguridad
`es_miembro`, `tiene_rol`, `mi_destajista`, `puede_escribir`, `_valida_empresa`
