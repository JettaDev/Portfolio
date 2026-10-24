// ─────────────────────────────────────────────────────────────────────────────
//  ÚNICO ARCHIVO QUE SE EDITA PARA ADAPTAR LA PLANTILLA A UN CLIENTE.
//  Después: `npm run comprobar` (avisa de errores, contraste y restos de la demo).
// ─────────────────────────────────────────────────────────────────────────────
import type { ConfigPlantilla, ItemBase } from '../_comun/tipos.ts';

/** Un servicio de la carta: lo común más su duración, que es la que llena el anillo de tiempo. */
export interface Servicio extends ItemBase {
  /** Duración aproximada en minutos (la suma se muestra como «1 h 45 min»). */
  duracionMin: number;
}

/** Lo propio de la peluquería. */
export interface ExtraPeluqueria {
  /** Cuántos días abiertos se ofrecen para pedir cita, contando desde hoy. */
  diasAntelacion: number;
  /** Texto del centro del anillo cuando aún no hay nada elegido. */
  textoAnillo: string;
  /** Minutos que llenan el anillo entero (con más, se queda lleno). */
  anilloMaxMin: number;
  /** Hora que separa la franja de mañana de la de tarde ("HH:MM"). */
  corteMananaTarde: string;
}

const config: ConfigPlantilla<Servicio, ExtraPeluqueria> = {
  demo: true,

  meta: {
    url: 'https://ejemplo.es/',
    titulo: 'Atelier Malva · Peluquería y estética en Guadalajara',
    descripcion:
      'Peluquería y centro de estética en Guadalajara: corte, color, uñas y cejas. Consulta precios y duración, y pide cita por WhatsApp en un minuto.',
    idioma: 'es',
    imagenOg: '/og.png',
  },

  negocio: {
    nombre: 'Atelier Malva',
    nombreCorto: 'Malva',
    eslogan: 'Peluquería y estética en Guadalajara',
    tipoSchema: ['HairSalon', 'BeautySalon'],
    rangoPrecios: '€€',
    logo: { texto: 'Atelier Malva' },
  },

  contacto: {
    telefono: '+34949000102',
    telefonoVisible: '949 000 102',
    whatsapp: '34649000102',
    email: 'cita@ejemplo.es',
    direccion: {
      calle: 'Avenida de las Malvas, 14',
      codigoPostal: '19003',
      localidad: 'Guadalajara',
      provincia: 'Guadalajara',
      pais: 'ES',
    },
    geo: { lat: 40.6301, lng: -3.1702 },
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=40.6301%2C-3.1702',
    comoLlegar: 'Bajos de la avenida, junto a la parada del autobús urbano. Zona azul en la misma calle.',
  },

  horario: {
    franjas: [
      { dias: ['ma', 'mi', 'ju', 'vi'], abre: '09:30', cierra: '19:30' },
      { dias: ['sa'], abre: '09:00', cierra: '14:00' },
    ],
    cierres: [],
    nota: 'De martes a viernes, de corrido. Si hay hueco, también te atendemos sin cita.',
  },

  accionPrincipal: { tipo: 'formulario', texto: 'Pedir cita' },
  formulario: { canal: 'whatsapp', saludo: 'Hola, quería pedir cita en Atelier Malva:' },

  redes: {},

  tema: {
    colores: {
      fondo: '#F7F1EB',
      superficie: '#FFFBF7',
      texto: '#2B2128',
      textoSuave: '#625560',
      primario: '#6B4466',
      textoSobrePrimario: '#FFFBF7',
      acento: '#E9CBC4',
      borde: '#E2D3CB',
    },
  },

  textos: {
    // Navegación y pie
    navPrecios: 'Precios',
    navEquipo: 'Equipo',
    navHorario: 'Horario',
    navDudas: 'Dudas',
    pieNota: 'Sin cookies ni analíticas.',
    // Apertura
    antetitulo: 'Peluquería y estética · Guadalajara',
    titular: 'Color con criterio, cortes con calma.',
    entradilla:
      'Pelo, color, uñas y estética en un estudio pequeño de la Avenida de las Malvas. Eliges tus servicios, ves cuánto duran y cuánto cuestan, y pides cita en un minuto.',
    ctaCita: 'Pedir cita',
    ctaPrecios: 'Ver precios',
    // Servicios
    serviciosEntradilla:
      'Precios con IVA incluido. Los marcados con «desde» dependen del largo y la cantidad de pelo: te lo confirmamos antes de empezar.',
    destacado: 'Favorito de la casa',
    gratis: 'Gratis',
    serviciosLlamada: '¿Ya sabes lo que quieres? Súmalo en el anillo y pide cita.',
    indiceFamilias: 'Familias de servicios',
    // Cita
    citaTitulo: 'Pide tu cita',
    citaEntradilla:
      'Marca los servicios y el anillo calcula el tiempo y el precio. Luego elige día y franja: te contestamos por WhatsApp con la hora exacta.',
    paso1: 'Qué te hacemos',
    paso2: 'Qué día te viene bien',
    paso3: 'Con quién y a nombre de quién',
    familiaEtiqueta: 'Familia de servicios',
    servicioSingular: 'servicio',
    servicioPlural: 'servicios',
    diaTitulo: 'Día',
    hoy: 'Hoy',
    manana: 'Mañana',
    sinScript: 'Para elegir día hace falta JavaScript. También puedes llamarnos.',
    franjaManana: 'Mañana',
    franjaTarde: 'Tarde',
    franjaTitulo: 'Franja',
    profesionalTitulo: 'Profesional',
    profesionalIndiferente: 'Me da igual',
    profesionalIndiferenteDetalle: 'Quien tenga antes el hueco',
    nombreEtiqueta: 'Tu nombre',
    resumenVacio: 'Aún no has elegido nada.',
    enviar: 'Pedir cita por WhatsApp',
    enviarCorreo: 'Pedir cita por correo',
    notaEnvio: 'No se guarda nada en esta web: se abre WhatsApp con el mensaje y tú decides si lo envías.',
    asuntoCorreo: 'Cita en Atelier Malva',
    sinDias: 'Ahora mismo no hay días disponibles. Llámanos y lo vemos.',
    eligeDia: 'Elige primero un día.',
    errorServicios: 'Marca al menos un servicio.',
    errorDia: 'Elige un día.',
    errorFranja: 'Elige mañana o tarde.',
    errorNombre: 'Escribe tu nombre para saber a quién apuntar.',
    // Etiquetas del mensaje que llega al negocio
    msgServicios: 'Servicios',
    msgDuracion: 'Duración aproximada',
    msgPrecio: 'Precio orientativo',
    msgDia: 'Día',
    msgFranja: 'Franja',
    msgProfesional: 'Profesional',
    msgNombre: 'Nombre',
    // Equipo
    equipoTitulo: 'Quién te atiende',
    equipoEntradilla: 'Cuatro personas, cuatro sillones y ninguna prisa.',
    // Horario y ubicación
    horarioTitulo: 'Horario y cómo llegar',
    horarioCaption: 'Horario de apertura',
    cerrado: 'Cerrado',
    comoLlegarBoton: 'Cómo llegar',
    llamar: 'Llamar al',
    contactosGuardar: 'Añadir a contactos',
    // FAQ
    faqTitulo: 'Preguntas que nos hacéis',
    // Página no encontrada
    titulo404: 'Este espejo no refleja nada',
    texto404: 'La página que buscas no existe o ha cambiado de sitio.',
    volver404: 'Volver al inicio',
  },

  catalogo: {
    titulo: 'Servicios y precios',
    categorias: [
      { id: 'pelo', nombre: 'Pelo', descripcion: 'Cortes, peinados y tratamientos.' },
      { id: 'color', nombre: 'Color', descripcion: 'Tintes, mechas y matices.' },
      { id: 'unas', nombre: 'Uñas', descripcion: 'Manos y pies, clásico o semipermanente.' },
      { id: 'estetica', nombre: 'Estética', descripcion: 'Cejas, pestañas, depilación y facial.' },
    ],
    items: [
      // Pelo
      { id: 'corte-mujer', categoria: 'pelo', nombre: 'Lavado, corte y peinado', descripcion: 'Con diagnóstico previo del pelo.', precio: 28, duracionMin: 45, destacado: true },
      { id: 'corte-hombre', categoria: 'pelo', nombre: 'Corte de caballero', descripcion: 'Tijera o máquina, con lavado.', precio: 15, duracionMin: 30 },
      { id: 'corte-infantil', categoria: 'pelo', nombre: 'Corte infantil', descripcion: 'Hasta 10 años.', precio: 11, duracionMin: 20 },
      { id: 'lavado-peinado', categoria: 'pelo', nombre: 'Lavado y peinado', precio: 16, desde: true, duracionMin: 30 },
      { id: 'ondas', categoria: 'pelo', nombre: 'Peinado con ondas', precio: 22, duracionMin: 45 },
      { id: 'recogido', categoria: 'pelo', nombre: 'Recogido de evento', descripcion: 'Bodas, comuniones y graduaciones.', precio: 40, desde: true, duracionMin: 60 },
      { id: 'hidratacion', categoria: 'pelo', nombre: 'Ritual de hidratación', descripcion: 'Mascarilla y masaje craneal.', precio: 18, duracionMin: 30 },
      { id: 'keratina', categoria: 'pelo', nombre: 'Alisado de keratina', precio: 110, desde: true, duracionMin: 150 },
      // Color
      { id: 'tinte-raiz', categoria: 'color', nombre: 'Tinte de raíz', descripcion: 'Hasta 3 cm de crecimiento.', precio: 32, duracionMin: 60 },
      { id: 'tinte-completo', categoria: 'color', nombre: 'Tinte completo', precio: 42, desde: true, duracionMin: 90 },
      { id: 'mechas', categoria: 'color', nombre: 'Mechas con papel', precio: 58, desde: true, duracionMin: 120 },
      { id: 'balayage', categoria: 'color', nombre: 'Balayage a mano alzada', descripcion: 'Degradado natural, sin línea de crecimiento.', precio: 85, desde: true, duracionMin: 150, destacado: true },
      { id: 'matiz', categoria: 'color', nombre: 'Matiz o baño de color', precio: 18, duracionMin: 30 },
      { id: 'prueba-color', categoria: 'color', nombre: 'Prueba de sensibilidad', descripcion: 'Obligatoria si es tu primer tinte con nosotros.', precio: 0, duracionMin: 10 },
      // Uñas
      { id: 'manicura', categoria: 'unas', nombre: 'Manicura clásica', precio: 14, duracionMin: 30 },
      { id: 'manicura-semi', categoria: 'unas', nombre: 'Manicura semipermanente', descripcion: 'Dura de dos a tres semanas.', precio: 22, duracionMin: 45, destacado: true },
      { id: 'retirada-semi', categoria: 'unas', nombre: 'Retirada de semipermanente', precio: 6, duracionMin: 15 },
      { id: 'unas-gel', categoria: 'unas', nombre: 'Uñas de gel, primera puesta', precio: 40, duracionMin: 90 },
      { id: 'pedicura', categoria: 'unas', nombre: 'Pedicura completa', precio: 26, duracionMin: 50 },
      { id: 'pedicura-semi', categoria: 'unas', nombre: 'Pedicura con semipermanente', precio: 32, duracionMin: 60 },
      // Estética
      { id: 'cejas', categoria: 'estetica', nombre: 'Diseño de cejas', descripcion: 'Con pinza e hilo.', precio: 9, duracionMin: 15 },
      { id: 'laminado-cejas', categoria: 'estetica', nombre: 'Laminado de cejas', precio: 32, duracionMin: 45 },
      { id: 'lifting-pestanas', categoria: 'estetica', nombre: 'Lifting de pestañas con tinte', precio: 42, duracionMin: 60 },
      { id: 'labio', categoria: 'estetica', nombre: 'Depilación de labio', precio: 6, duracionMin: 10 },
      { id: 'piernas', categoria: 'estetica', nombre: 'Depilación de piernas completas', precio: 24, duracionMin: 40 },
      { id: 'limpieza-facial', categoria: 'estetica', nombre: 'Limpieza facial profunda', descripcion: 'Con extracción e hidratación final.', precio: 45, duracionMin: 60 },
      { id: 'maquillaje', categoria: 'estetica', nombre: 'Maquillaje de evento', precio: 38, desde: true, duracionMin: 50 },
    ],
  },

  equipo: [
    { nombre: 'Marta Ruiz', rol: 'Corte y peinado', bio: 'Abrió el estudio. Cortes que crecen bien.' },
    { nombre: 'Lucía Sanz', rol: 'Colorista', bio: 'Balayage, rubios y canas sin sustos.' },
    { nombre: 'Javier Ortega', rol: 'Corte de caballero', bio: 'Degradados limpios y conversación justa.' },
    { nombre: 'Irene Gil', rol: 'Uñas y estética', bio: 'Semipermanente, cejas y pestañas.' },
  ],

  faq: [
    {
      pregunta: '¿Puedo ir sin cita?',
      respuesta: 'Sí, si hay un sillón libre te atendemos. Con cita te aseguras la hora, sobre todo los viernes y sábados.',
    },
    {
      pregunta: '¿Los precios son cerrados?',
      respuesta: 'Sí, salvo los marcados con «desde», que dependen del largo y la cantidad de pelo. Te damos el precio final antes de empezar.',
    },
    {
      pregunta: 'Es mi primer tinte aquí, ¿necesito algo?',
      respuesta: 'Una prueba de sensibilidad de diez minutos, al menos 48 horas antes. Es gratuita y puedes pedirla junto con la cita.',
    },
    {
      pregunta: '¿Y si no puedo ir?',
      respuesta: 'Avísanos con 24 horas por WhatsApp o por teléfono y le damos tu hueco a otra persona.',
    },
    {
      pregunta: '¿Cómo puedo pagar?',
      respuesta: 'En efectivo o con tarjeta. También tenemos tarjetas regalo para cualquier servicio.',
    },
  ],

  legal: {
    titular: 'Atelier Malva Estudio S.L. (ficticio)',
    nif: 'B00000000',
    domicilio: 'Avenida de las Malvas, 14, 19003 Guadalajara',
    email: 'cita@ejemplo.es',
  },

  extra: {
    diasAntelacion: 14,
    textoAnillo: 'Marca servicios',
    anilloMaxMin: 240,
    corteMananaTarde: '14:00',
  },
};

export default config;
