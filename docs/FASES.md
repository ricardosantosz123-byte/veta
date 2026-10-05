# Plan de construcción por fases

Cómo usar este archivo:

1. Abre Claude Code en la raíz del repo (`claude`).
2. Copia el prompt de la fase **completo** y pégalo. Claude Code leerá `CLAUDE.md` y el PRD.
3. Revisa el plan que te proponga, apruébalo y deja que construya.
4. No pases a la siguiente fase hasta cumplir los **criterios de aceptación**.
5. Al cerrar cada fase: `/clear` para empezar la siguiente con contexto limpio.

Tiempo estimado total: 3 a 5 semanas a ritmo de medio tiempo.

---

## Fase 0 · Arranque

**Modo nube** (sin Docker ni Supabase local; se trabaja contra el proyecto `veta-dev`).

**Tú haces antes**: instalar Node LTS y Claude Code. Crear el proyecto `veta-dev` en Supabase. Copiar el kit en el repo, instalar la CLI con `npm install supabase --save-dev`, correr `npx supabase init`, `npx supabase login`, `npx supabase link --project-ref <ref>` y `npx supabase db push` (las 2 migraciones).

```text
Lee CLAUDE.md y docs/PRD.md completos.

Fase 0 · Arranque del proyecto (modo nube):
1. Inicializa el frontend con Vite + React + TypeScript strict en la raíz, con Tailwind, shadcn/ui (tema neutro, radio 12px, modo claro/oscuro), React Router, TanStack Query, react-hook-form, zod, lucide-react y vite-plugin-pwa.
2. Confirma que las migraciones de supabase/migrations ya están aplicadas en veta-dev (`npx supabase db push --dry-run` no debe tener pendientes).
3. Genera src/types/database.ts con `npx supabase gen types typescript --linked`.
4. Crea src/lib/supabase.ts, src/lib/formato.ts (moneda MXN, fechas es-MX), src/config/marca.ts y el layout base: barra lateral con los módulos del PRD, encabezado con selector de empresa activa y menú de usuario.
5. Crea netlify.toml (build, publish, redirect SPA), .env.example y scripts typecheck/lint/build.
Propón el plan antes de ejecutar.
```

**Aceptación**: `npm run dev` muestra el layout vacío conectado a veta-dev; `db push --dry-run` sin migraciones pendientes; `npm run build` sin errores.

---

## Fase 1 · Cuenta, empresa, roles e invitaciones

```text
Lee CLAUDE.md y docs/PRD.md §4 y §5.1.

Fase 1:
1. Auth: registro, inicio de sesión con contraseña y con enlace mágico, recuperación de contraseña. Al iniciar sesión llama `aceptar_invitaciones()`.
2. Si el usuario no pertenece a ninguna empresa: asistente de alta en 3 pasos (nombre + slug con validación en vivo, logo + color, método de precio) usando `crear_empresa`. El logo se sube a Storage `publico/{empresa_id}/logo.*`.
3. Contexto EmpresaActiva: lista de membresías del usuario, selector, rol actual y `puede_escribir`. Guarda la última empresa elegida.
4. src/lib/permisos.ts: mapa de capacidades por rol, espejo exacto de la matriz del PRD §4. Hook `usePuede('editar_catalogo')`.
5. Ajustes > Empresa: datos, IVA, vigencia, anticipo, condiciones comerciales.
6. Ajustes > Usuarios (solo Admin): lista de miembros, invitar por correo con rol (si es destajista, elegir o crear el destajista), cambiar rol, desactivar. Edge Function `invitar` que inserta la invitación y envía el correo con Resend (enlace mágico a la app).
7. Banner de prueba: días restantes; si `puede_escribir` es falso, el modo solo lectura deshabilita las acciones.
Agrega pruebas al SQL si creas funciones nuevas.
```

**Aceptación**: crear empresa, invitar a un Vendedor y a un Destajista con correos reales de prueba, entrar con cada uno y ver solo los módulos de su rol.

---

## Fase 2 · Catálogo y costeo

