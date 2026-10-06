import { ArrowLeft, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { marca } from '@/config/marca'
import { planes } from '@/config/planes'

// BORRADORES para revisión de un abogado (LFPDPPP). No publicar como definitivos.

function Legal({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto grid max-w-[34rem] gap-6 px-4 py-10">
        <Link to="/" className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden /> {marca.nombre}
        </Link>
        <p role="note" className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          Borrador pendiente de revisión legal. No es la versión definitiva.
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{titulo}</h1>
        <div className="grid gap-5 text-[15px] leading-relaxed [&_h2]:mt-2 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ul]:grid [&_ul]:gap-1">{children}</div>
      </main>
    </div>
  )
}

export default function PaginaPrivacidad() {
  return (
    <Legal titulo="Aviso de privacidad">
      <p>
        Este aviso explica cómo {marca.nombre} trata los datos personales, conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y su
        Reglamento.
      </p>
      <h2>1. Quién es responsable</h2>
      <p>
        <strong>[Razón social y domicilio del titular de {marca.nombre} — por completar]</strong> es responsable de los datos de las personas que crean una cuenta (dueños y usuarios de
        las mueblerías). Respecto de los datos de los <strong>clientes finales</strong> y <strong>destajistas</strong> que cada mueblería captura, la mueblería es la responsable y{' '}
        {marca.nombre} actúa como <strong>encargado</strong>: los trata solo por cuenta y bajo instrucciones de la mueblería.
      </p>
      <h2>2. Qué datos tratamos</h2>
      <ul>
        <li>De usuarios: nombre, correo electrónico, rol y datos de la empresa (razón social, RFC, teléfono, domicilio, logo).</li>
        <li>De clientes finales (capturados por la mueblería): nombre, apellidos, teléfono, correo, domicilio de entrega, pedidos y pagos.</li>
        <li>De destajistas (capturados por la mueblería): nombre, teléfono, especialidad, órdenes y pagos.</li>
        <li>Datos técnicos: registros de uso y, en el portal público, un identificador cifrado (hash) de la dirección IP para evitar abusos.</li>
      </ul>
      <p>No tratamos datos personales sensibles. Los pagos con tarjeta los procesan Stripe y Mercado Pago; {marca.nombre} no recibe ni guarda números de tarjeta.</p>
      <h2>3. Para qué los usamos</h2>
      <ul>
        <li>Finalidades necesarias: prestar el servicio, administrar la cuenta y la suscripción, enviar avisos del sistema (invitaciones, cotizaciones, recibos, pedido listo) y dar soporte.</li>
        <li>Finalidades secundarias: [por definir, p. ej. encuestas de satisfacción]. Puedes negarte escribiendo a {marca.correoSoporte}.</li>
      </ul>
      <h2>4. Con quién los compartimos</h2>
      <p>
        Con proveedores que nos ayudan a operar como encargados: alojamiento y base de datos (Supabase), hospedaje web (Netlify), correo (Resend) y pagos (Stripe y Mercado Pago). No
        vendemos datos personales.
      </p>
      <h2>5. Derechos ARCO y revocación</h2>
      <p>
        Puedes acceder, rectificar, cancelar u oponerte al tratamiento de tus datos, o revocar tu consentimiento, escribiendo a <strong>{marca.correoSoporte}</strong> con tu nombre, el
        derecho que quieres ejercer y una identificación. Responderemos en los plazos que marca la ley. Si eres cliente de una mueblería, dirige tu solicitud a la mueblería; nosotros le
        ayudaremos a atenderla.
      </p>
      <h2>6. Cambios a este aviso</h2>
      <p>Publicaremos cualquier cambio en esta página. Última actualización: [fecha por definir].</p>
    </Legal>
  )
}

export function PaginaTerminos() {
  return (
    <Legal titulo="Términos y condiciones">
      <p>
        Estos términos regulan el uso de {marca.nombre}, un servicio en línea por suscripción para mueblerías y talleres. Al crear una cuenta aceptas estos términos y el aviso de
        privacidad.
      </p>
      <h2>1. El servicio</h2>
      <p>
        {marca.nombre} permite cotizar, registrar pedidos y pagos, organizar la producción con destajistas, llevar insumos y compartir el avance con clientes finales. Las
        funcionalidades pueden cambiar con el tiempo.
      </p>
      <h2>2. Prueba y suscripción</h2>
      <ul>
        <li>La prueba dura {planes.diasPrueba} días y no requiere tarjeta. Al terminar, la cuenta queda en solo lectura hasta contratar un plan.</li>
        <li>La suscripción se cobra por adelantado (mensual o anual) con Stripe y se renueva sola hasta que la canceles. Al cancelar conservas el acceso hasta el fin del periodo pagado.</li>
        <li>Precios: [por definir]. Los cambios de precio se avisarán con anticipación.</li>
        <li>Política de reembolsos: [por definir].</li>
      </ul>
      <h2>3. Tu cuenta y tus datos</h2>
      <ul>
        <li>Eres responsable de los usuarios que invitas y de la información que capturan, incluidos los datos de tus clientes y destajistas.</li>
        <li>Tus datos son tuyos. Si cancelas, puedes pedir una copia o su eliminación escribiendo a {marca.correoSoporte}. [Plazo de conservación por definir.]</li>
      </ul>
      <h2>4. Cobros a tus clientes</h2>
      <p>
        Los links de pago se generan con <strong>tu propia cuenta de Mercado Pago</strong>. El contrato de cobro es entre tú, tu cliente y Mercado Pago; {marca.nombre} solo registra
        el pago en el pedido.
      </p>
      <h2>5. Facturación (CFDI)</h2>
      <p>{marca.nombre} no emite comprobantes fiscales por tus ventas. La factura de la suscripción: [por definir].</p>
      <h2>6. Uso aceptable y disponibilidad</h2>
      <p>No uses el servicio para fines ilícitos ni intentes acceder a datos de otras empresas. Procuramos alta disponibilidad, pero puede haber interrupciones por mantenimiento o causas ajenas.</p>
      <h2>7. Responsabilidad</h2>
      <p>[Limitación de responsabilidad por definir con el abogado.]</p>
      <h2>8. Ley aplicable</h2>
      <p>Estos términos se rigen por las leyes de México. [Jurisdicción por definir.]</p>
      <p>Contacto: {marca.correoSoporte}. Última actualización: [fecha por definir].</p>
    </Legal>
  )
}
