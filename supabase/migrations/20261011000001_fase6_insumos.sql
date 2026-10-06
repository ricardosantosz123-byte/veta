-- =====================================================================
-- VETA · Fase 6: insumos
--   · Catálogo: unidad de una lista cerrada; nombre único sin distinguir mayúsculas ni acentos;
--     la unidad no cambia si ya hay movimientos; un insumo con movimientos no se borra (se desactiva).
--   · Existencia y costo promedio solo los escribe la base (4 decimales, renglón bloqueado al calcular).
--   · Movimientos: entrada con costo; ajuste con motivo; la existencia nunca queda negativa;
--     solo una salida se liga a una orden (misma empresa, no cancelada) y guarda su destajista;
--     salidas y ajustes guardan el costo promedio del momento (valor del material).
--   · crear_insumo (con existencia inicial que exige costo), ajustar_existencia (conteo físico),
--     material_entregado (ficha de la orden y "Mis órdenes", sin costos para el Destajista).
--   · v_insumos (bajo mínimo), v_movimientos_insumo (historial con existencia después).
--   · v_pedido_resumen: el margen es "Margen sobre destajos" (no incluye material).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Columnas y restricciones (las tablas están vacías en veta-dev)
-- ---------------------------------------------------------------------
alter table insumos            alter column costo_unitario type numeric(14,4);
alter table movimientos_insumo alter column costo_unitario type numeric(14,4);

alter table insumos add column nombre_norm text;
update insumos set nombre_norm = _norm(nombre);
alter table insumos alter column nombre_norm set not null;
alter table insumos drop constraint insumos_empresa_id_nombre_key;
alter table insumos add constraint insumos_nombre_unico unique (empresa_id, nombre_norm);
alter table insumos add constraint insumos_unidad_check
  check (unidad in ('pza', 'm', 'm2', 'pie_tabla', 'kg', 'l'));
alter table insumos add constraint insumos_minimo_check check (minimo >= 0);

alter table movimientos_insumo
  add column destajista_id uuid references destajistas(id) on delete set null; -- a quién se le entregó
alter table movimientos_insumo add constraint movimientos_insumo_orden_solo_salida
  check (orden_id is null or tipo = 'salida');
alter table movimientos_insumo add constraint movimientos_insumo_costo_entrada
  check (tipo <> 'entrada' or costo_unitario >= 0);

-- Borrar un insumo ya no borra su historial.
alter table movimientos_insumo drop constraint movimientos_insumo_insumo_id_fkey;
alter table movimientos_insumo add constraint movimientos_insumo_insumo_id_fkey
  foreign key (insumo_id) references insumos(id);
create index on movimientos_insumo (orden_id) where orden_id is not null;

-- ---------------------------------------------------------------------
-- Insumo
-- ---------------------------------------------------------------------
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
  if new.unidad not in ('pza', 'm', 'm2', 'pie_tabla', 'kg', 'l') then
    raise exception 'Unidad no válida: usa pza, m, m2, pie_tabla, kg o l';
  end if;
  if new.minimo < 0 then raise exception 'El mínimo no puede ser negativo'; end if;
  new.proveedor := nullif(trim(new.proveedor), '');

  new.existencia := (select coalesce(sum(case tipo when 'salida' then -cantidad else cantidad end), 0)
                     from movimientos_insumo where insumo_id = new.id);
  new.updated_at := now();
  return new;
end $$;

create or replace function public._tg_insumo_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Al borrar la empresa completa sí se va todo (la empresa ya no existe en ese momento).
  if exists (select 1 from movimientos_insumo where insumo_id = old.id)
     and exists (select 1 from empresas where id = old.empresa_id) then
    raise exception 'El insumo "%" tiene movimientos: desactívalo en lugar de borrarlo', old.nombre;
  end if;
  return old;
end $$;
create trigger insumo_delete before delete on insumos
  for each row execute function _tg_insumo_delete();

