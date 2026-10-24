// ─────────────────────────────────────────────────────────────────────────────
//  ÚNICO ARCHIVO QUE SE EDITA PARA ADAPTAR LA PLANTILLA A UN CLIENTE.
//  Después: `npm run comprobar` (avisa de errores, contraste y restos de la demo).
// ─────────────────────────────────────────────────────────────────────────────
import type { ConfigPlantilla, Dia, ItemBase } from '../_comun/tipos.ts';
import type { Alergeno } from './src/datos/alergenos.ts';

/** Un plato o una bebida de la carta. */
interface Plato extends ItemBase {
  /** Alérgenos que contiene, de la lista cerrada de los 14 de la UE (ver src/datos/alergenos.ts). Vacío = ninguno. */
  alergenos: Alergeno[];
  /** Tamaño de la ración, si la carta lo distingue. */
  racion?: 'tapa' | 'media' | 'entera';
}

interface PlatosDia {
  primeros?: string[];
  segundos?: string[];
  postres?: string[];
}

interface MenuGrupo {
  nombre: string;
  /** Precio por persona, en euros. */
  precio: number;
  descripcion: string;
  /** Lo que lleva, en el orden en que se sirve. */
  platos?: string[];
}

interface Extra {
  menuDelDia: {
    /** Días en que se sirve. */
    dias: Dia[];
    precio: number;
    /** «Pan, bebida y postre o café». */
    incluye: string;
    /** Platos de diario. Si un día cambia, se pone en `porDia` y sustituye a estos. */
    primeros: string[];
    segundos: string[];
    postres: string[];
    porDia?: Partial<Record<Dia, PlatosDia>>;
  };
  /** A partir de cuántas personas la reserva pasa a «comanda de grupo». */
  umbralGrupo: number;
  /** Máximo de personas que se pueden reservar desde la web (más = llamar). */
  maxPersonas: number;
  /** Minutos antes del cierre de cada franja en que se sienta la última mesa. */
  ultimaMesaMin: number;
  /** Tipos de celebración que se ofrecen en la comanda de grupo. */
  celebraciones: string[];
  menusGrupo: MenuGrupo[];
  /** PDF con los menús de grupo dentro de `public/` (opcional). */
  pdfGrupos?: string;
  /** Foto propia que sustituye a la ilustración de la presentación (dentro de `public/`). */
  fotoPresentacion?: { src: string; alt: string };
  /** Para el JSON-LD: tipo de cocina. */
  servesCuisine?: string[];
}

