# Estado actual

> Actualizar al cerrar cada fase. Última actualización: 2026-10-05 (confirmado con `git log`).

## Fases
| Fase | Tema | Estado | Commit |
|---|---|---|---|
| 0 | Arranque, Supabase en la nube, layout | ✅ Completada | `8bb1fd9` |
| 1 | Cuenta, empresa, roles, invitaciones | ✅ Completada | `262afb6` + `fd38904` (corrección: invitado no ve el asistente) |
| 2 | Catálogo y costeo | ✅ Completada | `265cb16` |
| 3 | Clientes y cotizador | ✅ Completada | `f1534f5` |
| 4 | Pedidos y cobranza | ✅ Completada | `6135d8a` |
| 5 | Producción y destajistas | ✅ Completada | `78e2a7a` + `38ff0e2` |
| 6 | Insumos | ⚪ Pendiente | |
| 7 | Portal del cliente final | ⚪ Pendiente (ruta pública `/:slug/p/:token` ya preparada) | |
| 8 | Link de pago Mercado Pago | ⚪ Pendiente | |
| 9 | Suscripción Stripe | ⚪ Pendiente | |
| 10 | Tablero, avisos, landing, lanzamiento | ⚪ Pendiente | |

## Fase 5: qué falta para cerrarla
- [x] `supabase/tests/run.sh` contra veta-dev: **154 pruebas en verde** (2026-10-05).
- [x] Push a GitHub.
- [x] Los tres ajustes, cada uno con su prueba:
  - (a) Admin autoriza el inicio sin anticipo (`autorizar_inicio_sin_anticipo`, visible en la línea de tiempo).
  - (b) Adelantos al destajista sin rebasar el costo acordado.
  - (c) "Por pagar" y "Comprometido" separados en `v_destajo_saldos`, `corte_destajistas` y `/mis-ordenes`.
- [x] Prueba de aceptación en la app: P-1 con 3 órdenes de "Ricardo" terminadas → pedido **terminado** solo (2026-10-05, probado también desde el celular).

## Prueba de aceptación de la Fase 5
1. P-1 (ya con anticipo) → **Mandar a producción** → asignar las etapas a "Ricardo" (destajista).
2. Producción → Tablero: aparecen las órdenes.
3. Como Destajista (`rsantoszertuche@gmail.com`) en **Mis órdenes**: Empecé → Terminé en cada una.
4. Como Admin en P-1: el pedido queda **Terminado** y aparece el aviso de finiquito.

## Siguiente paso
Empezar la **Fase 6 · Insumos**. Opcional antes: cobrar el finiquito del P-1 ($13,363.20) y marcarlo entregado.

## Datos de prueba
- Silla **Natalia**: Carpintería 1,800 · Tapicería 900 · Nogal +600 · Piel +900 · markup 1.0 → **$8,400** General / **$9,800** Expo.
- Cotización: 4 Natalia + mesa sobre diseño $12,000 − 10% → **$47,606.40**.
- Cuentas de prueba: Admin `ricardosantosz123@gmail.com` · Vendedor `ventas@flexora.mx` · Destajista `rsantoszertuche@gmail.com` (destajista "Ricardo").
- En veta-dev: empresa **Casa Sauce**, pedido **P-1** terminado (3 órdenes de Ricardo terminadas), saldo $13,363.20 por cobrar.
- Dev server en la red local: `npm run dev -- --host` → `http://192.168.100.8:5173` (la IP puede cambiar).
