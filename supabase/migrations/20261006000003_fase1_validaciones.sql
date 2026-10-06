-- =====================================================================
-- VETA · Fase 1: referencias cruzadas en invitaciones y miembros
-- El destajista ligado a una invitación o a un miembro debe ser de la misma empresa.
-- =====================================================================
create or replace function public._tg_destajista_misma_empresa()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform _valida_empresa('destajistas', new.destajista_id, new.empresa_id);
  return new;
end $$;

create trigger invitaciones_destajista before insert or update on invitaciones
  for each row execute function _tg_destajista_misma_empresa();
create trigger miembros_destajista before insert or update on miembros
  for each row execute function _tg_destajista_misma_empresa();
