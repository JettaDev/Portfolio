// Figura humana a línea para el mapa del cuerpo (vista frontal, sin rasgos).
// Se dibuja media silueta y se refleja sobre el eje central (x = 120).
// Lo usan el mapa de la portada y el script que genera public/og.png.

export const VISTA = { ancho: 240, alto: 520 };

/** Cabeza: elipse. */
export const CABEZA = { cx: 120, cy: 40, rx: 23, ry: 29 };

/** Media silueta: cuello, hombro, brazo, costado y pierna (lado izquierdo del dibujo). */
export const MEDIA = [
  'M110 66',
  'C110 78 109 86 106 91', // cuello
  'C96 96 82 98 73 104', // trapecio hasta el hombro
  'C63 110 60 124 60 140', // hombro
  'C59 160 57 180 56 200', // brazo hasta el codo
  'C54 226 51 256 49 282', // antebrazo hasta la muñeca
  'C46 292 44 302 47 310', // mano
  'C50 317 58 317 60 309',
  'C62 300 62 292 63 284', // muñeca por dentro
  'C66 258 70 230 72 204', // antebrazo por dentro
  'C74 182 78 162 82 146', // axila
  'C85 174 88 204 88 228', // costado hasta la cintura
  'C88 246 82 262 82 282', // cadera
  'C82 312 86 342 90 372', // muslo hasta la rodilla
  'C92 402 93 432 96 466', // pierna hasta el tobillo
  'C97 478 87 486 89 494', // pie
  'C93 501 110 501 113 493',
  'C115 485 112 476 112 466', // tobillo por dentro
  'C112 432 114 402 114 372', // rodilla por dentro
  'C116 346 118 322 120 302', // entrepierna
].join(' ');

/** Áreas que se rellenan al elegir una zona (elipses). Las zonas de los dos lados se dibujan en ambos. */
export const AREAS: Record<string, { cx: number; cy: number; rx: number; ry: number; simetrica?: boolean }[]> = {
  cuello: [{ cx: 120, cy: 82, rx: 17, ry: 13 }],
  hombro: [{ cx: 68, cy: 114, rx: 17, ry: 20, simetrica: true }],
  'espalda-alta': [{ cx: 120, cy: 136, rx: 33, ry: 24 }],
  lumbar: [{ cx: 120, cy: 222, rx: 30, ry: 17 }],
  'codo-muneca': [{ cx: 57, cy: 204, rx: 12, ry: 15, simetrica: true }, { cx: 56, cy: 284, rx: 11, ry: 13, simetrica: true }],
  cadera: [{ cx: 92, cy: 276, rx: 17, ry: 20, simetrica: true }],
  rodilla: [{ cx: 102, cy: 372, rx: 15, ry: 19, simetrica: true }],
  'tobillo-pie': [{ cx: 102, cy: 480, rx: 17, ry: 19, simetrica: true }],
};

/**
 * Dónde va el botón de cada zona (en unidades del dibujo) y hacia qué lado sale su etiqueta.
 * Separados lo bastante para que los botones de 44 px no se pisen con la figura a 190 px de ancho.
 */
export const MARCAS: Record<string, { x: number; y: number; lado: 'izq' | 'der' }> = {
  cuello: { x: 120, y: 82, lado: 'der' },
  hombro: { x: 64, y: 116, lado: 'izq' },
  'espalda-alta': { x: 120, y: 142, lado: 'der' },
  lumbar: { x: 120, y: 222, lado: 'der' },
  'codo-muneca': { x: 56, y: 222, lado: 'izq' },
  cadera: { x: 160, y: 278, lado: 'der' },
  rodilla: { x: 102, y: 372, lado: 'izq' },
  'tobillo-pie': { x: 138, y: 476, lado: 'der' },
};

/** Reflejo de una coordenada x sobre el eje. */
export const reflejar = (x: number) => VISTA.ancho - x;
