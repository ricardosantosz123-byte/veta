-- =====================================================================
-- VETA · Fase 7: portal del cliente final
--   · portal_pedido(token, slug): el link solo se ve bajo el slug de su mueblería; fecha del pedido
--     en America/Mexico_City; fechas de cada estado para la línea de tiempo; el botón de pago solo
--     con saldo; sin costos, destajistas, notas ni contacto del cliente (solo su nombre de pila).
--   · Límite por IP: portal_permitido / portal_registrar_intento (10 cada 10 minutos, IP con hash).
--   Todo lo llama solo la Edge Function `portal` con service_role.
-- =====================================================================

drop function public.portal_pedido(uuid);

create or replace function public.portal_pedido(p_token uuid, p_slug text default null)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
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
                 'liquidado_at', p.liquidado_at, 'entregado_at', p.entregado_at),
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
  from pedidos p
  join empresas e on e.id = p.empresa_id
  join clientes c on c.id = p.cliente_id
  where p.token_portal = p_token and p.estado <> 'cancelado'
    and (p_slug is null or e.slug = lower(trim(p_slug)));
$$;

-- ¿Esta IP (ya con hash) puede intentar? 10 intentos cada 10 minutos.
create or replace function public.portal_permitido(p_ip_hash text)
returns boolean language sql stable security definer set search_path = public as $$
  select count(*) < 10 from portal_intentos
  where ip_hash = p_ip_hash and created_at > now() - interval '10 minutes';
$$;

-- Registra un intento (búsqueda o link inexistente) y limpia los de más de un día.
create or replace function public.portal_registrar_intento(p_ip_hash text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(length(p_ip_hash), 0) < 32 then raise exception 'Hash de IP inválido'; end if;
  insert into portal_intentos (ip_hash) values (p_ip_hash);
  delete from portal_intentos where created_at < now() - interval '1 day';
end $$;

revoke execute on function public.portal_pedido(uuid, text)            from public, anon, authenticated;
grant  execute on function public.portal_pedido(uuid, text)            to service_role;
revoke execute on function public.portal_permitido(text)               from public, anon, authenticated;
grant  execute on function public.portal_permitido(text)               to service_role;
revoke execute on function public.portal_registrar_intento(text)       from public, anon, authenticated;
grant  execute on function public.portal_registrar_intento(text)       to service_role;
grant  select, insert, delete on portal_intentos to service_role;
