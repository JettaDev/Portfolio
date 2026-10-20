// Detalles de los edificios: cornisas, lo que hay en las azoteas (depósitos de agua, antenas y
// aparatos de aire), balcones en la fila de delante y bajos comerciales con su escaparate, su
// toldo y algún neón. Salen del trazado con su propio azar: la ciudad no cambia al añadirlos.
// `trazarDetalles` es puro (sin three) y tiene tests; `crearDetalles` lo convierte en mallas.

import {
  AdditiveBlending,
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PlaneGeometry,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { ruido } from './semilla';
import { COLORES } from './escena';
import { HUECO, PRIMERA_PLANTA, fachada, type Trazado } from './trazado';

export interface Caja {
  x: number;
  y: number;
  z: number;
  ancho: number;
  alto: number;
  fondo: number;
}

export interface Comercio {
  x: number;
  z: number;
  ancho: number;
  /** Tono del interior (índice de LUZ_COMERCIO) y del toldo (índice de TOLDOS, -1 sin toldo). */
  luz: number;
  toldo: number;
  neon?: { texto: string; color: string };
}

export interface Detalles {
  cornisas: Caja[];
  depositos: { x: number; y: number; z: number; radio: number; alto: number }[];
  antenas: { x: number; y: number; z: number; alto: number; luz: boolean }[];
  aires: Caja[];
  balcones: { x: number; y: number; z: number }[];
  comercios: Comercio[];
}

/** Hasta dónde llega lo que se ve de la calle a cada lado (encuadre ancho a la distancia mínima). */
const VISIBLE_X = 34;
const NEONES = [
  { texto: '24h', color: '#7fe0a6' },
  { texto: 'BAR', color: '#8fd3ff' },
  { texto: 'HOTEL', color: '#b9e6d2' },
] as const;
export const LUZ_COMERCIO = ['#f0d7a8', '#cfe3d6', '#d9e6f0'];
export const TOLDOS = ['#2f5640', '#3b4a5a', '#5a3b3b', '#56523c'];

/**
 * Lo alto que hay en una azotea (depósitos, antenas) no puede tapar un ventanal: solo en las filas
 * del fondo o en edificios lejos, de lado, de los ventanales que tienen detrás.
 */
function azoteaLibre(t: Trazado, i: number): boolean {
  const e = t.edificios[i];
  if (e.vacio || i === t.tienda) return false;
  if (t.obras.some((o) => o.edificio === i)) return false;
  return t.proyectos.every((p) => p.fila <= e.fila || Math.abs(e.x - p.x) > e.ancho / 2 + 5);
}

export function trazarDetalles(t: Trazado, semilla: number): Detalles {
  const r = (...n: number[]) => ruido(semilla ^ 0xdec0, ...n);
  const d: Detalles = { cornisas: [], depositos: [], antenas: [], aires: [], balcones: [], comercios: [] };
  const especiales = new Set([t.tienda, ...t.proyectos.map((p) => p.edificio), ...t.obras.map((o) => o.edificio)]);

  t.edificios.forEach((e, i) => {
    if (e.vacio) return;
    // Cornisa: un remate algo más ancho justo por debajo de la azotea (no sube la altura)
    d.cornisas.push({ x: e.x, y: e.alto - 0.22, z: e.z, ancho: e.ancho + 0.16, alto: 0.2, fondo: e.fondo + 0.16 });
    if (!azoteaLibre(t, i)) return;
    const margen = 0.7;
    const dentro = (k: number, lado: number) => (r(i, k, lado) - 0.5) * Math.max(0, lado - 2 * margen);
    if (r(i, 1) < 0.32) {
      const radio = 0.5 + r(i, 2) * 0.3;
      d.depositos.push({ x: e.x + dentro(3, e.ancho), y: e.alto, z: e.z + dentro(4, e.fondo), radio, alto: 1 + r(i, 5) * 0.5 });
    }
    if (r(i, 6) < 0.3) {
      d.antenas.push({ x: e.x + dentro(7, e.ancho), y: e.alto, z: e.z + dentro(8, e.fondo), alto: 1.8 + r(i, 9) * 2.6, luz: r(i, 10) < 0.45 });
    }
    const aires = Math.floor(r(i, 11) * 3);
    for (let k = 0; k < aires; k++) {
      d.aires.push({ x: e.x + dentro(12 + k, e.ancho), y: e.alto, z: e.z + dentro(20 + k, e.fondo), ancho: 0.6, alto: 0.42, fondo: 0.5 });
    }
  });

  // Fila de delante: balcones bajo algunas ventanas y bajos comerciales
  const delante = t.edificios.map((e, i) => ({ e, i })).filter(({ e, i }) => e.fila === 0 && !e.vacio && !especiales.has(i) && Math.abs(e.x) < VISIBLE_X);
  const edificioEn = (x: number) => delante.find(({ e }) => Math.abs(x - e.x) < e.ancho / 2);
  t.huecos.forEach((h, k) => {
    if (h.fila !== 0 || h.y < PRIMERA_PLANTA + 1) return;
    if (!edificioEn(h.x) || r(k, 30) > 0.13) return;
    d.balcones.push({ x: h.x, y: h.y - HUECO.alto / 2 - 0.1, z: h.z });
  });
  let neones = 0;
  // Los más cercanos al centro primero: los neones caen donde se ven
  for (const { e, i } of [...delante].sort((a, b) => Math.abs(a.e.x) - Math.abs(b.e.x))) {
    if (e.ancho < 2.6 || r(i, 40) > 0.62) continue;
    const comercio: Comercio = { x: e.x, z: fachada(e), ancho: e.ancho - 0.5, luz: Math.floor(r(i, 41) * LUZ_COMERCIO.length), toldo: r(i, 42) < 0.7 ? Math.floor(r(i, 43) * TOLDOS.length) : -1 };
    if (neones < NEONES.length && r(i, 44) < 0.7) comercio.neon = NEONES[neones++];
    d.comercios.push(comercio);
  }
  return d;
}

// --- Mallas -------------------------------------------------------------------------

export interface MallasDetalles {
  objeto: Group;
  /** Las luces de las antenas parpadean despacio. */
  actualizar(t: number, conMovimiento: boolean): void;
  apagar(): void;
}

const m = new Matrix4();
const q = new Quaternion();

function instancias(geometria: BoxGeometry | CylinderGeometry | PlaneGeometry, material: MeshLambertMaterial | MeshBasicMaterial, cajas: { x: number; y: number; z: number; ancho: number; alto: number; fondo: number; giro?: Quaternion }[]) {
  const malla = new InstancedMesh(geometria, material, Math.max(1, cajas.length));
  malla.count = cajas.length;
  cajas.forEach((c, k) => malla.setMatrixAt(k, m.compose(new Vector3(c.x, c.y, c.z), c.giro ?? q.identity(), new Vector3(c.ancho, c.alto, c.fondo))));
  malla.computeBoundingSphere();
  return malla;
}

function texturaNeon(texto: string): { textura: CanvasTexture; aspecto: number } {
  const c = document.createElement('canvas');
  const g = c.getContext('2d')!;
  const alto = 96;
  const fuente = `700 ${alto * 0.7}px "Bricolage Grotesque Variable", system-ui, sans-serif`;
  g.font = fuente;
  c.width = Math.ceil(g.measureText(texto).width + alto * 0.5);
  c.height = alto;
  g.font = fuente;
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(texto, c.width / 2, alto * 0.55);
  const textura = new CanvasTexture(c);
  textura.colorSpace = SRGBColorSpace;
  return { textura, aspecto: c.width / c.height };
}

export function crearDetalles(d: Detalles, halo: CanvasTexture): MallasDetalles {
  const grupo = new Group();
  const caja = new BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const oscuro = new MeshLambertMaterial({ color: '#0b1d13' });
  const metal = new MeshLambertMaterial({ color: '#29483a' });

  grupo.add(instancias(caja, new MeshLambertMaterial({ color: '#1b3a29' }), d.cornisas));

  // Depósitos: cilindro sobre cuatro patas, con su tejadillo
  const cilindro = new CylinderGeometry(1, 1, 1, 12).translate(0, 0.5, 0);
  const cono = new CylinderGeometry(0.05, 1.08, 1, 12).translate(0, 0.5, 0);
  grupo.add(instancias(cilindro, metal, d.depositos.map((p) => ({ x: p.x, y: p.y + 0.6, z: p.z, ancho: p.radio, alto: p.alto, fondo: p.radio }))));
  grupo.add(instancias(cono, oscuro, d.depositos.map((p) => ({ x: p.x, y: p.y + 0.6 + p.alto, z: p.z, ancho: p.radio, alto: 0.35, fondo: p.radio }))));
  const patas = d.depositos.flatMap((p) =>
    [-1, 1].flatMap((a) => [-1, 1].map((b) => ({ x: p.x + a * p.radio * 0.6, y: p.y, z: p.z + b * p.radio * 0.6, ancho: 0.07, alto: 0.6, fondo: 0.07 }))),
  );
  grupo.add(instancias(caja, oscuro, patas));

  // Antenas: mástil fino, un travesaño y, en algunas, una luz arriba
  grupo.add(instancias(caja, metal, d.antenas.map((a) => ({ x: a.x, y: a.y, z: a.z, ancho: 0.05, alto: a.alto, fondo: 0.05 }))));
  grupo.add(instancias(caja, metal, d.antenas.map((a) => ({ x: a.x, y: a.y + a.alto * 0.7, z: a.z, ancho: 0.7, alto: 0.04, fondo: 0.04 }))));
  const conLuz = d.antenas.filter((a) => a.luz);
  const luzAntena = new MeshBasicMaterial({ color: new Color(COLORES.estrellas).multiplyScalar(0.85), toneMapped: false });
  const lucesAntena = instancias(caja, luzAntena, conLuz.map((a) => ({ x: a.x, y: a.y + a.alto, z: a.z, ancho: 0.1, alto: 0.1, fondo: 0.1 })));
  grupo.add(lucesAntena);

  grupo.add(instancias(caja, metal, d.aires));

  // Balcones: losa, barandilla y dos postes
  grupo.add(instancias(caja, oscuro, d.balcones.map((b) => ({ x: b.x, y: b.y, z: b.z + 0.2, ancho: 0.78, alto: 0.06, fondo: 0.4 }))));
  grupo.add(instancias(caja, metal, d.balcones.map((b) => ({ x: b.x, y: b.y + 0.4, z: b.z + 0.38, ancho: 0.78, alto: 0.04, fondo: 0.04 }))));
  grupo.add(
    instancias(
      caja,
      metal,
      d.balcones.flatMap((b) => [-1, 0, 1].map((k) => ({ x: b.x + k * 0.37, y: b.y, z: b.z + 0.38, ancho: 0.03, alto: 0.42, fondo: 0.03 }))),
    ),
  );

  // Bajos comerciales: escaparate con luz tenue (por debajo del umbral del bloom), marco, toldo
  // inclinado y, en algunos, un neón pequeño encima
  const vidrios: Mesh[] = [];
  const neones: Mesh[] = [];
  const brillos: Mesh[] = [];
  const toldo = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 0.38);
  const toldos: (Caja & { giro: Quaternion; color: string })[] = [];
  for (const c of d.comercios) {
    const vidrio = new Mesh(new PlaneGeometry(c.ancho, 1.25), new MeshBasicMaterial({ color: new Color(LUZ_COMERCIO[c.luz]).multiplyScalar(0.3), toneMapped: false }));
    vidrio.position.set(c.x, 0.95, c.z + 0.04);
    const marco = new Mesh(caja, oscuro);
    marco.scale.set(c.ancho + 0.2, 1.5, 0.05);
    marco.position.set(c.x, 0.2, c.z + 0.02);
    grupo.add(marco, vidrio);
    vidrios.push(vidrio);
    // Luz del escaparate en la acera
    const charco = new Mesh(new PlaneGeometry(c.ancho * 1.2, 1.6), new MeshBasicMaterial({ map: halo, color: LUZ_COMERCIO[c.luz], transparent: true, opacity: 0.13, depthWrite: false, blending: AdditiveBlending }));
    charco.rotation.x = -Math.PI / 2;
    charco.position.set(c.x, 0.13, c.z + 0.9);
    grupo.add(charco);
    brillos.push(charco);
    if (c.toldo >= 0) toldos.push({ x: c.x, y: 1.72, z: c.z + 0.05, ancho: c.ancho + 0.1, alto: 0.05, fondo: 0.9, giro: toldo, color: TOLDOS[c.toldo] });
    if (c.neon) {
      const { textura, aspecto } = texturaNeon(c.neon.texto);
      const alto = 0.42;
      const neon = new Mesh(
        new PlaneGeometry(alto * aspecto, alto),
        new MeshBasicMaterial({ map: textura, color: new Color(c.neon.color).multiplyScalar(1.15), transparent: true, depthWrite: false, toneMapped: false }),
      );
      neon.position.set(c.x, 2.15, c.z + 0.06);
      grupo.add(neon);
      neones.push(neon);
    }
  }
  for (const [k, color] of TOLDOS.entries()) {
    const propios = toldos.filter((x) => x.color === TOLDOS[k]);
    if (propios.length) grupo.add(instancias(new BoxGeometry(1, 1, 1).translate(0, 0, 0.5), new MeshLambertMaterial({ color }), propios));
  }

  let apagada = false;
  return {
    objeto: grupo,
    actualizar: (tiempo, conMovimiento) => {
      if (apagada) return;
      // Las luces de las antenas se encienden y apagan despacio, cada una a su ritmo
      lucesAntena.visible = !conMovimiento || Math.sin(tiempo * 1.7) > -0.3;
      // Algún neón titila de vez en cuando
      neones.forEach((n, k) => (n.visible = !conMovimiento || Math.sin(tiempo * (0.7 + k * 0.31) + k * 2) > -0.97 || Math.sin(tiempo * 23) > 0));
    },
    apagar: () => {
      apagada = true;
      lucesAntena.visible = false;
      neones.forEach((n) => (n.visible = false));
      brillos.forEach((b) => (b.visible = false));
      vidrios.forEach((v) => (v.material as MeshBasicMaterial).color.set(COLORES.apagada));
    },
  };
}
