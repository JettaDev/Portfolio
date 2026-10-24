// ─────────────────────────────────────────────────────────────────────────────
//  ÚNICO ARCHIVO QUE SE EDITA PARA ADAPTAR LA PLANTILLA A UN CLIENTE.
//  Después: `npm run comprobar` (avisa de errores, contraste y restos de la demo).
// ─────────────────────────────────────────────────────────────────────────────
import type { ConfigPlantilla, ItemBase } from '../_comun/tipos.ts';

/** Zonas del mapa del cuerpo. Si cambias los id, cámbialos también en `extra.zonas`. */
export type Zona = 'cuello' | 'hombro' | 'espalda-alta' | 'lumbar' | 'codo-muneca' | 'cadera' | 'rodilla' | 'tobillo-pie';

/** Una especialidad de la clínica. */
export interface Item extends ItemBase {
  /** Qué es, en una frase llana (sin tecnicismos). */
  queEs: string;
  /** Zonas del mapa del cuerpo en las que aparece. */
  zonas: Zona[];
  /** Duración de la sesión en minutos. */
  sesionMin: number;
}

export interface Extra {
  /** Zonas del mapa, en el orden en que se listan. La posición en la figura la pone el diseño. */
  zonas: { id: Zona; nombre: string }[];
  /** «Tu primera visita, paso a paso» (4 pasos). */
  primeraVisita: { titulo: string; texto: string }[];
  /** Aviso visible en el formulario de cita. */
  avisoSalud: string;
}

