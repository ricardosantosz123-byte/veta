# Decisiones

> Formato: decisión · por qué. Si una decisión cambia, táchala (~~así~~) y agrega la nueva con fecha.

## Producto (2026-10-05)
- **Segmento V1:** mueblerías que maquilan **y** talleres que fabrican. El mismo modelo de datos atiende a ambos (destajista interno o externo).
- **Construcción desde cero**, sin reutilizar el código de Lortata CRM.
- **Módulos V1:** cotizador + catálogo, pedidos y cobranza, órdenes a destajistas, portal del cliente final, insumos básicos.
- **Costeo:** los dos métodos, a elegir por empresa: A = costo por etapa × (1 + markup); B = precio base + ajustes por opción.
- **Roles:** Admin, Vendedor, Producción, Destajista, Contador (solo lectura) + cliente final sin cuenta.
- **Cobranza:** registro manual con comprobante + link de pago de Mercado Pago (cuenta propia de cada mueblería).
- **CFDI:** fase 2. En V1 solo se marca *facturado* y se adjunta el CFDI externo.
- **Onboarding:** catálogo vacío, captura manual (importar Excel en fase 2).
- **Portal:** link único sin cuenta + buscador folio + apellidos en `/{slug}/seguimiento`.
- **Prueba:** 14 días sin tarjeta; al vencer, la cuenta queda en solo lectura.
- **Pasarelas:** Stripe para la suscripción de Veta; Mercado Pago para los cobros de cada mueblería.
- **Sucursales:** una sede por cuenta (multi-sede en fase 2).
- **Avisos:** correo + WhatsApp prearmado (`wa.me`). Sin WhatsApp Business API.
- **Precio de la suscripción:** pendiente. Stripe lee los precios de variables de entorno.
- **Nombre:** "Veta" es temporal. Opciones: Veta, Hechura, Escuadra, Bastidor, Ensamble.

## Infraestructura (2026-10-05)
- Mac Intel: **sin Homebrew ni Docker** (Homebrew ya no soporta Intel). Supabase en **modo nube** con CLI vía `npx supabase`.
- Proyecto `veta-dev` en una cuenta de Supabase separada (límite de 2 proyectos gratuitos por cuenta).
- psql desde Postgres.app para correr `supabase/tests/run.sh`.
- Principio rector: **la base de datos manda.** Totales, saldos, estados, folios, costos y permisos se calculan o validan en Postgres; la interfaz solo refleja.

## Fase 1
- **Correo opción A2:** sin dominio todavía, así que "Confirm email" está apagado y la invitación se acepta al registrarse. ⚠️ Requisito de lanzamiento en [[05 Pendientes y riesgos]].
- RPC `slug_disponible` y política `publico_select` para reemplazar el logo.
- El enlace mágico de la invitación nunca se muestra al Admin.

## Fase 2
- **A1:** el Contador puede usar `calcular_precio`.
- **B1:** `calcular_precio` rechaza opciones ajenas al modelo, inactivas o repetidas por grupo.
- **C1:** reordenar con @dnd-kit (mouse, dedo y teclado).
- El Contador **solo ve** el markup; solo el Admin lo edita.

## Fase 3
- **Opción A:** la base recalcula los precios no manuales, protege `vendido`, `pedido_id` y `opciones_texto`, y controla los estados (`parcial`/`aceptada` solo vía RPC). `v_cotizaciones` calcula "vencida".
- Se rechaza un renglón al que le falte la opción de un grupo obligatorio.
- Teléfonos normalizados a `52` + 10 dígitos para `wa.me`.
- Logo SVG/WEBP → se guarda también una copia PNG para el PDF.
- `precio_sugerido`: con precio manual se guarda el automático; Admin y Contador ven el descuento.

## Fase 4
- **Opción A:** solo → *entregado* (sin saldo) y → *cancelado* (solo Admin) son manuales; lo demás lo calcula la base. Pagos solo se anulan (con motivo), no se editan. Folio de recibo R-n. Fechas de cada estado.
- Pagos de Mercado Pago **no se rechazan** aunque superen el saldo → "saldo a favor". Un pago manual expira el link activo.
- Todas las fechas y el "hoy" en **America/Mexico_City**.
- Cancelar exige motivo; las órdenes pendientes se cancelan, las que están en proceso se quedan.