const config: ConfigPlantilla<Plato, Extra> = {
  demo: true,

  meta: {
    url: 'https://ejemplo.es/',
    titulo: 'Mesón La Trébede · Asados y cocina alcarreña en Guadalajara',
    descripcion: 'Asados de horno de leña, cuchara y postres de la Alcarria en el casco antiguo de Guadalajara. Menú del día de martes a viernes y reservas por WhatsApp.',
    idioma: 'es',
    imagenOg: '/og.png',
  },

  negocio: {
    nombre: 'Mesón La Trébede',
    nombreCorto: 'La Trébede',
    eslogan: 'Horno de leña y cocina de la Alcarria',
    tipoSchema: 'Restaurant',
    rangoPrecios: '€€',
    logo: { texto: 'La Trébede' },
  },

  contacto: {
    telefono: '+34949000101',
    telefonoVisible: '949 000 101',
    whatsapp: '34649000101',
    email: 'reservas@ejemplo.es',
    direccion: { calle: 'Calle del Horno Viejo, 7', codigoPostal: '19001', localidad: 'Guadalajara', provincia: 'Guadalajara', pais: 'ES' },
    geo: { lat: 40.6337, lng: -3.1652 },
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=40.6337%2C-3.1652',
    comoLlegar: 'En el casco antiguo, a cinco minutos a pie de la plaza Mayor. Aparcamiento público a 300 m.',
  },

  horario: {
    franjas: [
      { dias: ['ma', 'mi', 'ju', 'vi', 'sa', 'do'], abre: '13:00', cierra: '16:30' },
      { dias: ['vi', 'sa'], abre: '20:30', cierra: '00:00' },
    ],
    cierres: [{ desde: '2027-01-11', hasta: '2027-01-24', motivo: 'descanso de invierno' }],
    nota: 'La última mesa se sienta una hora antes del cierre. Lunes, cerrado por descanso.',
  },

  accionPrincipal: { tipo: 'formulario', texto: 'Reservar mesa' },
  formulario: { canal: 'whatsapp', saludo: 'Hola, quería reservar mesa en el Mesón La Trébede:' },

  redes: {},

  tema: {
    colores: {
      fondo: '#FBF6EC',
      superficie: '#FFFDF8',
      texto: '#231F1A',
      textoSuave: '#5E554B',
      primario: '#7A1F2B',
      textoSobrePrimario: '#FBF6EC',
      acento: '#55652A',
      borde: '#DCCFB8',
      /** Perforados del ticket y fondos de apoyo. */
      papelOscuro: '#EFE5D2',
    },
  },

  textos: {
    casaAntetitulo: 'La casa',
    cartaAntetitulo: 'Para comer y beber',
    reservaAntetitulo: 'La comanda',
    gruposAntetitulo: 'Menús cerrados',
    faqAntetitulo: 'Preguntas',
    horarioAntetitulo: 'Visítanos',
    antetitulo: 'Mesón en el casco antiguo de Guadalajara',
    titular: 'Asados de horno de leña y cocina de la Alcarria.',
    entradilla: 'Cabrito y cordero al horno, platos de cuchara y los postres de siempre. De martes a domingo a mediodía, y viernes y sábado también por la noche.',
    menuDelDiaTitulo: 'Menú del día',
    menuDelDiaSinHoy: 'Hoy no hay menú del día',
    presentacionTitulo: 'Una trébede, brasas y paciencia',
    presentacion: 'La trébede es el aro de hierro que sostiene la cazuela sobre las brasas, y así seguimos cocinando: sin prisa y con leña de encina. Carne de ganaderos de la provincia, miel de la Alcarria y una carta corta que cambia con la temporada.',
    cartaEntradilla: 'Precios con IVA. Pregunta por los platos fuera de carta y por las raciones para compartir.',
    alergenosAviso: 'Si tienes una alergia o intolerancia, avísanos al reservar: en cocina se manipulan los 14 alérgenos y no podemos descartar trazas.',
    reservaTitulo: 'Pide tu mesa',
    reservaEntradilla: 'Rellena la comanda y te la mandamos por WhatsApp. Te confirmamos la mesa en el día.',
    reservaNota: 'No se guarda nada en esta web: el mensaje sale de tu móvil.',
    reservaMasPersonas: '¿Sois más de {max}? Llámanos y lo organizamos:',
    gruposTitulo: 'Grupos y celebraciones',
    gruposEntradilla: 'Comuniones, cumpleaños y comidas de empresa en el salón del fondo, hasta 40 personas. Menús cerrados con bebida incluida.',
    faqTitulo: 'Antes de venir',
    horarioTitulo: 'Horario',
    llegarTitulo: 'Cómo llegar',
  },

  catalogo: {
    titulo: 'La carta',
    categorias: [
      { id: 'entrantes', nombre: 'Entrantes', descripcion: 'Para abrir boca y compartir al centro.' },
      { id: 'huerta', nombre: 'De la huerta', descripcion: 'Ensaladas y verduras de temporada.' },
      { id: 'cuchara', nombre: 'Cuchara', descripcion: 'Guisos de puchero, como en casa.' },
      { id: 'asados', nombre: 'Asados', descripcion: 'Del horno de leña y la brasa. Los asados, mejor por encargo.' },
      { id: 'postres', nombre: 'Postres', descripcion: 'Caseros, hechos cada mañana.' },
      { id: 'bebidas', nombre: 'Bebidas', descripcion: 'Vinos de la tierra y algo para la sobremesa.' },
    ],
    items: [
      // Entrantes
      { id: 'torreznos', categoria: 'entrantes', nombre: 'Torreznos crujientes', descripcion: 'De panceta adobada, fritos al momento.', precio: 7.5, racion: 'media', alergenos: [] },
      { id: 'croquetas', categoria: 'entrantes', nombre: 'Croquetas caseras de jamón', descripcion: 'Ocho piezas, bechamel de leche fresca.', precio: 10, racion: 'entera', alergenos: ['gluten', 'lacteos', 'huevos'], destacado: true },
      { id: 'queso', categoria: 'entrantes', nombre: 'Queso de oveja curado con miel', descripcion: 'Queso de la sierra y miel de la Alcarria.', precio: 12, racion: 'entera', alergenos: ['lacteos'] },
      { id: 'morcilla', categoria: 'entrantes', nombre: 'Morcilla de la tierra', descripcion: 'A la plancha, con pimientos asados.', precio: 8.5, racion: 'media', alergenos: [] },
      { id: 'mollejas', categoria: 'entrantes', nombre: 'Mollejas de cordero al ajillo', descripcion: 'Con un golpe de vino blanco y guindilla.', precio: 13.5, racion: 'entera', alergenos: ['sulfitos'] },
      { id: 'jamon', categoria: 'entrantes', nombre: 'Jamón ibérico de bellota', descripcion: 'Cortado a cuchillo, con pan con tomate.', precio: 22, racion: 'entera', alergenos: ['gluten'] },

      // De la huerta
      { id: 'ensalada-huerta', categoria: 'huerta', nombre: 'Ensalada de la huerta con ventresca', descripcion: 'Tomate, cebolleta, olivas y ventresca de bonito.', precio: 12.5, alergenos: ['pescado'] },
      { id: 'perdiz', categoria: 'huerta', nombre: 'Ensalada de perdiz escabechada', descripcion: 'Escabeche de la casa, brotes y vinagreta de mostaza.', precio: 14, alergenos: ['sulfitos', 'mostaza'], destacado: true },
      { id: 'esparragos', categoria: 'huerta', nombre: 'Espárragos trigueros a la brasa', descripcion: 'Con salsa romesco de almendra y avellana.', precio: 11, alergenos: ['frutosCascara', 'gluten', 'sulfitos'] },
      { id: 'pisto', categoria: 'huerta', nombre: 'Pisto con huevo de corral', descripcion: 'Pimiento, calabacín y tomate a fuego lento.', precio: 10.5, alergenos: ['huevos'] },
      { id: 'setas', categoria: 'huerta', nombre: 'Setas de temporada', descripcion: 'Salteadas con ajo y perejil. Según mercado.', precio: 13, alergenos: [] },

      // Cuchara
      { id: 'sopa-castellana', categoria: 'cuchara', nombre: 'Sopa castellana', descripcion: 'Pan asentado, ajo, pimentón y huevo escalfado.', precio: 8, alergenos: ['gluten', 'huevos'] },
      { id: 'gachas', categoria: 'cuchara', nombre: 'Gachas de almorta', descripcion: 'Con torreznos y un punto de comino. Solo en invierno.', precio: 9, alergenos: [] },
      { id: 'migas', categoria: 'cuchara', nombre: 'Migas del pastor', descripcion: 'Con chorizo, panceta y uvas.', precio: 10, alergenos: ['gluten'], destacado: true },
      { id: 'judias', categoria: 'cuchara', nombre: 'Judías blancas con perdiz', descripcion: 'Guisadas con verduras del sofrito.', precio: 13, alergenos: ['apio', 'sulfitos'] },
      { id: 'caldereta', categoria: 'cuchara', nombre: 'Caldereta de cordero', descripcion: 'Cordero de la provincia, patata y vino tinto.', precio: 16, alergenos: ['sulfitos', 'apio'] },

      // Asados
      { id: 'cabrito', categoria: 'asados', nombre: 'Cabrito asado al horno de leña', descripcion: 'Cuarto trasero, con patatas panaderas. Mejor por encargo.', precio: 26.5, racion: 'entera', alergenos: [], destacado: true },
      { id: 'cordero', categoria: 'asados', nombre: 'Cordero lechal asado', descripcion: 'Cuarto delantero, solo agua, sal y leña.', precio: 24, racion: 'entera', alergenos: [] },
      { id: 'chuletillas', categoria: 'asados', nombre: 'Chuletillas de cordero a la brasa', descripcion: 'Con sarmiento y patatas fritas.', precio: 19, racion: 'entera', alergenos: [] },
      { id: 'carrillada', categoria: 'asados', nombre: 'Carrillada ibérica al vino tinto', descripcion: 'Seis horas de horno, con puré de patata.', precio: 17.5, racion: 'entera', alergenos: ['sulfitos', 'apio', 'lacteos'] },
      { id: 'bacalao', categoria: 'asados', nombre: 'Bacalao confitado con pisto', descripcion: 'Lomo de bacalao al horno a baja temperatura.', precio: 19.5, racion: 'entera', alergenos: ['pescado'] },

      // Postres
      { id: 'bizcochos', categoria: 'postres', nombre: 'Bizcochos borrachos', descripcion: 'El dulce de Guadalajara, empapado en almíbar y vino.', precio: 6, alergenos: ['gluten', 'huevos', 'sulfitos'], destacado: true },
      { id: 'flan', categoria: 'postres', nombre: 'Flan de miel de la Alcarria', descripcion: 'Con nata montada.', precio: 5.5, alergenos: ['huevos', 'lacteos'] },
      { id: 'arroz-leche', categoria: 'postres', nombre: 'Arroz con leche', descripcion: 'Requemado con azúcar y canela.', precio: 5, alergenos: ['lacteos'] },
      { id: 'torrija', categoria: 'postres', nombre: 'Torrija de leche', descripcion: 'Caramelizada, con helado de canela.', precio: 6.5, alergenos: ['gluten', 'huevos', 'lacteos'] },
      { id: 'requeson', categoria: 'postres', nombre: 'Requesón con miel y nueces', descripcion: 'De leche de oveja.', precio: 5.5, alergenos: ['lacteos', 'frutosCascara'] },

      // Bebidas
      { id: 'vino-copa', categoria: 'bebidas', nombre: 'Vino tinto de la tierra, copa', precio: 2.8, alergenos: ['sulfitos'] },
      { id: 'vino-crianza', categoria: 'bebidas', nombre: 'Tinto crianza, botella', descripcion: 'Pregunta por la carta de vinos.', precio: 18, desde: true, alergenos: ['sulfitos'] },
      { id: 'cerveza', categoria: 'bebidas', nombre: 'Caña de cerveza', precio: 2.5, alergenos: ['gluten'] },
      { id: 'agua', categoria: 'bebidas', nombre: 'Agua mineral', descripcion: 'Botella de un litro.', precio: 2.5, alergenos: [] },
      { id: 'mosto', categoria: 'bebidas', nombre: 'Mosto o refresco', precio: 2.5, alergenos: [] },
      { id: 'orujo', categoria: 'bebidas', nombre: 'Orujo de hierbas de la casa', precio: 3.5, alergenos: [] },
      { id: 'cafe', categoria: 'bebidas', nombre: 'Café de puchero', precio: 1.8, alergenos: [] },
    ],
  },

  equipo: [
    { nombre: 'Julián Garrido', rol: 'Al horno' },
    { nombre: 'Marta Ruiz', rol: 'En la sala' },
  ],

  faq: [
    { pregunta: '¿Hay que encargar los asados?', respuesta: 'Recomendable: el cabrito y el cordero salen en horno de leña y se preparan por cuartos. Si lo encargas con la reserva, te lo tenemos a tu hora.' },
    { pregunta: '¿Tenéis opciones sin gluten?', respuesta: 'Sí. En la carta puedes ocultar los platos con gluten u otro alérgeno. Avísanos al reservar y adaptamos lo que se pueda.' },
    { pregunta: '¿Se puede ir con niños o con carrito?', respuesta: 'Claro. Tenemos tronas y el comedor está a pie de calle, sin escalones.' },
    { pregunta: '¿Aceptáis tarjeta?', respuesta: 'Sí, tarjeta y efectivo. Para grupos pedimos una señal al confirmar el menú.' },
  ],

  legal: {
    titular: 'Mesón La Trébede S.L. (ficticio)',
    nif: 'B00000000',
    domicilio: 'Calle del Horno Viejo, 7, 19001 Guadalajara',
    email: 'reservas@ejemplo.es',
  },

  extra: {
    menuDelDia: {
      dias: ['ma', 'mi', 'ju', 'vi'],
      precio: 16.5,
      incluye: 'Pan, bebida (vino de la casa, agua o refresco) y postre o café',
      primeros: ['Sopa castellana', 'Ensalada de la huerta', 'Migas del pastor'],
      segundos: ['Carrillada al vino tinto', 'Merluza a la romana', 'Pollo de corral en pepitoria'],
      postres: ['Arroz con leche', 'Flan casero', 'Fruta del tiempo'],
      porDia: {
        ma: {
          primeros: ['Judías blancas con perdiz', 'Ensalada de la huerta', 'Pisto con huevo'],
          segundos: ['Albóndigas en salsa', 'Bacalao con tomate', 'Lomo a la brasa con patatas'],
        },
        mi: {
          primeros: ['Lentejas estofadas', 'Ensalada de pasta', 'Sopa castellana'],
          segundos: ['Pollo de corral en pepitoria', 'Merluza a la romana', 'Chuletas de cerdo con pimientos'],
        },
        ju: {
          primeros: ['Cocido de garbanzos (primer vuelco)', 'Ensalada de la huerta', 'Revuelto de setas'],
          segundos: ['Cocido: carnes y verduras', 'Trucha a la navarra', 'Callos a la madrileña'],
        },
        vi: {
          primeros: ['Gachas de almorta', 'Ensalada de perdiz', 'Migas del pastor'],
          segundos: ['Caldereta de cordero', 'Bacalao confitado', 'Carrillada al vino tinto'],
          postres: ['Bizcochos borrachos', 'Arroz con leche', 'Fruta del tiempo'],
        },
      },
    },
    umbralGrupo: 8,
    maxPersonas: 12,
    ultimaMesaMin: 60,
    celebraciones: ['Cumpleaños', 'Comunión o bautizo', 'Comida de empresa', 'Aniversario', 'Otra'],
    menusGrupo: [
      {
        nombre: 'Menú Alcarria',
        precio: 34,
        descripcion: 'Para comidas de empresa y reuniones sin complicaciones.',
        platos: ['Croquetas, torreznos y queso con miel al centro', 'Carrillada al vino o bacalao confitado', 'Flan de miel', 'Vino de la casa, agua y café'],
      },
      {
        nombre: 'Menú del Horno',
        precio: 45,
        descripcion: 'El de las celebraciones: el asado entra en la mesa entero.',
        platos: ['Jamón ibérico y ensalada de perdiz al centro', 'Cabrito o cordero asado (un cuarto cada cuatro)', 'Bizcochos borrachos', 'Tinto crianza, agua y café'],
      },
      {
        nombre: 'Menú infantil',
        precio: 16,
        descripcion: 'Para menores de 12 años, dentro de un menú de grupo.',
        platos: ['Croquetas y patatas', 'Chuletillas o pollo de corral', 'Helado o arroz con leche', 'Agua o refresco'],
      },
    ],
    servesCuisine: ['Española', 'Castellana', 'Asados'],
  },
};

export default config;
