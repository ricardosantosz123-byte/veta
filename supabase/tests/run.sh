#!/usr/bin/env bash
# Prueba de punta a punta del esquema.
#
# Opción A · Supabase local (recomendado):
#   supabase db reset
#   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres ./supabase/tests/run.sh
#
# Opción B · Postgres 15+ suelto (simula roles y auth de Supabase):
#   PGHOST=... PGPORT=... PGUSER=postgres ./supabase/tests/run.sh
set -e
cd "$(dirname "$0")"
if [ -n "$DATABASE_URL" ]; then
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f 01_flujo_completo.sql 2>&1 | grep -E 'ok  |FALLA|ERROR|PASARON'
  exit "${PIPESTATUS[0]}"
fi
psql -q -c "drop database if exists veta_test;" -c "create database veta_test;" >/dev/null 2>&1
P="psql -v ON_ERROR_STOP=1 -q -d veta_test"
$P -f 00_supabase_stub.sql
# Todas las migraciones en orden, salvo las de Storage (requieren el esquema real de Supabase).
for f in ../migrations/*.sql; do
  case "$f" in *storage*) continue ;; esac
  $P -f "$f" 2>&1 | grep -v NOTICE || true
done
$P -f 01_flujo_completo.sql 2>&1 | grep -E 'ok  |FALLA|ERROR|PASARON'
exit "${PIPESTATUS[0]}"
