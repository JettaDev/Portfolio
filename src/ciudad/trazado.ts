// Trazado de la ciudad: edificios, huecos de ventana y ventanas de proyecto.
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

/** Cámara en reposo: a ras de calle, mirando un poco hacia arriba para ver el cielo. */
export const CAMARA = { y: 5, mira: { x: 0, y: 12, z: 0 }, fov: 42, distanciaMinima: 44 } as const;
/** Lo que se mueve la cámara con el parallax, a cada lado. */
export const PARALLAX = { x: 1.8, y: 0.9 } as const;

/** Filas de delante a atrás; las del fondo son más altas para que asomen sin tapar el cielo. */
export const FILAS = [
  { z: 0, alto: [8, 14] },
  { z: -11, alto: [10, 20] },
  { z: -23, alto: [12, 26] },
  { z: -37, alto: [15, 32] },
  { z: -53, alto: [18, 38] },
] as const;

/** Las apps solo van en las tres primeras filas, que se ven en todos los niveles de calidad. */
const FILAS_DE_PROYECTO = 3;
/** Distancia máxima al centro de los edificios con app, por fila (crece si no caben). */
const LIMITE_X = [10, 15, 20];
const ANCHO_CIUDAD = 75;
const PROPORCION_ENCENDIDAS = 0.24;
/** Número de tonos fríos de las ventanas decorativas (la paleta está en ventanas.ts). */
export const TONOS = 5;

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

export interface VentanaProyecto {
  slug: string;
  status: Estado;
  x: number;
  y: number;
  z: number;
  ancho: number;
  alto: number;
  edificio: number;
  fila: number;
  planta: number;
  columna: number;
}

export interface Trazado {
  edificios: Edificio[];
  huecos: Hueco[];
  proyectos: VentanaProyecto[];
  /** Mitad del ancho que ocupan los ventanales, con margen: sirve para encuadrar. */
  mitadAncho: number;
  /** Fachada más adelantada con ventanal (la más cercana a la cámara). */
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

/** Distancia de la cámara para que quepan los ventanales a lo ancho con este aspecto. */
export function distanciaCamara(aspecto: number, mitadAncho: number, frente = 0): number {
  const tan = Math.tan(((CAMARA.fov / 2) * Math.PI) / 180);
  return Math.max(CAMARA.distanciaMinima, mitadAncho / (tan * aspecto) + frente);
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
          if (tapa) minimo = Math.max(minimo, cy + (e.alto - cy) / t);
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
    .filter(({ e, i }) => e.fila === fila && !usados.has(i) && Math.abs(e.x) < limite && rejilla(e).columnas >= 2);
  const izq = validos.filter(({ e }) => e.x < 0).sort((a, b) => b.e.x - a.e.x);
  const der = validos.filter(({ e }) => e.x >= 0).sort((a, b) => a.e.x - b.e.x);
  const orden: number[] = [];
  let lado = (der[0]?.e.x ?? Infinity) <= -(izq[0]?.e.x ?? -Infinity) ? der : izq;
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
  const edificios: Edificio[] = [];
  FILAS.forEach((f, fila) => {
    let x = -ANCHO_CIUDAD - azar() * 3;
    while (x < ANCHO_CIUDAD) {
      const ancho = 3 + azar() * 3;
      const fondo = 4 + azar() * 3;
      const alto = f.alto[0] + azar() * (f.alto[1] - f.alto[0]);
      edificios.push({ x: x + ancho / 2, z: f.z - azar() * 3, ancho, fondo, alto, fila });
      x += ancho + 0.6 + azar() * 1.6;
    }
  });

  // --- Edificios con app ------------------------------------------------------
  // Un edificio por app: primero la fila de delante, del centro hacia fuera; si no caben,
  // la siguiente fila (con el ventanal más alto para que asome).
  const usados = new Set<number>();
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
  const reservados = new Set<string>();
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

  // --- Huecos decorativos -------------------------------------------------------
  const huecos: Hueco[] = [];
  const cortes = { edificios: [] as number[], huecos: [] as number[] };
  edificios.forEach((e, i) => {
    const { columnas, plantas, izquierda } = rejilla(e);
    for (let c = 0; c < columnas; c++) {
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

  const mitadAncho = Math.max(0, ...proyectos.map((p) => Math.abs(p.x) + p.ancho / 2)) + 2.5;
  const frente = Math.max(0, ...proyectos.map((p) => p.z));
  return { edificios, huecos, proyectos, mitadAncho, frente, cortes };
}