```text
Lee CLAUDE.md y docs/PRD.md §5.2.

Fase 2 · Catálogo (Admin edita; Vendedor y Producción consultan):
1. Categorías y Etapas (orden arrastrable).
2. Grupos de opciones y sus opciones (orden, activo, ajuste_precio visible solo si el método es base_ajustes).
3. Modelos: lista con foto, filtros por categoría; ficha con foto (Storage publico/{empresa_id}/modelos/), descripción, grupos aplicables, marca "sobre diseño".
4. Costeo del modelo (solo si el método es componentes): tabla etapa × costo base, y ajustes por opción por etapa; markup del modelo (solo Admin). Muestra en vivo el costo y el precio resultante para una combinación de opciones elegida.
5. Precio base (si el método es base_ajustes).
6. Listas de precios: factor, incluye IVA, redondeo, predeterminada.
7. "Simulador de precio": modelo + opciones + lista → `calcular_precio`. Es la misma pieza que usará el cotizador.
8. Estado vacío con asistente "Crea tu primer modelo en 3 pasos".
El Vendedor ve el catálogo sin columnas de costo ni markup (verifícalo entrando con un Vendedor).
```

**Aceptación**: capturar la silla de prueba del test (Natalia: Carpintería 1,800, Tapicería 900, Nogal +600, Piel +900, markup 1.0) y que el simulador dé 8,400 en General y 9,800 en Expo.

---

## Fase 3 · Clientes y cotizador

```text
Lee CLAUDE.md y docs/PRD.md §5.3 y §5.4.

Fase 3:
1. Clientes: lista con búsqueda, alta rápida (modal) y ficha con historial y saldo.
2. Cotizador (pantalla principal del producto, escritorio primero):
   - Encabezado: cliente (buscar o crear en línea), lista de precios, fecha y vigencia.
   - Renglones: modelo → selects por grupo de opciones → cantidad → precio automático (lo devuelve la base al insertar). Permite editar el precio a mano (precio_manual = true) con indicador visual. Renglón "sobre diseño" con descripción libre y precio manual.
   - Pie: descuento %, envío, notas; totales que vienen de la base (subtotal, IVA o "IVA incluido", total).
   - Al cambiar de lista: confirmar y llamar `recalcular_precios_cotizacion`.
   - Atajos de teclado para agregar renglón y guardar. Autoguardado como borrador.
3. PDF de cotización con @react-pdf/renderer: logo, color de marca, folio, fechas, cliente, renglones con opciones legibles, totales, condiciones de la empresa. Diseño minimalista premium.
4. Enviar: (a) correo con el PDF adjunto vía Edge Function `notificar` (tipo cotizacion_enviada); (b) WhatsApp: src/lib/whatsapp.ts arma el link wa.me con el teléfono del cliente y un mensaje con folio, total, vigencia y link de descarga del PDF (súbelo a Storage privado y genera una URL firmada de 15 días). Marca la cotización como "enviada".
5. Lista de cotizaciones con filtros por estado, vencimiento y vendedor; duplicar cotización.
6. "Convertir en pedido": modal con checkboxes por renglón (venta por partes), incluir envío sí/no y fecha compromiso → `crear_pedido_desde_cotizacion`.
```

**Aceptación**: cotizar 4 sillas más una mesa sobre diseño, descargar un PDF impecable, enviarlo por WhatsApp y vender solo las sillas. La cotización queda "parcial".

---

## Fase 4 · Pedidos y cobranza

```text
Lee CLAUDE.md y docs/PRD.md §5.5.

Fase 4:
1. Lista de pedidos: columnas folio, cliente, total, pagado, saldo, estado (badge), fecha compromiso; filtros y semáforo de atraso.
2. Ficha del pedido: renglones con su estado de producción, línea de tiempo de estados, pagos, saldo, anticipo requerido, dirección de entrega, notas, marca "facturado" con adjunto (Storage privado).
3. Registrar pago: monto (sugerir el anticipo faltante o el saldo), método, referencia, fecha y comprobante (foto desde el celular). Solo el Admin puede anular.
4. Recibo de pago en PDF y botón WhatsApp/correo (tipo pago_recibido).
5. Botón "Marcar entregado": deshabilitado con explicación si hay saldo (la base también lo bloquea).
6. Botón "Compartir seguimiento": copia el link del portal y abre wa.me con el mensaje. (El portal se construye en la Fase 7; deja la ruta preparada.)
7. Estado de cuenta del cliente: todos sus pedidos, pagos y saldo total.
```

