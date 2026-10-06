-- =====================================================================
-- VETA · Fase 3: clientes y cotizador
--   · Renglones: el precio automático lo pone siempre la base; grupos obligatorios; precio_sugerido.
--   · Columnas que solo escribe la base (vendido, pedido_id, opciones_texto, precio_sugerido, folio…).
--   · Estado de la cotización: parcial/aceptada salen de los renglones vendidos; "vencida" es derivada.
--   · v_cotizaciones, v_clientes, duplicar_cotizacion(), nombres_equipo().
--   · Teléfono de clientes normalizado a formato wa.me (52 + 10 dígitos).
--   · empresas.logo_pdf_path: copia PNG del logo para el PDF.
-- =====================================================================

alter table cotizacion_items add column precio_sugerido numeric(12,2);
comment on column cotizacion_items.precio_sugerido is
  'Precio automático del catálogo cuando el renglón es manual. Lo escribe la base; la interfaz lo muestra solo a Admin y Contador.';

alter table empresas add column logo_pdf_path text;
comment on column empresas.logo_pdf_path is 'Copia PNG del logo (react-pdf no lee SVG ni WEBP).';
grant update (logo_pdf_path) on empresas to authenticated;

-- ---------------------------------------------------------------------
-- Renglón de cotización
-- ---------------------------------------------------------------------
create or replace function public._tg_cot_item_before()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_lista uuid; v_sobre boolean := false; v_faltante text;
  v_cambio_config boolean;
begin
  select lista_id, empresa_id into v_lista, new.empresa_id from cotizaciones where id = new.cotizacion_id;

  perform _valida_empresa('modelos', new.modelo_id, new.empresa_id);
  if exists (select 1 from unnest(new.opcion_ids) x left join opciones o on o.id = x
             where o.empresa_id is distinct from new.empresa_id) then
    raise exception 'Opción inválida para esta empresa';
  end if;

  v_cambio_config := tg_op = 'INSERT'
    or new.opcion_ids is distinct from old.opcion_ids
    or new.modelo_id is distinct from old.modelo_id;

  if new.modelo_id is not null then
    select sobre_diseno into v_sobre from modelos where id = new.modelo_id;
    if new.descripcion = '' then
      new.descripcion := (select nombre from modelos where id = new.modelo_id);
    end if;
    new.opciones_texto := (
      select string_agg(o.nombre, ' · ' order by g.orden, o.orden)
      from opciones o join grupos_opcion g on g.id = o.grupo_id
      where o.id = any(new.opcion_ids));

    -- Grupos obligatorios: solo al crear el renglón o cambiar su configuración
    -- (un grupo que se vuelve obligatorio después no rompe cotizaciones viejas).
    if v_cambio_config and not v_sobre then
      select g.nombre into v_faltante
      from modelo_grupos mg join grupos_opcion g on g.id = mg.grupo_id
      where mg.modelo_id = new.modelo_id and g.obligatorio
        and exists (select 1 from opciones o where o.grupo_id = g.id and o.activo)
        and not exists (select 1 from opciones o where o.grupo_id = g.id and o.id = any(new.opcion_ids))
      order by g.orden limit 1;
      if found then raise exception 'Falta elegir %', lower(v_faltante); end if;
    end if;
  else
    new.opciones_texto := null;
  end if;

  -- Sin modelo o sobre diseño: el precio siempre es manual.
  if new.modelo_id is null or v_sobre then
    new.precio_manual := true;
  end if;

  if new.precio_manual then
    if new.precio_unitario is null then raise exception 'Este renglón requiere precio manual'; end if;
    if new.precio_unitario < 0 then raise exception 'El precio no puede ser negativo'; end if;
    -- Sugerido: al crear, al cambiar la configuración, al pasar de automático a manual o cuando
    -- recalcular_precios_cotizacion lo limpia. Así vender un renglón no depende del catálogo actual.
    if new.modelo_id is null or v_sobre then
      new.precio_sugerido := null;
    elsif tg_op = 'INSERT' or v_cambio_config or not old.precio_manual or new.precio_sugerido is null then
      new.precio_sugerido := calcular_precio(new.modelo_id, new.opcion_ids, v_lista);
    end if;
  else
    -- Automático: lo calcula la base. Se ignora cualquier precio que mande el cliente.
    if tg_op = 'INSERT' or v_cambio_config or old.precio_manual
       or new.precio_unitario is distinct from old.precio_unitario then
      new.precio_unitario := calcular_precio(new.modelo_id, new.opcion_ids, v_lista);
    end if;
    new.precio_sugerido := null;
  end if;
  return new;
