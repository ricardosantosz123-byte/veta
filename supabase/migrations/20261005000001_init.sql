-- =====================================================================
-- VETA · Esquema inicial (V1)
-- SaaS multi-empresa para mueblerías y talleres (carpintería, laca, tapicería)
--
-- Principios:
--   1. Todo registro de negocio lleva empresa_id y está protegido por RLS.
--   2. Los costos y márgenes viven en tablas separadas que el Vendedor no puede leer.
--   3. Los campos derivados (totales, pagado, saldo, existencias) se recalculan
--      SIEMPRE en triggers BEFORE: el cliente no puede alterarlos.
--   4. Las operaciones sensibles pasan por funciones RPC (security definer)
--      que validan el rol del usuario.
--   5. Si la prueba venció y no hay suscripción activa, la cuenta queda en
--      solo lectura (puede_escribir() = false).
-- =====================================================================

create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;

-- ---------------------------------------------------------------------
-- 1. Tipos
-- ---------------------------------------------------------------------
create type rol_miembro        as enum ('admin','vendedor','produccion','destajista','contador');
create type metodo_precio      as enum ('componentes','base_ajustes');
create type estado_suscripcion as enum ('prueba','activa','vencida','cancelada');
create type estado_cotizacion  as enum ('borrador','enviada','parcial','aceptada','vencida','cancelada');
create type estado_pedido      as enum ('anticipo_pendiente','en_produccion','terminado','liquidado','entregado','cancelado');
create type estado_produccion  as enum ('pendiente','en_proceso','terminado');
create type estado_orden       as enum ('pendiente','en_proceso','terminada','cancelada');
create type metodo_pago        as enum ('efectivo','transferencia','tarjeta','mercado_pago','otro');
create type tipo_movimiento    as enum ('entrada','salida','ajuste');

-- ---------------------------------------------------------------------
-- 2. Núcleo: empresas, miembros, invitaciones, folios
-- ---------------------------------------------------------------------
create table empresas (
  id                       uuid primary key default gen_random_uuid(),
  nombre                   text not null,
  slug                     text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  razon_social             text,
  rfc                      text,
  telefono                 text,
  email                    text,
  direccion                text,
  logo_path                text,
  color_marca              text not null default '#1d1d1f',
  metodo_precio            metodo_precio not null default 'componentes',
  iva                      numeric(5,4) not null default 0.16 check (iva >= 0 and iva < 1),
  vigencia_cotizacion_dias int not null default 15 check (vigencia_cotizacion_dias between 1 and 180),
  anticipo_pct             numeric(5,2) not null default 60 check (anticipo_pct between 0 and 100),
  condiciones_cotizacion   text,
  -- Suscripción (solo la escriben Edge Functions con service_role)
  estado_suscripcion       estado_suscripcion not null default 'prueba',
  prueba_termina           timestamptz not null default (now() + interval '14 days'),
  stripe_customer_id       text unique,
  stripe_subscription_id   text unique,
  plan_intervalo           text check (plan_intervalo in ('mes','anio')),
  periodo_termina          timestamptz,
  mp_conectado             boolean not null default false,
  created_at               timestamptz not null default now()
);

-- Secretos por empresa (token de Mercado Pago). Sin políticas RLS:
-- solo service_role (Edge Functions) puede leer o escribir.
create table empresa_secretos (
  empresa_id       uuid primary key references empresas(id) on delete cascade,
  mp_access_token  text,
  updated_at       timestamptz not null default now()
);

create table destajistas (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresas(id) on delete cascade,
  nombre      text not null,
  telefono    text,
  email       text,
  tipo        text not null default 'externo' check (tipo in ('externo','interno')),
  especialidad text,
  notas       text,
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (empresa_id, id)
);

