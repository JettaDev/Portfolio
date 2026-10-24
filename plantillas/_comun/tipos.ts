// Esquema común del archivo de configuración de las plantillas.
// Cada plantilla tiene UN `config.ts` que cumple `ConfigPlantilla<...>`: las claves de
// primer nivel son las mismas en las cuatro; solo cambian los campos extra de cada
// elemento del catálogo (alérgenos, duración, tipo de permiso…) y el bloque `extra`.

export type Dia = 'lu' | 'ma' | 'mi' | 'ju' | 'vi' | 'sa' | 'do';

/** Una franja de apertura. Horas en "HH:MM", hora de Madrid. Si `cierra` <= `abre`, cierra al día siguiente. */
export interface Franja {
  dias: Dia[];
  abre: string;
  cierra: string;
}

/** Días concretos sin abrir (vacaciones, festivos). Fechas "AAAA-MM-DD", ambas incluidas. */
export interface Cierre {
  desde: string;
  hasta: string;
  motivo: string;
}

export interface Direccion {
  calle: string;
  codigoPostal: string;
  localidad: string;
  provincia: string;
  /** Código ISO de país, p. ej. "ES". */
  pais: string;
}

/** Colores obligatorios. Cada plantilla puede añadir más claves. Se publican como `--c-<clave>`. */
export interface ColoresBase {
  fondo: string;
  superficie: string;
  texto: string;
  textoSuave: string;
  primario: string;
  textoSobrePrimario: string;
  acento: string;
  borde: string;
}

export interface Categoria {
  id: string;
  nombre: string;
  descripcion?: string;
}

/** Elemento del catálogo: un plato, un servicio, un permiso, una especialidad. */
export interface ItemBase {
  id: string;
  /** `id` de una categoría. */
  categoria: string;
  nombre: string;
  descripcion?: string;
  /** En euros. Sin precio = «consultar». */
  precio?: number;
  /** Mostrar «desde» delante del precio. */
  desde?: boolean;
  /** Destacado en portada (plato de la casa, servicio estrella…). */
  destacado?: boolean;
}

export interface Pregunta {
  pregunta: string;
  respuesta: string;
}

export interface Persona {
  nombre: string;
  rol: string;
  /** Frase corta. */
  bio?: string;
  /** Si no hay foto se dibujan las iniciales. Ruta dentro de `public/`. */
  foto?: string;
}

export interface ConfigPlantilla<Item extends ItemBase = ItemBase, Extra = Record<string, never>> {
  /** true = web de demostración: noindex, aviso visible y los enlaces de llamar/WhatsApp/correo muestran el mensaje en vez de abrirse. */
  demo: boolean;

  meta: {
    /** URL pública final, con barra al final. */
    url: string;
    /** <title>: «Nombre · qué es · Guadalajara». Máx. ~60 caracteres. */
    titulo: string;
    /** Meta description. 120-155 caracteres. */
    descripcion: string;
    idioma: 'es';
    /** Ruta dentro de `public/` de la imagen Open Graph (1200×630). */
    imagenOg: string;
  };

  negocio: {
    nombre: string;
    /** Para la barra fija y el logo compacto. */
    nombreCorto: string;
    eslogan: string;
    /** Tipo de schema.org: Restaurant, HairSalon, Physiotherapy… o varios: ["LocalBusiness", "DrivingSchool"]. */
    tipoSchema: string | string[];
    /** Rango de precios para el JSON-LD: "€", "€€"… */
    rangoPrecios?: string;
    logo: {
      /** Texto del logotipo. */
      texto: string;
      /** SVG en línea opcional (sin dimensiones fijas; usa currentColor). */
      svg?: string;
    };
  };

  contacto: {
    /** Formato E.164: "+34949000101". */
    telefono: string;
    /** Como se lee: "949 000 101". */
    telefonoVisible: string;
    /** Solo dígitos con prefijo de país: "34649000101". Vacío = sin WhatsApp. */
    whatsapp: string;
    email: string;
    direccion: Direccion;
    geo: { lat: number; lng: number };
    /** Enlace de Google Maps a la ficha del negocio (o a la dirección). */
    mapsUrl: string;
    /** Pista breve: «Junto a la plaza de Santo Domingo, aparcamiento a 2 min». */
    comoLlegar?: string;
  };

  horario: {
    franjas: Franja[];
    cierres?: Cierre[];
    /** Texto libre bajo el horario: «Cocina hasta las 23:00». */
    nota?: string;
  };

  /** La acción que va en el botón fijo y en la cabecera. */
  accionPrincipal: {
    tipo: 'whatsapp' | 'llamar' | 'formulario';
    texto: string;
  };

  /** Canal al que se envían los formularios (no se guarda nada en ningún servidor). */
  formulario: {
    canal: 'whatsapp' | 'email';
    /** Primera línea del mensaje: «Hola, quería reservar mesa:». */
    saludo: string;
  };

  redes: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    /** Enlace a las reseñas de Google. */
    resenas?: string;
  };

  tema: {
    colores: ColoresBase & Record<string, string>;
  };

  /** Textos de la página que no son datos: titulares, entradillas, llamadas a la acción. */
  textos: Record<string, string>;

  catalogo: {
    /** Título de la sección: «La carta», «Servicios», «Permisos», «Especialidades». */
    titulo: string;
    categorias: Categoria[];
    items: Item[];
  };

  equipo: Persona[];
  faq: Pregunta[];

  /** Datos del titular para el aviso legal y la privacidad (LSSI y RGPD). */
  legal: {
    titular: string;
    nif: string;
    domicilio: string;
    email: string;
    /** Inscripción registral, si es sociedad. */
    registro?: string;
  };

  /** Lo propio de cada plantilla (menú del día, packs, etc.). */
  extra: Extra;
}
