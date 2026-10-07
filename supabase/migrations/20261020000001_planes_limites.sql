-- =====================================================================
-- VETA · Planes y límite de usuarios (decisión de Ricardo, 2026-10-06)
--   · Planes: Taller ($300), Mueblería ($500) y Despacho de Interiores ($500) al mes, IVA incluido;
--     anual con 2 meses gratis. Los montos viven en Stripe; aquí solo el plan contratado.
--   · Cada plan incluye 3 usuarios de oficina (Vendedor, Comprador, Producción) y 5 proveedores
--     con acceso a la app. Admin y Contador no cuentan.
--   · Usuarios adicionales ($100 al mes c/u): una bolsa que cubre lo que exceda en cualquiera
--     de los dos grupos. La cantidad la escribe solo el webhook de Stripe.
--   · Se cuentan los miembros activos y las invitaciones pendientes (sin contar dos veces a quien
--     ya aceptó). Si no cabe, la base rechaza la invitación o el alta con un mensaje claro.
-- =====================================================================

alter table empresas
  add column plan text not null default 'muebleria' check (plan in ('taller', 'muebleria', 'despacho')),
  add column usuarios_extra int not null default 0 check (usuarios_extra between 0 and 500);

comment on column empresas.plan is 'Plan de Veta. Lo escribe aplicar_suscripcion_stripe; durante la prueba es Mueblería.';
comment on column empresas.usuarios_extra is 'Usuarios adicionales contratados en Stripe (bolsa para oficina y proveedores).';

-- Grupo que cuenta para el límite: oficina, proveedor o null (Admin y Contador no cuentan).
create or replace function public._grupo_rol(p_rol rol_miembro)
returns text language sql immutable set search_path = public as $$
  select case when p_rol in ('vendedor', 'comprador', 'produccion') then 'oficina'
              when p_rol = 'destajista' then 'proveedor' end;
$$;

