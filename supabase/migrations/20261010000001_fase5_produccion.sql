-- =====================================================================
-- VETA · Fase 5: producción y destajistas
--   · Pedido: el Admin puede autorizar el inicio sin anticipo; un pedido terminado vuelve a
--     producción si se reabre una orden.
--   · Órdenes: renglón y etapa inmutables; costo acordado >= pagado; no se reasigna con pagos;
--     no se crean para pedidos cancelados o entregados; el estado solo cambia con marcar_avance_orden.
--   · marcar_avance_orden: el Destajista solo avanza; Producción/Admin pueden regresar;
--     "empezar" exige anticipo cubierto o inicio autorizado.
--   · Pagos de destajo: adelantos permitidos sin superar el costo acordado; sin fecha futura.
--   · sugerir_ordenes(), v_destajo_saldos, corte_destajistas().
-- =====================================================================

alter table pedidos
  add column inicio_autorizado_por uuid references auth.users(id),
  add column inicio_autorizado_at  timestamptz;

-- ---------------------------------------------------------------------
-- Pedido
-- ---------------------------------------------------------------------
create or replace function public._tg_pedido_before()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_iva numeric; v_sub numeric; v_items int; v_term int;
begin
  select iva into v_iva from empresas where id = new.empresa_id;
  if tg_op = 'INSERT' then
    new.folio := coalesce(new.folio, _siguiente_folio(new.empresa_id, 'pedido'));
    new.token_portal := gen_random_uuid();
    new.estado := 'anticipo_pendiente';
  else
    new.token_portal := old.token_portal;   -- inmutables
    new.folio        := old.folio;
    new.empresa_id   := old.empresa_id;

    -- Cambios de estado a mano: solo entregado y cancelado. Los demás los calcula la base.
    if new.estado is distinct from old.estado then
      if old.estado = 'cancelado' then
        raise exception 'Un pedido cancelado no se puede reactivar';
      elsif new.estado = 'cancelado' then
        if auth.uid() is not null and not tiene_rol(new.empresa_id, '{admin}') then
          raise exception 'Solo el Admin puede cancelar un pedido';
        end if;
        if old.estado = 'entregado' then raise exception 'Un pedido entregado no se puede cancelar'; end if;
        if coalesce(trim(new.motivo_cancelacion), '') = '' then
          raise exception 'Escribe el motivo de la cancelación';
        end if;
        new.cancelado_at := now();
      elsif new.estado = 'entregado' then
        null;  -- se valida abajo: sin saldo pendiente
      else
        raise exception 'El estado del pedido cambia solo: con el anticipo, con el avance de producción y con los pagos';
      end if;
    end if;
  end if;
  perform _valida_empresa('clientes', new.cliente_id, new.empresa_id);
  perform _valida_empresa('cotizaciones', new.cotizacion_id, new.empresa_id);

  select coalesce(sum(cantidad * precio_unitario), 0), count(*),
         count(*) filter (where estado_produccion = 'terminado')
    into v_sub, v_items, v_term
  from pedido_items where pedido_id = new.id;

  new.subtotal := round(v_sub, 2);
  select t.iva_monto, t.total into new.iva, new.total
  from _totales(v_sub, new.descuento_pct, new.envio, v_iva, new.precios_con_iva) t;
  new.anticipo_requerido := round(new.total * new.anticipo_pct / 100, 2);
  new.pagado := (select coalesce(sum(monto), 0) from pagos_cliente
                 where pedido_id = new.id and not anulado);

  -- Se reabrió una orden: un pedido terminado (aún sin liquidar) vuelve a producción.
  if new.estado = 'terminado' and v_term < v_items then
    new.estado := 'en_produccion';
    new.terminado_at := null;
  end if;

  -- Transiciones automáticas
  if new.estado = 'anticipo_pendiente' and v_items > 0 and new.pagado >= new.anticipo_requerido then
    new.estado := 'en_produccion';
  end if;
  if new.estado = 'en_produccion' and v_items > 0 and v_term = v_items then
    new.estado := 'terminado';
  end if;
  if new.estado = 'terminado' and new.pagado >= new.total and new.total > 0 then
    new.estado := 'liquidado';
  end if;
  -- Se anuló un pago: un pedido liquidado vuelve a terminado.
  if new.estado = 'liquidado' and new.pagado < new.total then
    new.estado := 'terminado';
    new.liquidado_at := null;
  end if;

  if new.estado = 'en_produccion' and new.en_produccion_at is null then new.en_produccion_at := now(); end if;
  if new.estado = 'terminado' and new.terminado_at is null then new.terminado_at := now(); end if;
  if new.estado = 'liquidado' and new.liquidado_at is null then new.liquidado_at := now(); end if;

  -- Regla de negocio: nada sale del taller sin estar liquidado
  if new.estado = 'entregado' and new.pagado < new.total then
    raise exception 'No se puede entregar: el pedido tiene saldo pendiente de %', new.total - new.pagado;
  end if;
  if new.estado = 'entregado' and new.entregado_at is null then new.entregado_at := now(); end if;

  new.updated_at := now();
  return new;
