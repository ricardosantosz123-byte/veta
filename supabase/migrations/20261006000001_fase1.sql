-- =====================================================================
-- VETA · Fase 1: alta de empresa
--   · slug_disponible(): validación en vivo del slug en el asistente
--     (empresas_sel solo deja ver las empresas propias).
--   · crear_empresa(): mismos efectos, con errores claros en español.
-- =====================================================================

-- Slugs que chocarían con rutas de la app o que se prestan a confusión.
create or replace function public._slug_reservado(p_slug text)
returns boolean language sql immutable set search_path = public as $$
  select lower(trim(p_slug)) = any (array[
    'admin','ajustes','api','app','assets','auth','bienvenida','catalogo','clientes','cotizaciones',
    'entrar','insumos','login','pedidos','portal','privacidad','produccion','recuperar','registro',
    'restablecer','seguimiento','soporte','suscripcion','tablero','terminos','veta','www'
  ]);
$$;

-- true si el slug tiene formato válido, no está reservado y nadie lo usa.
create or replace function public.slug_disponible(p_slug text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v text := lower(trim(p_slug));
begin
  if auth.uid() is null then raise exception 'Inicia sesión primero'; end if;
  if v is null or v !~ '^[a-z0-9-]{3,40}$' or _slug_reservado(v) then return false; end if;
  return not exists (select 1 from empresas where slug = v);
end $$;

create or replace function public.crear_empresa(p_nombre text, p_slug text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_slug text := lower(trim(p_slug));
begin
  if auth.uid() is null then raise exception 'Inicia sesión primero'; end if;
  if coalesce(trim(p_nombre), '') = '' then raise exception 'Escribe el nombre de la empresa'; end if;
  if v_slug !~ '^[a-z0-9-]{3,40}$' then
    raise exception 'El slug debe tener de 3 a 40 letras minúsculas, números o guiones';
  end if;
  if _slug_reservado(v_slug) then raise exception 'Ese slug está reservado, elige otro'; end if;
  if exists (select 1 from empresas where slug = v_slug) then raise exception 'Ese slug ya está en uso, elige otro'; end if;
  insert into empresas (nombre, slug) values (trim(p_nombre), v_slug) returning id into v_id;
  insert into miembros (empresa_id, user_id, rol, nombre)
  values (v_id, auth.uid(), 'admin', (select email from auth.users where id = auth.uid()));
  return v_id;
end $$;

revoke execute on function public._slug_reservado(text)  from public, anon, authenticated;
revoke execute on function public.slug_disponible(text)  from public, anon;
grant  execute on function public.slug_disponible(text)  to authenticated;
revoke execute on function public.crear_empresa(text, text) from public, anon;
grant  execute on function public.crear_empresa(text, text) to authenticated;
