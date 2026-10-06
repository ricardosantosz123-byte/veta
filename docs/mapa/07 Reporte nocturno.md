# Reporte nocturno · Fases 6 a 10

> Trabajo autónomo del 2026-10-05 (noche) y 2026-10-06 (noche). Solo veta-dev, sin datos borrados, cada migración ensayada en una transacción revertida antes de aplicarla.
> Pruebas del esquema: **243 en verde** contra veta-dev · typecheck, lint y build en verde · `npm run check:funciones` (deno check) en verde.

## 1. Estado de cada fase

| Fase | Estado | Commits | Qué falta |
|---|---|---|---|
| 6 · Insumos | ✅ Completada (la diste por buena) | `1aa465c` `ddea1f1` | — |
| 7 · Portal del cliente | 🟡 Construida, desplegada y probada en el navegador (link de P-1 y búsqueda "p-1" + "SANTOS") | `aaa616e` | Tu prueba desde el celular |
| 8 · Mercado Pago | 🟡 Construida y **desplegada** (no necesita secretos globales) | `826bce9` | Cuentas de prueba de Mercado Pago y un pago de prueba |
| 9 · Stripe | 🟡 Código, pruebas y funciones listos; funciones **sin desplegar** | `65f6fef` | Cuenta de Stripe, llaves y despliegue |
| 10 · Tablero y lanzamiento | 🟡 Tablero, bitácora, avisos, landing, legales, PWA, rendimiento y guía | `8e9d67b` `9ee5346` `c56b73b` | Dominio, Resend, Netlify, revisión legal y precio |

**Sobre la Fase 6:** tus instrucciones listaban las unidades `pza, m, m2, pie_tabla, kg, l`. Conservé también **`dm2`**, que pediste esa mañana para la piel (migración `fase6_unidad_dm2`). Si ya no la quieres, dímelo.

## 2. Decisiones marcadas para revisar
Todas están en [[02 Decisiones]] con "⚠️ Decidida en modo nocturno, revisar". En resumen:

**Fase 7 · Portal**
- A1: el link sigue funcionando después de entregado. B1: botón de WhatsApp a la mueblería. C1: solo total, pagado y saldo.
- El límite de 10 intentos por IP cuenta las búsquedas y los links inexistentes; abrir un link válido no gasta intentos.

**Fase 8 · Mercado Pago**
- Generan links el Admin y el Vendedor; solo hay un link activo por pedido.
- `auto_return` solo con https: en local, el cliente regresa con "Volver al sitio".
- Las funciones de Mercado Pago **sí se desplegaron**, porque no necesitan secretos nuevos.

**Fase 9 · Stripe**
- `incomplete` deja el estado igual y `paused` lo pasa a vencida.
- No se abre un segundo pago si la suscripción ya está activa.
- La pantalla no muestra montos; el checkout está en español y acepta códigos promocionales.

**Fase 10 · Tablero y lanzamiento**
- Ventas del mes con IVA, conversión a 90 días y cotizaciones "por vencer" a 3 días.
- El Vendedor ve solo lo suyo.
- Función `avisos` separada de `notificar`; los pagos manuales siguen con PDF desde la app.
- La bitácora va como pestaña de Ajustes.
- Landing con "Precio por anunciar".

## 3. Lo que necesitas configurar tú (cuentas y llaves)
No inventé credenciales ni creé cuentas. La guía completa para producción está en `docs/DESPLIEGUE.md`. Para veta-dev:

**Mercado Pago (Fase 8)**
1. En mercadopago.com.mx/developers → **Cuentas de prueba**: crea un **vendedor** y un **comprador** de prueba.
2. Entra como el vendedor de prueba → crea una aplicación (Checkout Pro) → copia su **Access Token** (`APP_USR-…`).
3. En la app: **Ajustes → Cobros en línea** → pégalo → Conectar. No hay que poner nada en Supabase.

**Stripe (Fase 9)**
1. Cuenta de Stripe México. En **modo prueba**: un producto "Veta" con dos precios recurrentes (mensual y anual) y el **Portal de Cliente** activado.
2. En la app Terminal de tu Mac (no en el chat):
   ```bash
   cd ~/Proyectos/veta
   npx supabase secrets set STRIPE_SECRET_KEY=<sk_test_…> STRIPE_PRICE_MENSUAL=<price_…> STRIPE_PRICE_ANUAL=<price_…>
   npx supabase functions deploy stripe-checkout --use-api
   npx supabase functions deploy stripe-portal --use-api
   npx supabase functions deploy stripe-webhook --no-verify-jwt --use-api
   ```
