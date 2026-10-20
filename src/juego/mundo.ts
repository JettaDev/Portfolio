// Trazado del barrio del juego: una cuadrícula de manzanas con aceras, calles, farolas, árboles y
// coches aparcados. En la calle de salida están el estudio de JettaDev, el solar «Tu proyecto
// aquí» y, a los lados, un edificio con puerta por cada app.
// Es puro (sin three ni DOM) y determinista: con la misma semilla sale siempre el mismo barrio.

import { aleatorio } from '../ciudad/semilla';

/** Distancia entre los centros de dos manzanas (manzana + calle). */
export const CUADRA = 34;
/** Lado de una manzana, acera incluida. */
export const MANZANA = 24;
export const ACERA = 2.2;
/** Altura de la acera sobre la calzada. */
export const BORDILLO = 0.15;
/** Manzanas que se pueden recorrer a cada lado del centro; detrás hay un anillo más de relleno. */
export const RADIO = 2;
const RELLENO = 1;
/** Lado útil de una manzana, sin la acera. */
export const SOLAR_UTIL = MANZANA - 2 * ACERA;
/** Hasta dónde se puede andar: la calle que rodea las manzanas recorribles. */
export const LIMITE = RADIO * CUADRA + MANZANA / 2 + 4;
/** Distancia a una puerta desde la que se puede entrar. */
export const ALCANCE = 2.6;

/** Caja apoyada en el suelo: centro (x, z), ancho en x, fondo en z y alto. */
export interface Caja {
  x: number;
  z: number;
  ancho: number;
  fondo: number;
  alto: number;
}

export type Tipo = 'normal' | 'app' | 'estudio';

export interface Edificio extends Caja {
  tipo: Tipo;
  /** Varía las ventanas encendidas y el tono de cada edificio. */
  semilla: number;
}

export type Sitio = 'app' | 'estudio' | 'solar';

/** Algo en lo que se puede entrar: la puerta de un edificio o el cartel del solar. */
export interface Puerta {
  /** Slug de la app, `#sobre-mi` (el estudio) o `#contacto` (el solar). */
  id: string;
  sitio: Sitio;
  /** Centro de la puerta, en la fachada. */
  x: number;
  z: number;
  /** Hacia dónde mira la fachada (0: +z, π: -z). */
  giro: number;
  /** Ancho de la fachada del edificio (para el rótulo). */
  ancho: number;
  alto: number;
}

export interface Farola {
  x: number;
  z: number;
  /** Hacia dónde sale el brazo (hacia la calzada). */
  giro: number;
}

export interface Arbol {
  x: number;
  z: number;
  escala: number;
}

export interface Coche {
  x: number;
  z: number;
  /** 0: a lo largo de x; π/2: a lo largo de z. */
  giro: number;
  color: number;
}

export interface Circulo {
  x: number;
  z: number;
  r: number;
}

export interface Mundo {
  edificios: Edificio[];
  puertas: Puerta[];
  farolas: Farola[];
  arboles: Arbol[];
  coches: Coche[];
  /** Centros de las manzanas (con acera). */
  manzanas: { x: number; z: number }[];
  /** El solar: la valla delante y el cartel. */
  solar: Caja;
  /** Dónde aparece el jugador y hacia dónde mira. */
  salida: { x: number; z: number; giro: number };
  /** Lo que no se puede atravesar. */
  cajas: Caja[];
  circulos: Circulo[];
}

/** Medidas de los edificios especiales de la calle de salida. */
const ESTUDIO = { ancho: 7.2, fondo: 9, alto: 13 };
const APP = { ancho: 7.6, fondo: 9.2, alto: 15 };
const COCHE = { largo: 4.2, ancho: 1.9 };

/**
 * Sitios para los edificios de las apps, por orden: a los lados del estudio en la misma acera y
 * luego enfrente (la cara norte de las manzanas de detrás de la salida).
 */
const HUECOS_APP: { i: number; j: number; cara: 'sur' | 'norte' }[] = [
  { i: -1, j: 0, cara: 'sur' },
  { i: 1, j: 0, cara: 'sur' },
  { i: -1, j: 1, cara: 'norte' },
  { i: 1, j: 1, cara: 'norte' },
  { i: 0, j: 1, cara: 'norte' },
  { i: -2, j: 0, cara: 'sur' },
  { i: 2, j: 0, cara: 'sur' },
  { i: -2, j: 1, cara: 'norte' },
  { i: 2, j: 1, cara: 'norte' },
];
export const MAX_APPS = HUECOS_APP.length;

