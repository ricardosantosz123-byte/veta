-- =====================================================================
-- VETA · Fase 10: tablero
--   tablero(empresa): todos los indicadores del PRD §5.10 calculados en la base, en una sola llamada.
--   · Admin y Contador: completo, con margen sobre destajos y adeudo con destajistas.
--   · Vendedor: solo lo suyo (cotizaciones que hizo y pedidos que nacieron de ellas), sin costos.
--   Meses y "hoy" en America/Mexico_City. Montos con IVA salvo el margen (venta sin IVA).
-- =====================================================================

create or replace function public.tablero(p_empresa uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_completo boolean := tiene_rol(p_empresa, '{admin,contador}');
  v_vendedor boolean := tiene_rol(p_empresa, '{vendedor}');
  v_yo uuid := auth.uid();
  v_hoy date := hoy_mx();
  v_mes date := date_trunc('month', hoy_mx())::date;
  r jsonb;
begin
  if not (v_completo or v_vendedor) then raise exception 'Sin acceso al tablero'; end if;

  with
  ped as (  -- pedidos visibles para quien consulta (no cancelados)
    select p.*, (p.created_at at time zone 'America/Mexico_City')::date as dia
    from pedidos p left join cotizaciones c on c.id = p.cotizacion_id
    where p.empresa_id = p_empresa and p.estado <> 'cancelado'
      and (v_completo or coalesce(c.vendedor_id, p.created_by) = v_yo)),
  cot as (
    select c.* from cotizaciones c
    where c.empresa_id = p_empresa and (v_completo or c.vendedor_id = v_yo)),
  pag as (
    select pc.* from pagos_cliente pc join ped on ped.id = pc.pedido_id where not pc.anulado),
  meses as (
    select (v_mes - make_interval(months => g))::date as mes from generate_series(0, 5) g)
  select jsonb_build_object(
    'completo', v_completo,
    'mes', v_mes,
    'ventas_mes',  (select coalesce(sum(total), 0) from ped where dia >= v_mes),
    'pedidos_mes', (select count(*) from ped where dia >= v_mes),
    'cobrado_mes', (select coalesce(sum(monto), 0) from pag where fecha >= v_mes),
    'por_cobrar',  (select coalesce(sum(greatest(saldo, 0)), 0) from ped where estado <> 'entregado'),
    'anticipos_pendientes', (select count(*) from ped where estado = 'anticipo_pendiente'),
    'conversion', (select jsonb_build_object(
                     'cotizaciones', count(*) filter (where estado <> 'borrador'),
                     'vendidas', count(*) filter (where estado in ('parcial', 'aceptada')))
                   from cot where fecha >= v_hoy - 90),
    'serie', (select jsonb_agg(jsonb_build_object(
                'mes', m.mes,
                'ventas', (select coalesce(sum(total), 0) from ped where dia >= m.mes and dia < (m.mes + interval '1 month')::date),
                'cobrado', (select coalesce(sum(monto), 0) from pag where fecha >= m.mes and fecha < (m.mes + interval '1 month')::date))
              order by m.mes) from meses m),
    'por_estado', (select coalesce(jsonb_object_agg(estado, n), '{}'::jsonb)
                   from (select estado, count(*) n from ped group by estado) x),
    'por_etapa', (select coalesce(jsonb_agg(jsonb_build_object('etapa', e.nombre, 'pendientes', x.pend, 'en_proceso', x.proc) order by e.orden), '[]'::jsonb)
                  from etapas e
                  join (select o.etapa_id, count(*) filter (where o.estado = 'pendiente') pend, count(*) filter (where o.estado = 'en_proceso') proc
                        from ordenes_produccion o join pedido_items i on i.id = o.pedido_item_id join ped on ped.id = i.pedido_id
                        where o.estado in ('pendiente', 'en_proceso') group by o.etapa_id) x on x.etapa_id = e.id),
    'por_vencer', (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'folio', c.folio, 'cliente', trim(cl.nombre || ' ' || cl.apellidos),
                                                               'total', c.total, 'vigencia_hasta', c.vigencia_hasta) order by c.vigencia_hasta), '[]'::jsonb)
                   from cot c join clientes cl on cl.id = c.cliente_id
                   where c.estado = 'enviada' and c.vigencia_hasta between v_hoy and v_hoy + 3),
    -- Solo Admin y Contador: costos y márgenes.
    'margen_mes', case when v_completo then
                    (select jsonb_build_object('venta_sin_iva', coalesce(sum(total - iva), 0), 'costo', coalesce(sum(costo_produccion), 0),
                                               'margen', coalesce(sum(margen_bruto), 0),
                                               'pct', case when sum(total - iva) > 0 then round(sum(margen_bruto) / sum(total - iva) * 100, 1) end)
                     from v_pedido_resumen where empresa_id = p_empresa and estado <> 'cancelado'
                       and (created_at at time zone 'America/Mexico_City')::date >= v_mes) end,
    'margen_pedidos', case when v_completo then
                    (select coalesce(jsonb_agg(x order by x.folio desc), '[]'::jsonb) from (
                       select id, folio, cliente, total - iva as venta_sin_iva, costo_produccion, margen_bruto, margen_pct
                       from v_pedido_resumen where empresa_id = p_empresa and estado <> 'cancelado'
                       order by created_at desc limit 8) x) end,
    'destajistas', case when v_completo then
                    (select jsonb_build_object('por_pagar', coalesce(sum(por_pagar), 0), 'comprometido', coalesce(sum(comprometido), 0))
                     from v_destajo_saldos where empresa_id = p_empresa) end,
    'insumos_bajo_minimo', case when v_completo then
                    (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'nombre', nombre, 'existencia', existencia, 'minimo', minimo, 'unidad', unidad) order by nombre), '[]'::jsonb)
                     from v_insumos where empresa_id = p_empresa and activo and bajo_minimo) end
  ) into r;
  return r;
end $$;

revoke execute on function public.tablero(uuid) from public, anon;
grant  execute on function public.tablero(uuid) to authenticated;
