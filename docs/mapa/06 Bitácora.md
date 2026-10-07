# Bitácora de sesiones

> Una entrada por sesión, la más reciente arriba. Máximo 8 líneas.

## Plantilla
```
### 2026-10-06 · Afinación, bloque A
- Hecho: cuestionario de afinación con Ricardo (2 rondas); movimiento sutil en botones y menús; "Margen operativo"; portal cerrado 90 días después de entregar; Ricardo fuera de la demo.
- Decisiones nuevas: ver "Afinación de la plataforma" en [[02 Decisiones]]; rol Comprador, planes y módulos nuevos aprobados para los bloques siguientes.
- Pruebas: run.sh ✅ (250) · typecheck/lint/build ✅
- Siguiente paso: rol Comprador.

### AAAA-MM-DD · Fase N
- Hecho:
- Decisiones nuevas: (→ [[02 Decisiones]])
- Pruebas: run.sh ✅/❌ · typecheck/lint/build ✅/❌
- Commit:
- Siguiente paso:
```

---

### 2026-10-06 (noche, sin supervisión) · Fases 7 a 10
- Hecho: portal público + función `portal`; Mercado Pago (conectar, link, webhook); Stripe (código y funciones sin desplegar); tablero, bitácora, avisos con pg_net/pg_cron/Vault, landing y legales en borrador, PWA, rendimiento y guía de despliegue.
- Decisiones nuevas: marcadas con ⚠️ en [[02 Decisiones]] (Fases 7 a 10).
- Pruebas: run.sh ✅ 243 contra veta-dev (cada migración ensayada antes en transacción revertida) · typecheck/lint/build ✅ · `deno check` de las 10 funciones ✅ · Lighthouse landing 92/100/100/92.
- Commits: `aaa616e` (7), `826bce9` (8), `65f6fef` (9), `8e9d67b` `9ee5346` `c56b73b` (10).
- Siguiente paso: leer [[07 Reporte nocturno]].

### 2026-10-06 · Fase 6: ajuste de unidades
- Hecho: Ricardo probó la Fase 6 en la app (funciona). Pidió medir la piel en dm² o piezas → migración `fase6_unidad_dm2`; al elegir tipo Piel la unidad se sugiere en dm².
- Pruebas: run.sh ✅ 189 · typecheck/lint/build ✅.
- Fase 6 ✅ cerrada por Ricardo.
- Siguiente paso: plan de la Fase 7.

### 2026-10-05 (noche, sin supervisión) · Fase 6
- Hecho: migración `fase6_insumos` (12 huecos del esquema corregidos), Insumos (lista, ficha, entrada/salida/ajuste por conteo), "Material entregado" en la orden y en Mis órdenes; `.claude/settings.json` con permisos; contraseña de veta-dev en `~/.pgpass` y `~/.zshrc` (la puso Ricardo).
- Decisiones nuevas: 1A, 2A, 3A + unidades cerradas, nombre normalizado, existencia inicial con costo (→ [[02 Decisiones#Fase 6 (2026-10-05)]]); V2: material en el margen (→ [[05 Pendientes y riesgos#V2]]).
- Pruebas: run.sh ✅ 188 contra veta-dev (ensayo previo en transacción revertida) · typecheck/lint/build ✅ · contraste AA ✅ (insignia "Bajo mínimo" con contorno).
- Sin probar: la interfaz en el navegador (Claude no inicia sesión con cuentas reales).
- Commit: `0a27cce` (permisos), `1aa465c` (Fase 6).
- Siguiente paso: prueba de aceptación de la Fase 6 (ver [[01 Estado actual]]).

### 2026-10-05 · Cierre de la Fase 5
- Hecho: Fase 5 completa (órdenes, kanban, Por programar, destajistas, corte semanal, Mis órdenes, PDFs); prueba extra del corte con comprometido; mapa de Obsidian y sección "Memoria del proyecto" en CLAUDE.md.
- Decisiones nuevas: las de la Fase 5 ya están en [[02 Decisiones#Fase 5]]; `docs/mapa/.obsidian/` fuera de git.
- Pruebas: run.sh ✅ 154 contra veta-dev · typecheck/lint/build ✅ · aceptación ✅ (P-1 terminado, también desde el celular).
- Commit: `78e2a7a`, `228b547`, `38ff0e2` (en GitHub).
- Siguiente paso: Fase 6 · Insumos.

### 2026-10-05 · Fases 0 a 5
- Hecho: kit (PRD, CLAUDE.md, FASES, esquema con 62 pruebas); prototipo de 6 pantallas; Node, git y Postgres.app instalados; `veta-dev` en Supabase; repo en GitHub; Fases 0–4 construidas; plan de la Fase 5 aprobado.
- Decisiones nuevas: modo nube en Mac Intel; correo A2; ajustes de las Fases 2 a 5.
- Siguiente paso: terminar la Fase 5 y su prueba de aceptación.
