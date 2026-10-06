-- =====================================================================
-- VETA · "Markup" pasa a "Margen de venta" (decisión de Ricardo, 2026-10-06).
--   Antes: precio = costo × (1 + markup).    Ahora: precio = costo ÷ (1 − margen).
--   Un margen de 30 % significa que el 30 % del precio de venta es utilidad (costo ÷ 0.70).
--   Los valores existentes se convierten al margen equivalente, así ningún precio cambia:
--   margen = markup ÷ (1 + markup)   (100 % de markup = 50 % de margen).
--   La columna markup queda sin uso (no se borra ningún dato).
-- =====================================================================

alter table modelo_costeo add column margen_venta numeric(5,4);
update modelo_costeo set margen_venta = round(markup / (1 + markup), 4);
alter table modelo_costeo alter column margen_venta set default 0.5;
alter table modelo_costeo alter column margen_venta set not null;
alter table modelo_costeo add constraint modelo_costeo_margen_venta_check check (margen_venta >= 0 and margen_venta <= 0.9);
comment on column modelo_costeo.margen_venta is 'Margen de venta (fracción del precio): precio = costo / (1 - margen). 0.30 = 30 %.';
comment on column modelo_costeo.markup is 'Sin uso desde 2026-10-06: reemplazado por margen_venta. Se conserva el dato histórico.';

-- Mensaje claro antes que el check en inglés.
create or replace function public._tg_margen_venta()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.margen_venta is null or new.margen_venta < 0 or new.margen_venta > 0.9 then
    raise exception 'El margen de venta debe estar entre 0 %% y 90 %%';
  end if;
  return new;
end $$;
create trigger modelo_costeo_margen before insert or update on modelo_costeo
  for each row execute function _tg_margen_venta();

create or replace function public.calcular_precio(p_modelo uuid, p_opciones uuid[], p_lista uuid default null)
returns numeric language plpgsql stable security definer set search_path = public as $$
declare
  v_emp uuid; v_base numeric; v_sobre boolean; v_metodo metodo_precio; v_iva numeric;
  v_margen numeric; v_precio numeric;
  v_factor numeric := 1; v_con_iva boolean := false; v_redondeo int := 0;
begin
  select empresa_id, precio_base, sobre_diseno into v_emp, v_base, v_sobre from modelos where id = p_modelo;
  if v_emp is null then raise exception 'Modelo no encontrado'; end if;
  if not tiene_rol(v_emp, '{admin,vendedor,produccion,contador}') then raise exception 'Sin acceso'; end if;
  if v_sobre then raise exception 'Este modelo es sobre diseño: su precio es manual'; end if;
  perform _validar_opciones(p_modelo, p_opciones);

  select metodo_precio, iva into v_metodo, v_iva from empresas where id = v_emp;

  if v_metodo = 'componentes' then
    -- Margen de venta: el % del precio que es utilidad. 30 % → costo ÷ 0.70. Sin capturar: 50 %.
    select margen_venta into v_margen from modelo_costeo where modelo_id = p_modelo;
    v_precio := _calcular_costo(p_modelo, p_opciones) / (1 - coalesce(v_margen, 0.5));
  else
    select v_base + coalesce(sum(ajuste_precio), 0) into v_precio
    from opciones where empresa_id = v_emp and id = any(coalesce(p_opciones, '{}'));
  end if;

  if p_lista is not null then
    select factor, incluye_iva, redondeo into v_factor, v_con_iva, v_redondeo
    from listas_precios where id = p_lista and empresa_id = v_emp;
    if not found then raise exception 'Lista de precios no encontrada'; end if;
    v_precio := v_precio * coalesce(v_factor, 1);
    if coalesce(v_con_iva, false) then v_precio := v_precio * (1 + v_iva); end if;
    if coalesce(v_redondeo, 0) > 0 then v_precio := ceil(v_precio / v_redondeo) * v_redondeo; end if;
  end if;

  return round(v_precio, 2);
end $$;