**Aceptación**: registrar el anticipo y ver el pedido pasar solo a "en producción"; intentar entregar con saldo y ver el bloqueo.

---

## Fase 5 · Producción y destajistas

```text
Lee CLAUDE.md y docs/PRD.md §5.6.

Fase 5:
1. Destajistas (Admin/Producción): alta con especialidad, interno/externo, teléfono, invitación opcional a la app.
2. Desde el pedido: "Mandar a producción" → por cada renglón, crear órdenes por etapa (preselecciona las etapas con costo en el modelo y sugiere costo_acordado = costo de esa etapa × cantidad, editable), asignar destajista y fecha compromiso.
3. Tablero de producción: kanban por etapa con columnas Pendiente / En proceso / Terminada, filtros por destajista y atraso, y arrastrar entre columnas (usa `marcar_avance_orden`).
4. Pagos de destajo: registrar pago por orden; reporte "Corte semanal" de lo que se le debe a cada destajista, exportable a PDF.
5. Vista Destajista (móvil primero, ruta /mis-ordenes): sus órdenes agrupadas por estado, botones grandes "Empecé" / "Terminé" con nota opcional, y su saldo por cobrar. Nada más.
6. PDF de la orden de producción y botón wa.me para mandarla al destajista.
Verifica entrando como Destajista que no ve nada fuera de sus órdenes.
```

**Aceptación**: al terminar todas las etapas, el pedido pasa solo a "terminado" y aparece la sugerencia de avisar al cliente para el finiquito.

---

## Fase 6 · Insumos

```text
Lee CLAUDE.md y docs/PRD.md §5.7.

Fase 6: catálogo de insumos (tipo, unidad, mínimo, proveedor), registrar entrada (con costo), salida (opcionalmente ligada a una orden y su destajista) y ajuste con motivo. Muestra la existencia y el costo promedio que calcula la base, alerta bajo mínimo y el historial de movimientos por insumo. En la ficha de la orden: "Material entregado".
```

**Aceptación**: dos entradas a distinto costo dan el costo promedio correcto; la salida ligada a una orden aparece en esa orden.

---

## Fase 7 · Portal del cliente final

```text
Lee CLAUDE.md y docs/PRD.md §5.8.

Fase 7:
1. Edge Function `portal`:
   - GET ?token=… → `portal_pedido(token)`.
   - POST {slug, folio, apellidos} → `portal_buscar` y luego `portal_pedido`.
   - Usa service_role; limita 10 intentos por IP cada 10 min (tabla portal_intentos con hash SHA-256 de IP + PORTAL_SALT); CORS solo para el dominio de la app; responde 404 genérico si no hay resultado.
2. Rutas públicas sin login: /:slug/p/:token y /:slug/seguimiento (formulario folio + apellidos).
3. Diseño: móvil primero, logo y color de la mueblería, estado grande, barra de avance por etapa de cada mueble, pagos, saldo y botón "Pagar saldo" si viene link_pago. Pie "Hecho con Veta".
4. Logo desde Storage público.
```

**Aceptación**: abrir el link desde un celular sin sesión; buscar con "perez lopez" sin acentos; no aparece ningún costo ni nombre de destajista.

---

## Fase 8 · Link de pago con Mercado Pago

**Tú haces antes**: crear una cuenta de Mercado Pago de prueba (vendedor y comprador de prueba) en el panel de desarrolladores.