-- ---------------------------------------------------------------------
-- Movimientos
-- ---------------------------------------------------------------------
create or replace function public._tg_movimiento_before()
returns trigger language plpgsql security definer set search_path = public as $$
declare i insumos; o ordenes_produccion; v_nueva numeric;
begin
  -- Bloquea el insumo: dos entradas simultáneas no calculan el promedio con datos viejos.
  select * into i from insumos where id = new.insumo_id for update;
  if i.id is null then raise exception 'Insumo no encontrado'; end if;
  new.empresa_id := i.empresa_id;
  if not i.activo then
    raise exception 'El insumo "%" está desactivado: reactívalo para registrar movimientos', i.nombre;
  end if;

  new.nota := nullif(trim(new.nota), '');
  if new.tipo = 'ajuste' then
    if coalesce(new.cantidad, 0) = 0 then raise exception 'El ajuste debe cambiar la existencia'; end if;
    if new.nota is null then raise exception 'Escribe el motivo del ajuste'; end if;
  elsif coalesce(new.cantidad, 0) <= 0 then
    raise exception 'La cantidad debe ser mayor que cero';
  end if;

  if new.tipo = 'entrada' then
    if new.costo_unitario is null then raise exception 'Escribe el costo unitario de la entrada'; end if;
    if new.costo_unitario < 0 then raise exception 'El costo unitario no puede ser negativo'; end if;
  else
    new.costo_unitario := i.costo_unitario;  -- costo promedio del momento: valor del material
  end if;

  new.destajista_id := null;
  if new.orden_id is not null then
    if new.tipo <> 'salida' then raise exception 'Solo una salida se liga a una orden'; end if;
    select * into o from ordenes_produccion where id = new.orden_id;
    if o.id is null or o.empresa_id <> i.empresa_id then
      raise exception 'Referencia inválida a ordenes_produccion para esta empresa';
    end if;
    if o.estado = 'cancelada' then raise exception 'La orden O-% está cancelada', o.folio; end if;
    new.destajista_id := o.destajista_id;
  end if;

  v_nueva := i.existencia + case new.tipo when 'salida' then -new.cantidad else new.cantidad end;
  if v_nueva < 0 then
    raise exception 'No hay suficiente "%": hay % % y el movimiento pide %. Registra primero la entrada o haz un ajuste',
      i.nombre, trim_scale(i.existencia), i.unidad, trim_scale(abs(new.cantidad));
  end if;

  if new.tipo = 'entrada' then
    update insumos set costo_unitario = case
      when i.existencia > 0
        then round((i.existencia * i.costo_unitario + new.cantidad * new.costo_unitario) / (i.existencia + new.cantidad), 4)
      else new.costo_unitario end
    where id = i.id;
  end if;

  new.created_at := clock_timestamp();  -- orden exacto del historial, aun dentro de una transacción
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Columnas que solo escribe la base
-- ---------------------------------------------------------------------
revoke insert, update on insumos from authenticated;
grant insert (empresa_id, nombre, tipo, unidad, minimo, proveedor, activo) on insumos to authenticated;
grant update (nombre, tipo, unidad, minimo, proveedor, activo) on insumos to authenticated;

revoke insert, update on movimientos_insumo from authenticated;
grant insert (empresa_id, insumo_id, tipo, cantidad, costo_unitario, orden_id, nota)
  on movimientos_insumo to authenticated;

