-- Prueba de punta a punta: roles, aislamiento entre empresas, costeo, venta por partes,
-- cobranza, producción por destajista, insumos y portal público.
-- Uso: psql -v ON_ERROR_STOP=1 -f 00_supabase_stub.sql -f ../migrations/*.sql -f 01_flujo_completo.sql
\set QUIET on
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
select pg_temp.ok((select total from cotizaciones where id = :'cot') = 47606.40, 'total con 10% desc. e IVA: 41,040 × 1.16 = 47,606.40');
select pg_temp.ok((select count(*) from cotizacion_item_costos) = 0, 'Vendedor no ve el costo congelado');
select pg_temp.ok((select vigencia_hasta - fecha from cotizaciones where id = :'cot') = 15, 'vigencia 15 días');

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
update pedidos set pagado = 999999, total = 1 where id = :'ped';
select pg_temp.ok((select pagado = 15000 and total = 35078.40 from pedidos where id = :'ped'), 'pagado y total no se alteran a mano');
insert into pagos_cliente (empresa_id, pedido_id, monto, metodo) values (:'emp_a', :'ped', 6047.04, 'efectivo');
select pg_temp.ok((select estado from pedidos where id = :'ped') = 'en_produccion', 'anticipo cubierto → en producción');
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
reset role;

-- ============ Destajista: solo lo suyo ============
select set_config('request.jwt.claim.sub', :'destA', false); set role authenticated;
select pg_temp.ok((select count(*) from ordenes_produccion) = 2, 'destajista ve sus 2 órdenes');
select pg_temp.ok((select count(*) from pagos_destajista) = 1, 'destajista ve sus pagos');
select pg_temp.ok((select count(*) from pedidos) = 0 and (select count(*) from clientes) = 0, 'destajista no ve pedidos ni clientes');
select pg_temp.ok((select count(*) from costos_modelo) = 0, 'destajista no ve costeo');
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
update pedidos set estado = 'entregado' where id = :'ped';
select pg_temp.ok((select count(*) from v_pedido_resumen) = 0, 'Vendedor no ve márgenes');
reset role;

select set_config('request.jwt.claim.sub', :'contA', false); set role authenticated;
select pg_temp.ok((select margen_bruto from v_pedido_resumen where id = :'ped') = 30240 - 16800,
  'Contador ve margen: 30,240 − 16,800 de mano de obra');
select pg_temp.falla(format($$insert into clientes (empresa_id, nombre) values (%L, 'X')$$, :'emp_a'), 'Contador es solo lectura');
select pg_temp.ok(calcular_precio(:'m_nat', array[:'o_nog', :'o_piel']::uuid[], :'l_gen') = 8400, 'Contador calcula precios (PRD §4)');
select pg_temp.ok((select count(*) from modelo_costeo) = 1, 'Contador ve el markup');
update modelo_costeo set markup = 2 where modelo_id = :'m_nat';  -- RLS: 0 filas, sin error
select pg_temp.ok((select markup from modelo_costeo where modelo_id = :'m_nat') = 1.0, 'Contador no edita el markup');
reset role;

select set_config('request.jwt.claim.sub', :'adminA', false); set role authenticated;
select pg_temp.ok((select costo_unitario from cotizacion_item_costos where item_id = :'it1') = 4200, 'Admin ve costo congelado 4,200');
select pg_temp.ok((select count(*) from bitacora) > 10, 'bitácora registra movimientos');
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