## Fase 5
- **A1 + excepción:** "Empecé" está bloqueado sin anticipo, salvo que el Admin autorice el inicio en ese pedido (queda quién y cuándo).
- **B1:** solo Producción y Admin regresan una orden; el pedido vuelve a *en producción*.
- Se permiten adelantos al destajista sin rebasar el costo acordado.
- Saldos del destajista separados en **Por pagar** (terminadas) y **Comprometido** (pendientes y en proceso).

## Fase 6 (2026-10-05)
- **1A:** la base **bloquea** la existencia negativa (salida o ajuste); el error dice "Registra primero la entrada o haz un ajuste".
- **2A:** el Destajista ve el material que le entregaron en "Mis órdenes" (nombre y cantidad, **sin costos**) vía `material_entregado`.
- **3A:** el material **no** entra al margen en V1. El indicador se llama **"Margen sobre destajos"** con la nota "No incluye material de insumos" (PRD §5.10, FASES Fase 10, comentario en `v_pedido_resumen`). Integrarlo es V2 → [[05 Pendientes y riesgos#V2]].
- Unidades: lista cerrada `pza, m, m2, dm2, pie_tabla, kg, l`. **dm² agregado a petición de Ricardo:** la piel se compra por decímetro cuadrado o por pieza; al elegir tipo Piel en un alta, la unidad se pone en dm². Nombre único por empresa sin distinguir mayúsculas, acentos ni espacios (`nombre_norm` con `_norm`).
- Toda entrada lleva costo, también la existencia inicial del alta (`crear_insumo`).
- Ajuste = **conteo físico** (`ajustar_existencia`): la persona escribe cuánto hay y la base calcula la diferencia; exige motivo.
- Costo promedio ponderado con **4 decimales**; salidas y ajustes guardan el promedio del momento (valor del material). Renglón bloqueado (`for update`) al calcular.
- La salida ligada a una orden guarda al destajista de ese momento (`movimientos_insumo.destajista_id`); no se entrega material a órdenes canceladas ni de otra empresa.
- Un insumo con movimientos no se borra (se desactiva); uno inactivo no registra movimientos; la unidad no cambia si ya hay movimientos.
- Alerta "bajo mínimo" = `mínimo > 0 y existencia < mínimo` (estrictamente menor).
- El valor del material entregado **no** se descuenta del pago al destajista.

## Herramientas (2026-10-05)
- ~~Skills de antislop v3.2.20 en `.claude/skills/`, aplicando salvo contradicción con CLAUDE.md.~~ Reemplazado el mismo día:
- **antislop se retiró del proyecto (las 6 skills).** Por qué:
  - El núcleo (`antislop`) choca con decisiones firmes de Veta: marca **lucide-react** (stack fijo) como patrón a evitar, trata el minimalismo estilo Apple como "Sterile Default", pide un `DESIGN.md`, auditorías en `anti-slop/` y un bloque al final de CLAUDE.md, y pregunta su modo en cada sesión.
  - Las dos skills útiles (`antislop-layoutmobile` y `antislop-human`) **dependen del núcleo**: piden cargarse con `antislop.md` (que ni siquiera existía), dejan el control final al "Delivery Gate" del núcleo y citan sus reglas numeradas (R-03, R-25, R-32…). Sin el núcleo quedaban referencias rotas.
- **Qué se integró:**
  - Las reglas útiles pasaron a la sección **Diseño** de CLAUDE.md como reglas propias: contraste AA verificado (4.5:1 normal, 3:1 para texto de 24 px o más), foco visible, errores en texto, estados vacíos con acción, nada de datos inventados, 44 px y `dvh` en móvil.
  - El verificador se copió a `scripts/contraste.py` (`npm run contraste -- "#texto" "#fondo"`). Usa la misma fórmula que el original, verificada con los mismos resultados; la tabla de referencia de la autoprueba va dentro del script; solo usa la biblioteca estándar, sin red.
- Así CLAUDE.md es la única fuente de reglas de diseño.
