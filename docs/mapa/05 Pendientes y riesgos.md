# Pendientes y riesgos

## Antes del primer cliente real (bloqueantes)
- [ ] **Dominio + Resend verificado** como SMTP de Supabase Auth, y **volver a encender "Confirm email"**. Sin esto, alguien podría registrarse con el correo de un invitado y tomar su invitación.
- [ ] **Supabase Pro** para producción (el plan gratuito pausa proyectos inactivos).
- [ ] **Aviso de privacidad y términos** revisados por un abogado (LFPDPPP).
- [ ] **Precio de la suscripción** definido y cargado en Stripe.
- [ ] **Nombre definitivo:** buscarlo en el IMPI (clases 9 y 42) y comprar el dominio.

## Seguridad
- [ ] **Rotar el token de GitHub** `veta-mac`: quedó expuesto en un chat. Generar uno nuevo, actualizarlo en Acceso a Llaveros y borrar el anterior.
- [ ] Guardar el token de Mercado Pago de cada empresa en Supabase Vault (hoy está en `empresa_secretos`).

## Técnicos
- [ ] Bundle de JavaScript > 500 kB: cargar los módulos por separado (lazy), ya iniciado en Catálogo.
- [ ] Íconos PNG de la PWA cuando haya logo.

## Decisiones abiertas
- ¿Tope de descuento manual por rol? `precio_sugerido` ya permite medirlo.
- ¿Límite de usuarios por plan?
