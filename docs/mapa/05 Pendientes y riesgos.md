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
- [ ] Contraste en modo claro: el rojo `--destructive` (#e7000b) sobre fondos rojizos (`bg-destructive/5` o `/10`: la insignia y el botón "destructive" de shadcn, el aviso de cancelación del pedido) da ~4.4:1 y no pasa AA. Sobre blanco sí (4.77:1). En Insumos se usó contorno sobre blanco.
- [ ] Bundle de JavaScript > 500 kB: cargar los módulos por separado (lazy), ya iniciado en Catálogo.
- [ ] Íconos PNG de la PWA cuando haya logo.

## V2
- [ ] **Costo de material en el margen:** integrar el material de insumos al margen del pedido, distinguiendo si el material lo pone la empresa o el destajista, para no contarlo dos veces. Hoy el margen es "Margen sobre destajos" y el material solo se ve en la ficha de la orden (decisión de la Fase 6). Base lista: cada salida guarda su costo promedio (`movimientos_insumo.costo_unitario`) y su orden.

## Decisiones abiertas
- ¿Tope de descuento manual por rol? `precio_sugerido` ya permite medirlo.
- ¿Límite de usuarios por plan?