-- ---------------------------------------------------------------------
-- RPC
-- ---------------------------------------------------------------------
-- Alta con existencia inicial (registrada como primera entrada, con su costo).
create or replace function public.crear_insumo(
  p_empresa uuid, p_nombre text, p_tipo text, p_unidad text,
  p_minimo numeric default 0, p_proveedor text default null,
  p_existencia_inicial numeric default 0, p_costo_inicial numeric default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not tiene_rol(p_empresa, '{admin,produccion}') then raise exception 'Sin acceso'; end if;
  if not puede_escribir(p_empresa) then raise exception 'Cuenta en solo lectura: activa tu suscripción'; end if;
  if coalesce(p_existencia_inicial, 0) < 0 then raise exception 'La existencia inicial no puede ser negativa'; end if;
  if coalesce(p_existencia_inicial, 0) > 0 and p_costo_inicial is null then
    raise exception 'Escribe el costo unitario de la existencia inicial';
  end if;

  insert into insumos (empresa_id, nombre, tipo, unidad, minimo, proveedor)
  values (p_empresa, p_nombre, coalesce(p_tipo, 'otro'), coalesce(p_unidad, 'pza'), coalesce(p_minimo, 0), p_proveedor)
  returning id into v_id;

  if coalesce(p_existencia_inicial, 0) > 0 then
    insert into movimientos_insumo (empresa_id, insumo_id, tipo, cantidad, costo_unitario, nota)
    values (p_empresa, v_id, 'entrada', p_existencia_inicial, p_costo_inicial, 'Existencia inicial');
  end if;
  return v_id;
end $$;

-- Ajuste por conteo físico: la base calcula la diferencia con el renglón bloqueado.
create or replace function public.ajustar_existencia(p_insumo uuid, p_existencia_contada numeric, p_motivo text)
returns numeric language plpgsql security definer set search_path = public as $$
declare i insumos; v_dif numeric;
begin
  select * into i from insumos where id = p_insumo for update;
  if i.id is null then raise exception 'Insumo no encontrado'; end if;
  if not tiene_rol(i.empresa_id, '{admin,produccion}') then raise exception 'Sin acceso'; end if;
  if not puede_escribir(i.empresa_id) then raise exception 'Cuenta en solo lectura: activa tu suscripción'; end if;
  if p_existencia_contada is null or p_existencia_contada < 0 then
    raise exception 'La existencia contada no puede ser negativa';
  end if;
  v_dif := p_existencia_contada - i.existencia;
  if v_dif = 0 then
    raise exception 'La existencia contada es igual a la registrada: no hay nada que ajustar';
  end if;
  insert into movimientos_insumo (empresa_id, insumo_id, tipo, cantidad, nota)
  values (i.empresa_id, i.id, 'ajuste', v_dif, p_motivo);
  return v_dif;
end $$;

-- Material entregado por orden. El Destajista ve solo el suyo y sin costos.
create or replace function public.material_entregado(p_ordenes uuid[])
returns table (
  movimiento_id uuid, orden_id uuid, insumo_id uuid, insumo text, unidad text,
  cantidad numeric, nota text, destajista text, entregado_at timestamptz, valor numeric)
language sql stable security definer set search_path = public as $$
  select m.id, m.orden_id, i.id, i.nombre, i.unidad, m.cantidad, m.nota, d.nombre, m.created_at,
         case when tiene_rol(m.empresa_id, '{admin,produccion,contador}')
              then round(m.cantidad * m.costo_unitario, 2) end
  from movimientos_insumo m
  join insumos i on i.id = m.insumo_id
  left join destajistas d on d.id = m.destajista_id
  where m.orden_id = any(p_ordenes) and m.tipo = 'salida'
    and (tiene_rol(m.empresa_id, '{admin,produccion,contador}')
         or (m.destajista_id is not null and m.destajista_id = mi_destajista(m.empresa_id)))
  order by m.created_at;
$$;

-- ---------------------------------------------------------------------
-- Vistas (security_invoker: aplican el RLS de quien consulta)
-- ---------------------------------------------------------------------
create view v_insumos with (security_invoker = true) as
select i.id, i.empresa_id, i.nombre, i.tipo, i.unidad, i.costo_unitario, i.existencia, i.minimo,
       i.proveedor, i.activo, i.updated_at,
       (i.minimo > 0 and i.existencia < i.minimo)  as bajo_minimo,
       round(i.existencia * i.costo_unitario, 2)    as valor_existencia,
       (select max(m.created_at) from movimientos_insumo m where m.insumo_id = i.id) as ultimo_movimiento_at
from insumos i;

create view v_movimientos_insumo with (security_invoker = true) as
select m.id, m.empresa_id, m.insumo_id, i.nombre as insumo, i.unidad, m.tipo, m.cantidad,
       case m.tipo when 'salida' then -m.cantidad else m.cantidad end as efecto,
       m.costo_unitario,
       round(abs(m.cantidad) * m.costo_unitario, 2) as valor,
       sum(case m.tipo when 'salida' then -m.cantidad else m.cantidad end)
         over (partition by m.insumo_id order by m.created_at, m.id) as existencia_despues,
       m.orden_id, o.folio as orden_folio, m.destajista_id, d.nombre as destajista,
       m.nota, m.created_by, m.created_at
from movimientos_insumo m
join insumos i on i.id = m.insumo_id
left join ordenes_produccion o on o.id = m.orden_id
left join destajistas d on d.id = m.destajista_id;

comment on column v_pedido_resumen.margen_bruto is
  'Margen sobre destajos: venta sin IVA menos el costo de las órdenes. No incluye material de insumos.';
comment on column v_pedido_resumen.margen_pct is
  'Margen sobre destajos en %. No incluye material de insumos.';

revoke all on v_insumos, v_movimientos_insumo from anon;
grant select on v_insumos, v_movimientos_insumo to authenticated;
revoke execute on function public.crear_insumo(uuid, text, text, text, numeric, text, numeric, numeric) from public, anon;
grant  execute on function public.crear_insumo(uuid, text, text, text, numeric, text, numeric, numeric) to authenticated;
revoke execute on function public.ajustar_existencia(uuid, numeric, text) from public, anon;
grant  execute on function public.ajustar_existencia(uuid, numeric, text) to authenticated;
revoke execute on function public.material_entregado(uuid[]) from public, anon;
grant  execute on function public.material_entregado(uuid[]) to authenticated;
