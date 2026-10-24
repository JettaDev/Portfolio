// ─────────────────────────────────────────────────────────────────────────────
//  ÚNICO ARCHIVO QUE SE EDITA PARA ADAPTAR LA PLANTILLA A UN CLIENTE.
//  Después: `npm run comprobar` (avisa de errores, contraste y restos de la demo).
// ─────────────────────────────────────────────────────────────────────────────
import type { ConfigPlantilla, Franja, ItemBase } from '../_comun/tipos.ts';

/** Dibujo de cada permiso en su placa. */
export type Pictograma = 'coche' | 'moto' | 'ciclomotor' | 'camion';

/** Señal de cada paso de la carretera. */
export type SenalPaso = 'documento' | 'libro' | 'pregunta' | 'volante' | 'examen' | 'carnet';

/** Señal que ilustra cada pregunta del test. */
export type SenalTest = 'stop' | 'glorieta' | 'autovia' | 'ciclista';

/** Un permiso de conducir. Los precios van en euros, con IVA. */
interface Item extends ItemBase {
  /** Código del permiso tal como lo dice la DGT: 'AM', 'A2', 'A', 'B', 'C'… */
  codigo: string;
  /** Edad mínima para obtenerlo. */
  edadMinima: number;
  /** Condición extra para la edad o el acceso: «con 2 años de A2». */
  requisito?: string;
  /** Matrícula (alta, gestión del expediente y material). */
  matricula: number;
  /** Curso teórico. 0 = no hace falta (p. ej. el A si ya tienes el A2). */
  teorico: number;
  /** Precio de una clase práctica. */
  precioClase: number;
  /** Clases prácticas que se proponen por defecto en la calculadora. */
  clasesRecomendadas: number;
  pictograma: Pictograma;
  /** Tasa de la DGT de este permiso, si es distinta de `extra.tasaDGT`. */
  tasaDGT?: number;
}

interface Extra {
  /** Tasa de examen de la DGT (comprobar la vigente cada año en sede.dgt.gob.es). */
  tasaDGT: number;
  /** Duración de una clase práctica, en minutos. */
  minutosClase: number;
  /** Packs: matrícula + teórico + N clases a precio cerrado (sin la tasa). `permiso` es el `id` del permiso. */
  packs: { id: string; permiso: string; nombre: string; clases: number; precio: number; nota?: string }[];
  /** La carretera: de la matrícula al carnet. */
  pasos: { titulo: string; texto: string; senal: SenalPaso }[];
  /** Mini-test. `correcta` es el índice (desde 0) de la opción buena. */
  test: { pregunta: string; opciones: string[]; correcta: number; explicacion: string; pictograma: SenalTest }[];
  /** Horario de las clases prácticas (el de `horario` es el de la oficina). */
  horarioClases: Franja[];
  /** Turnos que se ofrecen en el formulario de matrícula. */
  turnos: string[];
}