end $$;


create or replace function public.autorizar_inicio_sin_anticipo(p_pedido uuid)
returns void language plpgsql security definer set search_path = public as $$
declare p pedidos;
begin
  select * into p from pedidos where id = p_pedido;
  if p.id is null then raise exception 'Pedido no encontrado'; end if;
  if not tiene_rol(p.empresa_id, '{admin}') then raise exception 'Solo el Admin puede autorizar el inicio sin anticipo'; end if;
  if not puede_escribir(p.empresa_id) then raise exception 'Cuenta en solo lectura: activa tu suscripción'; end if;
  if p.estado <> 'anticipo_pendiente' then raise exception 'El pedido ya no espera anticipo'; end if;
  update pedidos set inicio_autorizado_por = auth.uid(), inicio_autorizado_at = now() where id = p_pedido;
end $$;

-- ---------------------------------------------------------------------
-- Órdenes de producción
-- ---------------------------------------------------------------------
create or replace function public._tg_orden_before()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_estado_pedido estado_pedido;
begin
  if tg_op = 'INSERT' then
    new.empresa_id := (select empresa_id from pedido_items where id = new.pedido_item_id);
    select p.estado into v_estado_pedido
    from pedido_items i join pedidos p on p.id = i.pedido_id where i.id = new.pedido_item_id;
    if v_estado_pedido in ('cancelado', 'entregado') then
      raise exception 'No se crean órdenes para un pedido %', case v_estado_pedido when 'cancelado' then 'cancelado' else 'entregado' end;
    end if;
    new.folio := coalesce(new.folio, _siguiente_folio(new.empresa_id, 'orden'));
    if new.descripcion = '' then
      select concat_ws(' · ', descripcion, opciones_texto) into new.descripcion
      from pedido_items where id = new.pedido_item_id;
    end if;
  else
    -- Inmutables: a qué renglón, etapa y empresa pertenece la orden.
    new.folio := old.folio;
    new.empresa_id := old.empresa_id;
    new.pedido_item_id := old.pedido_item_id;
    new.etapa_id := old.etapa_id;
  end if;
  perform _valida_empresa('etapas', new.etapa_id, new.empresa_id);
  perform _valida_empresa('destajistas', new.destajista_id, new.empresa_id);

  new.pagado := (select coalesce(sum(monto), 0) from pagos_destajista where orden_id = new.id);
  if new.costo_acordado < new.pagado then
    raise exception 'El costo acordado no puede ser menor que lo ya pagado (%)', new.pagado;
  end if;
  if tg_op = 'UPDATE' and new.destajista_id is distinct from old.destajista_id and new.pagado > 0 then
    raise exception 'La orden ya tiene pagos: no se puede asignar a otro destajista';
  end if;

  -- Fechas de avance (al regresar una orden se limpian).
  if new.estado = 'pendiente' then new.iniciada_at := null; new.terminada_at := null; end if;
  if new.estado = 'en_proceso' then new.terminada_at := null; end if;
  if new.estado = 'en_proceso' and new.iniciada_at is null then new.iniciada_at := now(); end if;
  if new.estado = 'terminada' and new.iniciada_at is null then new.iniciada_at := now(); end if;
  if new.estado = 'terminada' and new.terminada_at is null then new.terminada_at := now(); end if;
  new.updated_at := now();
  return new;
end $$;

