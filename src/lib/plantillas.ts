// Las webs para negocios locales (plantillas/ en la raíz del repo): cada demo se compila aparte y se
// sirve en /plantillas/<slug>/ (npm run plantillas). Aquí solo está lo que enseña el portfolio.
// Las capturas salen de las demos compiladas: node plantillas/indice.mjs
import type { Lang } from '../i18n/ui';
import restaurante from '../assets/plantillas/restaurante.webp';
import peluqueria from '../assets/plantillas/peluqueria.webp';
import autoescuela from '../assets/plantillas/autoescuela.webp';
import fisioterapia from '../assets/plantillas/fisioterapia.webp';

type Texto = Record<Lang, string>;

export interface Plantilla {
  slug: string;
  /** Nombre del negocio ficticio (no se traduce). */
  nombre: string;
  /** Tono claro de su paleta: marco y punto de la ventana, subrayado al pasar. */
  hue: string;
  captura: ImageMetadata;
  tipo: Texto;
  frase: Texto;
  resumen: Texto;
  incluye: Record<Lang, string[]>;
}

const PLANTILLAS: Plantilla[] = [
  {
    slug: 'restaurante',
    nombre: 'Mesón La Trébede',
    hue: '#e0806f',
    captura: restaurante,
    tipo: { es: 'Restaurante o mesón', en: 'Restaurant' },
    frase: {
      es: 'La carta parece impresa y la reserva se rellena como una comanda.',
      en: 'The menu looks printed and booking a table fills in like a kitchen ticket.',
    },
    resumen: {
      es: 'Menú del día según el día de la semana, carta con filtros por categoría y alérgenos, y reservas con número de personas y opción para grupos. La comanda llega al restaurante por WhatsApp.',
      en: 'Today’s set menu by day of the week, a menu you can filter by course and allergen, and table bookings for any party size, groups included. The ticket reaches the restaurant on WhatsApp.',
    },
    incluye: {
      es: ['Carta con alérgenos', 'Menú del día', 'Reservas por WhatsApp', 'Grupos'],
      en: ['Allergen filter', 'Set menu of the day', 'WhatsApp bookings', 'Groups'],
    },
  },
  {
    slug: 'peluqueria',
    nombre: 'Atelier Malva',
    hue: '#d7aed0',
    captura: peluqueria,
    tipo: { es: 'Peluquería y estética', en: 'Hair and beauty salon' },
    frase: {
      es: 'Eliges servicios y un anillo te dice cuánto cuesta y cuánto tardas.',
      en: 'Pick your services and a ring tells you how much it costs and how long it takes.',
    },
    resumen: {
      es: 'Servicios con precio y duración, el equipo y una cita que se pide por día y franja. Sin agenda que mantener: la solicitud llega por WhatsApp con todo lo elegido.',
      en: 'Services with price and duration, the team, and an appointment requested by day and time slot. No booking system to maintain: the request arrives on WhatsApp with everything chosen.',
    },
    incluye: {
      es: ['Precio y duración', 'Cita por franjas', 'Equipo'],
      en: ['Price and duration', 'Time-slot requests', 'Team'],
    },
  },
  {
    slug: 'autoescuela',
    nombre: 'Autoescuela Rotonda',
    hue: '#f5c400',
    captura: autoescuela,
    tipo: { es: 'Autoescuela', en: 'Driving school' },
    frase: {
      es: 'Con el lenguaje de las señales: eliges carnet, calculas el precio y sigues la carretera hasta el examen.',
      en: 'In the language of road signs: pick a licence, work out the price and follow the road to the test.',
    },
    resumen: {
      es: 'Calculadora por permiso con la tasa de la DGT, los pasos de la matrícula al carnet, un mini-test y preguntas frecuentes. La matrícula se pide por WhatsApp con el presupuesto.',
      en: 'A price calculator per licence including the official fee, the steps from enrolment to licence, a mini theory test and FAQs. Enrolment is requested on WhatsApp with the quote.',
    },
    incluye: {
      es: ['Calculadora de precio', 'Mini-test', 'Matrícula por WhatsApp'],
      en: ['Price calculator', 'Mini test', 'WhatsApp enrolment'],
    },
  },
  {
    slug: 'fisioterapia',
    nombre: 'Clínica Eje',
    hue: '#8fc7ae',
    captura: fisioterapia,
    tipo: { es: 'Clínica de fisioterapia', en: 'Physiotherapy clinic' },
    frase: {
      es: 'Tocas dónde te duele y te enseña quién lo trata.',
      en: 'Tap where it hurts and it shows you who treats it.',
    },
    resumen: {
      es: 'Especialidades en lenguaje llano, el equipo, la primera visita paso a paso y una cita que no pide datos de salud: solo nombre, teléfono, especialidad y franja.',
      en: 'Specialities in plain words, the team, the first visit step by step, and an appointment request with no health data: just name, phone, speciality and time slot.',
    },
    incluye: {
      es: ['Mapa del cuerpo', 'Cita sin datos de salud', 'Equipo'],
      en: ['Body map', 'No health data', 'Team'],
    },
  },
];

export const getPlantillas = () => PLANTILLAS;

/** Ruta de la demo (las demos solo están en español). */
export const demoDe = (p: Plantilla) => `/plantillas/${p.slug}/`;
