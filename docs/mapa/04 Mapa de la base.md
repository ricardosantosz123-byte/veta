# Mapa de la base de datos

> Claude Code: mantén esta nota al día con cada migración nueva (nombre, qué agrega y sus pruebas).
> Última revisión contra veta-dev: 2026-10-06. Pruebas: `supabase/tests/01_flujo_completo.sql` (243).

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
| `20261011000001_fase6_insumos.sql` | Unidad cerrada, nombre único normalizado (`nombre_norm`), costo a 4 decimales, existencia nunca negativa, entrada con costo, ajuste con motivo, salida→orden con `destajista_id`, columnas protegidas, no borrar con movimientos; `crear_insumo`, `ajustar_existencia`, `material_entregado`; `v_insumos`, `v_movimientos_insumo`; comentario "Margen sobre destajos" en `v_pedido_resumen` |
| `20261011000002_fase6_unidad_dm2.sql` | Unidad `dm2` (decímetro cuadrado) para piel |
| `20261015000001_fase10_tablero.sql` | `tablero(empresa)`: indicadores del PRD §5.10 (completo para Admin/Contador, propio y sin costos para el Vendedor) |
| `20261015000002_fase10_avisos.sql` | `pg_net` y `pg_cron`; `_avisar()` (lee URL y secreto de Vault); triggers `aviso_pedido_terminado` y `aviso_pago_mp`; tarea `veta-avisos-prueba` (diaria 15:00 UTC) |
| `20261014000001_fase9_stripe.sql` | `empresas.cancela_al_final`; tabla `stripe_eventos` (solo service_role); `guardar_cliente_stripe`, `aplicar_suscripcion_stripe` (mapeo PRD §5.11) |
| `20261013000001_fase8_mercado_pago.sql` | `empresas.mp_cuenta`; `links_pago.concepto/pagado_at/pago_id`; política `lp_upd` (solo cancelar un link activo); `mp_guardar_conexion`, `mp_desconectar`, `preparar_link_pago`, `registrar_link_pago`, `registrar_pago_mp` |
| `20261012000001_fase7_portal.sql` | `portal_pedido(token, slug)` con slug obligatorio en el portal, fecha en CDMX, fechas de cada estado y botón de pago solo con saldo; `portal_permitido` y `portal_registrar_intento` (límite por IP con hash) |

> Ojo: una vista creada con `p.*` no ve columnas agregadas después; hay que recrearla (pasó con `v_cotizaciones` y `v_pedidos`).

## Tablas por módulo
- **Suscripción:** stripe_eventos (Fase 9)
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
| `crear_insumo` | Admin, Producción | Alta con existencia inicial (exige costo) |
| `ajustar_existencia` | Admin, Producción | Ajuste por conteo físico, con motivo |
| `preparar_link_pago` | Admin, Vendedor | Valida monto, rol y conexión antes de crear la preferencia |
| `mp_desconectar` | Admin | Borra el token, desconecta y cancela links activos |
| `mp_guardar_conexion` / `registrar_link_pago` / `registrar_pago_mp` | solo service_role (Edge Functions de Mercado Pago) | Guardar token, guardar link, registrar pago aprobado (idempotente) |
| `guardar_cliente_stripe` / `aplicar_suscripcion_stripe` | solo service_role (Edge Functions de Stripe) | Ligar customer y aplicar el estado actual de la suscripción |
| `tablero` | Admin, Contador (completo); Vendedor (lo suyo, sin costos) | Indicadores del Tablero |
| `_avisar` | solo la base (triggers y pg_cron) | Llama a la Edge Function `avisos` vía pg_net |
| `material_entregado` | Admin, Producción, Contador; Destajista (lo suyo, sin valor) | Material entregado por orden |
| `hoy_mx` | todos | "Hoy" en America/Mexico_City |
| `portal_pedido` / `portal_buscar` | solo service_role (Edge Function `portal`) | Portal público |
| `portal_permitido` / `portal_registrar_intento` | solo service_role (Edge Function `portal`) | Límite de 10 intentos por IP cada 10 min |

## Vistas (todas `security_invoker`: aplican el RLS de quien consulta)
| Vista | Para qué |
|---|---|
| `v_cotizaciones` | Cotización + cliente + `estado_efectivo` (vencida con `hoy_mx`) |
| `v_clientes` | Cliente + número de cotizaciones/pedidos + saldo |
| `v_pedidos` | Pedido + cliente + anticipo faltante, saldo a favor, semáforo |
| `v_pagos` | Pago + pagado acumulado + saldo después (recibos) |
| `v_destajo_saldos` | Por destajista: por pagar, comprometido, adelantos |
| `v_pedido_resumen` | Margen sobre destajos por pedido (Admin y Contador); no incluye material |
| `v_insumos` | Insumo + `bajo_minimo`, `valor_existencia`, último movimiento |
| `v_movimientos_insumo` | Historial con efecto, valor, existencia después, orden y destajista |

## Edge Functions
| Función | Para qué |
|---|---|
| `invitar` | Guarda la invitación (RLS) y, con Resend, manda el enlace mágico solo al invitado |
| `notificar` | `cotizacion_enviada` y `pago_recibido` con PDF adjunto (responde `no_configurado` sin Resend) |
| `mp-conectar` | Admin: valida el Access Token en `/users/me` y lo guarda con `mp_guardar_conexion` |
| `mp-crear-link` | Admin/Vendedor: `preparar_link_pago` → preferencia de Checkout Pro → `registrar_link_pago`. Usa `APP_URL` |
| `mp-webhook` | Pública (`verify_jwt = false`): consulta el pago en la API y llama `registrar_pago_mp` |
| `stripe-checkout` | Admin: customer + Checkout Session (subscription). **Sin desplegar** (faltan secretos de Stripe) |
| `stripe-portal` | Admin: sesión del Portal de Cliente. **Sin desplegar** |
| `stripe-webhook` | Pública con firma (`verify_jwt = false`): relee la suscripción y llama `aplicar_suscripcion_stripe`. **Sin desplegar** |
| `avisos` | Pública con `x-avisos-secreto` (`verify_jwt = false`): pedido terminado, pago de Mercado Pago y prueba por vencer. Desplegada; sin Resend responde `no_configurado` |
| `portal` | Pública (`verify_jwt = false`). GET link y POST buscador; límite por IP, CORS de `APP_ORIGINS`, 404 genérico. Secretos: `PORTAL_SALT`, `APP_ORIGINS` (ya puestos en veta-dev) |

## Configuración fuera de las migraciones (veta-dev)
- **Vault:** `veta_funciones_url`, `veta_avisos_secreto` (para `_avisar`).
- **Secretos de funciones:** `APP_URL`, `APP_ORIGINS`, `PORTAL_SALT`, `AVISOS_SECRET`. Faltan los de Stripe y Resend (ver `supabase/functions/.env.example`).
- **Extensiones:** `pg_net`, `pg_cron` (job `veta-avisos-prueba`).

## Helpers de seguridad
`es_miembro`, `tiene_rol`, `mi_destajista`, `puede_escribir`, `_valida_empresa`
