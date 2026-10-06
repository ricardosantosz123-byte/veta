# Estado actual

> Actualizar al cerrar cada fase. Última actualización: 2026-10-05 (noche, Fase 6 construida).

## Fases
| Fase | Tema | Estado | Commit |
|---|---|---|---|
| 0 | Arranque, Supabase en la nube, layout | ✅ Completada | `8bb1fd9` |
| 1 | Cuenta, empresa, roles, invitaciones | ✅ Completada | `262afb6` + `fd38904` (corrección: invitado no ve el asistente) |
| 2 | Catálogo y costeo | ✅ Completada | `265cb16` |
| 3 | Clientes y cotizador | ✅ Completada | `f1534f5` |
| 4 | Pedidos y cobranza | ✅ Completada | `6135d8a` |
| 5 | Producción y destajistas | ✅ Completada | `78e2a7a` + `38ff0e2` |
| 6 | Insumos | ✅ Completada | `1aa465c` + `ddea1f1` (unidad dm² para piel) |
| 7 | Portal del cliente final | 🟡 Construida (noche), falta la prueba desde el celular | ver [[07 Reporte nocturno]] |
| 8 | Link de pago Mercado Pago | 🟡 Construida (noche) y desplegada; falta probar con cuentas de prueba de Mercado Pago | ver [[07 Reporte nocturno]] |
| 9 | Suscripción Stripe | 🟡 Código y pruebas listos (noche); funciones sin desplegar hasta tener las llaves de Stripe | ver [[07 Reporte nocturno]] |
| 10 | Tablero, avisos, landing, lanzamiento | ⚪ Pendiente | |

## Fase 6: cierre
- [x] Migración `20261011000001_fase6_insumos.sql` y `20261011000002_fase6_unidad_dm2.sql` aplicadas en veta-dev; `run.sh`: **189 pruebas en verde** (35 nuevas).
- [x] Interfaz: Insumos (lista, alerta bajo mínimo, ficha con historial, entrada/salida/ajuste), "Material entregado" en la ficha de la orden y en "Mis órdenes".
- [x] typecheck, lint y build ✅.
- [x] Prueba en la app (Ricardo, 2026-10-06): funciona; pidió medir la piel en dm² o piezas → agregado dm².
- [x] Ricardo dio la Fase 6 por buena (2026-10-06).

## Prueba de aceptación de la Fase 6
1. Como Admin → **Insumos → Nuevo insumo**: "Piel Napa café", piel, **dm²** (se pone sola al elegir Piel), mínimo 5, existencia inicial 10 a $100.
2. En su ficha → **Entrada**: 10 m2 a $120 → costo promedio **$110**, existencia 20.
3. **Producción → Tablero** → abre una orden de P-1 → **Entregar material**: 3 m2 de esa piel → aparece en "Material entregado" con valor **$330**.
4. En la ficha del insumo: existencia 17 y la salida en el historial con "Orden O-n · entregado a Ricardo".
5. Como Destajista (`rsantoszertuche@gmail.com`) en **Mis órdenes**: el material solo se muestra en órdenes **abiertas** (pendientes o en proceso). Las de P-1 ya están terminadas: para verlo, entrega material a una orden abierta de Ricardo (otro pedido) → "Material que recibiste: … m² Piel Napa café", sin montos.
6. **Ajuste por conteo** a 2 con motivo → aparece **Bajo mínimo** en la lista.

## Siguiente paso
**Fase 7 · Portal del cliente final**: plan propuesto, esperando confirmación.

## Datos de prueba
- Silla **Natalia**: Carpintería 1,800 · Tapicería 900 · Nogal +600 · Piel +900 · markup 1.0 → **$8,400** General / **$9,800** Expo.
- Cotización: 4 Natalia + mesa sobre diseño $12,000 − 10% → **$47,606.40**.
- Cuentas de prueba: Admin `ricardosantosz123@gmail.com` · Vendedor `ventas@flexora.mx` · Destajista `rsantoszertuche@gmail.com` (destajista "Ricardo").
- En veta-dev: empresa **Casa Sauce**, pedido **P-1** terminado (3 órdenes de Ricardo terminadas), saldo $13,363.20 por cobrar.
- Dev server en la red local: `npm run dev -- --host` → `http://192.168.100.8:5173` (la IP puede cambiar).
