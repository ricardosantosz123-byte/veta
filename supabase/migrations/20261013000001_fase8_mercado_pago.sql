-- =====================================================================
-- VETA · Fase 8: link de pago con Mercado Pago (cuenta propia de cada mueblería)
--   · Conexión: mp_guardar_conexion (service_role, tras validar el token contra la API) y
--     mp_desconectar (Admin). empresas.mp_cuenta muestra con qué cuenta se conectó.
--   · Links: preparar_link_pago valida rol, cuenta activa, conexión y monto (≤ saldo) con la sesión
--     de quien lo pide; registrar_link_pago (service_role) lo guarda y cancela el link activo anterior.
--     Desde la app solo se cancela un link activo (RLS); "pagado" y "expirado" los escribe la base.
--   · registrar_pago_mp (service_role, lo llama mp-webhook después de consultar el pago en la API):
--     idempotente por externo_id; el pedido debe ser de la empresa de la URL; marca el link pagado.
-- =====================================================================

alter table empresas add column mp_cuenta text;  -- apodo o correo de la cuenta conectada (no es secreto)

alter table links_pago
  add column concepto  text not null default 'saldo' check (concepto in ('anticipo', 'saldo', 'otro')),
  add column pagado_at timestamptz,
  add column pago_id   uuid references pagos_cliente(id) on delete set null;

-- ---------------------------------------------------------------------
-- Links: desde la app solo se cancela un link activo (la columna estado es la única con permiso).
-- "pagado" y "expirado" los escriben funciones de la base y service_role, que no pasan por RLS.
-- ---------------------------------------------------------------------
drop policy lp_upd on links_pago;
create policy lp_upd on links_pago for update
  using (tiene_rol(empresa_id, '{admin,vendedor}') and estado = 'activo')
  with check (estado = 'cancelado');

