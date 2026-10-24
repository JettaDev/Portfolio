// Trazado de la ciudad: la calle, la manzana del centro (tienda con escaparate, estudio y solar, y
// el bajo comercial de las webs para negocios), los edificios, los huecos de ventana y los ventanales de las apps.
// Es puro (sin three ni DOM) y determinista: con la misma semilla sale siempre la misma ciudad.

import { aleatorio, ruido, SEMILLA } from './semilla';

/** Medidas de la fachada, en unidades de la escena. */
export const HUECO = { ancho: 0.42, alto: 0.62 } as const;
export const PLANTA_ALTO = 1.15;
export const COLUMNA = 0.9;
/** Altura del centro de la planta 0. */
export const PRIMERA_PLANTA = 1.2;

/** El ventanal de una app ocupa dos columnas y tiene la proporción de la captura (16:10). */
export const VENTANAL = { ancho: COLUMNA + HUECO.ancho, alto: (COLUMNA + HUECO.ancho) / 1.6 } as const;

/**
 * Cámara en reposo: a la altura de un primer piso, al otro lado de la calle, mirando casi en
 * horizontal. Se ven la acera y los bajos, la manzana entera y, arriba, el cielo con la luna.
 */
export const CAMARA = { y: 3.4, mira: { x: 0, y: 7, z: 0 }, fov: 42, distanciaMinima: 28 } as const;
/** Lo que se mueve la cámara con el parallax, a cada lado. */
export const PARALLAX = { x: 1.2, y: 0.5 } as const;

/**
 * La calle: todas las fachadas de la fila de delante dan a la misma línea; delante, la acera con
 * su bordillo y la calzada. Las farolas van en el borde de la acera.
 */
export const CALLE = { fachada: 2, acera: 2.2, bordillo: 0.12, calzada: 7.5, farola: 3.5 } as const;

/**
 * Filas de delante a atrás; las del fondo son más altas para que asomen, pero no tanto que
 * tapen la luna: con la cámara a pie de calle, el perfil de la ciudad no pasa de unos 20°.
 */
export const FILAS = [
  { z: 0, alto: [8, 13] },
  { z: -11, alto: [10, 18] },
  { z: -23, alto: [12, 22] },
  { z: -37, alto: [14, 26] },
  { z: -53, alto: [16, 30] },
] as const;

/**
 * La manzana del centro, con lotes fijos (no dependen de la semilla): la tienda de JettaDev en
 * medio, el solar a su derecha y, a su izquierda, el lote de la primera app. Es estrecha a
 * propósito: tiene que caber entera en un móvil en vertical.
 */
export const MANZANA = {
  tienda: { x: 0, ancho: 4.2, fondo: 5.4, plantas: 5 },
  lote: { x: -4, ancho: 3, fondo: 5, alto: 8.6 },
  solar: { x: 3.9, ancho: 2.8, fondo: 5 },
  /** Hueco entre los lotes de la manzana y el resto de la fila */
  separacion: 0.4,
} as const;

/**
 * Hasta dónde llega el cartel del solar (con sus postes): una valla alta, para que su rótulo no
 * se cruce con el del escaparate en una pantalla estrecha.
 */
const ALTO_CARTEL = 5.4;

/** Plantas de la tienda que ocupa el comercio: el escaparate y la banda del rótulo encima. */
const PLANTAS_COMERCIO = 2;

/** Plantillas de negocio expuestas en el bajo comercial. */
export const LOCALES_NEGOCIOS = 4;

/** Las apps solo van en las tres primeras filas, que se ven en todos los niveles de calidad. */
const FILAS_DE_PROYECTO = 3;
/** Distancia máxima al centro de los edificios con app, por fila (crece si no caben). */
const LIMITE_X = [5, 6.5, 9];
const ANCHO_CIUDAD = 75;
const PROPORCION_ENCENDIDAS = 0.24;
/** Número de tonos fríos de las ventanas decorativas (la paleta está en ventanas.ts). */
export const TONOS = 5;
/** Margen del encuadre alrededor de los sitios del barrio (deja sitio a las etiquetas HTML). */
const MARGEN = 0.9;

export type Estado = 'live' | 'beta' | 'wip';

export interface AppEnCiudad {
  slug: string;
  status: Estado;
  /** Planta pedida en el MDX; se sube si la taparía un edificio de delante. */
  planta?: number;
}

export interface Edificio {
  x: number;
  z: number;
  ancho: number;
  fondo: number;
  alto: number;
  fila: number;
  /** Lote vacío: el solar «Tu proyecto aquí». No se pinta ni tiene ventanas. */
  vacio?: boolean;
}

