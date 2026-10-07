-- =====================================================================
-- VETA · Portal: el link se cierra 90 días después de la entrega (decisión del 2026-10-06)
--   · Pasados 90 días desde entregado_at, portal_pedido ya no devuelve el pedido: solo
--     { cerrado: true, empresa } para que el portal muestre "Este seguimiento ya terminó"
--     con el contacto de la mueblería. Sin montos, partidas ni pagos.
--   · Los pedidos cancelados siguen sin mostrarse (null → 404 genérico).
-- =====================================================================

create or replace function public.portal_pedido(p_token uuid, p_slug text default null)
returns jsonb language sql stable security definer set search_path = public as $$
  select case
    when p.estado = 'entregado' and p.entregado_at < now() - interval '90 days' then
      jsonb_build_object(
        'cerrado', true,
        'empresa', jsonb_build_object('nombre', e.nombre, 'logo_path', e.logo_path,
                                      'telefono', e.telefono, 'color', e.color_marca, 'slug', e.slug))
    else jsonb_build_object(
    'empresa', jsonb_build_object('nombre', e.nombre, 'logo_path', e.logo_path,
                                  'telefono', e.telefono, 'color', e.color_marca, 'slug', e.slug),
    'pedido',  jsonb_build_object(
                 'folio', p.folio,
                 'fecha', (p.created_at at time zone 'America/Mexico_City')::date,
                 'estado', p.estado,
                 'fecha_compromiso', p.fecha_compromiso,
                 'cliente', c.nombre,
                 'total', p.total, 'pagado', p.pagado, 'saldo', p.saldo,
                 'anticipo_requerido', p.anticipo_requerido,
                 'anticipo_faltante', greatest(p.anticipo_requerido - p.pagado, 0),
                 'en_produccion_at', p.en_produccion_at, 'terminado_at', p.terminado_at,
                 'liquidado_at', p.liquidado_at, 'entregado_at', p.entregado_at,
                 'disponible_hasta', case when p.entregado_at is not null
                   then ((p.entregado_at + interval '90 days') at time zone 'America/Mexico_City')::date end),
    'items', (select coalesce(jsonb_agg(jsonb_build_object(
                'descripcion', i.descripcion, 'opciones', i.opciones_texto,
                'cantidad', i.cantidad, 'estado', i.estado_produccion,
                'etapas', (select coalesce(jsonb_agg(jsonb_build_object('etapa', et.nombre, 'estado', o.estado)
                                                     order by et.orden), '[]'::jsonb)
                           from ordenes_produccion o join etapas et on et.id = o.etapa_id
                           where o.pedido_item_id = i.id and o.estado <> 'cancelada'))
              order by i.created_at), '[]'::jsonb)
              from pedido_items i where i.pedido_id = p.id),
    'pagos', (select coalesce(jsonb_agg(jsonb_build_object('fecha', pc.fecha, 'monto', pc.monto,
                                                            'metodo', pc.metodo) order by pc.fecha, pc.created_at), '[]'::jsonb)
              from pagos_cliente pc where pc.pedido_id = p.id and not pc.anulado),
    'link_pago', case when p.saldo > 0 then
                   (select lp.url from links_pago lp
                    where lp.pedido_id = p.id and lp.estado = 'activo'
                    order by lp.created_at desc limit 1) end)
    end
  from pedidos p
  join empresas e on e.id = p.empresa_id
  join clientes c on c.id = p.cliente_id
  where p.token_portal = p_token and p.estado <> 'cancelado'
    and (p_slug is null or e.slug = lower(trim(p_slug)));
$$;

revoke execute on function public.portal_pedido(uuid, text) from public, anon, authenticated;
grant  execute on function public.portal_pedido(uuid, text) to service_role;
