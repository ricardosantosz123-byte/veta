# Veta · Kit de arranque para Claude Code

SaaS por suscripción para mueblerías y talleres de carpintería, laca y tapicería: cotizador, pedidos y cobranza, producción por etapa con destajistas, insumos y portal del cliente final. Stack: Supabase + Netlify + Stripe + Mercado Pago.

## Qué trae

| Archivo | Para qué sirve |
|---|---|
| `CLAUDE.md` | Reglas permanentes que Claude Code lee en cada sesión: stack, estructura, seguridad, diseño |
| `docs/PRD.md` | Especificación del producto: módulos, roles, reglas de negocio, arquitectura y nombres propuestos |
| `docs/FASES.md` | 11 prompts listos para pegar en Claude Code, en orden, con criterios de aceptación |
| `supabase/migrations/…_init.sql` | Base de datos completa: 29 tablas, RLS por rol, triggers de totales y estados, RPCs y portal |
| `supabase/migrations/…_storage.sql` | Buckets y permisos de archivos por empresa |
| `supabase/tests/` | Prueba de punta a punta del esquema (62 verificaciones, todas en verde) |
| `.env.example` | Variables de Netlify y de Edge Functions |

## Cómo arrancar

1. Instala Node LTS, Docker Desktop, Supabase CLI y Claude Code.
2. Crea un repo vacío y copia dentro este kit.
3. En la carpeta del repo ejecuta `claude` y pega el prompt de la **Fase 0** de `docs/FASES.md`.
4. Avanza fase por fase. Haz `/clear` entre fases.

## Lo que tienes que hacer tú (Claude Code no puede)

- [ ] Crear el proyecto en Supabase (región más cercana a México) y copiar URL y llaves.
- [ ] Crear el sitio en Netlify conectado al repo y cargar las variables `VITE_*`.
- [ ] Cuenta de Stripe México verificada; producto con precio mensual y anual; activar el Portal de Cliente; registrar el webhook.
- [ ] Cuenta de Resend y verificar tu dominio de correo.
- [ ] Cuenta de Mercado Pago de desarrollador para pruebas (cada mueblería conecta la suya).
- [ ] Comprar el dominio (tras decidir el nombre: ver `docs/PRD.md` §13).
- [ ] Aviso de privacidad y términos revisados por un abogado (LFPDPPP).
- [ ] Definir el precio de la suscripción.

## Probar la base de datos

```bash
supabase start && supabase db reset
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres ./supabase/tests/run.sh
```

La prueba corre dentro de una transacción y no deja datos.
