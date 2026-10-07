# Veta · Documento de producto (V1)

> Nombre de trabajo: **Veta**. Se cambia en un solo lugar (`src/config/marca.ts`) cuando se decida el definitivo. Ver §13.

## 1. En una línea

Software por suscripción para el sector mueblero que lleva un mueble de la **cotización** al **cobro final**, pasando por la **producción por etapas** con destajistas, y le da al cliente final un **portal para ver su pedido** sin llamar.

## 2. Para quién

| Segmento | Cómo opera hoy | Dolor principal | Qué le da Veta |
|---|---|---|---|
| **Mueblerías que maquilan** | Venden y mandan a producir con destajistas externos por etapa (carpintería en blanco, laca, tapicería, herrajes) | Cotizan en Excel, pierden el control de anticipos, no saben qué le deben a cada destajista ni cuánto ganaron por pedido | Cotizador con su lista de precios, cobranza con anticipo y saldo, órdenes por destajista, margen real por pedido |
| **Talleres que fabrican** (carpintería, laca, tapicería) | Producen para clientes finales o para mueblerías y diseñadores; pagan destajos semanales | No saben cuánto cuesta cada pieza, las cotizaciones tardan días, nadie sabe en qué etapa va cada pedido | Costeo por etapa, cotización en minutos, tablero de producción y pagos de destajo |

Un mismo modelo de datos atiende a ambos: en el taller el "destajista" puede ser interno (empleado a destajo) y en la mueblería, externo.

## 3. Alcance

**V1 incluye**

1. Cuenta, empresa, prueba de 14 días sin tarjeta y suscripción.
2. Usuarios con 6 roles (Admin, Vendedor, Comprador, Producción, Proveedor y Contador) más el portal del cliente final.
3. Catálogo con variaciones y **dos métodos de precio** a elegir por empresa.
4. Clientes.
5. Cotizador con PDF de marca, envío por correo y WhatsApp prearmado, y **venta por partes**.
6. Pedidos y cobranza: anticipo, saldo, pagos manuales con comprobante y **link de pago** de Mercado Pago.
7. Producción por etapa con destajistas: órdenes, avances y pagos de destajo.
8. Insumos básicos: entradas, salidas, existencias y mínimos.
9. Portal del cliente final.
10. Tablero de indicadores.

**Fuera de la V1** (fase 2 o posterior)

- Timbrado de CFDI. En V1 solo se marca el pedido como `facturado`.
- Varias sucursales por cuenta.
- WhatsApp Business API (en V1 solo links `wa.me`).
- Stripe Connect para que las mueblerías cobren con Stripe (en V1 cobran con su propio Mercado Pago).
- Mercado Pago por OAuth (en V1 cada empresa pega su Access Token).
- Importar catálogo desde Excel (la V1 arranca con captura manual).
- App nativa (la V1 es una PWA instalable).
- Inventario de producto terminado y almacenes múltiples.

## 4. Roles y permisos

| Capacidad | Admin | Vendedor | Comprador | Producción | Destajista | Contador | Cliente final |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Configurar empresa, usuarios y suscripción | ✅ | | | | | | |
| Ver catálogo y precios | ✅ | ✅ | ✅ | ✅ | | ✅ | |
| Editar catálogo y precios | ✅ | | | | | | |
| Ver costos por etapa | ✅ | | ✅ | ✅ | | ✅ | |
| Ver margen de venta y márgenes | ✅ | | ✅ | | | ✅ | |
| Clientes y cotizaciones | ✅ | ✅ | 👁 | | | 👁 | |
| Convertir a pedido y registrar cobros | ✅ | ✅ | 👁 | | | 👁 | |
| Anular un pago | ✅ | | | | | | |
| Crear órdenes y pagar destajos | ✅ | | ✅ | ✅ | | 👁 | |
| Ver y avanzar **sus** órdenes | | | | | ✅ | | |
| Insumos | ✅ | | ✅ | ✅ | | 👁 | |
| Bitácora | ✅ | | | | | | |
| Ver su pedido (portal) | | | | | | | ✅ |

👁 = solo lectura. El **Comprador** (2026-10-06) asigna pedidos a los proveedores, les registra pagos y compra insumos; en la base cuenta como Producción y como Contador (`tiene_rol`). Todo está aplicado en la base de datos con RLS (ver `supabase/migrations`) y probado en `supabase/tests`. La interfaz solo oculta lo que la base ya protege.

Un usuario puede pertenecer a varias empresas (por ejemplo, un tapicero que trabaja para tres mueblerías). Al entrar elige la empresa activa.