-- Uso del plan. Lo ve cualquier miembro (sin datos personales).
create or replace function public.uso_plan(p_empresa uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_plan text; v_extra int; v_ofi int; v_prov int;
  c_ofi constant int := 3; c_prov constant int := 5;
  v_exceso int;
begin
  if auth.uid() is not null and not es_miembro(p_empresa) then raise exception 'Sin acceso'; end if;
  select plan, usuarios_extra into v_plan, v_extra from empresas where id = p_empresa;
  if v_plan is null then raise exception 'Empresa no encontrada'; end if;

  with ocupados as (
    select _grupo_rol(m.rol) as grupo from miembros m
    where m.empresa_id = p_empresa and m.activo
    union all
    select _grupo_rol(i.rol) from invitaciones i
    where i.empresa_id = p_empresa and i.aceptada_at is null
      and not exists (select 1 from miembros m join auth.users u on u.id = m.user_id
                      where m.empresa_id = p_empresa and lower(u.email) = lower(i.email)))
  select count(*) filter (where grupo = 'oficina'), count(*) filter (where grupo = 'proveedor')
    into v_ofi, v_prov from ocupados;

  v_exceso := greatest(v_ofi - c_ofi, 0) + greatest(v_prov - c_prov, 0);
  return jsonb_build_object(
    'plan', v_plan,
    'oficina', v_ofi, 'oficina_incluidos', c_ofi,
    'proveedores', v_prov, 'proveedores_incluidos', c_prov,
    'extra', v_extra, 'extra_usados', v_exceso,
    'excedido', v_exceso > v_extra);
end $$;

-- Rechaza el cambio si deja a la empresa por encima de su plan.
create or replace function public._tg_limite_usuarios()
returns trigger language plpgsql security definer set search_path = public as $$
declare u jsonb;
begin
  if _grupo_rol(new.rol) is null then return null; end if;
  if tg_table_name = 'miembros' then
    if not new.activo then return null; end if;
    if tg_op = 'UPDATE' then
      if old.activo and _grupo_rol(old.rol) is not distinct from _grupo_rol(new.rol) then return null; end if;
    end if;
  end if;

  u := uso_plan(new.empresa_id);
  if (u->>'excedido')::boolean then
    raise exception 'Llegaste al límite de tu plan: % usuarios de oficina y % proveedores con acceso, más % adicionales. Agrega usuarios adicionales en Suscripción ($100 al mes cada uno).',
      u->>'oficina_incluidos', u->>'proveedores_incluidos', u->>'extra'
      using errcode = 'P0001';
  end if;
  return null;
end $$;

create trigger limite_usuarios_miembros after insert or update of rol, activo on miembros
  for each row execute function _tg_limite_usuarios();
create trigger limite_usuarios_invitaciones after insert or update of rol on invitaciones
  for each row execute function _tg_limite_usuarios();

-- Stripe: ahora también aplica el plan y los usuarios adicionales.
drop function public.aplicar_suscripcion_stripe(uuid, text, text, text, text, timestamptz, boolean);

create or replace function public.aplicar_suscripcion_stripe(
  p_empresa uuid, p_customer text, p_subscription text, p_status text,
  p_intervalo text, p_periodo_termina timestamptz, p_cancela_al_final boolean,
  p_plan text default null, p_usuarios_extra int default null)
returns estado_suscripcion language plpgsql security definer set search_path = public as $$
declare e empresas; v_estado estado_suscripcion;
begin
  select * into e from empresas where id = p_empresa for update;
  if e.id is null then raise exception 'Empresa no encontrada'; end if;
  if e.stripe_customer_id is not null and p_customer is distinct from e.stripe_customer_id then
    raise exception 'El customer no corresponde a la empresa';
  end if;
  if p_intervalo is not null and p_intervalo not in ('mes', 'anio') then raise exception 'Intervalo inválido'; end if;
  if p_plan is not null and p_plan not in ('taller', 'muebleria', 'despacho') then raise exception 'Plan inválido'; end if;
  if p_usuarios_extra is not null and p_usuarios_extra not between 0 and 500 then raise exception 'Usuarios adicionales inválidos'; end if;

  v_estado := case p_status
    when 'active' then 'activa' when 'trialing' then 'activa' when 'past_due' then 'activa'
    when 'unpaid' then 'vencida' when 'incomplete_expired' then 'vencida'
    when 'canceled' then 'cancelada'
    when 'incomplete' then e.estado_suscripcion
    when 'paused' then 'vencida'
    else null end;
  if v_estado is null then raise exception 'Estado de Stripe desconocido: %', p_status; end if;

  -- Bajar usuarios adicionales no borra a nadie: la empresa queda excedida y no puede invitar
  -- ni reactivar a más hasta liberar lugares (la interfaz lo avisa).
  update empresas set
    estado_suscripcion     = v_estado,
    stripe_customer_id     = coalesce(stripe_customer_id, p_customer),
    stripe_subscription_id = coalesce(p_subscription, stripe_subscription_id),
    plan_intervalo         = coalesce(p_intervalo, plan_intervalo),
    periodo_termina        = coalesce(p_periodo_termina, periodo_termina),
    cancela_al_final       = coalesce(p_cancela_al_final, false) and v_estado = 'activa',
    plan                   = coalesce(p_plan, plan),
    usuarios_extra         = case when v_estado = 'activa' then coalesce(p_usuarios_extra, usuarios_extra) else usuarios_extra end
  where id = p_empresa;
  return v_estado;
end $$;

revoke execute on function public._grupo_rol(rol_miembro) from public, anon;
revoke execute on function public._tg_limite_usuarios() from public, anon, authenticated;
revoke execute on function public.uso_plan(uuid) from public, anon;
grant  execute on function public.uso_plan(uuid) to authenticated, service_role;
revoke execute on function public.aplicar_suscripcion_stripe(uuid, text, text, text, text, timestamptz, boolean, text, int) from public, anon, authenticated;
grant  execute on function public.aplicar_suscripcion_stripe(uuid, text, text, text, text, timestamptz, boolean, text, int) to service_role;