/** Reparte un largo en tramos de entre `min` y `max`. */
function tramos(largo: number, min: number, max: number, azar: () => number): number[] {
  const partes: number[] = [];
  let resto = largo;
  while (resto > max) {
    const t = min + azar() * (max - min);
    if (resto - t < min) break;
    partes.push(t);
    resto -= t;
  }
  partes.push(resto);
  return partes;
}

export const dentroDeManzana = (x: number, z: number, m: { x: number; z: number }) =>
  Math.abs(x - m.x) <= MANZANA / 2 && Math.abs(z - m.z) <= MANZANA / 2;

/** Altura del suelo: sobre la acera (las manzanas) se sube el bordillo. */
export function alturaSuelo(x: number, z: number): number {
  const i = Math.round(x / CUADRA);
  const j = Math.round(z / CUADRA);
  return Math.abs(x - i * CUADRA) <= MANZANA / 2 && Math.abs(z - j * CUADRA) <= MANZANA / 2 ? BORDILLO : 0;
}

export function trazarMundo(slugs: string[], semilla = 11): Mundo {
  const azar = aleatorio(semilla);
  const edificios: Edificio[] = [];
  const puertas: Puerta[] = [];
  const manzanas: { x: number; z: number }[] = [];
  const mitad = SOLAR_UTIL / 2;
  let solar: Caja = { x: 0, z: 0, ancho: 0, fondo: 0, alto: 0 };

  const apps = new Map<string, string>();
  slugs.slice(0, MAX_APPS).forEach((slug, k) => {
    const h = HUECOS_APP[k];
    apps.set(`${h.i},${h.j},${h.cara}`, slug);
  });

  const alturaNormal = (cx: number, cz: number) => {
    // Más alto lejos del centro: el barrio crece hacia fuera y tapa el horizonte
    const lejos = Math.hypot(cx, cz) / CUADRA;
    return 7 + azar() * 12 + lejos * 4 + (azar() < 0.12 ? 14 : 0);
  };

  for (let i = -(RADIO + RELLENO); i <= RADIO + RELLENO; i++) {
    for (let j = -(RADIO + RELLENO); j <= RADIO + RELLENO; j++) {
      const cx = i * CUADRA;
      const cz = j * CUADRA;
      manzanas.push({ x: cx, z: cz });
      // Dos filas de solares: la de delante (sur, +z) y la de detrás (norte)
      for (const fila of ['norte', 'sur'] as const) {
        const z0 = fila === 'norte' ? cz - mitad : cz;
        const fondo = mitad;
        const especialApp = apps.get(`${i},${j},${fila}`);
        const centro = i === 0 && j === 0 && fila === 'sur';
        if (especialApp || centro) {
          // Tres lotes: el del medio es el especial
          const anchoMedio = centro ? ESTUDIO.ancho : APP.ancho;
          const lados = (SOLAR_UTIL - anchoMedio) / 2;
          const izquierda = { x: cx - mitad + lados / 2, ancho: lados };
          const derecha = { x: cx + mitad - lados / 2, ancho: lados };
          const caraZ = fila === 'sur' ? cz + mitad : cz - mitad;
          const medida = centro ? ESTUDIO : APP;
          const zEdificio = fila === 'sur' ? caraZ - medida.fondo / 2 : caraZ + medida.fondo / 2;
          edificios.push({ x: cx, z: zEdificio, ancho: medida.ancho - 0.3, fondo: medida.fondo, alto: medida.alto, tipo: centro ? 'estudio' : 'app', semilla: Math.floor(azar() * 1e6) });
          puertas.push({ id: centro ? '#sobre-mi' : especialApp!, sitio: centro ? 'estudio' : 'app', x: cx, z: caraZ, giro: fila === 'sur' ? 0 : Math.PI, ancho: medida.ancho, alto: medida.alto });
          // El lote de la izquierda, un edificio normal; el de la derecha, el solar en la manzana central
          for (const [k, lote] of [izquierda, derecha].entries()) {
            if (centro && k === 1) {
              solar = { x: lote.x, z: caraZ - 0.3, ancho: lote.ancho - 0.6, fondo: 0.2, alto: 2.2 };
              puertas.push({ id: '#contacto', sitio: 'solar', x: lote.x, z: caraZ, giro: 0, ancho: lote.ancho, alto: 6 });
              continue;
            }
            edificios.push({ x: lote.x, z: z0 + fondo / 2, ancho: lote.ancho - 0.3, fondo: fondo - 0.3, alto: alturaNormal(cx, cz), tipo: 'normal', semilla: Math.floor(azar() * 1e6) });
          }
          continue;
        }
        let x = cx - mitad;
        for (const ancho of tramos(SOLAR_UTIL, 4.5, 8, azar)) {
          edificios.push({ x: x + ancho / 2, z: z0 + fondo / 2, ancho: ancho - 0.3, fondo: fondo - 0.3, alto: alturaNormal(cx, cz), tipo: 'normal', semilla: Math.floor(azar() * 1e6) });
          x += ancho;
        }
      }
    }
  }

  // --- Farolas y árboles en el borde de la acera de las manzanas recorribles ----------------
  const farolas: Farola[] = [];
  const arboles: Arbol[] = [];
  const lejosDePuertas = (x: number, z: number, d: number) => puertas.every((p) => Math.hypot(x - p.x, z - p.z) > d);
  const borde = MANZANA / 2 - 0.45;
  for (const m of manzanas) {
    if (Math.abs(m.x) > RADIO * CUADRA || Math.abs(m.z) > RADIO * CUADRA) continue;
    // Cada lado: dirección a lo largo y normal hacia la calzada
    const lados = [
      { nx: 0, nz: 1 },
      { nx: 0, nz: -1 },
      { nx: 1, nz: 0 },
      { nx: -1, nz: 0 },
    ];
    for (const { nx, nz } of lados) {
      for (let t = -9; t <= 9; t += 6) {
        const a = nz !== 0 ? t : 0;
        const b = nx !== 0 ? t : 0;
        const x = m.x + a + nx * borde;
        const z = m.z + b + nz * borde;
        if (!lejosDePuertas(x, z, 2.4)) continue;
        if (Math.abs(t) === 9 || t === -3) farolas.push({ x, z, giro: Math.atan2(nx, nz) });
        else if (azar() < 0.8) {
          const xa = m.x + a + nx * (borde - 0.4);
          const za = m.z + b + nz * (borde - 0.4);
          if (lejosDePuertas(xa, za, 3)) arboles.push({ x: xa, z: za, escala: 0.8 + azar() * 0.5 });
        }
      }
    }
  }

  // --- Coches aparcados junto al bordillo ---------------------------------------------------
  const coches: Coche[] = [];
  const salida = { x: 0, z: CUADRA / 2 - 2, giro: Math.PI };
  const carril = MANZANA / 2 + 1.3;
  for (const m of manzanas) {
    if (Math.abs(m.x) > RADIO * CUADRA || Math.abs(m.z) > RADIO * CUADRA) continue;
    for (const lado of [1, -1]) {
      // A lo largo de x (caras sur y norte)
      for (let t = -7; t <= 7; t += 7) {
        if (azar() > 0.45) continue;
        const x = m.x + t;
        const z = m.z + lado * carril;
        if (Math.hypot(x - salida.x, z - salida.z) < 12 || !lejosDePuertas(x, z, 4.5)) continue;
        coches.push({ x, z, giro: 0, color: Math.floor(azar() * 6) });
      }
      // A lo largo de z (caras este y oeste)
      for (let t = -7; t <= 7; t += 7) {
        if (azar() > 0.45) continue;
        const x = m.x + lado * carril;
        const z = m.z + t;
        if (Math.hypot(x - salida.x, z - salida.z) < 12) continue;
        coches.push({ x, z, giro: Math.PI / 2, color: Math.floor(azar() * 6) });
      }
    }
  }

  const cajas: Caja[] = [
    ...edificios,
    solar,
    ...coches.map((c) => ({
      x: c.x,
      z: c.z,
      ancho: c.giro === 0 ? COCHE.largo : COCHE.ancho,
      fondo: c.giro === 0 ? COCHE.ancho : COCHE.largo,
      alto: 1.5,
    })),
  ];
  const circulos: Circulo[] = [...farolas.map((f) => ({ x: f.x, z: f.z, r: 0.18 })), ...arboles.map((a) => ({ x: a.x, z: a.z, r: 0.3 }))];

  return { edificios, puertas, farolas, arboles, coches, manzanas, solar, salida, cajas, circulos };
}

export { COCHE };