```text
Lee CLAUDE.md y docs/PRD.md §5.5 (link de pago).

Fase 8:
1. Ajustes > Cobros en línea (Admin): guía paso a paso para obtener el Access Token de producción de Mercado Pago, campo para pegarlo y Edge Function `mp-conectar` que lo valida contra la API (/users/me), lo guarda en empresa_secretos y pone mp_conectado = true. Botón desconectar.
2. Edge Function `mp-crear-link` (Admin/Vendedor): recibe pedido_id y monto (anticipo faltante o saldo), crea una preferencia de Checkout Pro con el token de esa empresa, external_reference = pedido_id, notification_url = mp-webhook?empresa=<id>, y back_urls al portal; inserta en links_pago.
3. Edge Function `mp-webhook`: no confíes en el cuerpo de la notificación (la firma pertenece a la app de cada mueblería, no a Veta). Toma el id de pago, consúltalo en la API de MP con el token de la empresa indicada en la URL, confirma que external_reference sea un pedido de esa empresa, y si está approved inserta pagos_cliente (metodo mercado_pago, externo_id = id de pago; idempotente) y marca el link como pagado.
4. En la ficha del pedido: botón "Generar link de pago", copiar y wa.me. En el portal: botón "Pagar saldo".
```

**Aceptación**: pagar con el comprador de prueba y ver el pago registrado solo, el saldo actualizado y el estado cambiado.

---

## Fase 9 · Suscripción con Stripe

**Tú haces antes**: cuenta de Stripe México verificada, un producto "Veta" con dos precios (mensual y anual) en modo prueba y el Portal de Cliente activado.

```text
Lee CLAUDE.md y docs/PRD.md §5.11.

Fase 9:
1. Pantalla Ajustes > Suscripción (Admin): estado, días de prueba restantes, plan actual, botones "Suscribirme mensual" / "Suscribirme anual" y "Administrar pago".
2. Edge Function `stripe-checkout`: crea o reutiliza el customer (guarda stripe_customer_id), crea una Checkout Session mode=subscription con STRIPE_PRICE_MENSUAL o STRIPE_PRICE_ANUAL, metadata empresa_id, success/cancel URLs.
3. Edge Function `stripe-portal`: sesión del Billing Portal.
4. Edge Function `stripe-webhook`: verifica la firma; maneja checkout.session.completed y customer.subscription.created/updated/deleted; actualiza estado_suscripcion (mapeo del PRD), stripe_subscription_id, plan_intervalo, periodo_termina. Idempotente.
5. Los precios se leen de variables de entorno; no hay montos en el código.
6. Banner global coherente con el estado (prueba, activa, vencida) y el modo solo lectura.
```

**Aceptación**: con la tarjeta de prueba 4242 la cuenta pasa a activa; al cancelar en el portal de Stripe, pasa a cancelada y queda en solo lectura.

---

## Fase 10 · Tablero, avisos, landing y lanzamiento

```text
Lee CLAUDE.md y docs/PRD.md §5.9, §5.10, §7 y §9.

Fase 10:
1. Tablero (Admin/Contador): tarjetas KPI y gráficas simples según el PRD §5.10, usando v_pedido_resumen y consultas agregadas. Tablero del Vendedor sin costos.
2. Avisos: Edge Function `notificar` con plantillas HTML minimalistas para cada evento del PRD §5.9; conéctala con Supabase Database Webhooks (pagos_cliente insert, pedidos update de estado). `avisos-prueba`: función programada diaria para la prueba por vencer.
3. Bitácora (Admin): lista filtrable por tabla, usuario y fecha.
4. Landing pública en / para usuarios sin sesión: propuesta de valor para mueblerías y talleres, capturas, sección de precios leída de una config, preguntas frecuentes y botón "Prueba 14 días sin tarjeta". Páginas /privacidad y /terminos (borrador, para revisión legal).
5. PWA: manifest, íconos y offline básico del shell.
6. Revisión final: accesibilidad, modo oscuro, móvil, rendimiento (Lighthouse ≥ 90), errores en español, y que ninguna clave secreta esté en el bundle.
7. Guía de despliegue: proyecto Supabase de producción (`supabase link`, `supabase db push`, `supabase functions deploy`, secretos), sitio en Netlify con variables y dominio, y webhooks de Stripe y Mercado Pago apuntando a producción.
```

**Aceptación**: una persona ajena se registra, crea su primera cotización en menos de 30 minutos y se suscribe con tarjeta real en producción.
