-- =====================================================================
-- VETA · Fase 2: catálogo y costeo
--   · _validar_opciones(): las opciones deben ser activas, de los grupos del modelo y una por grupo.
--   · calcular_precio(): valida opciones, rechaza "sobre diseño" y la puede usar el Contador (PRD §4).
--   · costear_modelo(): costo y precio de una combinación, para Admin, Producción y Contador.
--   · reordenar_catalogo(): guarda el orden arrastrado en una sola llamada.
--   · Una sola lista de precios predeterminada por empresa.
-- =====================================================================

-- Opciones válidas para un modelo. Que estén completos los grupos obligatorios lo valida la interfaz
-- (en la Fase 3 también el trigger de cotizacion_items).
create or replace function public._validar_opciones(p_modelo uuid, p_opciones uuid[])
returns void language plpgsql stable security definer set search_path = public as $$
declare v_emp uuid; v_nombre text;
begin
  select empresa_id into v_emp from modelos where id = p_modelo;

  select coalesce(o.nombre, 'desconocida') into v_nombre
  from unnest(coalesce(p_opciones, '{}')) x
  left join opciones o on o.id = x and o.empresa_id = v_emp
  where o.id is null or not o.activo
     or not exists (select 1 from modelo_grupos mg where mg.modelo_id = p_modelo and mg.grupo_id = o.grupo_id)
  limit 1;
  if found then
    raise exception 'La opción % no aplica a este modelo o está inactiva', v_nombre;
  end if;

  select g.nombre into v_nombre
  from opciones o join grupos_opcion g on g.id = o.grupo_id
  where o.id = any(coalesce(p_opciones, '{}'))
  group by g.id, g.nombre having count(*) > 1
  limit 1;
  if found then
    raise exception 'Elige solo una opción de %', v_nombre;
  end if;
end $$;

-- Precio de venta. Lo pueden llamar Admin, Vendedor, Producción y Contador: devuelve precio, nunca costo.
create or replace function public.calcular_precio(p_modelo uuid, p_opciones uuid[], p_lista uuid default null)
returns numeric language plpgsql stable security definer set search_path = public as $$
declare
  v_emp uuid; v_base numeric; v_sobre boolean; v_metodo metodo_precio; v_iva numeric;
  v_markup numeric; v_precio numeric;
  v_factor numeric := 1; v_con_iva boolean := false; v_redondeo int := 0;
begin
  select empresa_id, precio_base, sobre_diseno into v_emp, v_base, v_sobre from modelos where id = p_modelo;
  if v_emp is null then raise exception 'Modelo no encontrado'; end if;
  if not tiene_rol(v_emp, '{admin,vendedor,produccion,contador}') then raise exception 'Sin acceso'; end if;
  if v_sobre then raise exception 'Este modelo es sobre diseño: su precio es manual'; end if;
  perform _validar_opciones(p_modelo, p_opciones);

  select metodo_precio, iva into v_metodo, v_iva from empresas where id = v_emp;

  if v_metodo = 'componentes' then
    select coalesce(markup, 1) into v_markup from modelo_costeo where modelo_id = p_modelo;
    v_precio := _calcular_costo(p_modelo, p_opciones) * (1 + coalesce(v_markup, 1));
  else
    select v_base + coalesce(sum(ajuste_precio), 0) into v_precio
    from opciones where empresa_id = v_emp and id = any(coalesce(p_opciones, '{}'));
  end if;

  if p_lista is not null then
    select factor, incluye_iva, redondeo into v_factor, v_con_iva, v_redondeo
    from listas_precios where id = p_lista and empresa_id = v_emp;
    if not found then raise exception 'Lista de precios no encontrada'; end if;
    v_precio := v_precio * coalesce(v_factor, 1);
    if coalesce(v_con_iva, false) then v_precio := v_precio * (1 + v_iva); end if;
    if coalesce(v_redondeo, 0) > 0 then v_precio := ceil(v_precio / v_redondeo) * v_redondeo; end if;
  end if;

  return round(v_precio, 2);
end $$;

-- Costo (método componentes) y precio de una combinación. Para la ficha de costeo y el simulador
-- de quien puede ver costos. El Vendedor no tiene acceso: usa calcular_precio.
create or replace function public.costear_modelo(p_modelo uuid, p_opciones uuid[], p_lista uuid default null)
returns table (costo numeric, precio numeric) language plpgsql stable security definer set search_path = public as $$
declare v_emp uuid;
begin
  select empresa_id into v_emp from modelos where id = p_modelo;
  if v_emp is null then raise exception 'Modelo no encontrado'; end if;
  if not tiene_rol(v_emp, '{admin,produccion,contador}') then raise exception 'Sin acceso'; end if;
  perform _validar_opciones(p_modelo, p_opciones);
  costo := round(_calcular_costo(p_modelo, p_opciones), 2);
  precio := case when (select sobre_diseno from modelos where id = p_modelo) then null
                 else calcular_precio(p_modelo, p_opciones, p_lista) end;
  return next;
end $$;

-- Guarda el orden (1, 2, 3…) de una lista arrastrable. Solo tablas del catálogo y solo el Admin.
create or replace function public.reordenar_catalogo(p_tabla text, p_ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
declare v_emp uuid; v_distintas int; v_grupos int;
begin
  if p_tabla not in ('etapas', 'categorias', 'grupos_opcion', 'opciones') then
    raise exception 'No se puede reordenar %', p_tabla;
  end if;
  if coalesce(array_length(p_ids, 1), 0) = 0 then return; end if;

  execute format('select min(empresa_id::text)::uuid, count(distinct empresa_id) from %I where id = any($1)', p_tabla)
    into v_emp, v_distintas using p_ids;
  if v_emp is null or v_distintas <> 1 then raise exception 'Elementos inválidos para reordenar'; end if;
  if not tiene_rol(v_emp, '{admin}') then raise exception 'Solo el Admin puede reordenar el catálogo'; end if;
  if not puede_escribir(v_emp) then raise exception 'Cuenta en solo lectura: activa tu suscripción'; end if;

  if p_tabla = 'opciones' then
    select count(distinct grupo_id) into v_grupos from opciones where id = any(p_ids);
    if v_grupos <> 1 then raise exception 'Solo se reordenan opciones de un mismo grupo'; end if;
  end if;

  execute format(
    'update %I t set orden = o.pos from unnest($1) with ordinality as o(id, pos) where t.id = o.id', p_tabla)
    using p_ids;
end $$;

-- Una sola lista predeterminada por empresa: al marcar una, las demás se desmarcan.
create or replace function public._tg_lista_predeterminada()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update listas_precios set predeterminada = false
  where empresa_id = new.empresa_id and id <> new.id and predeterminada;
  return null;
end $$;
create trigger lista_predeterminada after insert or update of predeterminada on listas_precios
  for each row when (new.predeterminada) execute function _tg_lista_predeterminada();

revoke execute on function public._validar_opciones(uuid, uuid[])                   from public, anon, authenticated;
revoke execute on function public.calcular_precio(uuid, uuid[], uuid)              from public, anon;
grant  execute on function public.calcular_precio(uuid, uuid[], uuid)              to authenticated;
revoke execute on function public.costear_modelo(uuid, uuid[], uuid)               from public, anon;
grant  execute on function public.costear_modelo(uuid, uuid[], uuid)               to authenticated;
revoke execute on function public.reordenar_catalogo(text, uuid[])                 from public, anon;
grant  execute on function public.reordenar_catalogo(text, uuid[])                 to authenticated;