## 5. Módulos y reglas de negocio

### 5.1 Registro y configuración

- Registro con correo y contraseña o enlace mágico (Supabase Auth).
- Asistente de alta en 3 pasos: nombre de la empresa y `slug` (para el portal), logo y color, y método de precio. Luego, el tablero vacío con una guía de "primeros pasos".
- La empresa nace con: prueba de 14 días, 5 etapas editables (Carpintería, Acabado/Laca, Tapicería, Herrajes, Empaque) y una lista de precios "General" sin IVA. **El catálogo arranca vacío.**
- Ajustes: IVA (16% por defecto), vigencia de cotización (15 días), anticipo (60%), condiciones comerciales para el PDF, datos fiscales (texto, sin timbrado) y conexión con Mercado Pago.
- Invitaciones por correo con su rol. Al iniciar sesión se ejecuta `aceptar_invitaciones()`.

### 5.2 Catálogo y costeo

- **Categorías** (Silla, Banco, Mesa, Cubierta, Base, Sofá…), **modelos** con foto y **grupos de opciones** (Madera, Recubrimiento, Tela/Color, Medida…) asignados por modelo.
- **Método A · Costo por etapas + margen de venta** (`componentes`). Cada modelo tiene un costo base por etapa y ajustes por opción. Por ejemplo: Carpintería 1,800; Tapicería 900; Nogal +600 en Carpintería; Piel +900 en Tapicería.
  `precio = Σ costos aplicables ÷ (1 − margen de venta del modelo)`. Un margen de 30 % significa que el 30 % del precio es utilidad (costo ÷ 0.70). Tope: 90 %. (Antes de 2026-10-06 era `× (1 + markup)`.)
- **Método B · Precio base + ajustes** (`base_ajustes`). `precio = precio base del modelo + Σ ajustes de las opciones elegidas`.
- **Listas de precios**: factor, si incluyen IVA y redondeo hacia arriba (por ejemplo, la lista "Expo" con IVA incluido y redondeada a la centena).
- **Mueble sobre diseño**: el modelo se marca `sobre_diseno` o el renglón va sin modelo. En ambos casos el precio es manual.
- El precio se calcula **en el servidor** (`calcular_precio`) para que el Vendedor nunca reciba costos.

### 5.3 Clientes

Nombre, apellidos (obligatorios para el buscador del portal), empresa (B2B: despacho, hotel, desarrollador), teléfono, correo, dirección y notas. Búsqueda rápida y el historial de cotizaciones, pedidos y saldo de cada cliente.

### 5.4 Cotizador

- Flujo: elegir cliente (o crearlo en línea), elegir lista, agregar renglones (modelo, opciones, cantidad), ajustar descuento %, envío y notas.
- Precio automático, editable a mano (queda `precio_manual` y se registra en la bitácora).
- Al cambiar de lista: `recalcular_precios_cotizacion()` recalcula los automáticos y respeta los manuales.
- Folio consecutivo por empresa, vigencia automática y estados: `borrador → enviada → parcial / aceptada`, o bien `vencida / cancelada`.
- **PDF de marca**: logo, folio, fecha, vigencia, cliente, renglones con opciones legibles, subtotal, descuento, envío, IVA (o la leyenda "precios con IVA incluido"), total y condiciones.
- **Enviar**: correo con el PDF adjunto, o WhatsApp prearmado (`wa.me`) con el resumen y el link de descarga.
- **Venta por partes**: el usuario elige qué renglones se convierten en pedido (`crear_pedido_desde_cotizacion`). Los vendidos quedan bloqueados.

### 5.5 Pedidos y cobranza

- Totales, pagado, saldo y anticipo requerido los calcula la base de datos. El cliente no puede alterarlos.
- **Estados automáticos**

  ```
  anticipo_pendiente ──(pagado ≥ anticipo)──▶ en_produccion ──(todas las etapas terminadas)──▶ terminado
        terminado ──(pagado ≥ total)──▶ liquidado ──(manual)──▶ entregado
  cualquiera ──(manual, Admin)──▶ cancelado
  ```

- **Regla dura**: un pedido no puede pasar a `entregado` con saldo pendiente. El finiquito se cobra contra aviso de producto terminado.
- **Pagos manuales**: efectivo, transferencia, tarjeta u otro, con referencia y comprobante (foto o PDF). Solo el Admin anula.
- **Link de pago**: genera una preferencia de Mercado Pago por el anticipo o el saldo con la cuenta de la propia mueblería. El webhook registra el pago solo, con idempotencia (`externo_id`).
- **Recibo** PDF por pago y estado de cuenta del pedido, con envío por correo o `wa.me`.
- Fecha compromiso, dirección de entrega y marca `facturado` con adjunto del CFDI emitido por fuera.

