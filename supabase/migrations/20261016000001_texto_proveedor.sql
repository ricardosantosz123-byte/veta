-- =====================================================================
-- VETA · Texto visible: "destajista" pasa a "proveedor" (decisión de Ricardo, 2026-10-06).
--   Solo cambian mensajes y comentarios que puede ver una persona. Los nombres internos
--   (tabla destajistas, rol destajista, columnas destajista_id) se conservan.
-- =====================================================================

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
    raise exception 'La orden ya tiene pagos: no se puede asignar a otro proveedor';
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

comment on column v_pedido_resumen.margen_bruto is
  'Margen sobre fabricación: venta sin IVA menos el costo de las órdenes. No incluye material de insumos.';
comment on column v_pedido_resumen.margen_pct is
  'Margen sobre fabricación en %. No incluye material de insumos.';