const config: ConfigPlantilla<Item, Extra> = {
  demo: true,

  meta: {
    url: 'https://ejemplo.es/',
    titulo: 'Autoescuela Rotonda · Carnet de coche y moto en Guadalajara',
    descripcion: 'Autoescuela en Guadalajara: permisos AM, A2, A, B y C. Calcula el precio de tu carnet con la tasa DGT, haz un test y matricúlate por WhatsApp.',
    idioma: 'es',
    imagenOg: '/og.png',
  },

  negocio: {
    nombre: 'Autoescuela Rotonda',
    nombreCorto: 'Rotonda',
    eslogan: 'Tu carnet, sin rodeos.',
    tipoSchema: ['LocalBusiness', 'DrivingSchool'],
    rangoPrecios: '€€',
    logo: {
      texto: 'Rotonda',
      // Tres flechas en círculo, como la señal de glorieta (usa currentColor).
      svg: '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="4.5" d="M21.7 11.2A13 13 0 0 0 11.1 22.2M14 32.4A13 13 0 0 0 28.9 36.1M36.2 28.4A13 13 0 0 0 32 13.8"/><path fill="currentColor" d="M10.2 29.1L5.3 20.9L17.1 22.5zM35.4 33.4L30.7 41.8L26.2 30.7zM26.5 9.4L36.1 9.3L28.7 18.8z"/></svg>',
    },
  },

  contacto: {
    telefono: '+34949000103',
    telefonoVisible: '949 000 103',
    whatsapp: '34649000103',
    email: 'matricula@ejemplo.es',
    direccion: { calle: 'Calle de la Glorieta, 3', codigoPostal: '19005', localidad: 'Guadalajara', provincia: 'Guadalajara', pais: 'ES' },
    geo: { lat: 40.6355, lng: -3.1738 },
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=40.6355%2C-3.1738',
    comoLlegar: 'Bajo de la glorieta, con parada de autobús urbano en la puerta. Las prácticas salen desde aquí.',
  },

  // Horario de la OFICINA (el de las clases está en extra.horarioClases).
  horario: {
    franjas: [
      { dias: ['lu', 'ma', 'mi', 'ju', 'vi'], abre: '10:00', cierra: '13:30' },
      { dias: ['lu', 'ma', 'mi', 'ju', 'vi'], abre: '16:30', cierra: '20:30' },
    ],
    cierres: [],
    nota: 'En agosto, la oficina abre solo por las mañanas.',
  },

  accionPrincipal: { tipo: 'formulario', texto: 'Matricularme' },
  formulario: { canal: 'whatsapp', saludo: 'Hola, quiero matricularme en la autoescuela:' },

  redes: {},

  tema: {
    colores: {
      fondo: '#FFFFFF',
      superficie: '#F2F5F9',
      texto: '#111111',
      textoSuave: '#4A5260',
      primario: '#0B4F9C',
      textoSobrePrimario: '#FFFFFF',
      // Amarillo de obras: solo de fondo con texto oscuro encima, nunca como color de texto.
      acento: '#F5C400',
      borde: '#D5DCE6',
      // Solo para pictogramas (stop, peligro).
      rojo: '#C8102E',
      // La carretera.
      asfalto: '#2E333B',
    },
  },

  textos: {
    tipo: 'Autoescuela',
    antetitulo: 'Autoescuela en Guadalajara',
    titular: 'Tu carnet, sin rodeos.',
    entradilla: 'Teórico con profesor o desde el móvil, prácticas por las calles del examen y el precio entero antes de empezar.',
    panelPermisos: 'Elige tu carnet',
    panelPrecio: 'Calcula el precio',
    panelLlegar: 'Cómo llegar',

    permisosTitulo: '¿Qué carnet quieres?',
    permisosEntradilla: 'Toca uno y te preparamos el presupuesto con la tasa de la DGT incluida.',

    calculadoraTitulo: 'Calcula tu carnet',
    calculadoraEntradilla: 'Elige permiso y clases. El total es orientativo y ya lleva la tasa de examen.',
    notaPrecios: 'Precios orientativos con IVA. La tasa de examen la fija la DGT cada año: comprueba la vigente antes de pagar.',
    sueltas: 'Clases sueltas',
    matricularme: 'Matricularme',
    notaFormulario: 'Se abre WhatsApp con tu presupuesto. No guardamos nada hasta que lo envías.',

    rutaTitulo: 'De la matrícula al carnet',
    rutaEntradilla: 'Seis señales y has llegado. Te acompañamos en todas.',

    testTitulo: '¿Pasarías el teórico?',
    testEntradilla: 'Cuatro preguntas como las del examen de la DGT. Te corregimos al momento.',
    testResultado: 'Has acertado {aciertos} de {total}.',
    testBien: 'Vas bien encaminado: con el curso teórico lo dejas listo.',
    testMal: 'Nadie nace sabiendo: para eso está el curso teórico.',
    testExamen: 'En el examen real son 30 preguntas y puedes fallar 3 como mucho.',
    testRepetir: 'Repetir el test',

    horarioTitulo: 'Horario y dónde estamos',
    horarioOficina: 'Oficina',
    horarioClases: 'Clases prácticas',

    equipoTitulo: 'Quién va a tu lado',
    faqTitulo: 'Preguntas frecuentes',
  },

  catalogo: {
    titulo: 'Permisos',
    categorias: [
      { id: 'moto', nombre: 'Moto y ciclomotor' },
      { id: 'coche', nombre: 'Coche' },
      { id: 'profesional', nombre: 'Profesional' },
    ],
    items: [
      {
        id: 'b', categoria: 'coche', codigo: 'B', nombre: 'Coche',
        descripcion: 'Turismos de hasta 3.500 kg y 9 plazas contando la del conductor.',
        edadMinima: 18, matricula: 150, teorico: 100, precioClase: 40, clasesRecomendadas: 20,
        pictograma: 'coche', destacado: true,
      },
      {
        id: 'am', categoria: 'moto', codigo: 'AM', nombre: 'Ciclomotor',
        descripcion: 'Ciclomotores de hasta 45 km/h y cuatriciclos ligeros.',
        edadMinima: 15, matricula: 80, teorico: 60, precioClase: 30, clasesRecomendadas: 4,
        pictograma: 'ciclomotor', tasaDGT: 28.87,
      },
      {
        id: 'a2', categoria: 'moto', codigo: 'A2', nombre: 'Moto',
        descripcion: 'Motos de hasta 35 kW. La puerta de entrada a la moto grande.',
        edadMinima: 18, matricula: 150, teorico: 90, precioClase: 38, clasesRecomendadas: 10,
        pictograma: 'moto',
      },
      {
        id: 'a', categoria: 'moto', codigo: 'A', nombre: 'Moto sin límite',
        descripcion: 'Cualquier motocicleta. Solo hace falta el examen práctico.',
        edadMinima: 20, requisito: 'con 2 años de A2', matricula: 120, teorico: 0, precioClase: 40, clasesRecomendadas: 6,
        pictograma: 'moto',
      },
      {
        id: 'c', categoria: 'profesional', codigo: 'C', nombre: 'Camión',
        descripcion: 'Camiones de más de 3.500 kg. Necesitas tener el B.',
        edadMinima: 21, requisito: 'y el permiso B', matricula: 250, teorico: 150, precioClase: 65, clasesRecomendadas: 15,
        pictograma: 'camion',
      },
    ],
  },

  equipo: [
    { nombre: 'Marta Ruiz', rol: 'Profesora de coche', bio: 'Quince años quitando nervios antes del examen.' },
    { nombre: 'Javier Sanz', rol: 'Profesor de moto y camión', bio: 'Circuito cerrado los sábados por la mañana.' },
    { nombre: 'Nuria Gil', rol: 'Teórico y oficina', bio: 'Resuelve dudas del test por WhatsApp.' },
  ],

  faq: [
    { pregunta: '¿Puedo hacer el teórico desde casa?', respuesta: 'Sí. Tienes acceso a la plataforma de test desde el móvil y, si quieres, clases presenciales de dudas por las tardes.' },
    { pregunta: '¿Cuánto dura una clase práctica?', respuesta: '45 minutos de conducción efectiva. Empiezan y acaban en la autoescuela o en un punto acordado de Guadalajara.' },
    { pregunta: '¿Cuántas clases voy a necesitar?', respuesta: 'Depende de cada persona. Para el B, la mayoría necesita entre 20 y 25. Tras las primeras cinco te damos una estimación sincera.' },
    { pregunta: '¿Dónde son los exámenes?', respuesta: 'En Guadalajara, en las pruebas que convoca la Jefatura Provincial de Tráfico. Nosotros pedimos la fecha y te llevamos.' },
    { pregunta: '¿Qué pasa si suspendo?', respuesta: 'Repasamos los fallos y te volvemos a presentar en cuanto haya fecha. La tasa de la DGT cubre más de un intento; en la oficina te decimos cuántos te quedan.' },
    { pregunta: '¿Se puede pagar a plazos?', respuesta: 'Sí: los packs se pueden pagar en tres plazos sin intereses.' },
    { pregunta: 'Ya tengo el B. ¿Qué necesito para la moto?', respuesta: 'Para el A2 te basta un teórico específico de moto, más corto que el general, y el examen práctico en circuito y en circulación.' },
  ],

  legal: {
    titular: 'Autoescuela Rotonda S.L. (empresa ficticia)',
    nif: 'B00000000',
    domicilio: 'Calle de la Glorieta, 3, 19005 Guadalajara',
    email: 'matricula@ejemplo.es',
  },

  extra: {
    // Comprobar la tasa vigente cada año (tasa de examen para permisos de conducción de la DGT).
    tasaDGT: 94.05,
    minutosClase: 45,
    packs: [
      { id: 'b-20', permiso: 'b', nombre: 'Pack Glorieta', clases: 20, precio: 990, nota: 'Matrícula, teórico y 20 clases' },
      { id: 'b-30', permiso: 'b', nombre: 'Pack Autovía', clases: 30, precio: 1350, nota: 'Matrícula, teórico y 30 clases' },
      { id: 'a2-10', permiso: 'a2', nombre: 'Pack Curva', clases: 10, precio: 520, nota: 'Matrícula, teórico y 10 clases' },
    ],
    pasos: [
      { titulo: 'Matrícula', texto: 'Vienes con el DNI y una foto. Te damos de alta y acceso al teórico el mismo día.', senal: 'documento' },
      { titulo: 'Curso teórico', texto: 'Test en el móvil y clases de dudas. Te avisamos cuando tus resultados digan que estás listo.', senal: 'libro' },
      { titulo: 'Examen teórico', texto: '30 preguntas en la Jefatura de Tráfico. Pedimos la fecha por ti.', senal: 'pregunta' },
      { titulo: 'Clases prácticas', texto: 'Por las calles y glorietas donde se examina. A tu ritmo, de mañana o de tarde.', senal: 'volante' },
      { titulo: 'Examen práctico', texto: 'Vas con tu profesor y con el coche en el que has aprendido.', senal: 'examen' },
      { titulo: 'Carnet', texto: 'Sales con el permiso provisional el mismo día. Ya eres conductor.', senal: 'carnet' },
    ],
    test: [
      {
        pregunta: 'Llegas a una señal de STOP y no viene nadie. ¿Qué haces?',
        opciones: ['Reduzco y paso si veo que no viene nadie', 'Me detengo por completo y luego cedo el paso', 'Solo me detengo si hay otro vehículo'],
        correcta: 1,
        explicacion: 'El STOP obliga a detenerse siempre, venga o no alguien, y después ceder el paso.',
        pictograma: 'stop',
      },
      {
        pregunta: 'En una glorieta, ¿quién tiene preferencia?',
        opciones: ['El que entra en la glorieta', 'El que viene por la derecha', 'El que ya circula dentro de la glorieta'],
        correcta: 2,
        explicacion: 'Salvo señal que diga otra cosa, tienen preferencia los vehículos que ya circulan por la glorieta sobre los que quieren entrar.',
        pictograma: 'glorieta',
      },
      {
        pregunta: 'Sin otra señal, ¿a qué velocidad máxima puede ir un turismo por autovía?',
        opciones: ['100 km/h', '120 km/h', '130 km/h'],
        correcta: 1,
        explicacion: 'En autopistas y autovías el límite genérico para turismos y motos es de 120 km/h.',
        pictograma: 'autovia',
      },
      {
        pregunta: 'Al adelantar a un ciclista fuera de poblado, ¿qué separación lateral mínima debes dejar?',
        opciones: ['1 metro', '1,5 metros', 'La que permita el carril'],
        correcta: 1,
        explicacion: 'Hay que dejar al menos 1,5 metros de separación lateral, y si hace falta invadir el carril contrario, hacerlo con seguridad.',
        pictograma: 'ciclista',
      },
    ],
    horarioClases: [
      { dias: ['lu', 'ma', 'mi', 'ju', 'vi'], abre: '08:00', cierra: '21:00' },
      { dias: ['sa'], abre: '09:00', cierra: '14:00' },
    ],
    turnos: ['Mañanas', 'Tardes', 'Me da igual'],
  },
};

export default config;
