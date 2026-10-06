-- =====================================================================
-- VETA · Fase 10: avisos automáticos (PRD §5.9)
--   La base llama a la Edge Function `avisos` con pg_net (asíncrono, después del commit):
--   · pedido → terminado          → aviso al cliente con link al portal.
--   · pago de Mercado Pago (insert con externo_id) → aviso de pago recibido.
--   · pg_cron diario 9:00 (CDMX)  → prueba por vencer (3 días antes y el último día).
--   La URL de las funciones y el secreto viven en Supabase Vault (veta_funciones_url, veta_avisos_secreto).
--   Si faltan pg_net, Vault o esos secretos, _avisar no hace nada: un aviso nunca rompe una operación.
-- =====================================================================

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net;
  end if;
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
  end if;
end $$;

create or replace function public._avisar(p_tipo text, p_datos jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_url text; v_secreto text;
begin
  if to_regnamespace('net') is null or to_regclass('vault.decrypted_secrets') is null then return; end if;
  execute 'select decrypted_secret from vault.decrypted_secrets where name = $1' into v_url using 'veta_funciones_url';
  execute 'select decrypted_secret from vault.decrypted_secrets where name = $1' into v_secreto using 'veta_avisos_secreto';
  if v_url is null or v_secreto is null then return; end if;
  execute 'select net.http_post(url := $1, body := $2, headers := $3, timeout_milliseconds := 5000)'
    using rtrim(v_url, '/') || '/avisos',
          jsonb_build_object('tipo', p_tipo) || coalesce(p_datos, '{}'::jsonb),
          jsonb_build_object('Content-Type', 'application/json', 'x-avisos-secreto', v_secreto);
exception when others then
  raise warning 'Aviso % no enviado: %', p_tipo, sqlerrm;  -- nunca rompe la operación que lo disparó
end $$;

create or replace function public._tg_aviso_pedido_terminado()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform _avisar('pedido_terminado', jsonb_build_object('pedido_id', new.id));
  return null;
end $$;
create trigger aviso_pedido_terminado after update of estado on pedidos
  for each row when (new.estado = 'terminado' and old.estado is distinct from 'terminado')
  execute function _tg_aviso_pedido_terminado();

create or replace function public._tg_aviso_pago_mp()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform _avisar('pago_mercado_pago', jsonb_build_object('pago_id', new.id));
  return null;
end $$;
create trigger aviso_pago_mp after insert on pagos_cliente
  for each row when (new.externo_id is not null)
  execute function _tg_aviso_pago_mp();

-- Prueba por vencer: todos los días a las 15:00 UTC (9:00 en la Ciudad de México).
do $$
begin
  if to_regnamespace('cron') is not null then
    perform cron.unschedule(jobid) from cron.job where jobname = 'veta-avisos-prueba';
    perform cron.schedule('veta-avisos-prueba', '0 15 * * *', 'select public._avisar(''prueba_por_vencer'')');
  end if;
end $$;

revoke execute on function public._avisar(text, jsonb) from public, anon, authenticated;