const config: ConfigPlantilla<Item, Extra> = {
  demo: true,

  meta: {
    url: 'https://ejemplo.es/',
    titulo: 'Clínica Eje · Fisioterapia en Guadalajara',
    descripcion: 'Fisioterapia en el centro de Guadalajara: espalda, deporte, suelo pélvico y neurológica. Dinos dónde te duele y pide cita por WhatsApp.',
    idioma: 'es',
    imagenOg: '/og.png',
  },

  negocio: {
    nombre: 'Clínica Eje',
    nombreCorto: 'Eje',
    eslogan: 'Fisioterapia sin prisas, en el centro de Guadalajara.',
    tipoSchema: 'Physiotherapy',
    rangoPrecios: '€€',
    logo: { texto: 'Clínica Eje' },
  },

  contacto: {
    telefono: '+34949000104',
    telefonoVisible: '949 000 104',
    whatsapp: '34649000104',
    email: 'citas@ejemplo.es',
    direccion: { calle: 'Paseo del Eje, 21', codigoPostal: '19004', localidad: 'Guadalajara', provincia: 'Guadalajara', pais: 'ES' },
    geo: { lat: 40.629, lng: -3.1615 },
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=40.6290%2C-3.1615',
    comoLlegar: 'Bajo con rampa y sin escalones. Aparcamiento público a 3 minutos andando.',
  },

  horario: {
    franjas: [
      { dias: ['lu', 'ma', 'mi', 'ju', 'vi'], abre: '09:00', cierra: '14:00' },
      { dias: ['lu', 'ma', 'mi', 'ju', 'vi'], abre: '16:00', cierra: '21:00' },
    ],
    cierres: [],
    nota: 'Atendemos solo con cita. Sábados, domingos y festivos, cerrado.',
  },

  accionPrincipal: { tipo: 'formulario', texto: 'Pedir cita' },
  formulario: { canal: 'whatsapp', saludo: 'Hola, quería pedir cita en Clínica Eje:' },

  redes: {},

  tema: {
    colores: {
      fondo: '#F6F7F4',
      superficie: '#FFFFFF',
      texto: '#1F3344',
      textoSuave: '#4C5D69',
      primario: '#2F5E4E',
      textoSobrePrimario: '#FFFFFF',
      // Coral: solo decoración y textos de 24 px o más.
      acento: '#C2553A',
      borde: '#DCE2DC',
      // Relleno suave de la zona elegida y de los elementos resaltados.
      primarioSuave: '#E3ECE7',
    },
  },

  textos: {
    antetitulo: 'Fisioterapia en Guadalajara',
    titular: 'Vuelve a moverte sin pensar en ello.',
    entradilla: 'Somos cuatro fisioterapeutas en el centro de Guadalajara. Cada sesión es individual, dura lo que tiene que durar y sales sabiendo qué hacer en casa.',
    mapaTitulo: '¿Dónde te duele?',
    mapaAyuda: 'Toca una zona del cuerpo y te enseñamos qué especialidades la tratan. Es solo para orientarte: no se guarda ni se envía.',
    mapaVacio: 'Elige una zona en la figura o en la lista.',
    especialidadesEntradilla: 'Sin tecnicismos: qué es cada cosa, para qué sirve, cuánto dura la sesión y lo que cuesta. Los precios son orientativos.',
    visitaTitulo: 'Tu primera visita, paso a paso',
    equipoTitulo: 'Quién te va a atender',
    faqTitulo: 'Preguntas frecuentes',
    reservaTitulo: 'Pedir cita',
    reservaEntradilla: 'Rellena cuatro datos y te preparamos el mensaje de WhatsApp. Te contestamos con día y hora en el mismo día laborable.',
    reservaBoton: 'Preparar mensaje de cita',
    especialidadNoSe: 'No lo sé, que me orientéis',
    ubicacionTitulo: 'Dónde estamos',
  },

  catalogo: {
    titulo: 'Especialidades',
    categorias: [
      { id: 'lesiones', nombre: 'Dolor y lesiones', descripcion: 'Lo más habitual: golpes, sobrecargas, operaciones y dolores que no se van.' },
      { id: 'especificas', nombre: 'Casos que piden especialista', descripcion: 'Etapas de la vida o problemas que necesitan una formación concreta.' },
      { id: 'complementos', nombre: 'Técnicas y ejercicio', descripcion: 'Se suman al tratamiento o sirven para mantenerte cuando ya estás bien.' },
    ],
    items: [
      {
        id: 'traumatologica',
        categoria: 'lesiones',
        nombre: 'Fisioterapia traumatológica',
        queEs: 'Tratamiento de huesos, músculos y articulaciones después de un golpe, una lesión o una operación.',
        descripcion: 'Esguinces, tendinitis, fracturas ya soldadas, prótesis o el hombro que no termina de subir.',
        zonas: ['cuello', 'hombro', 'codo-muneca', 'cadera', 'rodilla', 'tobillo-pie'],
        sesionMin: 50,
        precio: 40,
        destacado: true,
      },
      {
        id: 'espalda',
        categoria: 'lesiones',
        nombre: 'Terapia manual de espalda y cuello',
        queEs: 'Trabajo con las manos y ejercicios para el dolor de espalda o de cuello que vuelve una y otra vez.',
        descripcion: 'Lumbalgias, cervicales cargadas por el trabajo, rigidez al levantarte o dolor que baja hacia el brazo o la pierna.',
        zonas: ['cuello', 'espalda-alta', 'lumbar'],
        sesionMin: 50,
        precio: 40,
        destacado: true,
      },
      {
        id: 'deportiva',
        categoria: 'lesiones',
        nombre: 'Fisioterapia deportiva',
        queEs: 'Para volver a entrenar después de una lesión, o prevenirla si notas que algo no va bien.',
        descripcion: 'Roturas fibrilares, rodilla del corredor, tobillos que se tuercen, hombro de nadador o de pádel.',
        zonas: ['hombro', 'lumbar', 'cadera', 'rodilla', 'tobillo-pie'],
        sesionMin: 50,
        precio: 45,
      },
      {
        id: 'suelo-pelvico',
        categoria: 'especificas',
        nombre: 'Suelo pélvico',
        queEs: 'Valoración y ejercicios de los músculos que sostienen la vejiga y la parte baja del abdomen.',
        descripcion: 'Durante el embarazo, en el posparto, con escapes de orina o tras una operación de la zona. En consulta privada y sin prisas.',
        zonas: ['cadera', 'lumbar'],
        sesionMin: 50,
        precio: 50,
      },
      {
        id: 'neurologica',
        categoria: 'especificas',
        nombre: 'Fisioterapia neurológica',
        queEs: 'Para recuperar movimiento, fuerza y equilibrio cuando el problema viene del sistema nervioso.',
        descripcion: 'Después de un ictus, con párkinson, esclerosis múltiple o lesiones de nervios. Incluye pautas para la familia.',
        zonas: ['hombro', 'codo-muneca', 'cadera', 'rodilla', 'tobillo-pie'],
        sesionMin: 50,
        precio: 45,
      },
      {
        id: 'puncion-seca',
        categoria: 'complementos',
        nombre: 'Punción seca',
        queEs: 'Una aguja muy fina, sin medicamento, para soltar puntos del músculo que están contracturados.',
        descripcion: 'Se usa dentro de un tratamiento, después de valorarte, cuando hay contracturas que no ceden con las manos.',
        zonas: ['cuello', 'hombro', 'espalda-alta', 'lumbar', 'cadera'],
        sesionMin: 30,
        precio: 30,
      },
      {
        id: 'pilates',
        categoria: 'complementos',
        nombre: 'Pilates terapéutico',
        queEs: 'Ejercicio guiado por un fisioterapeuta, en grupos de cuatro personas como mucho.',
        descripcion: 'Para fortalecer la espalda y el centro del cuerpo, y no volver a la consulta por lo mismo.',
        zonas: ['cuello', 'espalda-alta', 'lumbar', 'cadera'],
        sesionMin: 55,
        precio: 18,
        desde: true,
      },
      {
        id: 'drenaje',
        categoria: 'complementos',
        nombre: 'Drenaje linfático manual',
        queEs: 'Un masaje lento y suave que ayuda a mover el líquido que se acumula y produce hinchazón.',
        descripcion: 'Piernas o brazos hinchados, después de una operación o por retención de líquidos.',
        zonas: ['codo-muneca', 'rodilla', 'tobillo-pie'],
        sesionMin: 45,
        precio: 40,
      },
    ],
  },

  equipo: [
    { nombre: 'Marta Llorente', rol: 'Traumatológica y deportiva', bio: 'Te explico el porqué de cada ejercicio, para que en casa sepas lo que haces.' },
    { nombre: 'Javier Ortega', rol: 'Terapia manual y punción seca', bio: 'Primero escucho y exploro; las manos vienen después.' },
    { nombre: 'Elena Batanero', rol: 'Suelo pélvico', bio: 'Hablamos de todo con naturalidad, a tu ritmo y en una sala cerrada.' },
    { nombre: 'Andrés Molina', rol: 'Neurológica y pilates terapéutico', bio: 'Pequeños avances cada semana, contados y apuntados.' },
  ],

  faq: [
    { pregunta: '¿Necesito volante del médico?', respuesta: 'No. Puedes venir directamente. Si tienes informes o pruebas (radiografías, resonancias), tráelos a la primera visita y los miramos juntos.' },
    { pregunta: '¿Trabajáis con aseguradoras?', respuesta: 'Atendemos de forma privada. Algunas aseguradoras devuelven parte del importe: te damos factura con todos los datos para que la presentes. Pregúntanos por la tuya al pedir cita.' },
    { pregunta: '¿Qué ropa traigo?', respuesta: 'Ropa cómoda con la que puedas moverte. Si te duele una pierna, mejor pantalón corto o fácil de remangar; si es el hombro o la espalda, una camiseta de tirantes.' },
    { pregunta: '¿Cuánto dura la primera visita?', respuesta: 'Alrededor de una hora: hablamos, te exploramos y ese mismo día empezamos el tratamiento. Llega cinco minutos antes.' },
    { pregunta: '¿Cuántas sesiones voy a necesitar?', respuesta: 'Depende de cada caso. Al terminar la primera visita te decimos una estimación y la revisamos según cómo respondas.' },
    { pregunta: '¿Puedo cambiar o anular la cita?', respuesta: 'Sí. Avísanos con 24 horas por WhatsApp o por teléfono y la movemos sin coste.' },
    { pregunta: '¿Cómo puedo pagar?', respuesta: 'Con tarjeta, en efectivo o con Bizum. Si vienes a varias sesiones, pregunta por los bonos.' },
  ],

  legal: {
    titular: 'Clínica Eje Fisioterapia S.L. (empresa ficticia)',
    nif: 'B00000000',
    domicilio: 'Paseo del Eje, 21, 19004 Guadalajara',
    email: 'citas@ejemplo.es',
    registro: 'Datos registrales ficticios, solo para la demostración',
  },

  extra: {
    zonas: [
      { id: 'cuello', nombre: 'Cuello' },
      { id: 'hombro', nombre: 'Hombro' },
      { id: 'espalda-alta', nombre: 'Espalda alta' },
      { id: 'lumbar', nombre: 'Lumbar' },
      { id: 'codo-muneca', nombre: 'Codo y muñeca' },
      { id: 'cadera', nombre: 'Cadera' },
      { id: 'rodilla', nombre: 'Rodilla' },
      { id: 'tobillo-pie', nombre: 'Tobillo y pie' },
    ],
    primeraVisita: [
      { titulo: 'Pides cita', texto: 'Por WhatsApp, por teléfono o con el formulario. Solo te pedimos nombre, teléfono y cuándo te viene bien.' },
      { titulo: 'Hablamos', texto: 'En consulta te preguntamos cómo empezó, qué te alivia y qué te lo empeora. Trae informes si los tienes.' },
      { titulo: 'Te exploramos', texto: 'Miramos cómo te mueves y buscamos el origen del dolor, que no siempre está donde duele.' },
      { titulo: 'Empezamos y te llevas un plan', texto: 'Ese mismo día hacemos la primera sesión y te vas con ejercicios sencillos y una idea clara de los siguientes pasos.' },
    ],
    avisoSalud: 'No incluyas información sobre tu salud; lo hablaremos en consulta.',
  },
};

export default config;