/** Un rectángulo en una fachada (centro, ancho y alto), mirando a la cámara. */
export interface Rectangulo {
  x: number;
  y: number;
  z: number;
  ancho: number;
  alto: number;
}

/** El solar: valla a ras de calle y cartel sobre dos postes, junto a la tienda. */
export interface Solar {
  edificio: number;
  x: number;
  /** Línea de la valla (donde estaría la fachada). */
  z: number;
  ancho: number;
  cartel: Rectangulo;
}

/** La ventana de JettaDev: un ventanal con lámpara de escritorio en la última planta de la tienda. */
export interface Estudio extends Rectangulo {
  edificio: number;
}

/** El escaparate de la tienda (lleva al catálogo de apps), con su toldo encima. */
export interface Escaparate extends Rectangulo {
  edificio: number;
  toldo: { y: number; ancho: number; vuelo: number };
}

/**
 * El bajo comercial del lote de la izquierda: cuatro escaparates pequeños, uno por plantilla de
 * negocio, cada uno con su toldo. Lleva a la página de las webs para negocios.
 */
export interface Negocios extends Rectangulo {
  edificio: number;
  /** Cuántos escaparates (uno por plantilla). */
  locales: number;
  toldo: { y: number; vuelo: number };
}

/** Obra en marcha (apps en desarrollo): grúa en la azotea y andamio bajo el ventanal. */
export interface Obra {
  slug: string;
  edificio: number;
  /** Lado de la azotea donde va el mástil (-1 izquierda, 1 derecha). */
  lado: -1 | 1;
  /** Plantas que cubre el andamio (de la 0 a la anterior al ventanal). */
  plantas: number;
}

export interface Hueco {
  x: number;
  y: number;
  z: number;
  fila: number;
  encendida: boolean;
  tono: number;
  /** Intensidad de la luz encendida (0,07–0,18 del color): queda por debajo del umbral del bloom. */
  intensidad: number;
}

export interface VentanaProyecto extends Rectangulo {
  slug: string;
  status: Estado;
  edificio: number;
  fila: number;
  planta: number;
  columna: number;
}

export interface Calle {
  /** Línea de las fachadas de la fila de delante. */
  fachada: number;
  /** Borde de la acera (bordillo) y fin de la calzada. */
  bordillo: number;
  fin: number;
  /** Posición de cada farola (en el borde de la acera). */
  farolas: number[];
}

export interface Trazado {
  edificios: Edificio[];
  huecos: Hueco[];
  proyectos: VentanaProyecto[];
  calle: Calle;
  tienda: number;
  escaparate: Escaparate;
  estudio: Estudio;
  solar: Solar;
  negocios: Negocios;
  obras: Obra[];
  /** Mitad del ancho que ocupan los sitios del barrio, con margen: sirve para encuadrar. */
  mitadAncho: number;
  /** Fachada más adelantada (la más cercana a la cámara). */
  frente: number;
  /** Cuántos edificios y huecos hay en las primeras k+1 filas (están ordenados por fila). */
  cortes: { edificios: number[]; huecos: number[] };
}

interface Rejilla {
  columnas: number;
  plantas: number;
  izquierda: number;
}

export function rejilla(e: Edificio): Rejilla {
  const columnas = Math.max(1, Math.floor((e.ancho - 0.6) / COLUMNA));
  const plantas = Math.max(1, Math.floor((e.alto - 1.6) / PLANTA_ALTO));
  return { columnas, plantas, izquierda: e.x - ((columnas - 1) * COLUMNA) / 2 };
}

export const fachada = (e: Edificio) => e.z + e.fondo / 2;
const alturaDePlanta = (planta: number) => PRIMERA_PLANTA + planta * PLANTA_ALTO;
const plantaParaAltura = (y: number) => Math.ceil((y - PRIMERA_PLANTA) / PLANTA_ALTO);
/** Alto de un edificio con `plantas` plantas y su pretil. */
const altoPara = (plantas: number) => 1.6 + plantas * PLANTA_ALTO + 0.2;

/**
 * Dos encuadres fijos, para que el póster coincida con el canvas en cualquier pantalla:
 * con la distancia fija y el FOV vertical fijo, un aspecto distinto solo enseña más o menos
 * por los lados, igual que el póster con `object-fit: cover`.
 * - «ancho» (aspecto ≥ 1,2): póster a 2,4:1.
 * - «alto» (aspecto < 1,2, móviles y ventanas estrechas): póster a 1,2:1; la distancia se
 *   calcula para el móvil más estrecho (9:21).
 */
