# CLAUDE.md · Veta

Instrucciones permanentes para Claude Code en este repositorio. Léelas completas antes de cada tarea.

## Qué es

SaaS multi-empresa para mueblerías y talleres (carpintería, laca, tapicería): cotizador, pedidos y cobranza, producción por etapa con destajistas, insumos y portal del cliente final. Especificación completa en `docs/PRD.md`. Plan de construcción en `docs/FASES.md`.

## Stack (no cambiar sin preguntar)

- **Frontend**: Vite + React + TypeScript (`strict`), React Router, TanStack Query, react-hook-form + zod, Tailwind CSS + shadcn/ui, lucide-react, `@react-pdf/renderer` para PDFs, `vite-plugin-pwa`.
- **Backend**: Supabase (Postgres + RLS, Auth, Storage, Edge Functions en Deno). Cliente `@supabase/supabase-js` v2.
- **Hosting**: Netlify (SPA, `netlify.toml` con redirect `/* → /index.html 200`).
- **Pagos**: Stripe Billing (suscripción de Veta) y Mercado Pago Checkout Pro (cobros de cada mueblería a sus clientes).
- **Correo**: Resend desde Edge Functions.
- Usa siempre la versión estable más reciente de cada paquete; si una API cambió, consulta su documentación antes de escribir código.

## Estructura

```
src/
  app/            rutas, layout, providers (QueryClient, Auth, EmpresaActiva)
  features/       un folder por módulo: catalogo, clientes, cotizaciones, pedidos,
                  produccion, insumos, portal, tablero, ajustes, suscripcion
    <modulo>/     components/  hooks/ (useQuery/useMutation)  api.ts  schemas.ts  pdf/
  components/ui/  shadcn
  lib/            supabase.ts, formato.ts (moneda, fechas), permisos.ts, whatsapp.ts
  config/marca.ts nombre y textos del producto (nombre de trabajo: "Veta")
  types/database.ts  generado: supabase gen types typescript --local
supabase/
  migrations/     SQL versionado (nunca editar una migración ya aplicada; crear otra)
  functions/      Edge Functions, una carpeta por función, _shared/ para utilidades
  tests/          prueba de punta a punta del esquema (run.sh)
```

## Reglas de oro

1. **La base de datos manda.** Totales, pagado, saldo, estados de pedido, folios, costos y permisos se calculan o validan en Postgres. El frontend nunca escribe `pagado`, `total`, `saldo`, `folio`, `token_portal` ni campos de suscripción.
2. **Usa las RPC existentes** para operaciones de negocio: `crear_empresa`, `aceptar_invitaciones`, `calcular_precio`, `recalcular_precios_cotizacion`, `crear_pedido_desde_cotizacion`, `marcar_avance_orden`. Si necesitas otra, créala en una migración nueva como `security definer`, con `set search_path = public` y validación de rol con `tiene_rol()`.
3. **Toda tabla nueva** lleva `empresa_id`, RLS activado, políticas por rol, `puede_escribir()` en escrituras y `revoke all on <tabla> from anon`. Agrega casos a `supabase/tests/01_flujo_completo.sql` y córrelos.
4. **Costos ocultos al Vendedor.** No consultes `costos_modelo`, `modelo_costeo` ni `cotizacion_item_costos` en vistas que vea el Vendedor. El precio se obtiene con `calcular_precio`.
5. **Nunca** expongas `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY` ni tokens de Mercado Pago en el frontend. Solo viven en secretos de Edge Functions.
6. **Webhooks**: Stripe se verifica con firma; Mercado Pago se verifica consultando el pago en su API con el token de esa empresa. Ambos son idempotentes.
7. **Permisos en UI** = espejo de RLS (`lib/permisos.ts`), solo para ocultar botones. La seguridad real es RLS.
8. **Solo lectura**: si `puede_escribir` es falso (prueba vencida), deshabilita acciones y muestra el banner de suscripción. No dependas de que la base rechace.
9. El portal público (`/:slug/p/:token`, `/:slug/seguimiento`) solo habla con la Edge Function `portal`, nunca con tablas.

## Convenciones

- Interfaz 100% en español de México. Los nombres de dominio en el código siguen la base (`cotizacion`, `pedido`, `destajista`); lo genérico va en inglés (`useAuth`, `Button`).
- Dinero: `numeric` en la base; en el frontend, formatear con `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })`. Nunca uses `float` para sumar montos en el cliente; deja que la base calcule.
- Fechas en `America/Mexico_City`, formato `d MMM yyyy`.
- Formularios: zod como fuente de verdad, mensajes de error en español claros.
- Estados vacíos con una acción clara ("Crea tu primer modelo"). Esqueletos de carga, sin spinners a pantalla completa.
- Accesibilidad: labels en todos los inputs, foco visible, contraste AA.

## Diseño

Minimalista estilo Apple: fuente del sistema (`-apple-system`, SF Pro, Inter), escala de grises neutra, un acento (`--accent`, que toma `empresas.color_marca` en PDF y portal), radios de 12 px, bordes de 1 px sutiles, sombras mínimas, sin degradados, mucho espacio en blanco, modo claro y oscuro. Móvil primero en las vistas de Destajista y Portal; escritorio primero en Cotizador y Tablero. Números tabulares (`font-variant-numeric: tabular-nums`) en tablas de montos.

## Comandos

**Modo nube**: no hay Docker ni Supabase local. Se trabaja contra el proyecto `veta-dev` (project-ref `qrznjmtaljraownfrmbi`), ya ligado con `npx supabase link`. La CLI está instalada como dependencia de desarrollo: usa siempre `npx supabase`, nunca `supabase start` ni `supabase db reset`.

```bash
npm run dev                                   # frontend
npx supabase migration new <nombre>           # nueva migración en supabase/migrations
npx supabase db push --dry-run                # ver qué migraciones faltan en veta-dev
npx supabase db push                          # aplicar migraciones pendientes a veta-dev
npx supabase db query --linked "select ..."   # consulta rápida contra veta-dev
npx supabase gen types typescript --linked > src/types/database.ts
# Pruebas del esquema contra veta-dev (psql de Postgres.app; pide la contraseña; corre en transacción y no deja datos)
PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH DATABASE_URL="$(cat supabase/.temp/pooler-url)" ./supabase/tests/run.sh
npx supabase functions deploy <nombre> --use-api   # Edge Functions sin Docker (no hay functions serve local)
npx supabase secrets set NOMBRE=valor              # secretos de Edge Functions (los secretos reales los pone el usuario)
npm run typecheck && npm run lint && npm run build
```

Como `veta-dev` es compartida y no se puede reiniciar, las migraciones se revisan con `--dry-run` antes de cada `db push`.

## Forma de trabajar

- Una fase de `docs/FASES.md` a la vez. Antes de escribir código, presenta un plan corto y espera confirmación.
- Al terminar cada fase: `typecheck`, `lint`, `build` y las pruebas del esquema en verde; luego un commit con un mensaje descriptivo en español.
- Si algo del PRD es ambiguo, pregunta con opciones concretas en vez de suponer.
- No agregues dependencias pesadas sin justificarlo.
