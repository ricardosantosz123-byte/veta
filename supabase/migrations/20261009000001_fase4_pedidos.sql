-- =====================================================================
-- VETA · Fase 4: pedidos y cobranza
--   · hoy_mx(): "hoy" en America/Mexico_City para fechas por defecto y cálculos.
--   · Pedido: solo se marca a mano entregado o cancelado (Admin, con motivo); el resto lo calcula la base.
--     Al cancelar: órdenes pendientes canceladas, links de pago cancelados, pagos conservados.
--   · Montos del pedido y de sus renglones ya no se editan después de vender.
--   · Pagos: folio de recibo; solo se anulan (quién, cuándo, motivo); los manuales no superan el saldo,
--     no llevan fecha futura ni van a pedidos cancelados y expiran el link de pago activo.
--     Los de Mercado Pago (externo_id) se aceptan aunque dejen saldo a favor.
--   · Fechas de cada estado para la línea de tiempo; v_pedidos y v_pagos.
-- =====================================================================

-- ---------------------------------------------------------------------
-- "Hoy" en la Ciudad de México
-- ---------------------------------------------------------------------
create or replace function public.hoy_mx()
returns date language sql stable set search_path = public as $$
  select (now() at time zone 'America/Mexico_City')::date;
$$;

alter table cotizaciones     alter column fecha set default hoy_mx();
alter table pagos_cliente    alter column fecha set default hoy_mx();
alter table pagos_destajista alter column fecha set default hoy_mx();

create or replace function public.marcar_avance_orden(p_orden uuid, p_estado estado_orden, p_nota text default null)
returns void language plpgsql security definer set search_path = public as $$
declare o ordenes_produccion;
begin
  select * into o from ordenes_produccion where id = p_orden;
  if o.id is null then raise exception 'Orden no encontrada'; end if;
  if not (tiene_rol(o.empresa_id, '{admin,produccion}')
          or (o.destajista_id is not null and o.destajista_id = mi_destajista(o.empresa_id))) then
    raise exception 'Sin acceso';
  end if;
  if p_estado = 'cancelada' and not tiene_rol(o.empresa_id, '{admin,produccion}') then
    raise exception 'Solo Producción o Admin pueden cancelar una orden';
  end if;
  update ordenes_produccion
     set estado = p_estado,
         notas = case when p_nota is null then notas
                      else concat_ws(E'\n', notas, to_char(hoy_mx(), 'YYYY-MM-DD') || ': ' || p_nota) end
   where id = p_orden;
end $$;

-- ---------------------------------------------------------------------
-- Columnas nuevas
-- ---------------------------------------------------------------------
alter table pedidos
  add column en_produccion_at   timestamptz,
  add column liquidado_at       timestamptz,
  add column cancelado_at       timestamptz,
  add column motivo_cancelacion text,
  add column factura_path       text;

alter table pagos_cliente
  add column folio            int,
  add column anulado_at       timestamptz,
  add column anulado_por      uuid references auth.users(id),
  add column motivo_anulacion text;
create unique index on pagos_cliente (empresa_id, folio);

-- Folios para los pagos ya existentes (en orden de registro).
do $$
declare r record;
begin
  for r in select id, empresa_id from pagos_cliente where folio is null order by created_at loop
    update pagos_cliente set folio = _siguiente_folio(r.empresa_id, 'pago') where id = r.id;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Pedido: estados
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

-- Al cancelar: órdenes pendientes y links de pago activos se cancelan. Lo en proceso o terminado se queda.
create or replace function public._tg_pedido_cancelado()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update ordenes_produccion set estado = 'cancelada'
  where estado = 'pendiente'
    and pedido_item_id in (select id from pedido_items where pedido_id = new.id);
  update links_pago set estado = 'cancelado' where pedido_id = new.id and estado = 'activo';
  return null;
end $$;
create trigger pedido_cancelado after update of estado on pedidos
  for each row when (new.estado = 'cancelado' and old.estado is distinct from 'cancelado')
  execute function _tg_pedido_cancelado();