export type Encuadre = 'ancho' | 'alto';
export const ENCUADRES = {
  ancho: { desde: 1.2, poster: 2.4 },
  alto: { desde: 9 / 21, poster: 1.2 },
} as const;

export const encuadrePara = (aspecto: number): Encuadre => (aspecto >= ENCUADRES.ancho.desde ? 'ancho' : 'alto');

/** Distancia de la cámara para que quepan los sitios a lo ancho con el aspecto más estrecho del encuadre. */
export function distanciaCamara(encuadre: Encuadre, mitadAncho: number, frente = 0): number {
  const tan = Math.tan(((CAMARA.fov / 2) * Math.PI) / 180);
  return Math.max(CAMARA.distanciaMinima, mitadAncho / (tan * ENCUADRES[encuadre].desde) + frente);
}

/**
 * Altura mínima de la parte baja de un ventanal para que no lo tape ningún edificio de las
 * filas de delante, desde cualquier punto del parallax y a la distancia mínima de la cámara.
 */
function alturaVisible(edificios: Edificio[], fila: number, x: number, z: number): number {
  const d = CAMARA.distanciaMinima;
  let minimo = 0;
  for (const e of edificios) {
    if (e.fila >= fila) continue;
    for (const zCara of [fachada(e), e.z - e.fondo / 2]) {
      for (const cx of [-PARALLAX.x, 0, PARALLAX.x]) {
        for (const cy of [CAMARA.y - PARALLAX.y, CAMARA.y + PARALLAX.y]) {
          // Punto de la línea cámara → ventanal a la altura de la cara del edificio
          const t = (d - zCara) / (d - z);
          const xs = [x - VENTANAL.ancho / 2, x + VENTANAL.ancho / 2].map((v) => cx + (v - cx) * t);
          const tapa = Math.max(...xs) > e.x - e.ancho / 2 && Math.min(...xs) < e.x + e.ancho / 2;
          // El solar no tiene edificio, pero su cartel también tapa
          const alto = e.vacio ? ALTO_CARTEL : e.alto;
          if (tapa) minimo = Math.max(minimo, cy + (alto - cy) / t);
        }
      }
    }
  }
  return minimo;
}

/** Edificios candidatos de una fila, alternando lados desde el centro. */
function candidatos(edificios: Edificio[], fila: number, limite: number, usados: Set<number>): number[] {
  const validos = edificios
    .map((e, i) => ({ e, i }))
    .filter(({ e, i }) => e.fila === fila && !usados.has(i) && !e.vacio && Math.abs(e.x) < limite && rejilla(e).columnas >= 2);
  const izq = validos.filter(({ e }) => e.x < 0).sort((a, b) => b.e.x - a.e.x);
  const der = validos.filter(({ e }) => e.x >= 0).sort((a, b) => a.e.x - b.e.x);
  const orden: number[] = [];
  let lado = (der[0]?.e.x ?? Infinity) < -(izq[0]?.e.x ?? -Infinity) ? der : izq;
  while (izq.length || der.length) {
    const siguiente = lado.shift() ?? (lado === der ? izq : der).shift();
    if (siguiente) orden.push(siguiente.i);
    lado = lado === der ? izq : der;
  }
  return orden;
}

