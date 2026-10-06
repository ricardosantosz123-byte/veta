-- Prueba de punta a punta: roles, aislamiento entre empresas, costeo, venta por partes,
-- cobranza, producción por destajista, insumos y portal público.
-- Uso: psql -v ON_ERROR_STOP=1 -f 00_supabase_stub.sql -f ../migrations/*.sql -f 01_flujo_completo.sql
\set QUIET on
-- Misma zona que Supabase (UTC): así las pruebas detectan si algo usa la fecha UTC en lugar de hoy_mx().
set timezone to 'UTC';
\pset tuples_only on
\pset format unaligned

create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FALLA: %', msg; end if;
  raise notice 'ok  %', msg;
end $$;
create or replace function pg_temp.falla(sql text, msg text) returns void language plpgsql as $$
begin
  begin execute sql; exception when others then raise notice 'ok  % (bloqueado: %)', msg, sqlerrm; return; end;
  raise exception 'FALLA (debió bloquearse): %', msg;
end $$;
grant execute on all functions in schema pg_temp to authenticated, service_role, anon;

begin;  -- todo se revierte al final: se puede correr contra Supabase local sin dejar datos

-- Usuarios
insert into auth.users (id, email) values
 ('a0000000-0000-0000-0000-000000000001','admin@a.mx'),
 ('a0000000-0000-0000-0000-000000000002','venta@a.mx'),
 ('a0000000-0000-0000-0000-000000000003','prod@a.mx'),
 ('a0000000-0000-0000-0000-000000000004','sergio@destajo.mx'),
 ('a0000000-0000-0000-0000-000000000005','conta@a.mx'),
 ('b0000000-0000-0000-0000-000000000001','admin@b.mx');

\set adminA 'a0000000-0000-0000-0000-000000000001'
\set vendA  'a0000000-0000-0000-0000-000000000002'
\set prodA  'a0000000-0000-0000-0000-000000000003'
\set destA  'a0000000-0000-0000-0000-000000000004'
\set contA  'a0000000-0000-0000-0000-000000000005'
\set adminB 'b0000000-0000-0000-0000-000000000001'

-- ============ Admin A: alta de empresa y catálogo ============
select set_config('request.jwt.claim.sub', :'adminA', false); set role authenticated;
select crear_empresa('Mueblería Sauce', 'muebleria-sauce') as emp_a \gset
select pg_temp.ok((select count(*) from etapas) = 5, 'empresa nueva trae 5 etapas predeterminadas');
select pg_temp.ok((select count(*) from modelos) = 0, 'catálogo arranca vacío');
select pg_temp.ok(not slug_disponible('muebleria-sauce'), 'slug ocupado no está disponible');
select pg_temp.ok(slug_disponible('  Taller-Nuevo '), 'slug libre está disponible (sin importar mayúsculas)');
select pg_temp.ok(not slug_disponible('ajustes'), 'slug reservado no está disponible');
select pg_temp.ok(not slug_disponible('a b'), 'slug con formato inválido no está disponible');
select pg_temp.falla($$select crear_empresa('Otra', 'MUEBLERIA-SAUCE')$$, 'no se crea empresa con slug ocupado');
select pg_temp.falla($$select crear_empresa('Otra', 'tablero')$$, 'no se crea empresa con slug reservado');

select id as e_carp from etapas where nombre = 'Carpintería' \gset
select id as e_tap  from etapas where nombre = 'Tapicería' \gset
insert into categorias (empresa_id, nombre) values (:'emp_a', 'Silla') returning id as cat_silla \gset
insert into modelos (empresa_id, categoria_id, nombre) values (:'emp_a', :'cat_silla', 'Natalia') returning id as m_nat \gset
insert into modelo_costeo (modelo_id, empresa_id, markup) values (:'m_nat', :'emp_a', 1.0);
insert into grupos_opcion (empresa_id, nombre, orden) values (:'emp_a', 'Madera', 1) returning id as g_mad \gset
insert into grupos_opcion (empresa_id, nombre, orden) values (:'emp_a', 'Recubrimiento', 2) returning id as g_rec \gset
insert into opciones (empresa_id, grupo_id, nombre) values (:'emp_a', :'g_mad', 'Encino') returning id as o_enc \gset
insert into opciones (empresa_id, grupo_id, nombre) values (:'emp_a', :'g_mad', 'Nogal')  returning id as o_nog \gset
insert into opciones (empresa_id, grupo_id, nombre) values (:'emp_a', :'g_rec', 'Lino')   returning id as o_lin \gset
insert into opciones (empresa_id, grupo_id, nombre) values (:'emp_a', :'g_rec', 'Piel Napa') returning id as o_piel \gset
insert into modelo_grupos (modelo_id, grupo_id, empresa_id) values (:'m_nat', :'g_mad', :'emp_a'), (:'m_nat', :'g_rec', :'emp_a');
insert into costos_modelo (empresa_id, modelo_id, etapa_id, opcion_id, costo) values
  (:'emp_a', :'m_nat', :'e_carp', null, 1800),
  (:'emp_a', :'m_nat', :'e_tap',  null,  900),
  (:'emp_a', :'m_nat', :'e_carp', :'o_nog', 600),
  (:'emp_a', :'m_nat', :'e_tap',  :'o_piel', 900);
insert into listas_precios (empresa_id, nombre, incluye_iva, redondeo) values (:'emp_a', 'Expo', true, 100) returning id as l_expo \gset
select id as l_gen from listas_precios where nombre = 'General' \gset
select pg_temp.ok((select costo from costear_modelo(:'m_nat', array[:'o_nog', :'o_piel']::uuid[])) = 4200,
  'costear_modelo: 1800 + 600 + 900 + 900 = 4,200');
select pg_temp.ok((select precio from costear_modelo(:'m_nat', array[:'o_nog', :'o_piel']::uuid[], :'l_expo')) = 9800,
  'costear_modelo devuelve el mismo precio que calcular_precio');
insert into grupos_opcion (empresa_id, nombre) values (:'emp_a', 'Medida') returning id as g_med \gset
insert into opciones (empresa_id, grupo_id, nombre) values (:'emp_a', :'g_med', 'Grande') returning id as o_gde \gset
select pg_temp.falla(format($$select calcular_precio(%L, array[%L]::uuid[])$$, :'m_nat', :'o_gde'),
  'calcular_precio rechaza una opción de un grupo que no aplica al modelo');
update opciones set activo = false where id = :'o_enc';
select pg_temp.falla(format($$select calcular_precio(%L, array[%L]::uuid[])$$, :'m_nat', :'o_enc'),
  'calcular_precio rechaza una opción inactiva');
update opciones set activo = true where id = :'o_enc';
insert into modelos (empresa_id, nombre, sobre_diseno) values (:'emp_a', 'Mesa a medida', true) returning id as m_sd \gset
select pg_temp.falla(format($$select calcular_precio(%L, '{}')$$, :'m_sd'), 'calcular_precio rechaza un modelo sobre diseño');
select pg_temp.ok((select precio is null and costo = 0 from costear_modelo(:'m_sd', '{}')), 'costear_modelo: sobre diseño sin precio');
delete from modelos where id = :'m_sd';
select reordenar_catalogo('etapas', array(select id from etapas order by orden desc));
select pg_temp.ok((select nombre from etapas order by orden limit 1) = 'Empaque', 'reordenar_catalogo guarda el orden nuevo');
select pg_temp.falla(format($$select reordenar_catalogo('modelos', array[%L]::uuid[])$$, :'m_nat'), 'reordenar_catalogo solo acepta tablas permitidas');
select pg_temp.falla(format($$select reordenar_catalogo('opciones', array[%L, %L]::uuid[])$$, :'o_enc', :'o_lin'),
  'reordenar_catalogo no mezcla opciones de grupos distintos');
select reordenar_catalogo('etapas', array(select id from etapas order by orden desc));
update listas_precios set predeterminada = true where id = :'l_expo';
select pg_temp.ok((select array_agg(nombre) from listas_precios where predeterminada) = array['Expo'], 'una sola lista predeterminada');
update listas_precios set predeterminada = true where id = :'l_gen';

-- Invitaciones
insert into destajistas (empresa_id, nombre, especialidad) values (:'emp_a', 'Sergio Ávalos', 'Carpintería') returning id as d_sergio \gset
insert into invitaciones (empresa_id, email, rol) values
  (:'emp_a', 'venta@a.mx', 'vendedor'), (:'emp_a', 'prod@a.mx', 'produccion'), (:'emp_a', 'conta@a.mx', 'contador');
insert into invitaciones (empresa_id, email, rol, destajista_id) values (:'emp_a', 'SERGIO@destajo.mx', 'destajista', :'d_sergio');
select pg_temp.falla($$update empresas set estado_suscripcion = 'activa'$$, 'Admin no puede activarse la suscripción');
reset role;

-- Cada invitado inicia sesión y acepta
select set_config('request.jwt.claim.sub', :'vendA', false); set role authenticated; select aceptar_invitaciones(); reset role;
select set_config('request.jwt.claim.sub', :'prodA', false); set role authenticated; select aceptar_invitaciones(); reset role;
select set_config('request.jwt.claim.sub', :'contA', false); set role authenticated; select aceptar_invitaciones(); reset role;
select set_config('request.jwt.claim.sub', :'destA', false); set role authenticated;
select pg_temp.ok(aceptar_invitaciones() = 1, 'invitación de destajista aceptada sin importar mayúsculas del correo');
reset role;

-- ============ Vendedor A: precios, cotización ============
select set_config('request.jwt.claim.sub', :'vendA', false); set role authenticated;
select pg_temp.ok(calcular_precio(:'m_nat', array[:'o_nog', :'o_piel']::uuid[], :'l_gen') = 8400,
  'componentes: (1800+600+900+900) × (1+1.0) = 8,400');
select pg_temp.ok(calcular_precio(:'m_nat', array[:'o_nog', :'o_piel']::uuid[], :'l_expo') = 9800,
  'lista Expo: 8,400 × 1.16 = 9,744 → redondeo a 9,800');
select pg_temp.ok((select count(*) from costos_modelo) = 0, 'Vendedor no ve costos por etapa');
select pg_temp.ok((select count(*) from modelo_costeo) = 0, 'Vendedor no ve markup');
select pg_temp.ok((select count(*) from modelos) = 1, 'Vendedor sí ve el catálogo');
select pg_temp.falla(format($$select calcular_precio(%L, array[%L, %L]::uuid[])$$, :'m_nat', :'o_enc', :'o_nog'),
  'calcular_precio rechaza dos opciones del mismo grupo');
select pg_temp.falla($$select costear_modelo('00000000-0000-0000-0000-000000000000'::uuid, '{}')$$, 'costear_modelo con modelo inexistente');
select pg_temp.falla(format($$select * from costear_modelo(%L, '{}')$$, :'m_nat'), 'Vendedor no puede costear un modelo');
select pg_temp.falla(format($$select reordenar_catalogo('etapas', array[%L]::uuid[])$$, :'e_carp'), 'Vendedor no reordena el catálogo');

insert into clientes (empresa_id, nombre, apellidos, telefono) values (:'emp_a', 'Lucía', 'Pérez López', '3311112222') returning id as cli \gset
insert into cotizaciones (empresa_id, cliente_id, lista_id, descuento_pct) values (:'emp_a', :'cli', :'l_gen', 10) returning id as cot, folio as cot_folio \gset
insert into cotizacion_items (empresa_id, cotizacion_id, modelo_id, opcion_ids, cantidad)
  values (:'emp_a', :'cot', :'m_nat', array[:'o_nog', :'o_piel']::uuid[], 4) returning id as it1 \gset
select pg_temp.falla(format($$insert into cotizacion_items (empresa_id, cotizacion_id, descripcion, cantidad) values (%L, %L, 'Mesa sobre diseño', 1)$$, :'emp_a', :'cot'),
  'renglón sin modelo exige precio manual');
insert into cotizacion_items (empresa_id, cotizacion_id, descripcion, cantidad, precio_unitario, precio_manual)
  values (:'emp_a', :'cot', 'Mesa sobre diseño 2.40 m parota', 1, 12000, true) returning id as it2 \gset

select pg_temp.ok((select opciones_texto from cotizacion_items where id = :'it1') = 'Nogal · Piel Napa', 'snapshot legible de opciones');
select pg_temp.ok((select subtotal from cotizaciones where id = :'cot') = 45600, 'subtotal 4×8,400 + 12,000 = 45,600');
select pg_temp.ok((select importe from cotizacion_items where id = :'it1') = 33600, 'importe del renglón 4 × 8,400 = 33,600');
select pg_temp.ok((select descuento_monto from cotizaciones where id = :'cot') = 4560, 'monto de descuento 10% de 45,600 = 4,560');
select pg_temp.ok((select total from cotizaciones where id = :'cot') = 47606.40, 'total con 10% desc. e IVA: 41,040 × 1.16 = 47,606.40');
select pg_temp.ok((select count(*) from cotizacion_item_costos) = 0, 'Vendedor no ve el costo congelado');
select pg_temp.ok((select vigencia_hasta - fecha from cotizaciones where id = :'cot') = 15, 'vigencia 15 días');

-- Fase 3: teléfono, precio que no se falsifica, columnas y estado protegidos, sugerido, duplicar
select pg_temp.ok((select telefono from clientes where id = :'cli') = '523311112222', 'teléfono se normaliza a 52 + 10 dígitos');
insert into clientes (empresa_id, nombre, apellidos, telefono, email)
  values (:'emp_a', ' Ana ', 'Ruiz', '+52 (33) 2222-3333', ' Ana@Correo.MX ') returning id as cli2 \gset
select pg_temp.ok((select telefono = '523322223333' and email = 'ana@correo.mx' and nombre = 'Ana' from clientes where id = :'cli2'),
  'teléfono con +52, espacios y guiones; correo en minúsculas');
update cotizacion_items set precio_unitario = 1 where id = :'it1';
select pg_temp.ok((select precio_unitario from cotizacion_items where id = :'it1') = 8400, 'precio automático no se falsifica desde el cliente');
select pg_temp.falla(format($$update cotizacion_items set vendido = true where id = %L$$, :'it1'), 'el cliente no marca renglones como vendidos');
select pg_temp.falla(format($$update cotizaciones set total = 1 where id = %L$$, :'cot'), 'el cliente no escribe totales');
select pg_temp.falla(format($$update cotizaciones set estado = 'aceptada' where id = %L$$, :'cot'), 'no se marca aceptada sin vender');
update cotizaciones set estado = 'enviada' where id = :'cot';
select pg_temp.ok((select estado from cotizaciones where id = :'cot') = 'enviada', 'marcar como enviada');
insert into cotizaciones (empresa_id, cliente_id, lista_id) values (:'emp_a', :'cli2', :'l_gen') returning id as cot2 \gset
select pg_temp.falla(format($$insert into cotizacion_items (empresa_id, cotizacion_id, modelo_id, opcion_ids) values (%L, %L, %L, array[%L]::uuid[])$$,
  :'emp_a', :'cot2', :'m_nat', :'o_nog'), 'falta una opción de un grupo obligatorio');
insert into cotizacion_items (empresa_id, cotizacion_id, modelo_id, opcion_ids, precio_unitario, precio_manual)
  values (:'emp_a', :'cot2', :'m_nat', array[:'o_nog', :'o_piel']::uuid[], 7392, true) returning id as it3 \gset
select pg_temp.ok((select precio_unitario = 7392 and precio_sugerido = 8400 from cotizacion_items where id = :'it3'),
  'renglón manual guarda el precio sugerido del catálogo');
update cotizaciones set lista_id = :'l_expo' where id = :'cot2';
select recalcular_precios_cotizacion(:'cot2');
select pg_temp.ok((select precio_unitario = 7392 and precio_sugerido = 9800 from cotizacion_items where id = :'it3'),
  'al cambiar de lista se actualiza el sugerido, no el precio manual');
update cotizacion_items set precio_manual = false where id = :'it3';
select pg_temp.ok((select precio_unitario = 9800 and precio_sugerido is null from cotizacion_items where id = :'it3'), 'volver a automático recalcula el precio');
select duplicar_cotizacion(:'cot') as cot3 \gset
select pg_temp.ok((select count(*) from cotizacion_items where cotizacion_id = :'cot3') = 2
  and (select estado = 'borrador' and folio > :cot_folio from cotizaciones where id = :'cot3'), 'duplicar copia renglones con folio nuevo');
update cotizaciones set vigencia_hasta = hoy_mx() - 1 where id = :'cot3';
select pg_temp.ok((select estado_efectivo from v_cotizaciones where id = :'cot3') = 'vencida', 'vencida se deriva de la vigencia');
select pg_temp.ok((select count(*) from nombres_equipo(:'emp_a')) = 5, 'nombres_equipo lista a los miembros');
reset role;  -- limpieza para no alterar los conteos de pruebas posteriores
delete from cotizaciones where id in (:'cot2', :'cot3');
delete from clientes where id = :'cli2';
select set_config('request.jwt.claim.sub', :'vendA', false); set role authenticated;

-- Cambiar a lista Expo y recalcular (el renglón manual se respeta)
update cotizaciones set lista_id = :'l_expo' where id = :'cot';
select recalcular_precios_cotizacion(:'cot');
select pg_temp.ok((select precio_unitario from cotizacion_items where id = :'it1') = 9800, 'recalcula a precio Expo');
select pg_temp.ok((select precio_unitario from cotizacion_items where id = :'it2') = 12000, 'precio manual intacto');
select pg_temp.ok((select precios_con_iva from cotizaciones where id = :'cot'), 'lista Expo marca precios con IVA');
select pg_temp.ok((select total from cotizaciones where id = :'cot') = 46080, 'Expo: (39,200+12,000)×0.9 = 46,080 IVA incluido');
update cotizaciones set lista_id = :'l_gen' where id = :'cot';
select recalcular_precios_cotizacion(:'cot');

-- Venta por partes: solo las sillas
select crear_pedido_desde_cotizacion(:'cot', array[:'it1']::uuid[], true) as ped \gset
select pg_temp.ok((select estado from cotizaciones where id = :'cot') = 'parcial', 'cotización queda parcial');
select pg_temp.ok((select total from pedidos where id = :'ped') = 35078.40, 'pedido: 33,600 × 0.9 × 1.16 = 35,078.40');
select pg_temp.ok((select anticipo_requerido from pedidos where id = :'ped') = 21047.04, 'anticipo 60%');
update cotizacion_items set precio_unitario = 1 where id = :'it1';
select pg_temp.ok((select precio_unitario from cotizacion_items where id = :'it1') = 8400, 'renglón vendido ya no se edita');

-- Cobranza
insert into pagos_cliente (empresa_id, pedido_id, monto, metodo) values (:'emp_a', :'ped', 15000, 'transferencia');
select pg_temp.ok((select estado from pedidos where id = :'ped') = 'anticipo_pendiente', 'con 15,000 sigue esperando anticipo');
select pg_temp.falla(format($$update pedidos set pagado = 999999, total = 1 where id = %L$$, :'ped'), 'pagado y total no se alteran a mano');
select pg_temp.falla(format($$update pedidos set descuento_pct = 50 where id = %L$$, :'ped'), 'el descuento del pedido no cambia después de vender');
select pg_temp.falla(format($$update pedidos set estado = 'en_produccion' where id = %L$$, :'ped'), 'el estado del pedido no se fuerza a mano');
select pg_temp.falla(format($$insert into pagos_cliente (empresa_id, pedido_id, monto, metodo) values (%L, %L, 999999, 'efectivo')$$, :'emp_a', :'ped'),
  'pago manual mayor al saldo se rechaza');
select pg_temp.falla(format($$insert into pagos_cliente (empresa_id, pedido_id, monto, metodo, fecha) values (%L, %L, 10, 'efectivo', hoy_mx() + 1)$$, :'emp_a', :'ped'),
  'pago con fecha futura (Ciudad de México) se rechaza');
select pg_temp.ok((select fecha = hoy_mx() and folio is not null from pagos_cliente where pedido_id = :'ped' order by created_at limit 1),
  'pago con folio de recibo y fecha de hoy en la Ciudad de México');
select pg_temp.ok((select saldo_despues from v_pagos where pedido_id = :'ped' order by created_at limit 1) = 20078.40, 'v_pagos: saldo después del primer pago');
insert into pagos_cliente (empresa_id, pedido_id, monto, metodo) values (:'emp_a', :'ped', 6047.04, 'efectivo');
select pg_temp.ok((select estado from pedidos where id = :'ped') = 'en_produccion', 'anticipo cubierto → en producción');
select pg_temp.ok((select en_produccion_at is not null from pedidos where id = :'ped'), 'fecha de inicio de producción para la línea de tiempo');
select pg_temp.ok((select saldo = 14031.36 and pedidos = 1 and cotizaciones = 1 from v_clientes where id = :'cli'), 'v_clientes: saldo y conteos del cliente');
select id as pit from pedido_items where pedido_id = :'ped' \gset
select folio as ped_folio, token_portal as tok from pedidos where id = :'ped' \gset
reset role;

-- ============ Producción A: órdenes por etapa ============
select set_config('request.jwt.claim.sub', :'prodA', false); set role authenticated;
select pg_temp.ok((select count(*) from costos_modelo) = 4, 'Producción ve costos por etapa');
select pg_temp.ok((select count(*) from modelo_costeo) = 0, 'Producción no ve markup');
select pg_temp.ok((select count(*) from clientes) = 0, 'Producción no ve clientes');
insert into ordenes_produccion (empresa_id, pedido_item_id, etapa_id, destajista_id, cantidad, costo_acordado)
  values (:'emp_a', :'pit', :'e_carp', :'d_sergio', 4, 9600) returning id as o1 \gset
insert into ordenes_produccion (empresa_id, pedido_item_id, etapa_id, destajista_id, cantidad, costo_acordado)
  values (:'emp_a', :'pit', :'e_tap', :'d_sergio', 4, 7200) returning id as o2 \gset
select pg_temp.ok((select descripcion from ordenes_produccion where id = :'o1') = 'Natalia · Nogal · Piel Napa', 'orden lleva descripción del mueble');
insert into pagos_destajista (empresa_id, orden_id, monto) values (:'emp_a', :'o1', 4000);
select pg_temp.ok((select saldo from ordenes_produccion where id = :'o1') = 5600, 'saldo con destajista 9,600 − 4,000');

-- Insumos
insert into insumos (empresa_id, nombre, tipo, unidad) values (:'emp_a', 'Piel Napa Café', 'piel', 'm2') returning id as ins \gset
insert into movimientos_insumo (empresa_id, insumo_id, tipo, cantidad, costo_unitario) values (:'emp_a', :'ins', 'entrada', 10, 100);
insert into movimientos_insumo (empresa_id, insumo_id, tipo, cantidad, costo_unitario) values (:'emp_a', :'ins', 'entrada', 10, 120);
insert into movimientos_insumo (empresa_id, insumo_id, tipo, cantidad, orden_id) values (:'emp_a', :'ins', 'salida', 3, :'o2');
select pg_temp.ok((select existencia from insumos where id = :'ins') = 17, 'existencia 10+10−3 = 17');
select pg_temp.ok((select costo_unitario from insumos where id = :'ins') = 110, 'costo promedio ponderado 110');
-- Fase 6: reglas de insumos
select pg_temp.ok((select destajista_id from movimientos_insumo where insumo_id = :'ins' and tipo = 'salida') = :'d_sergio',
  'la salida ligada a una orden guarda a su destajista');
select pg_temp.ok((select costo_unitario = 110 and valor = 330 from v_movimientos_insumo where insumo_id = :'ins' and tipo = 'salida'),
  'la salida guarda el costo promedio del momento: 3 × 110 = 330');
select pg_temp.ok((select insumo = 'Piel Napa Café' and cantidad = 3 and valor = 330 from material_entregado(array[:'o2']::uuid[])),
  'material entregado aparece en su orden con su valor');
select pg_temp.ok((select existencia_despues from v_movimientos_insumo where insumo_id = :'ins' order by created_at desc limit 1) = 17,
  'historial con la existencia después de cada movimiento');
select pg_temp.falla(format($$insert into insumos (empresa_id, nombre, tipo, unidad) values (%L, '  piel  napa cafe ', 'piel', 'm2')$$, :'emp_a'),
  'nombre de insumo único sin mayúsculas, acentos ni espacios de más');
select pg_temp.falla(format($$insert into insumos (empresa_id, nombre, unidad) values (%L, 'Tachuela', 'cm')$$, :'emp_a'),
  'unidad fuera de la lista cerrada');
select crear_insumo(:'emp_a', 'Piel Florentic negra', 'piel', 'dm2', 0, null, 450, 4.8) as ins_dm2 \gset
select pg_temp.ok((select unidad = 'dm2' and existencia = 450 and costo_unitario = 4.8 from insumos where id = :'ins_dm2'),
  'la piel se mide en decímetros cuadrados (dm2)');
select pg_temp.falla(format($$insert into movimientos_insumo (empresa_id, insumo_id, tipo, cantidad) values (%L, %L, 'entrada', 5)$$, :'emp_a', :'ins'),
  'una entrada exige costo unitario');
select pg_temp.falla(format($$insert into movimientos_insumo (empresa_id, insumo_id, tipo, cantidad, costo_unitario, orden_id) values (%L, %L, 'entrada', 5, 100, %L)$$, :'emp_a', :'ins', :'o2'),
  'solo una salida se liga a una orden');
select pg_temp.falla(format($$insert into movimientos_insumo (empresa_id, insumo_id, tipo, cantidad) values (%L, %L, 'salida', 18)$$, :'emp_a', :'ins'),
  'la existencia no queda negativa (hay 17, salen 18)');
select pg_temp.falla(format($$insert into movimientos_insumo (empresa_id, insumo_id, tipo, cantidad) values (%L, %L, 'ajuste', -2)$$, :'emp_a', :'ins'),
  'un ajuste exige motivo');
select pg_temp.falla(format($$update insumos set costo_unitario = 1 where id = %L$$, :'ins'), 'el costo promedio no se escribe a mano');
select pg_temp.falla(format($$update insumos set existencia = 999 where id = %L$$, :'ins'), 'la existencia no se escribe a mano');
select pg_temp.falla(format($$update insumos set unidad = 'm' where id = %L$$, :'ins'), 'la unidad no cambia si ya hay movimientos');
insert into movimientos_insumo (empresa_id, insumo_id, tipo, cantidad, nota) values (:'emp_a', :'ins', 'ajuste', -2, 'Merma por corte');
select pg_temp.ok((select existencia from insumos where id = :'ins') = 15 and (select costo_unitario from insumos where id = :'ins') = 110,
  'ajuste con motivo: 17 − 2 = 15 y el promedio no cambia');
update insumos set minimo = 20 where id = :'ins';
select pg_temp.ok((select bajo_minimo and valor_existencia = 1650 from v_insumos where id = :'ins'), 'alerta bajo mínimo (15 < 20) y valor 15 × 110');
select pg_temp.falla(format($$select crear_insumo(%L, 'Hule espuma 2"', 'espuma', 'm2', 0, null, 5, null)$$, :'emp_a'),
  'la existencia inicial exige costo unitario');
select crear_insumo(:'emp_a', 'Hule espuma 2"', 'espuma', 'm2', 2, 'Espumas del Bajío', 5, 50.5) as ins2 \gset
select pg_temp.ok((select existencia = 5 and costo_unitario = 50.5 from insumos where id = :'ins2'), 'alta con existencia inicial como primera entrada');
insert into movimientos_insumo (empresa_id, insumo_id, tipo, cantidad, costo_unitario) values (:'emp_a', :'ins2', 'entrada', 3, 0.3333);
select pg_temp.ok((select costo_unitario from insumos where id = :'ins2') = 31.6875, 'promedio con 4 decimales: (5×50.5 + 3×0.3333) / 8');
select ajustar_existencia(:'ins2', 7, 'Conteo físico') as dif_conteo \gset
select pg_temp.ok(:dif_conteo = -1 and (select existencia from insumos where id = :'ins2') = 7,
  'ajuste por conteo físico: la base calcula la diferencia (8 → 7)');
select pg_temp.falla(format($$select ajustar_existencia(%L, 7, 'Otra vez')$$, :'ins2'), 'conteo igual a la existencia no genera ajuste');
update insumos set activo = false where id = :'ins2';
select pg_temp.falla(format($$insert into movimientos_insumo (empresa_id, insumo_id, tipo, cantidad) values (%L, %L, 'salida', 1)$$, :'emp_a', :'ins2'),
  'un insumo desactivado no registra movimientos');
update insumos set activo = true where id = :'ins2';
reset role;

-- ============ Destajista: solo lo suyo ============
select set_config('request.jwt.claim.sub', :'destA', false); set role authenticated;
select pg_temp.ok((select count(*) from ordenes_produccion) = 2, 'destajista ve sus 2 órdenes');
select pg_temp.ok((select count(*) from pagos_destajista) = 1, 'destajista ve sus pagos');
select pg_temp.ok((select count(*) from pedidos) = 0 and (select count(*) from clientes) = 0, 'destajista no ve pedidos ni clientes');
select pg_temp.ok((select count(*) from costos_modelo) = 0, 'destajista no ve costeo');
select pg_temp.ok((select count(*) from insumos) = 0 and (select count(*) from v_movimientos_insumo) = 0, 'destajista no ve insumos ni movimientos');
select pg_temp.ok((select count(*) = 1 and bool_and(valor is null) and bool_and(cantidad = 3)
  from material_entregado(array[:'o1', :'o2']::uuid[])), 'destajista ve el material que le entregaron, sin costos');
select pg_temp.falla(format($$select marcar_avance_orden(%L, 'cancelada')$$, :'o1'), 'destajista no puede cancelar');
select marcar_avance_orden(:'o1', 'en_proceso');
select marcar_avance_orden(:'o1', 'terminada', 'Listas en blanco');
select marcar_avance_orden(:'o2', 'terminada');
reset role;

-- ============ Cierre: terminado → no entrega con saldo → liquidado → entregado ============
select set_config('request.jwt.claim.sub', :'vendA', false); set role authenticated;
select pg_temp.ok((select estado_produccion from pedido_items where id = :'pit') = 'terminado', 'renglón terminado al cerrar todas sus etapas');
select pg_temp.ok((select estado from pedidos where id = :'ped') = 'terminado', 'pedido pasa a terminado');
select pg_temp.falla(format($$update pedidos set estado = 'entregado' where id = %L$$, :'ped'), 'no se entrega con saldo pendiente');
insert into pagos_cliente (empresa_id, pedido_id, monto, metodo) values (:'emp_a', :'ped', 14031.36, 'transferencia');
select pg_temp.ok((select estado from pedidos where id = :'ped') = 'liquidado', 'finiquito → liquidado');
reset role;
select set_config('request.jwt.claim.sub', :'adminA', false); set role authenticated;
select id as pago_fin from pagos_cliente where pedido_id = :'ped' and monto = 14031.36 \gset
select pg_temp.falla(format($$update pagos_cliente set monto = 1 where id = %L$$, :'pago_fin'), 'el monto de un pago no se edita');
select pg_temp.falla(format($$update pagos_cliente set anulado = true where id = %L$$, :'pago_fin'), 'anular un pago exige motivo');
update pagos_cliente set anulado = true, motivo_anulacion = 'Transferencia rebotada' where id = :'pago_fin';
select pg_temp.ok((select estado = 'terminado' and liquidado_at is null from pedidos where id = :'ped'), 'anular el finiquito regresa el pedido a terminado');
select pg_temp.falla(format($$update pagos_cliente set anulado = false where id = %L$$, :'pago_fin'), 'un pago anulado no se restaura');
insert into pagos_cliente (empresa_id, pedido_id, monto, metodo) values (:'emp_a', :'ped', 14031.36, 'transferencia');
select pg_temp.ok((select estado from pedidos where id = :'ped') = 'liquidado', 'nuevo finiquito → liquidado otra vez');
reset role;
select set_config('request.jwt.claim.sub', :'vendA', false); set role authenticated;
update pedidos set estado = 'entregado' where id = :'ped';
select pg_temp.ok((select entregado_at is not null from pedidos where id = :'ped'), 'entregado con fecha');
select pg_temp.ok((select count(*) from v_pedido_resumen) = 0, 'Vendedor no ve márgenes');
select pg_temp.ok((select count(*) from v_insumos) = 0 and (select count(*) from material_entregado(array[:'o2']::uuid[])) = 0,
  'Vendedor no ve insumos ni material entregado');
reset role;

select set_config('request.jwt.claim.sub', :'contA', false); set role authenticated;
select pg_temp.ok((select margen_bruto from v_pedido_resumen where id = :'ped') = 30240 - 16800,
  'Contador ve margen: 30,240 − 16,800 de mano de obra');
select pg_temp.falla(format($$insert into clientes (empresa_id, nombre) values (%L, 'X')$$, :'emp_a'), 'Contador es solo lectura');
select pg_temp.ok(calcular_precio(:'m_nat', array[:'o_nog', :'o_piel']::uuid[], :'l_gen') = 8400, 'Contador calcula precios (PRD §4)');
select pg_temp.ok((select count(*) from modelo_costeo) = 1, 'Contador ve el markup');
update modelo_costeo set markup = 2 where modelo_id = :'m_nat';  -- RLS: 0 filas, sin error
select pg_temp.ok((select markup from modelo_costeo where modelo_id = :'m_nat') = 1.0, 'Contador no edita el markup');
select pg_temp.ok((select count(*) from v_insumos) = 3 and (select valor from material_entregado(array[:'o2']::uuid[])) = 330,
  'Contador ve insumos y el valor del material');
select pg_temp.falla(format($$select crear_insumo(%L, 'Clavo', 'herraje', 'pza')$$, :'emp_a'), 'Contador no da de alta insumos');
select pg_temp.falla(format($$insert into movimientos_insumo (empresa_id, insumo_id, tipo, cantidad, costo_unitario) values (%L, %L, 'entrada', 1, 1)$$, :'emp_a', :'ins'),
  'Contador no registra movimientos');
reset role;

select set_config('request.jwt.claim.sub', :'adminA', false); set role authenticated;
select pg_temp.ok((select costo_unitario from cotizacion_item_costos where item_id = :'it1') = 4200, 'Admin ve costo congelado 4,200');
select pg_temp.ok((select count(*) from bitacora) > 10, 'bitácora registra movimientos');
select pg_temp.falla(format($$update pagos_cliente set anulado = true, motivo_anulacion = 'x' where pedido_id = %L$$, :'ped'),
  'no se anulan pagos de un pedido entregado');

-- Fase 4: Mercado Pago con saldo a favor, link de pago, semáforo y cancelación
select crear_pedido_desde_cotizacion(:'cot', array[:'it2']::uuid[], false) as ped2 \gset
select pg_temp.ok((select estado from cotizaciones where id = :'cot') = 'aceptada', 'vender el resto deja la cotización aceptada');
select id as pit2 from pedido_items where pedido_id = :'ped2' \gset
reset role;
insert into links_pago (empresa_id, pedido_id, monto, url) values (:'emp_a', :'ped2', 5000, 'https://mp.test/1');  -- lo haría mp-crear-link
select set_config('request.jwt.claim.sub', :'adminA', false); set role authenticated;
insert into pagos_cliente (empresa_id, pedido_id, monto, metodo) values (:'emp_a', :'ped2', 1000, 'efectivo');
select pg_temp.ok((select estado from links_pago where pedido_id = :'ped2') = 'expirado', 'un pago manual expira el link de pago activo');
reset role;
set role service_role;  -- webhook de Mercado Pago
insert into pagos_cliente (empresa_id, pedido_id, monto, metodo, externo_id) values (:'emp_a', :'ped2', 20000, 'mercado_pago', 'mp-123');
reset role;
select set_config('request.jwt.claim.sub', :'adminA', false); set role authenticated;
select pg_temp.ok((select saldo_a_favor from v_pedidos where id = :'ped2') = 21000 - 12528, 'pago de Mercado Pago mayor al saldo: se acepta y queda saldo a favor');
update pedidos set fecha_compromiso = hoy_mx() - 1 where id = :'ped2';
select pg_temp.ok((select semaforo from v_pedidos where id = :'ped2') = 'atrasado', 'semáforo atrasado con la fecha de la Ciudad de México');
insert into ordenes_produccion (empresa_id, pedido_item_id, etapa_id, cantidad, costo_acordado) values (:'emp_a', :'pit2', :'e_carp', 1, 3000) returning id as o3 \gset
insert into ordenes_produccion (empresa_id, pedido_item_id, etapa_id, cantidad, costo_acordado) values (:'emp_a', :'pit2', :'e_tap', 1, 2000) returning id as o4 \gset
select marcar_avance_orden(:'o3', 'en_proceso');
reset role;
select set_config('request.jwt.claim.sub', :'vendA', false); set role authenticated;
select pg_temp.falla(format($$update pedidos set estado = 'cancelado', motivo_cancelacion = 'x' where id = %L$$, :'ped2'), 'solo el Admin cancela un pedido');
reset role;
select set_config('request.jwt.claim.sub', :'adminA', false); set role authenticated;
select pg_temp.falla(format($$update pedidos set estado = 'cancelado' where id = %L$$, :'ped2'), 'cancelar exige motivo');
update pedidos set estado = 'cancelado', motivo_cancelacion = 'El cliente se arrepintió' where id = :'ped2';
select pg_temp.ok((select estado from ordenes_produccion where id = :'o4') = 'cancelada'
  and (select estado from ordenes_produccion where id = :'o3') = 'en_proceso', 'cancelar: la orden pendiente se cancela, la en proceso se queda');
select pg_temp.ok((select pagado = 21000 and cancelado_at is not null from pedidos where id = :'ped2'), 'cancelar conserva lo cobrado');
select pg_temp.falla(format($$insert into pagos_cliente (empresa_id, pedido_id, monto, metodo) values (%L, %L, 10, 'efectivo')$$, :'emp_a', :'ped2'),
  'no se registran pagos manuales a un pedido cancelado');
select pg_temp.falla(format($$update pedidos set estado = 'entregado' where id = %L$$, :'ped2'), 'un pedido cancelado no se reactiva');
select pg_temp.falla(format($$insert into movimientos_insumo (empresa_id, insumo_id, tipo, cantidad, orden_id) values (%L, %L, 'salida', 1, %L)$$, :'emp_a', :'ins', :'o4'),
  'no se entrega material a una orden cancelada');
select pg_temp.falla(format($$delete from insumos where id = %L$$, :'ins'), 'un insumo con movimientos no se borra: se desactiva');
insert into insumos (empresa_id, nombre, unidad) values (:'emp_a', 'Insumo de prueba', 'pza') returning id as ins3 \gset
delete from insumos where id = :'ins3';
select pg_temp.ok((select count(*) from insumos where id = :'ins3') = 0, 'un insumo sin movimientos sí se borra');

-- Fase 5: órdenes protegidas, inicio sin anticipo autorizado, adelantos y saldos de destajo
insert into cotizaciones (empresa_id, cliente_id, lista_id) values (:'emp_a', :'cli', :'l_gen') returning id as cot5 \gset
insert into cotizacion_items (empresa_id, cotizacion_id, modelo_id, opcion_ids, cantidad) values (:'emp_a', :'cot5', :'m_nat', array[:'o_nog', :'o_piel']::uuid[], 1);
select crear_pedido_desde_cotizacion(:'cot5') as ped3 \gset
select id as pit3 from pedido_items where pedido_id = :'ped3' \gset
select pg_temp.ok((select costo_sugerido from sugerir_ordenes(:'ped3') where etapa = 'Carpintería') = 2400
  and (select costo_sugerido from sugerir_ordenes(:'ped3') where etapa = 'Tapicería') = 1800, 'sugerir_ordenes: (1800+600)×1 y (900+900)×1');
select pg_temp.ok((select count(*) from sugerir_ordenes(:'ped3') where con_costo) = 2, 'sugerir_ordenes preselecciona las etapas con costo');
insert into ordenes_produccion (empresa_id, pedido_item_id, etapa_id, destajista_id, cantidad, costo_acordado)
  values (:'emp_a', :'pit3', :'e_carp', :'d_sergio', 1, 2400) returning id as o5 \gset
insert into ordenes_produccion (empresa_id, pedido_item_id, etapa_id, destajista_id, cantidad, costo_acordado)
  values (:'emp_a', :'pit3', :'e_tap', :'d_sergio', 1, 1800) returning id as o6 \gset
select pg_temp.ok((select tiene_orden from sugerir_ordenes(:'ped3') where etapa = 'Carpintería'), 'sugerir_ordenes marca las etapas que ya tienen orden');
select pg_temp.falla(format($$update ordenes_produccion set etapa_id = %L where id = %L$$, :'e_tap', :'o5'), 'la etapa de una orden no se cambia');
select pg_temp.falla(format($$update ordenes_produccion set estado = 'terminada' where id = %L$$, :'o5'), 'el estado de una orden solo cambia con marcar_avance_orden');
select pg_temp.falla(format($$insert into ordenes_produccion (empresa_id, pedido_item_id, etapa_id, cantidad, costo_acordado) values (%L, %L, %L, 1, 10)$$,
  :'emp_a', :'pit2', :'e_carp'), 'no se crean órdenes para un pedido cancelado');
insert into pagos_destajista (empresa_id, orden_id, monto) values (:'emp_a', :'o5', 1000);  -- adelanto sobre orden pendiente
select pg_temp.ok((select saldo from ordenes_produccion where id = :'o5') = 1400, 'adelanto sobre una orden pendiente');
select pg_temp.falla(format($$insert into pagos_destajista (empresa_id, orden_id, monto) values (%L, %L, 1500)$$, :'emp_a', :'o5'),
  'el total pagado no supera el costo acordado');
select pg_temp.falla(format($$insert into pagos_destajista (empresa_id, orden_id, monto, fecha) values (%L, %L, 10, hoy_mx() + 1)$$, :'emp_a', :'o5'),
  'pago de destajo con fecha futura se rechaza');
select pg_temp.falla(format($$update ordenes_produccion set costo_acordado = 500 where id = %L$$, :'o5'), 'el costo acordado no baja de lo pagado');
select pg_temp.falla(format($$update ordenes_produccion set destajista_id = null where id = %L$$, :'o5'), 'una orden con pagos no se reasigna');
select pg_temp.ok((select por_pagar = 5600 + 7200 and comprometido = 1400 + 1800
  from corte_destajistas(:'emp_a', hoy_mx() - 6, hoy_mx()) where destajista_id = :'d_sergio'), 'corte: separa por pagar (terminadas) y comprometido (en curso − adelantos)');
reset role;

select set_config('request.jwt.claim.sub', :'destA', false); set role authenticated;
select pg_temp.falla(format($$select marcar_avance_orden(%L, 'en_proceso')$$, :'o5'), 'sin anticipo no se empieza una orden');
select pg_temp.ok((select por_pagar = 5600 + 7200 and comprometido = 1400 + 1800 and adelantos = 1000 from v_destajo_saldos),
  'destajista ve su por pagar (terminado − pagado) y su comprometido (en curso − adelantos)');
select pg_temp.ok((select count(*) from v_destajo_saldos) = 1, 'destajista solo ve su propio saldo');
reset role;
select set_config('request.jwt.claim.sub', :'vendA', false); set role authenticated;
select pg_temp.falla(format($$select autorizar_inicio_sin_anticipo(%L)$$, :'ped3'), 'solo el Admin autoriza el inicio sin anticipo');
reset role;
select set_config('request.jwt.claim.sub', :'adminA', false); set role authenticated;
select autorizar_inicio_sin_anticipo(:'ped3');
select pg_temp.ok((select inicio_autorizado_at is not null and inicio_autorizado_por = :'adminA' from pedidos where id = :'ped3'),
  'el inicio autorizado queda registrado con quién y cuándo');
select pg_temp.ok((select inicio_autorizado_at is not null from v_pedidos where id = :'ped3'), 'v_pedidos muestra la autorización de inicio');
reset role;
select set_config('request.jwt.claim.sub', :'destA', false); set role authenticated;
select marcar_avance_orden(:'o5', 'en_proceso', 'Arranqué con autorización');
select pg_temp.ok((select estado from ordenes_produccion where id = :'o5') = 'en_proceso', 'con autorización el destajista empieza sin anticipo');
select pg_temp.falla(format($$select marcar_avance_orden(%L, 'pendiente')$$, :'o5'), 'el destajista no regresa una orden');
select marcar_avance_orden(:'o5', 'terminada');
select marcar_avance_orden(:'o6', 'terminada');
reset role;
select set_config('request.jwt.claim.sub', :'adminA', false); set role authenticated;
insert into pagos_cliente (empresa_id, pedido_id, monto, metodo) values (:'emp_a', :'ped3', 5846.40, 'transferencia');
select pg_temp.ok((select estado from pedidos where id = :'ped3') = 'terminado', 'anticipo + todas las etapas terminadas → pedido terminado');
select marcar_avance_orden(:'o6', 'en_proceso', 'Costura abierta');
select pg_temp.ok((select estado = 'en_produccion' and terminado_at is null from pedidos where id = :'ped3'), 'reabrir una orden regresa el pedido a producción');
select pg_temp.ok((select terminada_at is null from ordenes_produccion where id = :'o6'), 'al regresar la orden se limpia su fecha de terminado');
select marcar_avance_orden(:'o6', 'terminada');
select pg_temp.ok((select estado from pedidos where id = :'ped3') = 'terminado', 'al terminarla otra vez el pedido vuelve a terminado');
select pg_temp.ok((select por_pagar = 5600 + 7200 + 1400 + 1800 and comprometido = 0
  from corte_destajistas(:'emp_a', hoy_mx() - 6, hoy_mx()) where destajista_id = :'d_sergio'), 'corte: por pagar de lo terminado, sin comprometido');
select pg_temp.ok((select pagado_periodo = 4000 + 1000 and ordenes_terminadas_periodo = 4
  from corte_destajistas(:'emp_a', hoy_mx() - 6, hoy_mx()) where destajista_id = :'d_sergio'), 'corte: pagos y órdenes terminadas de la semana');
reset role;

-- ============ Aislamiento entre empresas ============
select set_config('request.jwt.claim.sub', :'adminB', false); set role authenticated;
select crear_empresa('Taller Brambila', 'taller-brambila') as emp_b \gset
select pg_temp.ok((select count(*) from clientes) = 0 and (select count(*) from pedidos) = 0, 'Empresa B no ve datos de A');
select pg_temp.falla(format($$insert into cotizaciones (empresa_id, cliente_id) values (%L, %L)$$, :'emp_b', :'cli'),
  'B no puede cotizar con un cliente de A');
select pg_temp.falla(format($$insert into clientes (empresa_id, nombre) values (%L, 'Intruso')$$, :'emp_a'),
  'B no puede escribir en A');
select pg_temp.falla($$select portal_pedido(gen_random_uuid())$$, 'usuario autenticado no llama funciones del portal');
select pg_temp.falla(format($$insert into invitaciones (empresa_id, email, rol, destajista_id) values (%L, 'x@b.mx', 'destajista', %L)$$, :'emp_b', :'d_sergio'),
  'B no puede invitar ligando un destajista de A');
select pg_temp.ok((select count(*) from v_insumos) = 0 and (select count(*) from material_entregado(array[:'o2']::uuid[])) = 0,
  'B no ve insumos ni material de A');
select crear_insumo(:'emp_b', 'Piel Napa Café', 'piel', 'm2', 0, null, 4, 90) as ins_b \gset
select pg_temp.ok((select existencia from insumos where id = :'ins_b') = 4, 'el mismo nombre de insumo sí se repite en otra empresa');
select pg_temp.falla(format($$insert into movimientos_insumo (empresa_id, insumo_id, tipo, cantidad, orden_id) values (%L, %L, 'salida', 1, %L)$$, :'emp_b', :'ins_b', :'o2'),
  'B no liga material a una orden de A');
select pg_temp.falla(format($$insert into movimientos_insumo (empresa_id, insumo_id, tipo, cantidad, costo_unitario) values (%L, %L, 'entrada', 1, 1)$$, :'emp_b', :'ins'),
  'B no registra movimientos en un insumo de A');
reset role;

-- ============ Portal público (vía Edge Function con service_role) ============
set role service_role;
select pg_temp.ok(portal_buscar('Muebleria-Sauce', :ped_folio, '  perez  LÓPEZ ') = :'tok', 'buscador: folio + apellidos sin acentos ni mayúsculas');
select pg_temp.ok(portal_buscar('muebleria-sauce', :ped_folio, 'Pérez') is null, 'apellidos incompletos no encuentran');
select pg_temp.ok(portal_buscar('taller-brambila', :ped_folio, 'Pérez López') is null, 'el folio no cruza empresas');
select pg_temp.ok((portal_pedido(:'tok')->'pedido'->>'saldo')::numeric = 0, 'portal muestra saldo');
select pg_temp.ok(jsonb_array_length(portal_pedido(:'tok')->'items'->0->'etapas') = 2, 'portal muestra avance por etapa');
select pg_temp.ok(portal_pedido(:'tok')::text not like '%9600%' and portal_pedido(:'tok')::text not like '%Sergio%',
  'portal no expone costos ni destajistas');
reset role;
set role anon;
select pg_temp.falla(format($$select portal_pedido(%L)$$, :'tok'), 'anon no llama al portal directo');
select pg_temp.falla($$select * from pedidos$$, 'anon no lee tablas');
select pg_temp.falla($$select slug_disponible('libre-123')$$, 'anon no consulta slugs');
reset role;

-- ============ Prueba vencida → solo lectura ============
update empresas set prueba_termina = now() - interval '1 day' where id = :'emp_a';
select set_config('request.jwt.claim.sub', :'vendA', false); set role authenticated;
select pg_temp.ok((select count(*) from clientes) = 1, 'con prueba vencida sigue leyendo');
select pg_temp.falla(format($$insert into clientes (empresa_id, nombre) values (%L, 'Nuevo')$$, :'emp_a'), 'con prueba vencida no escribe');
reset role;
update empresas set estado_suscripcion = 'activa' where id = :'emp_a';  -- lo haría el webhook de Stripe
select set_config('request.jwt.claim.sub', :'vendA', false); set role authenticated;
insert into clientes (empresa_id, nombre) values (:'emp_a', 'Nuevo');
select pg_temp.ok((select count(*) from clientes) = 2, 'suscripción activa → vuelve a escribir');
reset role;

rollback;
\echo '==== TODAS LAS PRUEBAS PASARON ===='