3. Stripe → Developers → Webhooks → endpoint `https://qrznjmtaljraownfrmbi.supabase.co/functions/v1/stripe-webhook` con los eventos `checkout.session.completed` y `customer.subscription.created/updated/deleted`. Copia el *Signing secret* y guárdalo con:
   ```bash
   npx supabase secrets set STRIPE_WEBHOOK_SECRET=<whsec_…>
   ```

**Correo (Fase 10, requiere dominio)**
- Resend con el dominio verificado → `RESEND_API_KEY` y `EMAIL_FROM`.
- SMTP de Supabase Auth con Resend y **Confirm email encendido**.

**Pendientes de producto**
- Precio en Stripe y en `src/config/planes.ts`.
- Correo de soporte en `src/config/marca.ts` (hoy dice `soporte@tudominio.com`).
- Razón social y domicilio en `/privacidad` y `/terminos`, más la revisión del abogado.

**Ya configurado por mí en veta-dev** (valores al azar, nunca mostrados):
- Secretos: `PORTAL_SALT`, `APP_ORIGINS` y `AVISOS_SECRET`.
- Vault: `veta_funciones_url` y `veta_avisos_secreto`.
- Extensiones `pg_net` y `pg_cron`.

## 4. Pruebas de aceptación que te tocan

**Fase 7 · Portal**
1. `npm run dev -- --host` y, desde el celular en la misma red Wi-Fi, abre `http://<IP-de-tu-Mac>:5173/casa-sauce/p/<token>`. Para obtener el link: P-1 → **Compartir seguimiento**.
2. En `/casa-sauce/seguimiento`, busca con folio `P-1` y apellidos `santos`, sin acentos ni mayúsculas.
3. Confirma que no aparece ningún costo ni el nombre del destajista.

**Fase 8 · Mercado Pago**
1. Conecta el vendedor de prueba.
2. Crea un pedido con saldo → tarjeta **Link de pago** → Generar (anticipo o saldo).
3. Abre el link en una ventana de incógnito, entra con el **comprador de prueba** y paga con una tarjeta de prueba de Mercado Pago.
4. En unos segundos el pago aparece solo en el pedido, el saldo baja y el estado cambia.

**Fase 9 · Stripe** (después de configurar las llaves)
1. **Suscripción → Suscribirme mensual** → paga con `4242 4242 4242 4242`, cualquier fecha futura y cualquier CVC → la cuenta pasa a **activa**.
2. **Administrar pago → Cancelar**: queda "Se cancela el …". Cuando Stripe la cancela de verdad, la cuenta queda en solo lectura. Para probarlo al instante, cancela "inmediatamente" desde el panel de Stripe.

**Fase 10 · Tablero y lanzamiento**
1. Como Admin: el **Tablero** muestra ventas, cobrado, margen sobre destajos ("No incluye material de insumos"), destajistas e insumos bajo mínimo.
2. Como Vendedor (`ventas@flexora.mx`): el Tablero aparece **sin costos**.
3. **Ajustes → Bitácora**: prueba los filtros.
4. Cierra sesión y abre `/`: aparece la landing. Revisa también `/privacidad` y `/terminos`.
5. Instala la app desde el celular ("Agregar a pantalla de inicio").
6. Con Resend configurado: marca un pedido como terminado y debe llegar el correo "Tus muebles están listos".

## 5. Problemas encontrados y cómo quedaron
- **GitHub bloqueó un push** porque el marcador `sk_test_xxxx…` de `supabase/functions/.env.example` parecía una llave real. Dejé esos valores vacíos y corregí el commit antes de subirlo; no se subió ninguna llave.
- **Las pruebas veían datos de antes.** En Postgres, una subconsulta dentro del mismo `select` que llama a una función ve los datos anteriores a esa función. Separé esas pruebas en dos pasos (pasó en Insumos y en Stripe).
- **Mi primera protección de los links de pago bloqueaba al webhook.** La reemplacé por una política RLS: desde la app solo se cancela un link activo.
- **No probé con sesión** el Tablero, la Bitácora, Cobros en línea, el Link de pago y Suscripción: no inicio sesión con cuentas reales. Están revisados con typecheck, lint, build y las pruebas de la base. Sí probé en el navegador el portal, el buscador, la landing, `/privacidad` y las rutas protegidas.
- **Lighthouse del portal** salió con error de CORS: el puerto 4173 de la prueba no está en `APP_ORIGINS`, así que es el comportamiento esperado. La landing sacó 92 / 100 / 100 / 92.
- **Sigue pendiente:**
  - Contraste del rojo sobre fondos rojizos en modo claro (en otras pantallas, no en las nuevas).
  - Reembolsos y contracargos de Mercado Pago (hoy solo se registran pagos aprobados).
  - El token de Mercado Pago a Vault.
  - Todo está anotado en [[05 Pendientes y riesgos]].
- **Ninguna tarea falló 3 veces.**