create or replace function public.marcar_avance_orden(p_orden uuid, p_estado estado_orden, p_nota text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  o ordenes_produccion; p pedidos;
  v_staff boolean; v_rango int; v_nuevo int;
begin
  select * into o from ordenes_produccion where id = p_orden;
  if o.id is null then raise exception 'Orden no encontrada'; end if;
  v_staff := tiene_rol(o.empresa_id, '{admin,produccion}');
  if not (v_staff or (o.destajista_id is not null and o.destajista_id = mi_destajista(o.empresa_id))) then
    raise exception 'Sin acceso';
  end if;
  if not puede_escribir(o.empresa_id) then raise exception 'Cuenta en solo lectura: activa tu suscripción'; end if;
  if p_estado = 'cancelada' and not v_staff then
    raise exception 'Solo Producción o Admin pueden cancelar una orden';
  end if;
  if o.estado = 'cancelada' then raise exception 'La orden está cancelada'; end if;

  v_rango := case o.estado when 'pendiente' then 0 when 'en_proceso' then 1 else 2 end;
  v_nuevo := case p_estado when 'pendiente' then 0 when 'en_proceso' then 1 when 'terminada' then 2 else -1 end;

  -- El Destajista solo avanza; Producción y Admin también pueden regresar una orden.
  if v_nuevo >= 0 and v_nuevo < v_rango and not v_staff then
    raise exception 'Solo Producción o Admin pueden regresar una orden';
  end if;

  -- Empezar exige anticipo cubierto o inicio autorizado por el Admin.
  if v_rango = 0 and v_nuevo > 0 then
    select pe.* into p from pedidos pe join pedido_items i on i.pedido_id = pe.id where i.id = o.pedido_item_id;
    if p.estado = 'anticipo_pendiente' and p.inicio_autorizado_at is null then
      raise exception 'El pedido P-% aún no cubre el anticipo: el Admin puede autorizar el inicio', p.folio;
    end if;
    if p.estado = 'cancelado' then raise exception 'El pedido está cancelado'; end if;
  end if;

  update ordenes_produccion
     set estado = p_estado,
         notas = case when p_nota is null or trim(p_nota) = '' then notas
                      else concat_ws(E'\n', notas, to_char(hoy_mx(), 'YYYY-MM-DD') || ': ' || trim(p_nota)) end
   where id = p_orden;
end $$;

-- ---------------------------------------------------------------------
-- Pagos de destajo: adelantos permitidos, sin superar el costo acordado
-- ---------------------------------------------------------------------
create or replace function public._tg_pago_destajista()
returns trigger language plpgsql security definer set search_path = public as $$
declare o ordenes_produccion;
begin
  if tg_op = 'DELETE' then return old; end if;
  select * into o from ordenes_produccion where id = new.orden_id;
  new.empresa_id := o.empresa_id;
  if tg_op = 'INSERT' then
    if new.fecha > hoy_mx() then raise exception 'La fecha del pago no puede ser futura'; end if;
    if new.monto > o.costo_acordado - o.pagado then
      raise exception 'El pago (%) supera lo que falta por pagar de la orden (%)', new.monto, o.costo_acordado - o.pagado;
    end if;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Columnas que solo escribe la base
-- ---------------------------------------------------------------------
revoke insert, update on ordenes_produccion from authenticated;
grant insert (empresa_id, pedido_item_id, etapa_id, destajista_id, descripcion, cantidad, costo_acordado, fecha_compromiso, notas)
  on ordenes_produccion to authenticated;
grant update (destajista_id, descripcion, cantidad, costo_acordado, fecha_compromiso, notas)
  on ordenes_produccion to authenticated;

revoke insert, update on pagos_destajista from authenticated;
grant insert (empresa_id, orden_id, monto, metodo, fecha, nota) on pagos_destajista to authenticated;

-- ---------------------------------------------------------------------
-- Sugerencia de órdenes: costo de cada etapa (base + ajustes de las opciones) × cantidad
-- ---------------------------------------------------------------------
create or replace function public.sugerir_ordenes(p_pedido uuid)
returns table (
  pedido_item_id uuid, descripcion text, opciones_texto text, cantidad int, estado_produccion estado_produccion,
  etapa_id uuid, etapa text, etapa_orden int, con_costo boolean, costo_unitario numeric, costo_sugerido numeric,
  tiene_orden boolean)
language plpgsql stable security definer set search_path = public as $$
declare v_emp uuid;
begin
  select empresa_id into v_emp from pedidos where id = p_pedido;
  if v_emp is null then raise exception 'Pedido no encontrado'; end if;
  if not tiene_rol(v_emp, '{admin,produccion}') then raise exception 'Sin acceso'; end if;
  return query
  select i.id, i.descripcion, i.opciones_texto, i.cantidad, i.estado_produccion,
         e.id, e.nombre, e.orden,
         exists (select 1 from costos_modelo cm where cm.modelo_id = i.modelo_id and cm.etapa_id = e.id),
         coalesce(c.costo, 0),
         round(coalesce(c.costo, 0) * i.cantidad, 2),
         exists (select 1 from ordenes_produccion o where o.pedido_item_id = i.id and o.etapa_id = e.id and o.estado <> 'cancelada')
  from pedido_items i
  left join cotizacion_items ci on ci.id = i.cotizacion_item_id
  cross join etapas e
  left join lateral (
    select sum(cm.costo) as costo from costos_modelo cm
    where cm.modelo_id = i.modelo_id and cm.etapa_id = e.id
      and (cm.opcion_id is null or cm.opcion_id = any(coalesce(ci.opcion_ids, '{}')))
  ) c on true
  where i.pedido_id = p_pedido and e.empresa_id = v_emp and e.activo
  order by i.created_at, e.orden;
end $$;

-- ---------------------------------------------------------------------
-- Saldos con destajistas: "Por pagar" (terminado − pagado) y "Comprometido" (en curso − adelantos)
-- ---------------------------------------------------------------------
create view v_destajo_saldos with (security_invoker = true) as
select d.id as destajista_id, d.empresa_id, d.nombre, d.especialidad, d.telefono, d.tipo, d.activo,
       coalesce(sum(o.costo_acordado) filter (where o.estado = 'terminada'), 0) as terminado,
       coalesce(sum(o.pagado) filter (where o.estado = 'terminada'), 0) as pagado_terminado,
       coalesce(sum(o.saldo) filter (where o.estado = 'terminada'), 0) as por_pagar,
       coalesce(sum(o.costo_acordado) filter (where o.estado in ('pendiente', 'en_proceso')), 0) as en_curso,
       coalesce(sum(o.pagado) filter (where o.estado in ('pendiente', 'en_proceso')), 0) as adelantos,
       coalesce(sum(o.saldo) filter (where o.estado in ('pendiente', 'en_proceso')), 0) as comprometido,
       count(o.id) filter (where o.estado in ('pendiente', 'en_proceso')) as ordenes_abiertas
from destajistas d
left join ordenes_produccion o on o.destajista_id = d.id and o.estado <> 'cancelada'
group by d.id;

-- Corte de un periodo (p. ej. la semana): trabajo terminado y pagos del periodo, más los saldos actuales.
create or replace function public.corte_destajistas(p_empresa uuid, p_desde date, p_hasta date)
returns table (
  destajista_id uuid, nombre text, telefono text,
  terminado_periodo numeric, ordenes_terminadas_periodo int, pagado_periodo numeric,
  por_pagar numeric, comprometido numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not tiene_rol(p_empresa, '{admin,produccion,contador}') then raise exception 'Sin acceso'; end if;
  return query
  select d.id, d.nombre, d.telefono,
         coalesce((select sum(o.costo_acordado) from ordenes_produccion o
                   where o.destajista_id = d.id and o.estado = 'terminada'
                     and (o.terminada_at at time zone 'America/Mexico_City')::date between p_desde and p_hasta), 0),
         (select count(*)::int from ordenes_produccion o
          where o.destajista_id = d.id and o.estado = 'terminada'
            and (o.terminada_at at time zone 'America/Mexico_City')::date between p_desde and p_hasta),
         coalesce((select sum(pd.monto) from pagos_destajista pd join ordenes_produccion o on o.id = pd.orden_id
                   where o.destajista_id = d.id and pd.fecha between p_desde and p_hasta), 0),
         coalesce((select sum(o.saldo) from ordenes_produccion o where o.destajista_id = d.id and o.estado = 'terminada'), 0),
         coalesce((select sum(o.saldo) from ordenes_produccion o where o.destajista_id = d.id and o.estado in ('pendiente', 'en_proceso')), 0)
  from destajistas d
  where d.empresa_id = p_empresa
  order by d.nombre;
end $$;

revoke all on v_destajo_saldos from anon;
grant select on v_destajo_saldos to authenticated;
revoke execute on function public.autorizar_inicio_sin_anticipo(uuid)        from public, anon;
grant  execute on function public.autorizar_inicio_sin_anticipo(uuid)        to authenticated;
revoke execute on function public.sugerir_ordenes(uuid)                      from public, anon;
grant  execute on function public.sugerir_ordenes(uuid)                      to authenticated;
revoke execute on function public.corte_destajistas(uuid, date, date)        from public, anon;
grant  execute on function public.corte_destajistas(uuid, date, date)        to authenticated;
