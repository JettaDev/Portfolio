// ─────────────────────────────────────────────────────────────────────────────
//  ÚNICO ARCHIVO QUE SE EDITA PARA ADAPTAR LA PLANTILLA A UN CLIENTE.
//  Después: `npm run comprobar` (avisa de errores, contraste y restos de la demo).
// ─────────────────────────────────────────────────────────────────────────────
import type { ConfigPlantilla, ItemBase } from '../_comun/tipos.ts';

/** Campos propios de cada elemento del catálogo de esta plantilla (aquí ninguno). */
type Item = ItemBase;
/** Bloque `extra` de esta plantilla (aquí vacío). */
type Extra = Record<string, never>;

const config: ConfigPlantilla<Item, Extra> = {
  demo: true,

  meta: {
    url: 'https://ejemplo.es/',
    titulo: 'Negocio de ejemplo · Guadalajara',
    descripcion: 'Plantilla base de las webs para negocios locales de Guadalajara: horario, servicios, contacto por WhatsApp y cómo llegar.',
    idioma: 'es',
    imagenOg: '/og.png',
  },

  negocio: {
    nombre: 'Negocio de ejemplo',
    nombreCorto: 'Ejemplo',
    eslogan: 'Un negocio ficticio para probar la plantilla.',
    tipoSchema: 'LocalBusiness',
    rangoPrecios: '€€',
    logo: { texto: 'Ejemplo' },
  },

  contacto: {
    telefono: '+34949000100',
    telefonoVisible: '949 000 100',
    whatsapp: '34649000100',
    email: 'hola@ejemplo.es',
    direccion: { calle: 'Calle Mayor 1', codigoPostal: '19001', localidad: 'Guadalajara', provincia: 'Guadalajara', pais: 'ES' },
    geo: { lat: 40.6326, lng: -3.1665 },
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=40.6326%2C-3.1665',
    comoLlegar: 'En el centro, junto a la plaza Mayor.',
  },

  horario: {
    franjas: [
      { dias: ['lu', 'ma', 'mi', 'ju', 'vi'], abre: '09:30', cierra: '14:00' },
      { dias: ['lu', 'ma', 'mi', 'ju', 'vi'], abre: '17:00', cierra: '20:30' },
      { dias: ['sa'], abre: '10:00', cierra: '14:00' },
    ],
    cierres: [],
    nota: 'Agosto: solo mañanas.',
  },

  accionPrincipal: { tipo: 'whatsapp', texto: 'Escríbenos' },
  formulario: { canal: 'whatsapp', saludo: 'Hola, os escribo desde la web:' },

  redes: {},

  tema: {
    colores: {
      fondo: '#FAFAF7',
      superficie: '#FFFFFF',
      texto: '#1C1C1A',
      textoSuave: '#55554F',
      primario: '#1F4E79',
      textoSobrePrimario: '#FFFFFF',
      acento: '#C0392B',
      borde: '#DADAD2',
    },
  },

  textos: {
    titular: 'Lo que hacemos, explicado en una línea.',
    entradilla: 'Dos frases sobre el negocio: qué ofrece, a quién y por qué elegirlo.',
  },

  catalogo: {
    titulo: 'Servicios',
    categorias: [{ id: 'general', nombre: 'General' }],
    items: [
      { id: 'servicio-1', categoria: 'general', nombre: 'Servicio de ejemplo', descripcion: 'Descripción corta.', precio: 20 },
      { id: 'servicio-2', categoria: 'general', nombre: 'Otro servicio', precio: 35, desde: true },
    ],
  },

  equipo: [],
  faq: [{ pregunta: '¿Hay que pedir cita?', respuesta: 'Recomendable, pero también atendemos sin cita si hay hueco.' }],

  legal: {
    titular: 'Negocio de Ejemplo S.L. (ficticio)',
    nif: 'B00000000',
    domicilio: 'Calle Mayor 1, 19001 Guadalajara',
    email: 'hola@ejemplo.es',
  },

  extra: {},
};

export default config;