-- ---------------------------------------------------------------------
-- Conexión con Mercado Pago
-- ---------------------------------------------------------------------
create or replace function public.mp_guardar_conexion(p_empresa uuid, p_token text, p_cuenta text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(length(trim(p_token)), 0) < 20 then raise exception 'Token de Mercado Pago inválido'; end if;
  insert into empresa_secretos (empresa_id, mp_access_token, updated_at) values (p_empresa, trim(p_token), now())
  on conflict (empresa_id) do update set mp_access_token = excluded.mp_access_token, updated_at = now();
  update empresas set mp_conectado = true, mp_cuenta = nullif(trim(p_cuenta), '') where id = p_empresa;
end $$;

create or replace function public.mp_desconectar(p_empresa uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not tiene_rol(p_empresa, '{admin}') then raise exception 'Solo el Admin puede desconectar Mercado Pago'; end if;
  update empresa_secretos set mp_access_token = null, updated_at = now() where empresa_id = p_empresa;
  update empresas set mp_conectado = false, mp_cuenta = null where id = p_empresa;
  update links_pago set estado = 'cancelado' where empresa_id = p_empresa and estado = 'activo';
end $$;

-- ---------------------------------------------------------------------
-- Links de pago
-- ---------------------------------------------------------------------
-- Valida con la sesión de quien pide el link y devuelve lo necesario para crear la preferencia.
create or replace function public.preparar_link_pago(p_pedido uuid, p_monto numeric)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare p pedidos; e empresas; v_monto numeric := round(p_monto, 2); v_falta numeric;
begin
  select * into p from pedidos where id = p_pedido;
  if p.id is null then raise exception 'Pedido no encontrado'; end if;
  if not tiene_rol(p.empresa_id, '{admin,vendedor}') then raise exception 'Solo Admin o Vendedor generan links de pago'; end if;
  if not puede_escribir(p.empresa_id) then raise exception 'Cuenta en solo lectura: activa tu suscripción'; end if;
  select * into e from empresas where id = p.empresa_id;
  if not e.mp_conectado then raise exception 'Conecta Mercado Pago en Ajustes > Cobros en línea'; end if;
  if p.estado in ('cancelado', 'entregado') then raise exception 'No se generan links para un pedido %', p.estado; end if;
  if v_monto is null or v_monto <= 0 then raise exception 'Escribe un monto mayor que cero'; end if;
  if v_monto > p.saldo then raise exception 'El monto (%) es mayor que el saldo del pedido (%)', v_monto, greatest(p.saldo, 0); end if;
  v_falta := greatest(p.anticipo_requerido - p.pagado, 0);
  return jsonb_build_object(
    'empresa_id', p.empresa_id, 'empresa', e.nombre, 'slug', e.slug,
    'pedido_id', p.id, 'folio', p.folio, 'token_portal', p.token_portal, 'monto', v_monto,
    'concepto', case when v_monto = p.saldo then 'saldo'
                     when p.estado = 'anticipo_pendiente' and v_monto = v_falta then 'anticipo'
                     else 'otro' end);
end $$;

-- Guarda el link ya creado en Mercado Pago (vuelve a validar el monto) y cancela el activo anterior.
create or replace function public.registrar_link_pago(
  p_pedido uuid, p_monto numeric, p_url text, p_externo text, p_concepto text, p_usuario uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare p pedidos; v_id uuid;
begin
  select * into p from pedidos where id = p_pedido for update;
  if p.id is null then raise exception 'Pedido no encontrado'; end if;
  if p.estado in ('cancelado', 'entregado') then raise exception 'No se generan links para un pedido %', p.estado; end if;
  if p_monto is null or p_monto <= 0 or p_monto > p.saldo then raise exception 'Monto inválido para el saldo del pedido'; end if;
  if p_url !~ '^https://' then raise exception 'URL de pago inválida'; end if;
  update links_pago set estado = 'cancelado' where pedido_id = p_pedido and estado = 'activo';
  insert into links_pago (empresa_id, pedido_id, proveedor, monto, url, externo_id, concepto, created_by)
  values (p.empresa_id, p_pedido, 'mercado_pago', round(p_monto, 2), p_url, p_externo,
          coalesce(nullif(p_concepto, ''), 'saldo'), p_usuario)
  returning id into v_id;
  return v_id;
end $$;

-- Pago aprobado en Mercado Pago (consultado en su API por mp-webhook). Idempotente.
create or replace function public.registrar_pago_mp(
  p_empresa uuid, p_pedido uuid, p_pago_externo text, p_monto numeric, p_fecha date)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_emp uuid;
begin
  select empresa_id into v_emp from pedidos where id = p_pedido;
  if v_emp is null or v_emp <> p_empresa then raise exception 'El pedido no pertenece a esta empresa'; end if;
  if coalesce(trim(p_pago_externo), '') = '' then raise exception 'Falta el id del pago'; end if;
  if p_monto is null or p_monto <= 0 then raise exception 'Monto inválido'; end if;

  select id into v_id from pagos_cliente where externo_id = p_pago_externo;
  if v_id is not null then return v_id; end if;  -- notificación repetida

  insert into pagos_cliente (empresa_id, pedido_id, monto, metodo, referencia, fecha, externo_id, registrado_por)
  values (p_empresa, p_pedido, round(p_monto, 2), 'mercado_pago', 'Mercado Pago #' || p_pago_externo,
          least(coalesce(p_fecha, hoy_mx()), hoy_mx()), p_pago_externo, null)
  on conflict (externo_id) do nothing
  returning id into v_id;
  if v_id is null then select id into v_id from pagos_cliente where externo_id = p_pago_externo; end if;

  update links_pago set estado = 'pagado', pagado_at = now(), pago_id = v_id
  where pedido_id = p_pedido and estado = 'activo';
  return v_id;
end $$;

revoke execute on function public.mp_guardar_conexion(uuid, text, text)                       from public, anon, authenticated;
grant  execute on function public.mp_guardar_conexion(uuid, text, text)                       to service_role;
revoke execute on function public.mp_desconectar(uuid)                                        from public, anon;
grant  execute on function public.mp_desconectar(uuid)                                        to authenticated;
revoke execute on function public.preparar_link_pago(uuid, numeric)                           from public, anon;
grant  execute on function public.preparar_link_pago(uuid, numeric)                           to authenticated;
revoke execute on function public.registrar_link_pago(uuid, numeric, text, text, text, uuid)  from public, anon, authenticated;
grant  execute on function public.registrar_link_pago(uuid, numeric, text, text, text, uuid)  to service_role;
revoke execute on function public.registrar_pago_mp(uuid, uuid, text, numeric, date)          from public, anon, authenticated;
grant  execute on function public.registrar_pago_mp(uuid, uuid, text, numeric, date)          to service_role;