export function trazarCiudad(apps: AppEnCiudad[], semilla = SEMILLA): Trazado {
  const azar = aleatorio(semilla);

  // --- Edificios -------------------------------------------------------------
  // Se generan siempre igual, haya las apps que haya: añadir una no mueve la ciudad.
  // En la fila de delante, la manzana del centro tiene lotes fijos y el resto da a la calle.
  const edificios: Edificio[] = [];
  const m = MANZANA;
  const izquierdaManzana = m.lote.x - m.lote.ancho / 2 - m.separacion;
  const derechaManzana = m.solar.x + m.solar.ancho / 2 + m.separacion;
  let tienda = -1;
  let loteSolar = -1;
  let loteNegocios = -1;
  FILAS.forEach((f, fila) => {
    let x = -ANCHO_CIUDAD - azar() * 3;
    while (x < ANCHO_CIUDAD) {
      let ancho = 3 + azar() * 3;
      const fondo = 4 + azar() * 3;
      const alto = f.alto[0] + azar() * (f.alto[1] - f.alto[0]);
      const z = f.z - azar() * 3;
      if (fila === 0 && tienda < 0 && x + ancho > izquierdaManzana) {
        // El último edificio antes de la manzana se estrecha para no pisarla
        ancho = izquierdaManzana - x;
        if (ancho >= 2.4) edificios.push({ x: x + ancho / 2, z: CALLE.fachada - fondo / 2, ancho, fondo, alto, fila });
        const lote = (l: { x: number; ancho: number; fondo: number }, alto: number, vacio?: boolean): number =>
          edificios.push({ x: l.x, z: CALLE.fachada - l.fondo / 2, ancho: l.ancho, fondo: l.fondo, alto, fila, ...(vacio ? { vacio } : {}) }) - 1;
        loteNegocios = lote(m.lote, m.lote.alto);
        tienda = lote(m.tienda, altoPara(m.tienda.plantas));
        loteSolar = lote(m.solar, 0, true);
        x = derechaManzana;
        continue;
      }
      const z0 = fila === 0 ? CALLE.fachada - fondo / 2 : z;
      edificios.push({ x: x + ancho / 2, z: z0, ancho, fondo, alto, fila });
      x += ancho + 0.6 + azar() * 1.6;
    }
  });

  // --- La tienda: escaparate a pie de calle y, en la última planta, el estudio -----------
  const reservados = new Set<string>();
  const t = edificios[tienda];
  const rejillaTienda = rejilla(t);
  const zTienda = fachada(t) + 0.03;
  for (let p = 0; p < PLANTAS_COMERCIO; p++) {
    for (let c = 0; c < rejillaTienda.columnas; c++) reservados.add(`${tienda}:${c}:${p}`);
  }
  const altoEscaparate = 1.6;
  const escaparate: Escaparate = {
    x: t.x,
    y: 0.45 + altoEscaparate / 2,
    z: zTienda,
    ancho: t.ancho - 0.8,
    alto: altoEscaparate,
    edificio: tienda,
    toldo: { y: 0.45 + altoEscaparate + 0.12, ancho: t.ancho - 0.4, vuelo: 0.7 },
  };
  const columnaEstudio = Math.floor((rejillaTienda.columnas - 2) / 2);
  const plantaEstudio = rejillaTienda.plantas - 1;
  reservados.add(`${tienda}:${columnaEstudio}:${plantaEstudio}`).add(`${tienda}:${columnaEstudio + 1}:${plantaEstudio}`);
  const estudio: Estudio = {
    x: rejillaTienda.izquierda + (columnaEstudio + 0.5) * COLUMNA,
    y: alturaDePlanta(plantaEstudio),
    z: zTienda,
    ancho: VENTANAL.ancho,
    alto: VENTANAL.alto,
    edificio: tienda,
  };

  // --- Bajo comercial de las webs para negocios: la planta baja del lote de la izquierda ------
  const ln = edificios[loteNegocios];
  for (let c = 0; c < rejilla(ln).columnas; c++) reservados.add(`${loteNegocios}:${c}:0`);
  const altoNegocios = 1.3;
  const negocios: Negocios = {
    x: ln.x,
    y: 0.45 + altoNegocios / 2,
    z: fachada(ln) + 0.03,
    // Algo más estrecho que el lote: no ensancha el encuadre (el cartel del solar llega igual de lejos)
    ancho: ln.ancho - 0.8,
    alto: altoNegocios,
    edificio: loteNegocios,
    locales: LOCALES_NEGOCIOS,
    toldo: { y: 0.45 + altoNegocios + 0.1, vuelo: 0.45 },
  };

  // --- Edificios con app ------------------------------------------------------
  // Un edificio por app: primero la fila de delante, del centro hacia fuera; si no caben,
  // la siguiente fila (con el ventanal más alto para que asome por encima de los tejados).
  const usados = new Set<number>([tienda, loteSolar]);
  const asignados: number[] = [];
  for (let ampliacion = 0; asignados.length < apps.length; ampliacion += 5) {
    for (let fila = 0; fila < FILAS_DE_PROYECTO && asignados.length < apps.length; fila++) {
      for (const i of candidatos(edificios, fila, LIMITE_X[fila] + ampliacion, usados)) {
        if (asignados.length === apps.length) break;
        usados.add(i);
        asignados.push(i);
      }
    }
    if (ampliacion > ANCHO_CIUDAD) throw new Error('No caben más apps en la ciudad');
  }

  // Se colocan de delante a atrás: si un edificio con app crece, los de detrás ya lo tienen en cuenta.
  const proyectos: VentanaProyecto[] = [];
  const porFila = apps.map((_, n) => n).sort((a, b) => edificios[asignados[a]].fila - edificios[asignados[b]].fila);
  for (const n of porFila) {
    const app = apps[n];
    const indice = asignados[n];
    const e = edificios[indice];
    const { columnas, izquierda } = rejilla(e);
    const columna = Math.floor((columnas - 2) / 2);
    const x = izquierda + (columna + 0.5) * COLUMNA;
    const z = fachada(e) + 0.03;

    const enFila = asignados.slice(0, n).filter((i) => edificios[i].fila === e.fila).length;
    const minima = plantaParaAltura(alturaVisible(edificios, e.fila, x, z) + 0.3 + VENTANAL.alto / 2);
    const planta = Math.max(1, minima, app.planta ?? (e.fila === 0 ? 3 + (enFila % 2) : minima));

    // El edificio crece si hace falta: al menos una planta por encima del ventanal
    e.alto = Math.max(e.alto, 1.6 + (planta + 2) * PLANTA_ALTO + 0.3);
    reservados.add(`${indice}:${columna}:${planta}`).add(`${indice}:${columna + 1}:${planta}`);

    proyectos[n] = {
      slug: app.slug,
      status: app.status,
      x,
      y: alturaDePlanta(planta),
      z,
      ancho: VENTANAL.ancho,
      alto: VENTANAL.alto,
      edificio: indice,
      fila: e.fila,
      planta,
      columna,
    };
  }

  // --- Solar «Tu proyecto aquí»: el lote vacío junto a la tienda ---------------------
  const lote = edificios[loteSolar];
  const anchoCartel = Math.min(2.4, lote.ancho - 0.4);
  const solar: Solar = {
    edificio: loteSolar,
    x: lote.x,
    z: fachada(lote),
    ancho: lote.ancho,
    cartel: { x: lote.x, y: ALTO_CARTEL - 0.2 - 0.6, z: fachada(lote) - 0.9, ancho: anchoCartel, alto: 1.2 },
  };

  // --- Obras: las apps en desarrollo tienen grúa y andamio --------------------------
  const obras: Obra[] = proyectos
    .filter((p) => p.status === 'wip')
    .map((p) => ({ slug: p.slug, edificio: p.edificio, lado: edificios[p.edificio].x < 0 ? -1 : 1, plantas: p.planta }));

  // --- Huecos decorativos -------------------------------------------------------
  const huecos: Hueco[] = [];
  const cortes = { edificios: [] as number[], huecos: [] as number[] };
  edificios.forEach((e, i) => {
    const { columnas, plantas, izquierda } = rejilla(e);
    for (let c = 0; c < (e.vacio ? 0 : columnas); c++) {
      for (let p = 0; p < plantas; p++) {
        if (reservados.has(`${i}:${c}:${p}`)) continue;
        huecos.push({
          x: izquierda + c * COLUMNA,
          y: alturaDePlanta(p),
          z: fachada(e) + 0.02,
          fila: e.fila,
          encendida: ruido(semilla, i, c, p, 1) < PROPORCION_ENCENDIDAS,
          tono: Math.floor(ruido(semilla, i, c, p, 2) * TONOS),
          intensidad: 0.07 + ruido(semilla, i, c, p, 3) * 0.11,
        });
      }
    }
    if (edificios[i + 1]?.fila !== e.fila) {
      cortes.edificios.push(i + 1);
      cortes.huecos.push(huecos.length);
    }
  });

  // --- La calle: farolas en el borde de la acera, entre los lotes de la manzana, junto al solar y luego cada 7
  const entreLotes = MANZANA.tienda.ancho / 2 + MANZANA.separacion / 2;
  const farolas: number[] = [];
  for (let x = entreLotes; x < ANCHO_CIUDAD; x += 7) farolas.push(-x, x);
  // Una más al otro lado del solar: su luz cae sobre la valla y el hueco se lee entre los edificios
  farolas.push(MANZANA.solar.x + MANZANA.solar.ancho / 2 + 0.25);
  const calle: Calle = {
    fachada: CALLE.fachada,
    bordillo: CALLE.fachada + CALLE.acera,
    fin: CALLE.fachada + CALLE.acera + CALLE.calzada,
    farolas: farolas.sort((a, b) => a - b),
  };

  // El encuadre tiene que abarcar los ventanales, la tienda (escaparate y estudio) y el cartel
  const extremos = [
    ...proyectos.map((p) => Math.abs(p.x) + p.ancho / 2),
    Math.abs(estudio.x) + estudio.ancho / 2,
    Math.abs(escaparate.x) + escaparate.ancho / 2,
    Math.abs(solar.cartel.x) + solar.cartel.ancho / 2,
    Math.abs(negocios.x) + negocios.ancho / 2,
  ];
  const mitadAncho = Math.max(...extremos) + MARGEN;
  const frente = Math.max(CALLE.fachada, ...proyectos.map((p) => p.z));
  return { edificios, huecos, proyectos, calle, tienda, escaparate, estudio, solar, negocios, obras, mitadAncho, frente, cortes };
}
