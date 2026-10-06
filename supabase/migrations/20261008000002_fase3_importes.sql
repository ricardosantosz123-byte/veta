-- =====================================================================
-- VETA · Fase 3: importes calculados por la base
-- El cotizador, el PDF y los pedidos muestran importe por renglón y monto de descuento:
-- se calculan aquí para que el frontend nunca multiplique ni sume dinero.
-- =====================================================================
alter table cotizacion_items
  add column importe numeric(14,2) generated always as (round(cantidad * coalesce(precio_unitario, 0), 2)) stored;
alter table pedido_items
  add column importe numeric(14,2) generated always as (round(cantidad * precio_unitario, 2)) stored;
alter table cotizaciones
  add column descuento_monto numeric(12,2) generated always as (round(subtotal * descuento_pct / 100, 2)) stored;
alter table pedidos
  add column descuento_monto numeric(12,2) generated always as (round(subtotal * descuento_pct / 100, 2)) stored;

-- La vista expande c.* al crearse: se recrea para incluir la columna nueva.
drop view v_cotizaciones;
create view v_cotizaciones with (security_invoker = true) as
select c.*,
       case when c.estado in ('borrador', 'enviada') and c.vigencia_hasta < current_date
            then 'vencida'::estado_cotizacion else c.estado end as estado_efectivo,
       cl.nombre as cliente_nombre, cl.apellidos as cliente_apellidos, cl.empresa_cliente,
       (select count(*) from cotizacion_items i where i.cotizacion_id = c.id) as renglones
from cotizaciones c
join clientes cl on cl.id = c.cliente_id;
revoke all on v_cotizaciones from anon;
grant select on v_cotizaciones to authenticated;