create table miembros (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references empresas(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  rol            rol_miembro not null,
  destajista_id  uuid references destajistas(id) on delete set null,
  nombre         text,
  activo         boolean not null default true,
  created_at     timestamptz not null default now(),
  unique (empresa_id, user_id),
  check ((rol = 'destajista') = (destajista_id is not null))
);
create index on miembros (user_id);

create table invitaciones (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references empresas(id) on delete cascade,
  email          text not null,
  rol            rol_miembro not null,
  destajista_id  uuid references destajistas(id) on delete cascade,
  aceptada_at    timestamptz,
  created_by     uuid references auth.users(id),
  created_at     timestamptz not null default now(),
  check ((rol = 'destajista') = (destajista_id is not null))
);
create unique index on invitaciones (empresa_id, lower(email)) where aceptada_at is null;

create table folios (
  empresa_id uuid not null references empresas(id) on delete cascade,
  tipo       text not null,
  ultimo     int  not null default 0,
  primary key (empresa_id, tipo)
);

-- Control de abuso del portal público (lo usa la Edge Function `portal`)
create table portal_intentos (
  id         bigint generated always as identity primary key,
  ip_hash    text not null,
  created_at timestamptz not null default now()
);
create index on portal_intentos (ip_hash, created_at);

-- ---------------------------------------------------------------------
-- 3. Funciones auxiliares de acceso
-- ---------------------------------------------------------------------
create or replace function public.es_miembro(p_empresa uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from miembros
                 where empresa_id = p_empresa and user_id = auth.uid() and activo);
$$;

create or replace function public.tiene_rol(p_empresa uuid, p_roles rol_miembro[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from miembros
                 where empresa_id = p_empresa and user_id = auth.uid() and activo
                   and rol = any(p_roles));
$$;

create or replace function public.mi_destajista(p_empresa uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select destajista_id from miembros
  where empresa_id = p_empresa and user_id = auth.uid() and activo and rol = 'destajista';
$$;

-- La cuenta puede escribir si la prueba sigue vigente o la suscripción está activa.
create or replace function public.puede_escribir(p_empresa uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select estado_suscripcion = 'activa'
                       or (estado_suscripcion = 'prueba' and prueba_termina > now())
                   from empresas where id = p_empresa), false);
$$;

create or replace function public._siguiente_folio(p_empresa uuid, p_tipo text)
returns int language plpgsql security definer set search_path = public as $$
declare v int;
begin
  insert into folios (empresa_id, tipo, ultimo) values (p_empresa, p_tipo, 1)
  on conflict (empresa_id, tipo) do update set ultimo = folios.ultimo + 1
  returning ultimo into v;
  return v;
end $$;

-- Evita referencias cruzadas entre empresas (un cliente, modelo o etapa de otra cuenta).
create or replace function public._valida_empresa(p_tabla regclass, p_id uuid, p_empresa uuid)
returns void language plpgsql stable security definer set search_path = public as $$
declare v uuid;
begin
  if p_id is null then return; end if;
  execute format('select empresa_id from %s where id = $1', p_tabla) into v using p_id;
  if v is distinct from p_empresa then
    raise exception 'Referencia inválida a % para esta empresa', p_tabla;
  end if;
end $$;

create or replace function public._norm(t text)
returns text language sql stable set search_path = public as $$
  select lower(regexp_replace(trim(extensions.unaccent(coalesce(t, ''))), '\s+', ' ', 'g'));
$$;

-- Totales con o sin IVA incluido en el precio.
create or replace function public._totales(
  p_subtotal numeric, p_descuento_pct numeric, p_envio numeric,
  p_iva numeric, p_con_iva boolean,
  out iva_monto numeric, out total numeric)
language plpgsql immutable as $$
declare base numeric;
begin
  base := coalesce(p_subtotal,0) * (1 - coalesce(p_descuento_pct,0) / 100) + coalesce(p_envio,0);
  if p_con_iva then
    total     := round(base, 2);
    iva_monto := round(base - base / (1 + p_iva), 2);
  else
    iva_monto := round(base * p_iva, 2);
    total     := round(base + base * p_iva, 2);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 4. Catálogo y costeo
-- ---------------------------------------------------------------------
create table etapas (               -- Carpintería, Laca, Tapicería, Herrajes, Empaque…
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresas(id) on delete cascade,
  nombre      text not null,
  orden       int  not null default 0,
  activo      boolean not null default true,
  unique (empresa_id, nombre)
);

create table categorias (           -- Silla, Banco, Mesa, Cubierta, Base, Sofá…
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresas(id) on delete cascade,
  nombre      text not null,
  orden       int  not null default 0,
  unique (empresa_id, nombre)
);

create table modelos (
  id           uuid primary key default gen_random_uuid(),
  empresa_id   uuid not null references empresas(id) on delete cascade,
  categoria_id uuid references categorias(id) on delete set null,
  nombre       text not null,
  descripcion  text,
  foto_path    text,
  precio_base  numeric(12,2) not null default 0 check (precio_base >= 0), -- método base_ajustes
  sobre_diseno boolean not null default false,                            -- precio siempre manual
  activo       boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (empresa_id, nombre)
);

-- Markup por modelo: precio = costo × (1 + markup). Solo Admin y Contador.
create table modelo_costeo (
  modelo_id   uuid primary key references modelos(id) on delete cascade,
  empresa_id  uuid not null references empresas(id) on delete cascade,
  markup      numeric(6,3) not null default 1 check (markup >= 0)
);

create table grupos_opcion (        -- Madera, Recubrimiento, Tela/Color, Medida…
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresas(id) on delete cascade,
  nombre      text not null,
  obligatorio boolean not null default true,
  orden       int not null default 0,
  unique (empresa_id, nombre)
);

create table opciones (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references empresas(id) on delete cascade,
  grupo_id      uuid not null references grupos_opcion(id) on delete cascade,
  nombre        text not null,
  ajuste_precio numeric(12,2) not null default 0, -- método base_ajustes (puede ser negativo)
  activo        boolean not null default true,
  orden         int not null default 0,
  unique (grupo_id, nombre)
);

create table modelo_grupos (        -- qué grupos de opciones aplican a cada modelo
  modelo_id  uuid not null references modelos(id) on delete cascade,
  grupo_id   uuid not null references grupos_opcion(id) on delete cascade,
  empresa_id uuid not null references empresas(id) on delete cascade,
  primary key (modelo_id, grupo_id)
);

-- Costo por etapa (método componentes). opcion_id NULL = costo base de la etapa;
-- con opcion_id = ajuste (delta) que se suma si esa opción se elige.
-- Ej.: Carpintería base 1,800 · opción Nogal +600 · opción Piel (Tapicería) +900
create table costos_modelo (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresas(id) on delete cascade,
  modelo_id   uuid not null references modelos(id) on delete cascade,
  etapa_id    uuid not null references etapas(id) on delete restrict,
  opcion_id   uuid references opciones(id) on delete cascade,
  costo       numeric(12,2) not null
);
create unique index on costos_modelo (modelo_id, etapa_id, coalesce(opcion_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table listas_precios (       -- "General" (sin IVA) · "Expo" (IVA incluido, redondeada)
  id           uuid primary key default gen_random_uuid(),
  empresa_id   uuid not null references empresas(id) on delete cascade,
  nombre       text not null,
  factor       numeric(6,4) not null default 1 check (factor > 0),
  incluye_iva  boolean not null default false,
  redondeo     int not null default 0 check (redondeo >= 0), -- 0 = sin redondeo; 100 = a la centena superior
  predeterminada boolean not null default false,
  activo       boolean not null default true,
  unique (empresa_id, nombre)
);

-- Costo de un modelo con opciones (uso interno; no expuesto al Vendedor)
create or replace function public._calcular_costo(p_modelo uuid, p_opciones uuid[])
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(sum(costo), 0) from costos_modelo
  where modelo_id = p_modelo
    and (opcion_id is null or opcion_id = any(coalesce(p_opciones, '{}')));
$$;

-- Precio de venta. Lo puede llamar el Vendedor: devuelve precio, nunca costo.
create or replace function public.calcular_precio(p_modelo uuid, p_opciones uuid[], p_lista uuid default null)
returns numeric language plpgsql stable security definer set search_path = public as $$
declare
  v_emp uuid; v_base numeric; v_metodo metodo_precio; v_iva numeric;
  v_markup numeric; v_precio numeric;
  v_factor numeric := 1; v_con_iva boolean := false; v_redondeo int := 0;
begin
  select empresa_id, precio_base into v_emp, v_base from modelos where id = p_modelo;
  if v_emp is null then raise exception 'Modelo no encontrado'; end if;
  if not tiene_rol(v_emp, '{admin,vendedor,produccion}') then raise exception 'Sin acceso'; end if;

  select metodo_precio, iva into v_metodo, v_iva from empresas where id = v_emp;

  if v_metodo = 'componentes' then
    select coalesce(markup, 1) into v_markup from modelo_costeo where modelo_id = p_modelo;
    v_precio := _calcular_costo(p_modelo, p_opciones) * (1 + coalesce(v_markup, 1));
  else
    select v_base + coalesce(sum(ajuste_precio), 0) into v_precio
    from opciones where empresa_id = v_emp and id = any(coalesce(p_opciones, '{}'));
  end if;

  if p_lista is not null then
    select factor, incluye_iva, redondeo into v_factor, v_con_iva, v_redondeo
    from listas_precios where id = p_lista and empresa_id = v_emp;
    v_precio := v_precio * coalesce(v_factor, 1);
    if coalesce(v_con_iva, false) then v_precio := v_precio * (1 + v_iva); end if;
    if coalesce(v_redondeo, 0) > 0 then v_precio := ceil(v_precio / v_redondeo) * v_redondeo; end if;
  end if;

  return round(v_precio, 2);
end $$;

-- ---------------------------------------------------------------------
-- 5. Clientes
-- ---------------------------------------------------------------------
create table clientes (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresas(id) on delete cascade,
  nombre      text not null,
  apellidos   text not null default '',
  empresa_cliente text,             -- despacho / desarrollador / hotel (B2B)
  telefono    text,
  email       text,
  direccion   text,
  notas       text,
  created_at  timestamptz not null default now()
);
create index on clientes (empresa_id, apellidos);

-- ---------------------------------------------------------------------
-- 6. Cotizaciones
-- ---------------------------------------------------------------------
create table cotizaciones (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references empresas(id) on delete cascade,
  folio          int,
  cliente_id     uuid not null references clientes(id) on delete restrict,
  lista_id       uuid references listas_precios(id) on delete set null,
  vendedor_id    uuid references auth.users(id) default auth.uid(),
  fecha          date not null default current_date,
  vigencia_hasta date,
  estado         estado_cotizacion not null default 'borrador',
  descuento_pct  numeric(5,2) not null default 0 check (descuento_pct between 0 and 100),
  envio          numeric(12,2) not null default 0 check (envio >= 0),
  precios_con_iva boolean not null default false,
  subtotal       numeric(12,2) not null default 0,
  iva            numeric(12,2) not null default 0,
  total          numeric(12,2) not null default 0,
  notas          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (empresa_id, folio)
);

create table cotizacion_items (
  id                uuid primary key default gen_random_uuid(),
  empresa_id        uuid not null references empresas(id) on delete cascade,
  cotizacion_id     uuid not null references cotizaciones(id) on delete cascade,
  modelo_id         uuid references modelos(id) on delete set null, -- NULL = mueble sobre diseño
  opcion_ids        uuid[] not null default '{}',
  opciones_texto    text,           -- snapshot legible: "Nogal · Piel Napa Café"
  descripcion       text not null default '',
  cantidad          int not null default 1 check (cantidad > 0),
  precio_unitario   numeric(12,2),  -- NULL al insertar = se calcula automáticamente
  precio_manual     boolean not null default false,
  vendido           boolean not null default false,
  pedido_id         uuid,
  orden             int not null default 0,
  created_at        timestamptz not null default now()
);
create index on cotizacion_items (cotizacion_id);

-- Costo congelado al cotizar (Admin/Contador). El Vendedor no lo ve.
create table cotizacion_item_costos (
  item_id        uuid primary key references cotizacion_items(id) on delete cascade,
  empresa_id     uuid not null references empresas(id) on delete cascade,
  costo_unitario numeric(12,2) not null default 0
);

-- ---------------------------------------------------------------------
-- 7. Pedidos y cobranza
-- ---------------------------------------------------------------------
create table pedidos (
  id                 uuid primary key default gen_random_uuid(),
  empresa_id         uuid not null references empresas(id) on delete cascade,
  folio              int,
  cliente_id         uuid not null references clientes(id) on delete restrict,
  cotizacion_id      uuid references cotizaciones(id) on delete set null,
  estado             estado_pedido not null default 'anticipo_pendiente',
  descuento_pct      numeric(5,2) not null default 0,
  envio              numeric(12,2) not null default 0,
  precios_con_iva    boolean not null default false,
  anticipo_pct       numeric(5,2) not null default 60,
  subtotal           numeric(12,2) not null default 0,
  iva                numeric(12,2) not null default 0,
  total              numeric(12,2) not null default 0,
  anticipo_requerido numeric(12,2) not null default 0,
  pagado             numeric(12,2) not null default 0,
  saldo              numeric(12,2) generated always as (total - pagado) stored,
  fecha_compromiso   date,
  direccion_entrega  text,
  token_portal       uuid not null unique default gen_random_uuid(),
  facturado          boolean not null default false, -- CFDI: fase 2
  terminado_at       timestamptz,
  entregado_at       timestamptz,
  notas              text,
  created_by         uuid references auth.users(id) default auth.uid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (empresa_id, folio)
);

alter table cotizacion_items
  add constraint cotizacion_items_pedido_fk foreign key (pedido_id) references pedidos(id) on delete set null;

create table pedido_items (
  id                 uuid primary key default gen_random_uuid(),
  empresa_id         uuid not null references empresas(id) on delete cascade,
  pedido_id          uuid not null references pedidos(id) on delete cascade,
  cotizacion_item_id uuid references cotizacion_items(id) on delete set null,
  modelo_id          uuid references modelos(id) on delete set null,
  descripcion        text not null,
  opciones_texto     text,
  cantidad           int not null default 1 check (cantidad > 0),
  precio_unitario    numeric(12,2) not null default 0,
  estado_produccion  estado_produccion not null default 'pendiente',
  created_at         timestamptz not null default now()
);
create index on pedido_items (pedido_id);

create table pagos_cliente (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references empresas(id) on delete cascade,
  pedido_id       uuid not null references pedidos(id) on delete cascade,
  monto           numeric(12,2) not null check (monto > 0),
  metodo          metodo_pago not null,
  referencia      text,
  comprobante_path text,
  fecha           date not null default current_date,
  anulado         boolean not null default false,
  externo_id      text unique,      -- id de pago de Mercado Pago (idempotencia del webhook)
  registrado_por  uuid references auth.users(id) default auth.uid(),
  created_at      timestamptz not null default now()
);
create index on pagos_cliente (pedido_id);

create table links_pago (
  id           uuid primary key default gen_random_uuid(),
  empresa_id   uuid not null references empresas(id) on delete cascade,
  pedido_id    uuid not null references pedidos(id) on delete cascade,
  proveedor    text not null default 'mercado_pago',
  monto        numeric(12,2) not null check (monto > 0),
  url          text not null,
  externo_id   text,
  estado       text not null default 'activo' check (estado in ('activo','pagado','expirado','cancelado')),
  created_by   uuid references auth.users(id) default auth.uid(),
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 8. Producción por etapa (destajistas)
-- ---------------------------------------------------------------------
create table ordenes_produccion (
  id               uuid primary key default gen_random_uuid(),
  empresa_id       uuid not null references empresas(id) on delete cascade,
  folio            int,
  pedido_item_id   uuid not null references pedido_items(id) on delete cascade,
  etapa_id         uuid not null references etapas(id) on delete restrict,
  destajista_id    uuid references destajistas(id) on delete set null,
  descripcion      text not null default '',  -- snapshot: el destajista no lee el pedido
  cantidad         int not null default 1 check (cantidad > 0),
  costo_acordado   numeric(12,2) not null default 0 check (costo_acordado >= 0),
  pagado           numeric(12,2) not null default 0,
  saldo            numeric(12,2) generated always as (costo_acordado - pagado) stored,
  estado           estado_orden not null default 'pendiente',
  fecha_compromiso date,
  iniciada_at      timestamptz,
  terminada_at     timestamptz,
  notas            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (empresa_id, folio)
);
create index on ordenes_produccion (pedido_item_id);
create index on ordenes_produccion (destajista_id, estado);

create table pagos_destajista (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references empresas(id) on delete cascade,
  orden_id       uuid not null references ordenes_produccion(id) on delete cascade,
  monto          numeric(12,2) not null check (monto > 0),
  metodo         metodo_pago not null default 'transferencia',
  fecha          date not null default current_date,
  nota           text,
  registrado_por uuid references auth.users(id) default auth.uid(),
  created_at     timestamptz not null default now()
);
create index on pagos_destajista (orden_id);

-- ---------------------------------------------------------------------
-- 9. Insumos básicos
-- ---------------------------------------------------------------------
create table insumos (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references empresas(id) on delete cascade,
  nombre         text not null,
  tipo           text not null default 'otro'
                 check (tipo in ('madera','tela','piel','espuma','herraje','acabado','empaque','otro')),
  unidad         text not null default 'pza',  -- m, m2, pie_tabla, kg, l, pza
  costo_unitario numeric(12,2) not null default 0,
  existencia     numeric(12,3) not null default 0,
  minimo         numeric(12,3) not null default 0,
  proveedor      text,
  activo         boolean not null default true,
  updated_at     timestamptz not null default now(),
  unique (empresa_id, nombre)
);

create table movimientos_insumo (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references empresas(id) on delete cascade,
  insumo_id      uuid not null references insumos(id) on delete cascade,
  tipo           tipo_movimiento not null,
  cantidad       numeric(12,3) not null,  -- entrada/salida > 0; ajuste con signo
  costo_unitario numeric(12,2),           -- solo en entradas
  orden_id       uuid references ordenes_produccion(id) on delete set null, -- material entregado al destajista
  nota           text,
  created_by     uuid references auth.users(id) default auth.uid(),
  created_at     timestamptz not null default now(),
  check ((tipo = 'ajuste' and cantidad <> 0) or (tipo <> 'ajuste' and cantidad > 0))
);
create index on movimientos_insumo (insumo_id);

-- ---------------------------------------------------------------------
-- 10. Bitácora (solo Admin)
-- ---------------------------------------------------------------------
create table bitacora (
  id          bigint generated always as identity primary key,
  empresa_id  uuid not null references empresas(id) on delete cascade,
  user_id     uuid,
  tabla       text not null,
  operacion   text not null,
  registro_id uuid,
  datos       jsonb,
  created_at  timestamptz not null default now()
);
create index on bitacora (empresa_id, created_at desc);

-- =====================================================================
-- 11. Triggers
-- =====================================================================

-- 11.1 Empresa nueva: etapas y lista predeterminadas (el catálogo arranca vacío)
create or replace function public._tg_empresa_defaults()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into etapas (empresa_id, nombre, orden) values
    (new.id, 'Carpintería', 1), (new.id, 'Acabado / Laca', 2),
    (new.id, 'Tapicería', 3), (new.id, 'Herrajes', 4), (new.id, 'Empaque', 5);
  insert into listas_precios (empresa_id, nombre, predeterminada) values (new.id, 'General', true);
  return new;
end $$;
create trigger empresa_defaults after insert on empresas
  for each row execute function _tg_empresa_defaults();

-- 11.2 Cotización: folio, vigencia, IVA de la lista y totales
create or replace function public._tg_cotizacion_before()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_iva numeric; v_dias int; v_sub numeric;
begin
  select iva, vigencia_cotizacion_dias into v_iva, v_dias from empresas where id = new.empresa_id;
  if tg_op = 'INSERT' then
    new.folio := coalesce(new.folio, _siguiente_folio(new.empresa_id, 'cotizacion'));
    new.vigencia_hasta := coalesce(new.vigencia_hasta, new.fecha + v_dias);
  else
    new.folio := old.folio;
    new.empresa_id := old.empresa_id;
  end if;
  perform _valida_empresa('clientes', new.cliente_id, new.empresa_id);
  perform _valida_empresa('listas_precios', new.lista_id, new.empresa_id);
  if new.lista_id is not null then
    select incluye_iva into new.precios_con_iva from listas_precios where id = new.lista_id;
  end if;
  select coalesce(sum(cantidad * coalesce(precio_unitario, 0)), 0) into v_sub
  from cotizacion_items where cotizacion_id = new.id;
  new.subtotal := round(v_sub, 2);
  select t.iva_monto, t.total into new.iva, new.total
  from _totales(v_sub, new.descuento_pct, new.envio, v_iva, new.precios_con_iva) t;
  new.updated_at := now();
  return new;
end $$;
create trigger cotizacion_before before insert or update on cotizaciones
  for each row execute function _tg_cotizacion_before();

-- 11.3 Renglón de cotización: precio automático, snapshot de opciones, costo congelado
create or replace function public._tg_cot_item_before()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_lista uuid; v_sobre boolean;
begin
  select lista_id into v_lista from cotizaciones where id = new.cotizacion_id;
  new.empresa_id := (select empresa_id from cotizaciones where id = new.cotizacion_id);

  perform _valida_empresa('modelos', new.modelo_id, new.empresa_id);
  if exists (select 1 from unnest(new.opcion_ids) x left join opciones o on o.id = x
             where o.empresa_id is distinct from new.empresa_id) then
    raise exception 'Opción inválida para esta empresa';
  end if;

  if new.modelo_id is not null then
    select sobre_diseno into v_sobre from modelos where id = new.modelo_id;
    if new.descripcion = '' then
      new.descripcion := (select nombre from modelos where id = new.modelo_id);
    end if;
    new.opciones_texto := (
      select string_agg(o.nombre, ' · ' order by g.orden, o.orden)
      from opciones o join grupos_opcion g on g.id = o.grupo_id
      where o.id = any(new.opcion_ids));
  end if;

  -- Precio: manual si se marcó, si es sobre diseño o si no hay modelo; si no, automático
  if new.precio_unitario is null
     or (tg_op = 'UPDATE' and not new.precio_manual
         and (new.opcion_ids is distinct from old.opcion_ids or new.modelo_id is distinct from old.modelo_id)) then
    if new.modelo_id is not null and not coalesce(v_sobre, false) and not new.precio_manual then
      new.precio_unitario := calcular_precio(new.modelo_id, new.opcion_ids, v_lista);
    elsif new.precio_unitario is null then
      raise exception 'Este renglón requiere precio manual';
    end if;
  end if;
  if tg_op = 'INSERT' and new.precio_unitario is not null and new.modelo_id is not null
     and coalesce(v_sobre, false) then
    new.precio_manual := true;
  end if;
  return new;
end $$;
create trigger cot_item_before before insert or update on cotizacion_items
  for each row execute function _tg_cot_item_before();

create or replace function public._tg_cot_item_after()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_recalcular boolean := false;
begin
  if tg_op = 'INSERT' then
    v_recalcular := new.modelo_id is not null;
  elsif tg_op = 'UPDATE' then
    v_recalcular := new.modelo_id is not null
      and (new.opcion_ids is distinct from old.opcion_ids or new.modelo_id is distinct from old.modelo_id);
  end if;
  if v_recalcular then
    insert into cotizacion_item_costos (item_id, empresa_id, costo_unitario)
    values (new.id, new.empresa_id, _calcular_costo(new.modelo_id, new.opcion_ids))
    on conflict (item_id) do update set costo_unitario = excluded.costo_unitario;
  end if;
  if tg_op = 'DELETE' then
    update cotizaciones set updated_at = now() where id = old.cotizacion_id;
  else
    update cotizaciones set updated_at = now() where id = new.cotizacion_id;
  end if;
  return null;
end $$;
create trigger cot_item_after after insert or update or delete on cotizacion_items
  for each row execute function _tg_cot_item_after();

-- 11.4 Pedido: folio, totales, pagado, anticipo y transiciones de estado automáticas
create or replace function public._tg_pedido_before()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_iva numeric; v_sub numeric; v_items int; v_term int;
begin
  select iva into v_iva from empresas where id = new.empresa_id;
  if tg_op = 'INSERT' then
    new.folio := coalesce(new.folio, _siguiente_folio(new.empresa_id, 'pedido'));
    new.token_portal := gen_random_uuid();
  else
    new.token_portal := old.token_portal;   -- inmutables
    new.folio        := old.folio;
    new.empresa_id   := old.empresa_id;
  end if;
  perform _valida_empresa('clientes', new.cliente_id, new.empresa_id);
  perform _valida_empresa('cotizaciones', new.cotizacion_id, new.empresa_id);

  select coalesce(sum(cantidad * precio_unitario), 0), count(*),
         count(*) filter (where estado_produccion = 'terminado')
    into v_sub, v_items, v_term
  from pedido_items where pedido_id = new.id;

  new.subtotal := round(v_sub, 2);
  select t.iva_monto, t.total into new.iva, new.total
  from _totales(v_sub, new.descuento_pct, new.envio, v_iva, new.precios_con_iva) t;
  new.anticipo_requerido := round(new.total * new.anticipo_pct / 100, 2);
  new.pagado := (select coalesce(sum(monto), 0) from pagos_cliente
                 where pedido_id = new.id and not anulado);

  -- Transiciones automáticas
  if new.estado = 'anticipo_pendiente' and v_items > 0 and new.pagado >= new.anticipo_requerido then
    new.estado := 'en_produccion';
  end if;
  if new.estado = 'en_produccion' and v_items > 0 and v_term = v_items then
    new.estado := 'terminado';
  end if;
  if new.estado = 'terminado' and new.pagado >= new.total and new.total > 0 then
    new.estado := 'liquidado';
  end if;
  if new.estado = 'terminado' and new.terminado_at is null then new.terminado_at := now(); end if;

  -- Regla de negocio: nada sale del taller sin estar liquidado
  if new.estado = 'entregado' and new.pagado < new.total then
    raise exception 'No se puede entregar: el pedido tiene saldo pendiente de %', new.total - new.pagado;
  end if;
  if new.estado = 'entregado' and new.entregado_at is null then new.entregado_at := now(); end if;

  new.updated_at := now();
  return new;
end $$;
create trigger pedido_before before insert or update on pedidos
  for each row execute function _tg_pedido_before();

create or replace function public._tg_toca_pedido()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update pedidos set updated_at = now() where id = coalesce(new.pedido_id, old.pedido_id);
  return null;
end $$;
create trigger pedido_items_toca after insert or update or delete on pedido_items
  for each row execute function _tg_toca_pedido();
create trigger pagos_cliente_toca after insert or update or delete on pagos_cliente
  for each row execute function _tg_toca_pedido();

create or replace function public._tg_pago_cliente_before()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.empresa_id := (select empresa_id from pedidos where id = new.pedido_id);
  return new;
end $$;
create trigger pago_cliente_before before insert or update on pagos_cliente
  for each row execute function _tg_pago_cliente_before();

-- 11.5 Órdenes de producción: folio, pagado y avance del renglón del pedido
create or replace function public._tg_orden_before()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.empresa_id := (select empresa_id from pedido_items where id = new.pedido_item_id);
  if tg_op = 'INSERT' then
    new.folio := coalesce(new.folio, _siguiente_folio(new.empresa_id, 'orden'));
    if new.descripcion = '' then
      select concat_ws(' · ', descripcion, opciones_texto) into new.descripcion
      from pedido_items where id = new.pedido_item_id;
    end if;
  else
    new.folio := old.folio;
  end if;
  perform _valida_empresa('etapas', new.etapa_id, new.empresa_id);
  perform _valida_empresa('destajistas', new.destajista_id, new.empresa_id);
  new.pagado := (select coalesce(sum(monto), 0) from pagos_destajista where orden_id = new.id);
  if new.estado = 'en_proceso' and new.iniciada_at is null then new.iniciada_at := now(); end if;
  if new.estado = 'terminada'  and new.terminada_at is null then new.terminada_at := now(); end if;
  new.updated_at := now();
  return new;
end $$;
create trigger orden_before before insert or update on ordenes_produccion
  for each row execute function _tg_orden_before();

create or replace function public._tg_orden_after()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_item uuid; v_total int; v_term int; v_activas int;
begin
  v_item := coalesce(new.pedido_item_id, old.pedido_item_id);
  select count(*) filter (where estado <> 'cancelada'),
         count(*) filter (where estado = 'terminada'),
         count(*) filter (where estado in ('en_proceso','terminada'))
    into v_total, v_term, v_activas
  from ordenes_produccion where pedido_item_id = v_item;

  if v_total > 0 then
    update pedido_items set estado_produccion =
      case when v_term = v_total then 'terminado'::estado_produccion
           when v_activas > 0     then 'en_proceso'::estado_produccion
           else 'pendiente'::estado_produccion end
    where id = v_item;
  end if;
  return null;
end $$;
create trigger orden_after after insert or update or delete on ordenes_produccion
  for each row execute function _tg_orden_after();

create or replace function public._tg_pago_destajista()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op <> 'DELETE' then
    new.empresa_id := (select empresa_id from ordenes_produccion where id = new.orden_id);
    return new;
  end if;
  return old;
end $$;
create trigger pago_destajista_before before insert or update on pagos_destajista
  for each row execute function _tg_pago_destajista();

create or replace function public._tg_toca_orden()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update ordenes_produccion set updated_at = now() where id = coalesce(new.orden_id, old.orden_id);
  return null;
end $$;
create trigger pago_destajista_toca after insert or update or delete on pagos_destajista
  for each row execute function _tg_toca_orden();

-- 11.6 Insumos: existencia = suma de movimientos; costo promedio en entradas
create or replace function public._tg_insumo_before()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.existencia := (select coalesce(sum(case tipo when 'salida' then -cantidad else cantidad end), 0)
                     from movimientos_insumo where insumo_id = new.id);
  new.updated_at := now();
  return new;
end $$;
create trigger insumo_before before insert or update on insumos
  for each row execute function _tg_insumo_before();

create or replace function public._tg_movimiento_before()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_exist numeric; v_costo numeric;
begin
  select empresa_id, existencia, costo_unitario into new.empresa_id, v_exist, v_costo
  from insumos where id = new.insumo_id;
  if new.tipo = 'entrada' and new.costo_unitario is not null then
    update insumos set costo_unitario = case
      when v_exist > 0 then round((v_exist * v_costo + new.cantidad * new.costo_unitario) / (v_exist + new.cantidad), 2)
      else new.costo_unitario end
    where id = new.insumo_id;
  end if;
  return new;
end $$;
create trigger movimiento_before before insert on movimientos_insumo
  for each row execute function _tg_movimiento_before();

create or replace function public._tg_toca_insumo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update insumos set updated_at = now() where id = coalesce(new.insumo_id, old.insumo_id);
  return null;
end $$;
create trigger movimiento_toca after insert or update or delete on movimientos_insumo
  for each row execute function _tg_toca_insumo();

-- 11.7 empresa_id heredado en tablas hijas de catálogo (evita mezclar empresas)
create or replace function public._tg_hereda_empresa_modelo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.empresa_id := (select empresa_id from modelos where id = new.modelo_id);
  return new;
end $$;
create trigger costos_modelo_emp before insert or update on costos_modelo
  for each row execute function _tg_hereda_empresa_modelo();

create or replace function public._tg_costos_valida()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform _valida_empresa('etapas', new.etapa_id, new.empresa_id);
  perform _valida_empresa('opciones', new.opcion_id, new.empresa_id);
  return new;
end $$;
create trigger costos_modelo_valida before insert or update on costos_modelo
  for each row execute function _tg_costos_valida();   -- corre después de *_emp (orden alfabético)

create or replace function public._tg_modelo_valida()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then new.empresa_id := old.empresa_id; end if;
  perform _valida_empresa('categorias', new.categoria_id, new.empresa_id);
  return new;
end $$;
create trigger modelo_valida before insert or update on modelos
  for each row execute function _tg_modelo_valida();

create or replace function public._tg_modelo_grupo_valida()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform _valida_empresa('grupos_opcion', new.grupo_id, new.empresa_id);
  return new;
end $$;
create trigger modelo_grupos_valida before insert or update on modelo_grupos
  for each row execute function _tg_modelo_grupo_valida();
create trigger modelo_costeo_emp before insert or update on modelo_costeo
  for each row execute function _tg_hereda_empresa_modelo();
create trigger modelo_grupos_emp before insert or update on modelo_grupos
  for each row execute function _tg_hereda_empresa_modelo();

create or replace function public._tg_hereda_empresa_grupo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.empresa_id := (select empresa_id from grupos_opcion where id = new.grupo_id);
  return new;
end $$;
create trigger opciones_emp before insert or update on opciones
  for each row execute function _tg_hereda_empresa_grupo();

create or replace function public._tg_hereda_empresa_pedido()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.empresa_id := (select empresa_id from pedidos where id = new.pedido_id);
  return new;
end $$;
create trigger pedido_items_emp before insert or update on pedido_items
  for each row execute function _tg_hereda_empresa_pedido();
create trigger links_pago_emp before insert or update on links_pago
  for each row execute function _tg_hereda_empresa_pedido();

-- 11.8 Bitácora
create or replace function public._tg_bitacora()
returns trigger language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  r := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into bitacora (empresa_id, user_id, tabla, operacion, registro_id, datos)
  values ((r->>'empresa_id')::uuid, auth.uid(), tg_table_name, tg_op,
          nullif(r->>'id','')::uuid, r);
  return null;
end $$;
create trigger bitacora_cotizaciones after insert or update or delete on cotizaciones      for each row execute function _tg_bitacora();
create trigger bitacora_cot_items    after insert or update or delete on cotizacion_items  for each row execute function _tg_bitacora();
create trigger bitacora_pedidos      after insert or update or delete on pedidos           for each row execute function _tg_bitacora();
create trigger bitacora_pagos        after insert or update or delete on pagos_cliente     for each row execute function _tg_bitacora();
create trigger bitacora_ordenes      after insert or update or delete on ordenes_produccion for each row execute function _tg_bitacora();
create trigger bitacora_pagos_dest   after insert or update or delete on pagos_destajista  for each row execute function _tg_bitacora();
create trigger bitacora_modelos      after insert or update or delete on modelos           for each row execute function _tg_bitacora();
create trigger bitacora_miembros     after insert or update or delete on miembros          for each row execute function _tg_bitacora();

-- =====================================================================
-- 12. Funciones RPC
-- =====================================================================

-- Alta de empresa: quien la crea queda como Admin. Arranca en prueba de 14 días.
create or replace function public.crear_empresa(p_nombre text, p_slug text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Inicia sesión primero'; end if;
  insert into empresas (nombre, slug) values (trim(p_nombre), lower(trim(p_slug))) returning id into v_id;
  insert into miembros (empresa_id, user_id, rol, nombre)
  values (v_id, auth.uid(), 'admin', (select email from auth.users where id = auth.uid()));
  return v_id;
end $$;

-- Al iniciar sesión: convierte invitaciones pendientes del correo en membresías.
create or replace function public.aceptar_invitaciones()
returns int language plpgsql security definer set search_path = public as $$
declare v_email text; v_n int;
begin
  select lower(email) into v_email from auth.users where id = auth.uid();
  if v_email is null then return 0; end if;
  with nuevas as (
    insert into miembros (empresa_id, user_id, rol, destajista_id, nombre)
    select i.empresa_id, auth.uid(), i.rol, i.destajista_id, v_email
    from invitaciones i
    where lower(i.email) = v_email and i.aceptada_at is null
    on conflict (empresa_id, user_id) do nothing
    returning empresa_id)
  select count(*) into v_n from nuevas;
  update invitaciones set aceptada_at = now()
  where lower(email) = v_email and aceptada_at is null;
  return v_n;
end $$;

-- Recalcula precios automáticos de una cotización (p. ej. al cambiar de lista). Respeta los manuales.
create or replace function public.recalcular_precios_cotizacion(p_cotizacion uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_emp uuid;
begin
  select empresa_id into v_emp from cotizaciones where id = p_cotizacion;
  if not tiene_rol(v_emp, '{admin,vendedor}') then raise exception 'Sin acceso'; end if;
  if not puede_escribir(v_emp) then raise exception 'Cuenta en solo lectura: activa tu suscripción'; end if;
  update cotizacion_items set precio_unitario = null
  where cotizacion_id = p_cotizacion and not precio_manual and not vendido and modelo_id is not null;
end $$;

-- Venta total o por partes: convierte renglones seleccionados de una cotización en pedido.
create or replace function public.crear_pedido_desde_cotizacion(
  p_cotizacion uuid, p_items uuid[] default null, p_incluir_envio boolean default true,
  p_fecha_compromiso date default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare c cotizaciones; v_pedido uuid; v_pend int;
begin
  select * into c from cotizaciones where id = p_cotizacion;
  if c.id is null then raise exception 'Cotización no encontrada'; end if;
  if not tiene_rol(c.empresa_id, '{admin,vendedor}') then raise exception 'Sin acceso'; end if;
  if not puede_escribir(c.empresa_id) then raise exception 'Cuenta en solo lectura: activa tu suscripción'; end if;

  if not exists (select 1 from cotizacion_items
                 where cotizacion_id = c.id and not vendido
                   and (p_items is null or id = any(p_items))) then
    raise exception 'No hay renglones disponibles para vender';
  end if;

  insert into pedidos (empresa_id, cliente_id, cotizacion_id, descuento_pct, envio,
                       precios_con_iva, anticipo_pct, fecha_compromiso)
  values (c.empresa_id, c.cliente_id, c.id, c.descuento_pct,
          case when p_incluir_envio then c.envio else 0 end,
          c.precios_con_iva, (select anticipo_pct from empresas where id = c.empresa_id),
          p_fecha_compromiso)
  returning id into v_pedido;

  insert into pedido_items (empresa_id, pedido_id, cotizacion_item_id, modelo_id,
                            descripcion, opciones_texto, cantidad, precio_unitario)
  select c.empresa_id, v_pedido, i.id, i.modelo_id, i.descripcion, i.opciones_texto,
         i.cantidad, i.precio_unitario
  from cotizacion_items i
  where i.cotizacion_id = c.id and not i.vendido and (p_items is null or i.id = any(p_items))
  order by i.orden, i.created_at;

  update cotizacion_items set vendido = true, pedido_id = v_pedido
  where cotizacion_id = c.id and not vendido and (p_items is null or id = any(p_items));

  select count(*) into v_pend from cotizacion_items where cotizacion_id = c.id and not vendido;
  update cotizaciones set estado = case when v_pend = 0 then 'aceptada'::estado_cotizacion
                                        else 'parcial'::estado_cotizacion end
  where id = c.id;

  return v_pedido;
end $$;

-- Avance de una orden: lo usa el Destajista (solo las suyas) o Producción/Admin.
create or replace function public.marcar_avance_orden(p_orden uuid, p_estado estado_orden, p_nota text default null)
returns void language plpgsql security definer set search_path = public as $$
declare o ordenes_produccion;
begin
  select * into o from ordenes_produccion where id = p_orden;
  if o.id is null then raise exception 'Orden no encontrada'; end if;
  if not (tiene_rol(o.empresa_id, '{admin,produccion}')
          or (o.destajista_id is not null and o.destajista_id = mi_destajista(o.empresa_id))) then
    raise exception 'Sin acceso';
  end if;
  if p_estado = 'cancelada' and not tiene_rol(o.empresa_id, '{admin,produccion}') then
    raise exception 'Solo Producción o Admin pueden cancelar una orden';
  end if;
  update ordenes_produccion
     set estado = p_estado,
         notas = case when p_nota is null then notas
                      else concat_ws(E'\n', notas, to_char(now(), 'YYYY-MM-DD') || ': ' || p_nota) end
   where id = p_orden;
end $$;

-- Portal público (lo llama SOLO la Edge Function `portal`, con service_role y límite por IP)
create or replace function public.portal_pedido(p_token uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'empresa', jsonb_build_object('nombre', e.nombre, 'logo_path', e.logo_path,
                                  'telefono', e.telefono, 'color', e.color_marca, 'slug', e.slug),
    'pedido',  jsonb_build_object('folio', p.folio, 'fecha', p.created_at::date, 'estado', p.estado,
                                  'fecha_compromiso', p.fecha_compromiso, 'cliente', c.nombre,
                                  'total', p.total, 'pagado', p.pagado, 'saldo', p.saldo,
                                  'anticipo_requerido', p.anticipo_requerido),
    'items', (select coalesce(jsonb_agg(jsonb_build_object(
                'descripcion', i.descripcion, 'opciones', i.opciones_texto,
                'cantidad', i.cantidad, 'estado', i.estado_produccion,
                'etapas', (select coalesce(jsonb_agg(jsonb_build_object('etapa', et.nombre, 'estado', o.estado)
                                                     order by et.orden), '[]'::jsonb)
                           from ordenes_produccion o join etapas et on et.id = o.etapa_id
                           where o.pedido_item_id = i.id and o.estado <> 'cancelada'))
              order by i.created_at), '[]'::jsonb)
              from pedido_items i where i.pedido_id = p.id),
    'pagos', (select coalesce(jsonb_agg(jsonb_build_object('fecha', pc.fecha, 'monto', pc.monto,
                                                            'metodo', pc.metodo) order by pc.fecha), '[]'::jsonb)
              from pagos_cliente pc where pc.pedido_id = p.id and not pc.anulado),
    'link_pago', (select lp.url from links_pago lp
                  where lp.pedido_id = p.id and lp.estado = 'activo'
                  order by lp.created_at desc limit 1))
  from pedidos p
  join empresas e on e.id = p.empresa_id
  join clientes c on c.id = p.cliente_id
  where p.token_portal = p_token and p.estado <> 'cancelado';
$$;

-- Buscador del portal: folio + apellidos (sin acentos ni mayúsculas) dentro de una empresa.
create or replace function public.portal_buscar(p_slug text, p_folio int, p_apellidos text)
returns uuid language sql stable security definer set search_path = public as $$
  select p.token_portal
  from pedidos p
  join empresas e on e.id = p.empresa_id
  join clientes c on c.id = p.cliente_id
  where e.slug = lower(trim(p_slug)) and p.folio = p_folio
    and length(_norm(p_apellidos)) >= 3
    and _norm(c.apellidos) = _norm(p_apellidos)
    and p.estado <> 'cancelado'
  limit 1;
$$;

-- Resumen por pedido con costo real de producción y margen (Admin y Contador)
create view v_pedido_resumen with (security_invoker = true) as
select p.id, p.empresa_id, p.folio, p.created_at, p.estado,
       c.nombre || ' ' || c.apellidos as cliente,
       p.total, p.iva, p.pagado, p.saldo,
       coalesce(op.costo, 0)                          as costo_produccion,
       coalesce(op.por_pagar, 0)                      as por_pagar_destajistas,
       (p.total - p.iva) - coalesce(op.costo, 0)       as margen_bruto,
       case when p.total - p.iva > 0
            then round(((p.total - p.iva) - coalesce(op.costo, 0)) / (p.total - p.iva) * 100, 1) end as margen_pct
from pedidos p
join clientes c on c.id = p.cliente_id
left join lateral (
  select sum(o.costo_acordado) as costo, sum(o.saldo) as por_pagar
  from ordenes_produccion o join pedido_items i on i.id = o.pedido_item_id
  where i.pedido_id = p.id and o.estado <> 'cancelada') op on true
where tiene_rol(p.empresa_id, '{admin,contador}');

-- =====================================================================
-- 13. Row Level Security
-- =====================================================================
alter table empresas               enable row level security;
alter table empresa_secretos       enable row level security;
alter table destajistas            enable row level security;
alter table miembros               enable row level security;
alter table invitaciones           enable row level security;
alter table folios                 enable row level security;
alter table portal_intentos        enable row level security;
alter table etapas                 enable row level security;
alter table categorias             enable row level security;
alter table modelos                enable row level security;
alter table modelo_costeo          enable row level security;
alter table grupos_opcion          enable row level security;
alter table opciones               enable row level security;
alter table modelo_grupos          enable row level security;
alter table costos_modelo          enable row level security;
alter table listas_precios         enable row level security;
alter table clientes               enable row level security;
alter table cotizaciones           enable row level security;
alter table cotizacion_items       enable row level security;
alter table cotizacion_item_costos enable row level security;
alter table pedidos                enable row level security;
alter table pedido_items           enable row level security;
alter table pagos_cliente          enable row level security;
alter table links_pago             enable row level security;
alter table ordenes_produccion     enable row level security;
alter table pagos_destajista       enable row level security;
alter table insumos                enable row level security;
alter table movimientos_insumo     enable row level security;
alter table bitacora               enable row level security;
-- empresa_secretos, folios y portal_intentos: sin políticas = sin acceso desde el cliente.

-- Empresas
create policy empresas_sel on empresas for select using (es_miembro(id));
create policy empresas_upd on empresas for update using (tiene_rol(id, '{admin}')) with check (tiene_rol(id, '{admin}'));

-- Miembros e invitaciones
create policy miembros_sel on miembros for select using (user_id = auth.uid() or tiene_rol(empresa_id, '{admin}'));
create policy miembros_upd on miembros for update using (tiene_rol(empresa_id, '{admin}') and user_id <> auth.uid())
  with check (tiene_rol(empresa_id, '{admin}'));
create policy miembros_del on miembros for delete using (tiene_rol(empresa_id, '{admin}') and user_id <> auth.uid());
create policy invit_all on invitaciones for all using (tiene_rol(empresa_id, '{admin}'))
  with check (tiene_rol(empresa_id, '{admin}') and puede_escribir(empresa_id));

-- Destajistas
create policy dest_sel on destajistas for select
  using (tiene_rol(empresa_id, '{admin,produccion,contador}') or id = mi_destajista(empresa_id));
create policy dest_ins on destajistas for insert with check (tiene_rol(empresa_id, '{admin,produccion}') and puede_escribir(empresa_id));
create policy dest_upd on destajistas for update using (tiene_rol(empresa_id, '{admin,produccion}') and puede_escribir(empresa_id));
create policy dest_del on destajistas for delete using (tiene_rol(empresa_id, '{admin}'));

-- Catálogo visible (sin costos): Admin, Vendedor, Producción. Edita: Admin.
do $$
declare t text;
begin
  foreach t in array array['etapas','categorias','modelos','grupos_opcion','opciones','modelo_grupos','listas_precios'] loop
    execute format('create policy %1$s_sel on %1$I for select using (tiene_rol(empresa_id, ''{admin,vendedor,produccion,contador}''))', t);
    execute format('create policy %1$s_ins on %1$I for insert with check (tiene_rol(empresa_id, ''{admin}'') and puede_escribir(empresa_id))', t);
    execute format('create policy %1$s_upd on %1$I for update using (tiene_rol(empresa_id, ''{admin}'') and puede_escribir(empresa_id))', t);
    execute format('create policy %1$s_del on %1$I for delete using (tiene_rol(empresa_id, ''{admin}'') and puede_escribir(empresa_id))', t);
  end loop;
end $$;
-- El destajista ve los nombres de etapa (para sus órdenes)
create policy etapas_sel_dest on etapas for select using (mi_destajista(empresa_id) is not null);

-- Costos: Producción ve costos por etapa (mano de obra); markup solo Admin y Contador.
create policy costos_sel on costos_modelo for select using (tiene_rol(empresa_id, '{admin,produccion,contador}'));
create policy costos_ins on costos_modelo for insert with check (tiene_rol(empresa_id, '{admin}') and puede_escribir(empresa_id));
create policy costos_upd on costos_modelo for update using (tiene_rol(empresa_id, '{admin}') and puede_escribir(empresa_id));
create policy costos_del on costos_modelo for delete using (tiene_rol(empresa_id, '{admin}') and puede_escribir(empresa_id));
create policy markup_sel on modelo_costeo for select using (tiene_rol(empresa_id, '{admin,contador}'));
create policy markup_ins on modelo_costeo for insert with check (tiene_rol(empresa_id, '{admin}') and puede_escribir(empresa_id));
create policy markup_upd on modelo_costeo for update using (tiene_rol(empresa_id, '{admin}') and puede_escribir(empresa_id));
create policy markup_del on modelo_costeo for delete using (tiene_rol(empresa_id, '{admin}'));

-- Clientes: Admin y Vendedor editan; Contador consulta.
create policy clientes_sel on clientes for select using (tiene_rol(empresa_id, '{admin,vendedor,contador}'));
create policy clientes_ins on clientes for insert with check (tiene_rol(empresa_id, '{admin,vendedor}') and puede_escribir(empresa_id));
create policy clientes_upd on clientes for update using (tiene_rol(empresa_id, '{admin,vendedor}') and puede_escribir(empresa_id));
create policy clientes_del on clientes for delete using (tiene_rol(empresa_id, '{admin}'));

-- Cotizaciones
create policy cot_sel on cotizaciones for select using (tiene_rol(empresa_id, '{admin,vendedor,contador}'));
create policy cot_ins on cotizaciones for insert with check (tiene_rol(empresa_id, '{admin,vendedor}') and puede_escribir(empresa_id));
create policy cot_upd on cotizaciones for update using (tiene_rol(empresa_id, '{admin,vendedor}') and puede_escribir(empresa_id));
create policy cot_del on cotizaciones for delete using (tiene_rol(empresa_id, '{admin}') and estado = 'borrador');

create policy coti_sel on cotizacion_items for select using (tiene_rol(empresa_id, '{admin,vendedor,contador}'));
create policy coti_ins on cotizacion_items for insert with check (
  tiene_rol((select empresa_id from cotizaciones where id = cotizacion_id), '{admin,vendedor}')
  and puede_escribir((select empresa_id from cotizaciones where id = cotizacion_id)));
create policy coti_upd on cotizacion_items for update using (tiene_rol(empresa_id, '{admin,vendedor}') and not vendido and puede_escribir(empresa_id));
create policy coti_del on cotizacion_items for delete using (tiene_rol(empresa_id, '{admin,vendedor}') and not vendido);

create policy cotic_sel on cotizacion_item_costos for select using (tiene_rol(empresa_id, '{admin,contador}'));
create policy cotic_upd on cotizacion_item_costos for update using (tiene_rol(empresa_id, '{admin}'));
create policy cotic_ins on cotizacion_item_costos for insert with check (tiene_rol(empresa_id, '{admin}'));

-- Pedidos (se crean con crear_pedido_desde_cotizacion o directo por Admin/Vendedor)
create policy ped_sel on pedidos for select using (tiene_rol(empresa_id, '{admin,vendedor,produccion,contador}'));
create policy ped_ins on pedidos for insert with check (tiene_rol(empresa_id, '{admin,vendedor}') and puede_escribir(empresa_id));
create policy ped_upd on pedidos for update using (tiene_rol(empresa_id, '{admin,vendedor,produccion}') and puede_escribir(empresa_id));
create policy ped_del on pedidos for delete using (tiene_rol(empresa_id, '{admin}') and pagado = 0);

create policy pedi_sel on pedido_items for select using (tiene_rol(empresa_id, '{admin,vendedor,produccion,contador}'));
create policy pedi_ins on pedido_items for insert with check (
  tiene_rol((select empresa_id from pedidos where id = pedido_id), '{admin,vendedor}')
  and puede_escribir((select empresa_id from pedidos where id = pedido_id)));
create policy pedi_upd on pedido_items for update using (tiene_rol(empresa_id, '{admin,vendedor,produccion}') and puede_escribir(empresa_id));
create policy pedi_del on pedido_items for delete using (tiene_rol(empresa_id, '{admin}'));

-- Cobranza: registran Admin y Vendedor; anula solo Admin; Contador consulta.
create policy pc_sel on pagos_cliente for select using (tiene_rol(empresa_id, '{admin,vendedor,contador}'));
create policy pc_ins on pagos_cliente for insert with check (
  tiene_rol((select empresa_id from pedidos where id = pedido_id), '{admin,vendedor}')
  and puede_escribir((select empresa_id from pedidos where id = pedido_id)));
create policy pc_upd on pagos_cliente for update using (tiene_rol(empresa_id, '{admin}'));

create policy lp_sel on links_pago for select using (tiene_rol(empresa_id, '{admin,vendedor,contador}'));
create policy lp_upd on links_pago for update using (tiene_rol(empresa_id, '{admin,vendedor}'));
-- links_pago se crean desde la Edge Function `mp-crear-link` (service_role).

-- Producción
create policy op_sel on ordenes_produccion for select using (
  tiene_rol(empresa_id, '{admin,produccion,contador}')
  or (destajista_id is not null and destajista_id = mi_destajista(empresa_id)));
create policy op_ins on ordenes_produccion for insert with check (
  tiene_rol((select empresa_id from pedido_items where id = pedido_item_id), '{admin,produccion}')
  and puede_escribir((select empresa_id from pedido_items where id = pedido_item_id)));
create policy op_upd on ordenes_produccion for update using (tiene_rol(empresa_id, '{admin,produccion}') and puede_escribir(empresa_id));
create policy op_del on ordenes_produccion for delete using (tiene_rol(empresa_id, '{admin,produccion}') and pagado = 0);

create policy pd_sel on pagos_destajista for select using (
  tiene_rol(empresa_id, '{admin,produccion,contador}')
  or exists (select 1 from ordenes_produccion o where o.id = orden_id
             and o.destajista_id = mi_destajista(pagos_destajista.empresa_id)));
create policy pd_ins on pagos_destajista for insert with check (
  tiene_rol((select empresa_id from ordenes_produccion where id = orden_id), '{admin,produccion}')
  and puede_escribir((select empresa_id from ordenes_produccion where id = orden_id)));
create policy pd_del on pagos_destajista for delete using (tiene_rol(empresa_id, '{admin}'));

-- Insumos
create policy ins_sel on insumos for select using (tiene_rol(empresa_id, '{admin,produccion,contador}'));
create policy ins_ins on insumos for insert with check (tiene_rol(empresa_id, '{admin,produccion}') and puede_escribir(empresa_id));
create policy ins_upd on insumos for update using (tiene_rol(empresa_id, '{admin,produccion}') and puede_escribir(empresa_id));
create policy ins_del on insumos for delete using (tiene_rol(empresa_id, '{admin}'));
create policy mov_sel on movimientos_insumo for select using (tiene_rol(empresa_id, '{admin,produccion,contador}'));
create policy mov_ins on movimientos_insumo for insert with check (
  tiene_rol((select empresa_id from insumos where id = insumo_id), '{admin,produccion}')
  and puede_escribir((select empresa_id from insumos where id = insumo_id)));

-- Bitácora
create policy bit_sel on bitacora for select using (tiene_rol(empresa_id, '{admin}'));

-- =====================================================================
-- 14. Permisos de columnas y funciones
-- =====================================================================
-- Admin edita datos de la empresa, nunca los campos de suscripción.
revoke update on empresas from authenticated;
grant update (nombre, slug, razon_social, rfc, telefono, email, direccion, logo_path, color_marca,
              metodo_precio, iva, vigencia_cotizacion_dias, anticipo_pct, condiciones_cotizacion)
  on empresas to authenticated;
revoke insert on empresas from authenticated;   -- se crean con crear_empresa()
revoke insert on miembros from authenticated;   -- se crean con crear_empresa() / aceptar_invitaciones()
revoke update on miembros from authenticated;
grant update (rol, destajista_id, nombre, activo) on miembros to authenticated;
revoke insert, update on links_pago from authenticated;
grant update (estado) on links_pago to authenticated;
revoke all on empresa_secretos, folios, portal_intentos from anon, authenticated;
revoke all on bitacora from anon;
revoke insert, update, delete on bitacora from authenticated;

-- Nada para anon salvo lo que pase por Edge Functions.
revoke all on all tables in schema public from anon;

-- Funciones internas y del portal: fuera del alcance del cliente.
revoke execute on function public._siguiente_folio(uuid, text)          from public, anon, authenticated;
revoke execute on function public._calcular_costo(uuid, uuid[])          from public, anon, authenticated;
revoke execute on function public.portal_pedido(uuid)                    from public, anon, authenticated;
revoke execute on function public.portal_buscar(text, int, text)         from public, anon, authenticated;
grant  execute on function public.portal_pedido(uuid)                    to service_role;
grant  execute on function public.portal_buscar(text, int, text)         to service_role;
revoke execute on function public.crear_empresa(text, text)              from anon;
revoke execute on function public.aceptar_invitaciones()                 from anon;
revoke execute on function public.crear_pedido_desde_cotizacion(uuid, uuid[], boolean, date) from anon;
revoke execute on function public.marcar_avance_orden(uuid, estado_orden, text) from anon;
revoke execute on function public.calcular_precio(uuid, uuid[], uuid)    from anon;
revoke execute on function public.recalcular_precios_cotizacion(uuid)    from anon;
revoke execute on function public._valida_empresa(regclass, uuid, uuid)  from public, anon, authenticated;
