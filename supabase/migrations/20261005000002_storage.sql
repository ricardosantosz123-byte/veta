-- =====================================================================
-- VETA · Storage
-- Convención de rutas: {empresa_id}/{carpeta}/{archivo}
--   publico/   → logos y fotos de modelos (lectura pública, para PDFs y portal)
--   privado/   → comprobantes de pago, adjuntos de pedidos (solo miembros)
-- Requiere el esquema `storage` de Supabase (no se prueba con el stub local).
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('publico', 'publico', true,  5242880,  array['image/png','image/jpeg','image/webp','image/svg+xml']),
  ('privado', 'privado', false, 10485760, array['image/png','image/jpeg','image/webp','application/pdf'])
on conflict (id) do nothing;

-- Convierte el primer segmento de la ruta en uuid sin romper si no lo es.
create or replace function public._empresa_de_ruta(p_name text)
returns uuid language plpgsql immutable as $$
begin
  return ((storage.foldername(p_name))[1])::uuid;
exception when others then
  return null;
end $$;

-- publico: cualquiera lee (bucket público); solo Admin sube o borra.
create policy publico_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'publico'
              and public.tiene_rol(public._empresa_de_ruta(name), '{admin}')
              and public.puede_escribir(public._empresa_de_ruta(name)));
create policy publico_update on storage.objects for update to authenticated
  using (bucket_id = 'publico' and public.tiene_rol(public._empresa_de_ruta(name), '{admin}'));
create policy publico_delete on storage.objects for delete to authenticated
  using (bucket_id = 'publico' and public.tiene_rol(public._empresa_de_ruta(name), '{admin}'));

-- privado: leen Admin, Vendedor, Producción y Contador; suben Admin, Vendedor y Producción.
create policy privado_select on storage.objects for select to authenticated
  using (bucket_id = 'privado'
         and public.tiene_rol(public._empresa_de_ruta(name), '{admin,vendedor,produccion,contador}'));
create policy privado_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'privado'
              and public.tiene_rol(public._empresa_de_ruta(name), '{admin,vendedor,produccion}')
              and public.puede_escribir(public._empresa_de_ruta(name)));
create policy privado_delete on storage.objects for delete to authenticated
  using (bucket_id = 'privado' and public.tiene_rol(public._empresa_de_ruta(name), '{admin}'));
