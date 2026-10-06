-- =====================================================================
-- VETA · Fase 6 (ajuste): unidad dm2 (decímetro cuadrado) para piel.
--   La piel se compra por dm² o por pieza; pza ya existía.
-- =====================================================================

alter table insumos drop constraint insumos_unidad_check;
alter table insumos add constraint insumos_unidad_check
  check (unidad in ('pza', 'm', 'm2', 'dm2', 'pie_tabla', 'kg', 'l'));

create or replace function public._tg_insumo_before()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.costo_unitario := 0;  -- el costo llega solo con las entradas
  else
    new.empresa_id := old.empresa_id;
    if new.unidad is distinct from old.unidad
       and exists (select 1 from movimientos_insumo where insumo_id = new.id) then
      raise exception 'No se puede cambiar la unidad: "%" ya tiene movimientos en %', old.nombre, old.unidad;
    end if;
  end if;

  new.nombre := regexp_replace(trim(coalesce(new.nombre, '')), '\s+', ' ', 'g');
  if new.nombre = '' then raise exception 'Escribe el nombre del insumo'; end if;
  new.nombre_norm := _norm(new.nombre);
  if exists (select 1 from insumos
             where empresa_id = new.empresa_id and nombre_norm = new.nombre_norm and id <> new.id) then
    raise exception 'Ya existe un insumo llamado "%"', new.nombre;
  end if;
  if new.unidad not in ('pza', 'm', 'm2', 'dm2', 'pie_tabla', 'kg', 'l') then
    raise exception 'Unidad no válida: usa pza, m, m2, dm2, pie_tabla, kg o l';
  end if;
  if new.minimo < 0 then raise exception 'El mínimo no puede ser negativo'; end if;
  new.proveedor := nullif(trim(new.proveedor), '');

  new.existencia := (select coalesce(sum(case tipo when 'salida' then -cantidad else cantidad end), 0)
                     from movimientos_insumo where insumo_id = new.id);
  new.updated_at := now();
  return new;
end $$;
