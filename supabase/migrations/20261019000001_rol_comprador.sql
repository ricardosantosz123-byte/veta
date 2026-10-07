-- =====================================================================
-- VETA · Rol "Comprador" (1 de 2): nuevo valor del enum.
--   Postgres no deja usar un valor nuevo de enum en la misma transacción que lo crea,
--   por eso los permisos van en la migración siguiente.
-- =====================================================================
alter type rol_miembro add value if not exists 'comprador';
