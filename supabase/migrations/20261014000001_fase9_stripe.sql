-- =====================================================================
-- VETA · Fase 9: suscripción con Stripe
--   · Los campos de suscripción de empresas solo los escribe la base (service_role vía Edge Functions).
--   · guardar_cliente_stripe: liga el customer de Stripe a la empresa (una sola vez).
--   · aplicar_suscripcion_stripe: aplica el estado ACTUAL de la suscripción (el webhook la vuelve a
--     leer de la API, así el orden de los eventos no importa). Mapeo del PRD §5.11:
--     active, trialing, past_due → activa · unpaid, incomplete_expired → vencida · canceled → cancelada
--     · incomplete → sin cambio (el primer cobro aún no se confirma).
--   · stripe_eventos: eventos ya procesados (idempotencia del webhook).
-- =====================================================================

alter table empresas add column cancela_al_final boolean not null default false;

create table stripe_eventos (
  id          text primary key,           -- evt_… de Stripe
  tipo        text not null,
  empresa_id  uuid references empresas(id) on delete set null,
  recibido_at timestamptz not null default now()
);
alter table stripe_eventos enable row level security;  -- sin políticas: solo service_role
revoke all on stripe_eventos from anon, authenticated;
grant select, insert on stripe_eventos to service_role;

create or replace function public.guardar_cliente_stripe(p_empresa uuid, p_customer text)
returns void language plpgsql security definer set search_path = public as $$
declare v_actual text;
begin
  if p_customer !~ '^cus_[A-Za-z0-9]+$' then raise exception 'Customer de Stripe inválido'; end if;
  select stripe_customer_id into v_actual from empresas where id = p_empresa for update;
  if not found then raise exception 'Empresa no encontrada'; end if;
  if v_actual is not null and v_actual <> p_customer then
    raise exception 'La empresa ya tiene otro customer de Stripe';
  end if;
  update empresas set stripe_customer_id = p_customer where id = p_empresa;
end $$;

create or replace function public.aplicar_suscripcion_stripe(
  p_empresa uuid, p_customer text, p_subscription text, p_status text,
  p_intervalo text, p_periodo_termina timestamptz, p_cancela_al_final boolean)
returns estado_suscripcion language plpgsql security definer set search_path = public as $$
declare e empresas; v_estado estado_suscripcion;
begin
  select * into e from empresas where id = p_empresa for update;
  if e.id is null then raise exception 'Empresa no encontrada'; end if;
  if e.stripe_customer_id is not null and p_customer is distinct from e.stripe_customer_id then
    raise exception 'El customer no corresponde a la empresa';
  end if;
  if p_intervalo is not null and p_intervalo not in ('mes', 'anio') then raise exception 'Intervalo inválido'; end if;

  v_estado := case p_status
    when 'active' then 'activa' when 'trialing' then 'activa' when 'past_due' then 'activa'
    when 'unpaid' then 'vencida' when 'incomplete_expired' then 'vencida'
    when 'canceled' then 'cancelada'
    when 'incomplete' then e.estado_suscripcion
    when 'paused' then 'vencida'
    else null end;
  if v_estado is null then raise exception 'Estado de Stripe desconocido: %', p_status; end if;

  update empresas set
    estado_suscripcion     = v_estado,
    stripe_customer_id     = coalesce(stripe_customer_id, p_customer),
    stripe_subscription_id = coalesce(p_subscription, stripe_subscription_id),
    plan_intervalo         = coalesce(p_intervalo, plan_intervalo),
    periodo_termina        = coalesce(p_periodo_termina, periodo_termina),
    cancela_al_final       = coalesce(p_cancela_al_final, false) and v_estado = 'activa'
  where id = p_empresa;
  return v_estado;
end $$;

revoke execute on function public.guardar_cliente_stripe(uuid, text) from public, anon, authenticated;
grant  execute on function public.guardar_cliente_stripe(uuid, text) to service_role;
revoke execute on function public.aplicar_suscripcion_stripe(uuid, text, text, text, text, timestamptz, boolean) from public, anon, authenticated;
grant  execute on function public.aplicar_suscripcion_stripe(uuid, text, text, text, text, timestamptz, boolean) to service_role;
