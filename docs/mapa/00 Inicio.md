# Veta · Mapa del proyecto

SaaS por suscripción para mueblerías y talleres (carpintería, laca, tapicería): cotizador, pedidos y cobranza, producción por etapa con destajistas, insumos y portal del cliente final.

## Para Claude Code: cómo usar este mapa
1. **Al iniciar sesión:** lee [[01 Estado actual]] y, si la tarea lo necesita, la nota específica. No releas todo el PRD.
2. **Antes de decidir algo:** revisa [[02 Decisiones]]. Si ya se decidió, respétalo; si cambia, regístralo ahí.
3. **Al cerrar una fase o sesión:** actualiza [[01 Estado actual]], agrega lo nuevo a [[02 Decisiones]] y [[04 Mapa de la base]], y escribe una entrada en [[06 Bitácora]].

## Notas
| Nota | Para qué |
|---|---|
| [[01 Estado actual]] | Fase en curso, qué funciona, siguiente paso |
| [[02 Decisiones]] | Todas las decisiones tomadas y por qué |
| [[03 Reglas de negocio]] | Reglas que la base de datos debe garantizar |
| [[04 Mapa de la base]] | Tablas, funciones, vistas y migraciones |
| [[05 Pendientes y riesgos]] | Lo que falta antes de lanzar |
| [[06 Bitácora]] | Una entrada por sesión |

## Documentos fuente
- Especificación completa: `docs/PRD.md`
- Prompts por fase: `docs/FASES.md`
- Reglas permanentes de código: `CLAUDE.md`
- Prototipo visual: canvas "Veta · Prototipo" en Claude (6 pantallas)

## Infraestructura
- **Repo:** github.com/ricardosantosz123-byte/veta (privado)
- **Supabase:** proyecto `veta-dev` · ref `qrznjmtaljraownfrmbi` · modo nube (sin Docker)
- **Local:** `~/Proyectos/veta` · Mac Intel · Node 24 LTS · psql de Postgres.app
- **Dev server:** http://localhost:5173