### 5.6 Producción

- **Órdenes de producción** por renglón del pedido y por etapa, asignadas a un destajista con costo acordado y fecha compromiso.
- **Tablero kanban** por etapa (Pendiente, En proceso, Terminada) con filtros por destajista y semáforo de atraso.
- **Destajista**: vista móvil con sus órdenes, el botón "Empecé / Terminé" (`marcar_avance_orden`) y sus pagos y saldo. No ve clientes, precios de venta ni otros destajistas.
- **Pagos de destajo** por orden. Reporte semanal: cuánto se le debe a cada destajista.
- Al terminar todas las etapas de un renglón, el renglón pasa a terminado. Cuando todos los renglones terminan, el pedido pasa a `terminado` y dispara el aviso al cliente.
- PDF de la orden para el destajista, con descripción, opciones, cantidad, fecha y costo acordado.

### 5.7 Insumos básicos

Madera, tela, piel, espuma, herrajes, acabados y empaque, con su unidad. Entradas (con costo, que actualiza el costo promedio), salidas (opcionalmente ligadas a una orden: "le entregué 12 m de tela al tapicero") y ajustes. Muestra la existencia y una alerta bajo el mínimo. En V1 no descuenta solo a partir del costeo.

### 5.8 Portal del cliente final

- **Link único** `/{slug}/p/{token}`: se comparte por WhatsApp y no requiere cuenta.
- **Buscador** `/{slug}/seguimiento`: folio de pedido más apellidos (sin importar acentos ni mayúsculas).
- Muestra: logo y nombre de la mueblería, folio, fecha, fecha compromiso, estado, renglones con su avance por etapa, pagos, saldo y el botón "Pagar saldo" si hay un link activo.
- No muestra costos, destajistas, notas internas ni datos de contacto del cliente.
- Todo pasa por la Edge Function `portal`, con límite de 10 intentos por IP cada 10 minutos.

### 5.9 Avisos

| Evento | Correo | WhatsApp prearmado |
|---|:-:|:-:|
| Invitación a usuario | ✅ | |
| Cotización enviada (con PDF) | ✅ | ✅ |
| Pago recibido (con recibo) | ✅ | ✅ |
| Pedido terminado, listo para finiquito | ✅ | ✅ |
| Orden asignada al destajista | | ✅ |
| Prueba por vencer (3 días antes y el último día) | ✅ | |

### 5.10 Tablero (Admin y Contador)

Ventas del mes, cobrado del mes, cuentas por cobrar, conversión de cotización a pedido, **margen sobre destajos** por pedido (`v_pedido_resumen`: venta sin IVA menos el costo de las órdenes; con la nota "No incluye material de insumos"), pedidos por estado y por etapa, adeudo con destajistas, insumos bajo mínimo y cotizaciones por vencer. El Vendedor ve su propio tablero sin montos de costo.

### 5.11 Suscripción

- Prueba de **14 días sin tarjeta**. Al vencer, la cuenta queda en **solo lectura** (la base lo impone con `puede_escribir()`), con un banner para suscribirse.
- **Stripe Billing**: plan mensual y anual. Los precios **se definen después** y se cargan como `STRIPE_PRICE_MENSUAL` y `STRIPE_PRICE_ANUAL`, sin tocar código.
- Checkout de Stripe para suscribirse y Portal de Cliente de Stripe para la tarjeta, las facturas y la cancelación.
- El webhook actualiza `estado_suscripcion`, `periodo_termina` y `plan_intervalo`. Mapeo de estados de Stripe: `active`, `trialing` y `past_due` → `activa` (mientras Stripe reintenta el cobro); `unpaid` e `incomplete_expired` → `vencida`; `canceled` → `cancelada`.

## 6. Arquitectura

```
Netlify (PWA React)  ──supabase-js──▶  Supabase
   │                                     ├─ Postgres + RLS (toda la lógica de negocio crítica)
   │                                     ├─ Auth (correo, enlace mágico)
   │                                     ├─ Storage (publico/, privado/)
   │                                     └─ Edge Functions (Deno)
   │                                          ├─ portal            ← público, con límite por IP
   │                                          ├─ invitar           → Resend
   │                                          ├─ notificar         → Resend (vía Database Webhooks)
   │                                          ├─ stripe-checkout / stripe-portal / stripe-webhook
   │                                          ├─ mp-conectar / mp-crear-link / mp-webhook
   │                                          └─ avisos            (pedido listo, pago MP y prueba por vencer; pg_net + pg_cron)
   └─ /{slug}/p/{token}  (portal, misma app)
```

