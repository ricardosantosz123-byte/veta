-- =====================================================================
-- VETA · Fase 5: v_pedidos incluye las columnas nuevas del pedido (inicio autorizado sin anticipo).
-- Las vistas expanden p.* al crearse, así que se recrea con la misma definición.
-- =====================================================================
drop view v_pedidos;
create view v_pedidos with (security_invoker = true) as
select p.*,
       cl.nombre as cliente_nombre, cl.apellidos as cliente_apellidos, cl.telefono as cliente_telefono,
       cl.email as cliente_email, cl.empresa_cliente,
       greatest(p.anticipo_requerido - p.pagado, 0) as anticipo_faltante,
       greatest(p.pagado - p.total, 0) as saldo_a_favor,
       p.fecha_compromiso - hoy_mx() as dias_para_compromiso,
       case
         when p.estado in ('terminado', 'liquidado', 'entregado', 'cancelado') or p.fecha_compromiso is null then null
         when p.fecha_compromiso < hoy_mx() then 'atrasado'
         when p.fecha_compromiso <= hoy_mx() + 3 then 'por_vencer'
         else 'a_tiempo'
       end as semaforo
from pedidos p
join clientes cl on cl.id = p.cliente_id;

revoke all on v_pedidos from anon;
grant select on v_pedidos to authenticated;
