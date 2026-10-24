// Enlaces de contacto y mensajes prellenados. Los formularios no envían nada a ningún servidor:
// construyen un texto y abren WhatsApp o el correo con él.

export const enlaceTelefono = (telefono: string) => `tel:${telefono.replace(/\s/g, '')}`;

export const enlaceWhatsApp = (numero: string, texto = '') =>
  `https://wa.me/${numero.replace(/\D/g, '')}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;

export const enlaceCorreo = (email: string, asunto = '', cuerpo = '') => {
  const q = new URLSearchParams();
  if (asunto) q.set('subject', asunto);
  if (cuerpo) q.set('body', cuerpo);
  // URLSearchParams codifica los espacios como «+», que algunos clientes de correo muestran tal cual.
  const qs = q.toString().replace(/\+/g, '%20');
  return `mailto:${email}${qs ? `?${qs}` : ''}`;
};

/** Mensaje legible: saludo, una línea por dato y despedida. Omite los datos vacíos. */
export function construirMensaje(saludo: string, datos: [etiqueta: string, valor: string | number | undefined | null][], despedida = 'Gracias.') {
  const lineas = datos
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
    .map(([e, v]) => `• ${e}: ${String(v).trim()}`);
  return [saludo, '', ...lineas, '', despedida].join('\n');
}

/** Enlace final según el canal del config. */
export function enlaceFormulario(
  canal: 'whatsapp' | 'email',
  contacto: { whatsapp: string; email: string },
  asunto: string,
  texto: string,
) {
  return canal === 'whatsapp' && contacto.whatsapp
    ? enlaceWhatsApp(contacto.whatsapp, texto)
    : enlaceCorreo(contacto.email, asunto, texto);
}

/** «12 €», «12,50 €», «desde 30 €». */
export function formatearPrecio(precio: number | undefined, desde = false) {
  if (precio === undefined) return 'Consultar';
  const n = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: Number.isInteger(precio) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(precio);
  return `${desde ? 'desde ' : ''}${n} €`;
}

/** «45 min», «1 h», «1 h 30 min». */
export function formatearDuracion(minutos: number) {
  const h = Math.floor(minutos / 60), m = minutos % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}