**Principio**: lo que protege dinero o datos (totales, saldos, estados, permisos, costos) vive en la base de datos, no en el frontend.

## 7. Seguridad y datos personales

- RLS en todas las tablas, aislamiento por `empresa_id` y validación de referencias cruzadas en triggers.
- Los costos viven en tablas separadas (`costos_modelo`, `modelo_costeo`, `cotizacion_item_costos`) que el Vendedor no puede leer.
- Los campos de suscripción de `empresas` no son editables por el usuario (permisos por columna).
- El token de Mercado Pago vive en `empresa_secretos` (solo service_role). Recomendación: migrarlo a Supabase Vault.
- Los webhooks verifican firma (Stripe) o consultan el pago en la API (Mercado Pago). Nunca confían en el cuerpo de la petición.
- **Requisito de lanzamiento · correo de Auth**: antes del primer cliente real, verificar el dominio en Resend, configurarlo como SMTP de Supabase Auth y volver a encender **Confirm email**. Sin confirmación de correo, alguien podría registrarse con el correo de un invitado y quedarse con su invitación (`aceptar_invitaciones()` confía en el correo de la cuenta). En desarrollo (`veta-dev`) está apagado temporalmente.
- **LFPDPPP**: aviso de privacidad y términos en la landing y en el registro. Veta es *encargado* de los datos de los clientes de cada mueblería; la mueblería es la *responsable*.

## 8. Indicadores del producto

- **Activación**: primera cotización enviada en menos de 30 minutos desde el registro.
- **Conversión** de prueba a pago a los 14 días.
- **Uso semanal**: cotizaciones y pedidos por cuenta activa.
- **Cancelación** mensual.

## 9. Diseño

Minimalista estilo Apple: tipografía del sistema (SF Pro o Inter), grises neutros, un solo color de acento (el de la empresa en PDFs y portal), mucho espacio en blanco, bordes sutiles, sin degradados, modo claro y oscuro, objetivos táctiles de 44 px y móvil primero en las vistas de Destajista y Portal. Montos en formato `es-MX` y `MXN`.

## 10. Decisiones abiertas

1. Precio de la suscripción (mensual y anual).
2. Nombre definitivo (§13).
3. Límite de usuarios por plan, o usuarios ilimitados.
4. Si el Vendedor puede bajar precios sin autorización (hoy puede, y queda en la bitácora). Opción: tope de descuento por rol.

## 11. Riesgos

| Riesgo | Mitigación |
|---|---|
| Fricción al capturar el catálogo desde cero | Asistente de primer modelo y plantilla de grupos de opciones. Importar Excel en fase 2. |
| Pegar el token de Mercado Pago es técnico para el cliente | Guía paso a paso con capturas. OAuth en fase 2. |
| El destajista no usa la app | Funciona con `wa.me` y PDF aunque no entre. El acceso es opcional. |
| CFDI es la primera petición de los clientes | Comunicar que llega en fase 2 y permitir adjuntar el CFDI externo. |

## 12. Glosario

> En la interfaz, "destajista" se muestra como **proveedor** (fabricante) y el margen como **"Margen operativo"** (decisión del 2026-10-06). En el código y la base sigue llamándose `destajista`.

**Destajista**: quien produce una etapa por pieza. **Hechura en blanco**: carpintería sin acabado. **Finiquito**: pago del saldo. **Sobre diseño**: mueble a medida sin modelo de catálogo.

## 13. Nombres propuestos

| Nombre | Idea | Por qué funciona |
|---|---|---|
| **Veta** ⭐ | La veta de la madera | Corto, premium, sirve para carpintería y tapicería |
| **Hechura** | "Hechura en blanco", término del oficio | Suena a artesanía y conecta con el taller |
| **Escuadra** | Herramienta de precisión del carpintero | Transmite exactitud en costos y tiempos |
| **Bastidor** | Estructura del mueble tapizado | Muy del sector; incluye a los tapiceros |
| **Ensamble** | Unión de piezas y de personas | Habla de mueblería + talleres + cliente |

Antes de decidir: verificar el dominio (.com / .mx / .app) y buscar en el IMPI (Marcia) en las clases 9 y 42.
