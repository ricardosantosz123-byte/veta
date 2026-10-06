-- =====================================================================
-- VETA · Fase 1: Storage
-- Reemplazar o borrar el logo exige poder "ver" el objeto por la API de Storage.
-- El bucket es público para leer por URL; esta política solo cubre la API autenticada.
-- =====================================================================
create policy publico_select on storage.objects for select to authenticated
  using (bucket_id = 'publico' and public.tiene_rol(public._empresa_de_ruta(name), '{admin}'));