end $$;

-- Recalcular al cambiar de lista: automáticos se recalculan; en los manuales se actualiza el sugerido.
create or replace function public.recalcular_precios_cotizacion(p_cotizacion uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_emp uuid;
begin
  select empresa_id into v_emp from cotizaciones where id = p_cotizacion;
  if not tiene_rol(v_emp, '{admin,vendedor}') then raise exception 'Sin acceso'; end if;
  if not puede_escribir(v_emp) then raise exception 'Cuenta en solo lectura: activa tu suscripción'; end if;
  update cotizacion_items set precio_unitario = null
  where cotizacion_id = p_cotizacion and not precio_manual and not vendido and modelo_id is not null;
  update cotizacion_items set precio_sugerido = null
  where cotizacion_id = p_cotizacion and precio_manual and not vendido and modelo_id is not null;
end $$;

-- ---------------------------------------------------------------------
-- Cotización: el estado parcial/aceptada sale de los renglones vendidos
-- ---------------------------------------------------------------------
create or replace function public._tg_cotizacion_before()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_iva numeric; v_dias int; v_sub numeric; v_vendidos int; v_total int;
begin
  select iva, vigencia_cotizacion_dias into v_iva, v_dias from empresas where id = new.empresa_id;
  if tg_op = 'INSERT' then
    new.folio := coalesce(new.folio, _siguiente_folio(new.empresa_id, 'cotizacion'));
    new.vigencia_hasta := coalesce(new.vigencia_hasta, new.fecha + v_dias);
    new.estado := 'borrador';
    new.vendedor_id := coalesce(auth.uid(), new.vendedor_id);
  else
    new.folio := old.folio;
    new.empresa_id := old.empresa_id;
    new.vendedor_id := old.vendedor_id;
  end if;
  perform _valida_empresa('clientes', new.cliente_id, new.empresa_id);
  perform _valida_empresa('listas_precios', new.lista_id, new.empresa_id);
  if new.lista_id is not null then
    select incluye_iva into new.precios_con_iva from listas_precios where id = new.lista_id;
  end if;

  select count(*) filter (where vendido), count(*) into v_vendidos, v_total
  from cotizacion_items where cotizacion_id = new.id;
  if v_vendidos > 0 then
    new.estado := case when v_vendidos = v_total then 'aceptada'::estado_cotizacion else 'parcial'::estado_cotizacion end;
  elsif new.estado not in ('borrador', 'enviada', 'cancelada') then
    raise exception 'Una cotización solo pasa a parcial o aceptada al convertirla en pedido';
  end if;

  select coalesce(sum(cantidad * coalesce(precio_unitario, 0)), 0) into v_sub
  from cotizacion_items where cotizacion_id = new.id;
  new.subtotal := round(v_sub, 2);
  select t.iva_monto, t.total into new.iva, new.total
  from _totales(v_sub, new.descuento_pct, new.envio, v_iva, new.precios_con_iva) t;
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Columnas que solo escribe la base
-- ---------------------------------------------------------------------
revoke insert, update on cotizaciones from authenticated;
grant insert (empresa_id, cliente_id, lista_id, fecha, vigencia_hasta, descuento_pct, envio, notas)
  on cotizaciones to authenticated;
grant update (cliente_id, lista_id, fecha, vigencia_hasta, estado, descuento_pct, envio, notas)
  on cotizaciones to authenticated;

revoke insert, update on cotizacion_items from authenticated;
grant insert (empresa_id, cotizacion_id, modelo_id, opcion_ids, descripcion, cantidad, precio_unitario, precio_manual, orden)
  on cotizacion_items to authenticated;
grant update (modelo_id, opcion_ids, descripcion, cantidad, precio_unitario, precio_manual, orden)
  on cotizacion_items to authenticated;

-- ---------------------------------------------------------------------
-- Clientes: teléfono en formato wa.me
-- ---------------------------------------------------------------------
-- "33 1111-2222", "+52 (33) 1111 2222", "521 33…" → "523311112222". Otros formatos: solo dígitos.
create or replace function public._normalizar_telefono(p text)
returns text language plpgsql immutable set search_path = public as $$
declare d text := regexp_replace(coalesce(p, ''), '\D', '', 'g');
begin
  if d = '' then return null; end if;
  if length(d) = 10 then return '52' || d; end if;
  if length(d) = 12 and left(d, 2) = '52' then return d; end if;
  if length(d) = 13 and left(d, 3) = '521' then return '52' || right(d, 10); end if;
  return d;
end $$;

create or replace function public._tg_cliente_before()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.telefono := _normalizar_telefono(new.telefono);
  new.email := nullif(lower(trim(new.email)), '');
  new.nombre := trim(new.nombre);
  new.apellidos := trim(new.apellidos);
  return new;
end $$;
create trigger cliente_before before insert or update on clientes
  for each row execute function _tg_cliente_before();
update clientes set telefono = telefono where telefono is not null;

-- ---------------------------------------------------------------------
-- Vistas (security_invoker: aplican las políticas de quien consulta)
-- ---------------------------------------------------------------------
create view v_cotizaciones with (security_invoker = true) as
select c.*,
       case when c.estado in ('borrador', 'enviada') and c.vigencia_hasta < current_date
            then 'vencida'::estado_cotizacion else c.estado end as estado_efectivo,
       cl.nombre as cliente_nombre, cl.apellidos as cliente_apellidos, cl.empresa_cliente,
       (select count(*) from cotizacion_items i where i.cotizacion_id = c.id) as renglones
from cotizaciones c
join clientes cl on cl.id = c.cliente_id;

create view v_clientes with (security_invoker = true) as
select cl.*,
       (select count(*) from cotizaciones c where c.cliente_id = cl.id) as cotizaciones,
       (select count(*) from pedidos p where p.cliente_id = cl.id and p.estado <> 'cancelado') as pedidos,
       coalesce((select sum(p.saldo) from pedidos p where p.cliente_id = cl.id and p.estado <> 'cancelado'), 0) as saldo
from clientes cl;

revoke all on v_cotizaciones, v_clientes from anon;
grant select on v_cotizaciones, v_clientes to authenticated;

-- ---------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------
-- Copia una cotización como borrador nuevo (folio nuevo, vigencia nueva). Los precios automáticos
-- se recalculan con el catálogo actual; los manuales se conservan.
create or replace function public.duplicar_cotizacion(p_cotizacion uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare c cotizaciones; v_nueva uuid;
begin
  select * into c from cotizaciones where id = p_cotizacion;
  if c.id is null then raise exception 'Cotización no encontrada'; end if;
  if not tiene_rol(c.empresa_id, '{admin,vendedor}') then raise exception 'Sin acceso'; end if;
  if not puede_escribir(c.empresa_id) then raise exception 'Cuenta en solo lectura: activa tu suscripción'; end if;

  insert into cotizaciones (empresa_id, cliente_id, lista_id, descuento_pct, envio, notas)
  values (c.empresa_id, c.cliente_id, c.lista_id, c.descuento_pct, c.envio, c.notas)
  returning id into v_nueva;

  insert into cotizacion_items (empresa_id, cotizacion_id, modelo_id, opcion_ids, descripcion,
                                cantidad, precio_unitario, precio_manual, orden)
  select c.empresa_id, v_nueva, i.modelo_id, i.opcion_ids, i.descripcion, i.cantidad,
         case when i.precio_manual then i.precio_unitario end, i.precio_manual, i.orden
  from cotizacion_items i where i.cotizacion_id = c.id
  order by i.orden, i.created_at;

  return v_nueva;
end $$;

-- Nombres de los miembros de la empresa (para mostrar y filtrar por vendedor).
-- miembros solo es visible completo para el Admin; esto expone únicamente el nombre.
create or replace function public.nombres_equipo(p_empresa uuid)
returns table (user_id uuid, nombre text, rol rol_miembro)
language sql stable security definer set search_path = public as $$
  select m.user_id, coalesce(m.nombre, 'Sin nombre'), m.rol
  from miembros m
  where m.empresa_id = p_empresa and es_miembro(p_empresa)
  order by m.nombre;
$$;

revoke execute on function public._normalizar_telefono(text)       from public, anon, authenticated;
revoke execute on function public.duplicar_cotizacion(uuid)        from public, anon;
grant  execute on function public.duplicar_cotizacion(uuid)        to authenticated;
revoke execute on function public.nombres_equipo(uuid)             from public, anon;
grant  execute on function public.nombres_equipo(uuid)             to authenticated;
