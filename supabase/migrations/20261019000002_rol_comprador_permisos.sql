-- =====================================================================
-- VETA · Rol "Comprador" (2 de 2): permisos (decisión de Ricardo, 2026-10-06)
--   El Comprador asigna pedidos a los proveedores (fabricantes), les registra pagos y compra
--   insumos; ve casi todo, incluidos costos y márgenes, pero no edita ventas, catálogo,
--   cobros ni la configuración.
--
--   Regla única, en tiene_rol: el Comprador cumple cualquier permiso que incluya a
--   Producción (lo que hace el taller) o al Contador (lo que se puede leer).
--   Así cada política y RPC existente lo cubre sin reescribirlas, y lo que es solo del
--   Admin (anular pagos, usuarios, empresa, bitácora, catálogo) sigue siendo solo del Admin.
-- =====================================================================

create or replace function public.tiene_rol(p_empresa uuid, p_roles rol_miembro[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from miembros
                 where empresa_id = p_empresa and user_id = auth.uid() and activo
                   and (rol = any(p_roles)
                        or (rol = 'comprador' and p_roles && '{produccion,contador}'::rol_miembro[])));
$$;

comment on function public.tiene_rol(uuid, rol_miembro[]) is
  'true si el usuario tiene alguno de los roles en la empresa. El Comprador cuenta como Producción y como Contador (lectura).';