-- ---------------------------------------------------------------------
-- Pagos del cliente
-- ---------------------------------------------------------------------
create or replace function public._tg_pago_cliente_before()
returns trigger language plpgsql security definer set search_path = public as $$
declare p pedidos;
begin
  select * into p from pedidos where id = new.pedido_id;
  new.empresa_id := p.empresa_id;

  if tg_op = 'INSERT' then
    new.folio := _siguiente_folio(new.empresa_id, 'pago');
    new.anulado := false;
    if new.externo_id is null then
      -- Pago manual
      if p.estado = 'cancelado' then raise exception 'El pedido está cancelado: no se registran pagos'; end if;
      if new.fecha > hoy_mx() then raise exception 'La fecha del pago no puede ser futura'; end if;
      if new.monto > p.saldo then
        raise exception 'El pago (%) es mayor que el saldo del pedido (%)', new.monto, greatest(p.saldo, 0);
      end if;
    end if;
    -- Mercado Pago (externo_id): se registra siempre; si excede, el pedido queda con saldo a favor.
  else
    -- Un pago solo se anula: el resto de sus datos es inmutable.
    new.pedido_id := old.pedido_id; new.monto := old.monto; new.metodo := old.metodo;
    new.fecha := old.fecha; new.folio := old.folio; new.externo_id := old.externo_id;
    new.registrado_por := old.registrado_por; new.referencia := old.referencia;
    new.comprobante_path := old.comprobante_path; new.empresa_id := old.empresa_id;
    if old.anulado and not new.anulado then raise exception 'Un pago anulado no se puede restaurar'; end if;
    if new.anulado and not old.anulado then
      if p.estado = 'entregado' then raise exception 'No se anulan pagos de un pedido entregado'; end if;
      if coalesce(trim(new.motivo_anulacion), '') = '' then raise exception 'Escribe el motivo de la anulación'; end if;
      new.anulado_at := now();
      new.anulado_por := auth.uid();
    else
      new.anulado_at := old.anulado_at; new.anulado_por := old.anulado_por; new.motivo_anulacion := old.motivo_anulacion;
    end if;
  end if;
  return new;
end $$;

-- Un pago manual deja sin efecto el link de pago activo (el monto ya no corresponde).
create or replace function public._tg_pago_expira_link()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update links_pago set estado = 'expirado' where pedido_id = new.pedido_id and estado = 'activo';
  return null;
end $$;
create trigger pago_expira_link after insert on pagos_cliente
  for each row when (new.externo_id is null) execute function _tg_pago_expira_link();

-- ---------------------------------------------------------------------
-- Columnas que solo escribe la base
-- ---------------------------------------------------------------------
revoke insert, update on pedidos from authenticated;   -- se crean con crear_pedido_desde_cotizacion()
grant update (estado, fecha_compromiso, direccion_entrega, notas, facturado, factura_path, motivo_cancelacion)
  on pedidos to authenticated;

revoke insert, update on pedido_items from authenticated;
grant update (estado_produccion) on pedido_items to authenticated;

revoke insert, update on pagos_cliente from authenticated;
grant insert (empresa_id, pedido_id, monto, metodo, referencia, comprobante_path, fecha) on pagos_cliente to authenticated;
grant update (anulado, motivo_anulacion) on pagos_cliente to authenticated;

-- ---------------------------------------------------------------------
-- Vistas
-- ---------------------------------------------------------------------
create view v_pedidos with (security_invoker = true) as
select p.*,
       cl.nombre as cliente_nombre, cl.apellidos as cliente_apellidos, cl.telefono as cliente_telefono,
       cl.email as cliente_email, cl.empresa_cliente,
       greatest(p.anticipo_requerido - p.pagado, 0) as anticipo_faltante,
       greatest(p.pagado - p.total, 0) as saldo_a_favor,
       p.fecha_compromiso - hoy_mx() as dias_para_compromiso,
       case
         when p.estado in ('terminado', 'liquidado', 'entregado', 'cancelado') or p.fecha_compromiso is null then null
         when p.fecha_compromiso < hoy_mx() then 'atrasado'
         when p.fecha_compromiso <= hoy_mx() + 3 then 'por_vencer'
         else 'a_tiempo'
       end as semaforo
from pedidos p
join clientes cl on cl.id = p.cliente_id;

create view v_pagos with (security_invoker = true) as
select pc.*,
       sum(pc.monto) filter (where not pc.anulado)
         over (partition by pc.pedido_id order by pc.created_at, pc.folio rows unbounded preceding) as pagado_acumulado,
       p.total - sum(pc.monto) filter (where not pc.anulado)
         over (partition by pc.pedido_id order by pc.created_at, pc.folio rows unbounded preceding) as saldo_despues,
       p.folio as pedido_folio, p.total as pedido_total
from pagos_cliente pc
join pedidos p on p.id = pc.pedido_id;

-- "Vencida" con la fecha de la Ciudad de México.
create or replace view v_cotizaciones with (security_invoker = true) as
select c.*,
       case when c.estado in ('borrador', 'enviada') and c.vigencia_hasta < hoy_mx()
            then 'vencida'::estado_cotizacion else c.estado end as estado_efectivo,
       cl.nombre as cliente_nombre, cl.apellidos as cliente_apellidos, cl.empresa_cliente,
       (select count(*) from cotizacion_items i where i.cotizacion_id = c.id) as renglones
from cotizaciones c
join clientes cl on cl.id = c.cliente_id;

revoke all on v_pedidos, v_pagos from anon;
grant select on v_pedidos, v_pagos to authenticated;
revoke execute on function public.hoy_mx() from anon;
