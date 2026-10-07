# Guía de despliegue a producción

> Borrador de la Fase 10. Se hace **una sola vez**, cuando estén listos el dominio, Resend, Stripe y el precio.
> Todo lo que diga `<…>` lo pones tú. Nunca pegues llaves secretas en el chat ni en archivos del repo.

## 0. Antes de empezar (requisitos de lanzamiento)
- [ ] **Dominio** comprado (ver `docs/mapa/05 Pendientes y riesgos.md`: nombre definitivo e IMPI).
- [ ] **Supabase Pro** para el proyecto de producción (el gratuito se pausa).
- [ ] **Resend** con el dominio verificado (registros DNS SPF/DKIM).
- [ ] **Stripe México** verificado, con el producto y los dos precios (mensual y anual) en **modo live**, y el Portal de Cliente activado.
- [ ] **Aviso de privacidad y términos** revisados por un abogado (`/privacidad` y `/terminos` hoy son borradores).
- [ ] Precio definido y escrito en `src/config/planes.ts` (el mismo que en Stripe).

## 1. Proyecto de Supabase de producción
1. En supabase.com crea un proyecto nuevo (región: la más cercana a México, p. ej. `us-east-1`). Guarda la contraseña de la base en tu gestor de contraseñas.
2. En tu Mac, dentro de `~/Proyectos/veta`, liga la CLI **al proyecto de producción** (esto cambia el proyecto ligado; para volver a veta-dev repite el `link` con `qrznjmtaljraownfrmbi`):
   ```bash
   npx supabase link --project-ref <ref-de-produccion>
   ```
3. Revisa y aplica todas las migraciones:
   ```bash
   npx supabase db push --dry-run
   npx supabase db push
   ```
4. **Auth** (Dashboard → Authentication):
   - Site URL: `https://<tu-dominio>`; Redirect URLs: `https://<tu-dominio>/**`.
   - SMTP personalizado con Resend (host `smtp.resend.com`, usuario `resend`, contraseña = API key de Resend, remitente `avisos@<tu-dominio>`).
   - **Encender "Confirm email"** (obligatorio: sin esto alguien podría registrarse con el correo de un invitado).
5. **Storage**: las migraciones crean los buckets `publico` y `privado`; confirma que existan.

## 2. Secretos de las Edge Functions
```bash
npx supabase secrets set APP_URL=https://<tu-dominio>
npx supabase secrets set APP_ORIGINS=https://<tu-dominio>
npx supabase secrets set "PORTAL_SALT=$(openssl rand -hex 32)"
npx supabase secrets set RESEND_API_KEY=<re_…> "EMAIL_FROM=<Nombre> <avisos@tu-dominio>"
npx supabase secrets set STRIPE_SECRET_KEY=<sk_live_…>
npx supabase secrets set STRIPE_PRICE_TALLER_MENSUAL=<price_…> STRIPE_PRICE_TALLER_ANUAL=<price_…> STRIPE_PRICE_MUEBLERIA_MENSUAL=<price_…> STRIPE_PRICE_MUEBLERIA_ANUAL=<price_…>
npx supabase secrets set STRIPE_PRICE_DESPACHO_MENSUAL=<price_…> STRIPE_PRICE_DESPACHO_ANUAL=<price_…> STRIPE_PRICE_EXTRA_MENSUAL=<price_…> STRIPE_PRICE_EXTRA_ANUAL=<price_…>
```
En Stripe crea 4 productos (Taller, Mueblería, Despacho de Interiores y Usuario adicional), cada uno con precio mensual y anual en MXN con IVA incluido: $300/$3,000, $500/$5,000, $500/$5,000 y $100/$1,000. Despliega también `stripe-extras`. `STRIPE_WEBHOOK_SECRET` se pone en el paso 5. La lista completa está en `supabase/functions/.env.example`.

## 3. Avisos automáticos (Vault + pg_cron)
La base llama a la función `avisos` con la URL y el secreto guardados en Supabase Vault. Corre esto **una vez** (el secreto se genera y nunca se muestra):
```bash
S=$(openssl rand -hex 32); npx supabase secrets set "AVISOS_SECRET=$S"; npx supabase db query --linked "select vault.create_secret('$S', 'veta_avisos_secreto'); select vault.create_secret('https://<ref-de-produccion>.supabase.co/functions/v1', 'veta_funciones_url');"; unset S
```
La tarea diaria `veta-avisos-prueba` (9:00 CDMX) la crea la migración de la Fase 10.

## 4. Desplegar las Edge Functions
```bash
npx supabase functions deploy invitar --use-api
npx supabase functions deploy notificar --use-api
npx supabase functions deploy mp-conectar --use-api
npx supabase functions deploy mp-crear-link --use-api
npx supabase functions deploy stripe-checkout --use-api
npx supabase functions deploy stripe-portal --use-api
npx supabase functions deploy portal --no-verify-jwt --use-api
npx supabase functions deploy mp-webhook --no-verify-jwt --use-api
npx supabase functions deploy stripe-webhook --no-verify-jwt --use-api
npx supabase functions deploy avisos --no-verify-jwt --use-api
```
Antes, `npm run check:funciones` debe pasar sin errores.

## 5. Webhook de Stripe
1. Stripe Dashboard (modo live) → Developers → Webhooks → **Add endpoint**:
   `https://<ref-de-produccion>.supabase.co/functions/v1/stripe-webhook`
2. Eventos: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.
3. Copia el **Signing secret** y guárdalo:
   ```bash
   npx supabase secrets set STRIPE_WEBHOOK_SECRET=<whsec_…>
   ```

## 6. Mercado Pago
No hay nada global que configurar: cada mueblería conecta **su propia cuenta** en Ajustes → Cobros en línea. La URL de notificación (`…/functions/v1/mp-webhook?empresa=<id>`) la manda `mp-crear-link` en cada preferencia.

## 7. Netlify
1. app.netlify.com → **Add new site → Import from Git** → repo `veta`.
2. Build command `npm run build`; publish directory `dist` (el `netlify.toml` ya trae el redirect de SPA).
3. Variables de entorno: `VITE_SUPABASE_URL=https://<ref-de-produccion>.supabase.co` y `VITE_SUPABASE_ANON_KEY=<llave publishable del proyecto de producción>` (solo la pública; jamás la service_role).
4. Domain management → agrega `<tu-dominio>` y sigue las instrucciones de DNS; Netlify emite el certificado HTTPS.

## 8. Verificación final (aceptación de la Fase 10)
- [ ] Registro con un correo externo → llega el correo de confirmación **desde tu dominio**.
- [ ] Enlace mágico, recuperar contraseña e invitación llegan a un correo externo.
- [ ] Una persona ajena se registra y envía su primera cotización en menos de 30 minutos.
- [ ] Suscripción con tarjeta real → la cuenta pasa a **activa**; cancelar en el portal de Stripe → cancelada al fin del periodo.
- [ ] Portal: abrir un link desde un celular sin sesión.
- [ ] `grep -r "sb_secret\|sk_live\|SERVICE_ROLE" dist/` no encuentra llaves reales (solo nombres de la librería).
