// Bloques de los edificios (una InstancedMesh ordenada por filas) y lo que se construye alrededor:
// la calle con sus farolas, la grúa y el andamio de las apps en desarrollo y el solar «Tu proyecto aquí».

import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PlaneGeometry,
  Quaternion,
  Vector3,
  type CanvasTexture,
} from 'three';
import { COLORES } from './escena';
import { CALLE, PLANTA_ALTO, PRIMERA_PLANTA, fachada, type Trazado } from './trazado';
import type { Objetivo } from './ventanas';

const caja = () => new BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
const m = new Matrix4();
const giro = new Quaternion();
const colocar = (malla: InstancedMesh, i: number, x: number, y: number, z: number, ax: number, ay: number, az: number) =>
  malla.setMatrixAt(i, m.compose(new Vector3(x, y, z), giro, new Vector3(ax, ay, az)));

export function crearEdificios(trazado: Trazado): InstancedMesh {
  const malla = new InstancedMesh(caja(), new MeshLambertMaterial({ color: COLORES.edificio }), trazado.edificios.length);
  trazado.edificios.forEach((e, i) => {
    // El solar es un lote vacío: su instancia se queda sin tamaño
    if (e.vacio) colocar(malla, i, e.x, 0, e.z, 0, 0, 0);
    else colocar(malla, i, e.x, 0, e.z, e.ancho, e.alto, e.fondo);
  });
  malla.computeBoundingSphere();
  return malla;
}

// --- La calle: acera con bordillo, calzada con su raya y farolas -------------------------

export interface Calle {
  objeto: Group;
  /** Las farolas se apagan con la ciudad (404). */
  apagar(): void;
}

/** Largo de la calle: llega más allá de lo que se ve por los lados. */
const LARGO_CALLE = 160;

export function crearCalle(trazado: Trazado, halo: CanvasTexture): Calle {
  const { calle } = trazado;
  const grupo = new Group();
  const geometria = caja();

  // La acera es un escalón con luz (el bordillo se lee por su cara de delante); la calzada, un plano
  const acera = new Mesh(geometria, new MeshLambertMaterial({ color: COLORES.acera }));
  acera.scale.set(LARGO_CALLE, CALLE.bordillo, calle.bordillo - calle.fachada + 0.4);
  acera.position.set(0, 0, (calle.fachada - 0.4 + calle.bordillo) / 2);
  const calzada = new Mesh(new PlaneGeometry(LARGO_CALLE, calle.fin - calle.bordillo), new MeshBasicMaterial({ color: COLORES.calzada }));
  calzada.rotation.x = -Math.PI / 2;
  calzada.position.set(0, 0.004, (calle.bordillo + calle.fin) / 2);
  grupo.add(acera, calzada);

  // Raya discontinua en medio de la calzada
  const tramos = Math.floor(LARGO_CALLE / 3);
  const rayas = new InstancedMesh(new PlaneGeometry(1.3, 0.09), new MeshBasicMaterial({ color: COLORES.raya }), tramos);
  const enSuelo = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2);
  for (let k = 0; k < tramos; k++) {
    rayas.setMatrixAt(k, m.compose(new Vector3(-LARGO_CALLE / 2 + 1.5 + k * 3, 0.008, (calle.bordillo + calle.fin) / 2), enSuelo, new Vector3(1, 1, 1)));
  }
  grupo.add(rayas);

  // Farolas: poste, brazo hacia la calzada y una cabeza de luz fría, con su charco de luz en la acera
  const n = calle.farolas.length;
  const metal = new MeshLambertMaterial({ color: '#2a4636' });
  const postes = new InstancedMesh(geometria, metal, n);
  const brazos = new InstancedMesh(geometria, metal, n);
  const luz = new MeshBasicMaterial({ color: new Color(COLORES.farola).multiplyScalar(0.6), toneMapped: false });
  const cabezas = new InstancedMesh(geometria, luz, n);
  const charco = new MeshBasicMaterial({ map: halo, color: '#9fbfae', transparent: true, opacity: 0.2, depthWrite: false, blending: AdditiveBlending });
  const charcos = new InstancedMesh(new PlaneGeometry(3.2, 2.6), charco, n);
  const z = calle.bordillo - 0.3;
  calle.farolas.forEach((x, i) => {
    colocar(postes, i, x, CALLE.bordillo, z, 0.09, CALLE.farola, 0.09);
    colocar(brazos, i, x, CALLE.bordillo + CALLE.farola - 0.06, z + 0.3, 0.06, 0.06, 0.7);
    colocar(cabezas, i, x, CALLE.bordillo + CALLE.farola - 0.16, z + 0.55, 0.22, 0.09, 0.36);
    charcos.setMatrixAt(i, m.compose(new Vector3(x, CALLE.bordillo + 0.005, z - 0.2), enSuelo, new Vector3(1, 1, 1)));
  });
  for (const malla of [postes, brazos, cabezas, charcos]) malla.computeBoundingSphere();
  grupo.add(postes, brazos, cabezas, charcos);

  return {
    objeto: grupo,
    apagar: () => {
      luz.color.set(COLORES.apagada);
      charcos.visible = false;
    },
  };
}

// --- Obras: grúa en la azotea y andamio bajo el ventanal ----------------------------

export interface Obras {
  objetos: Group[];
  /** La pluma se mueve despacio y la luz de la punta parpadea (nada con movimiento reducido). */
  actualizar(t: number, conMovimiento: boolean): void;
  apagar(): void;
}

/** Algo más claro que los edificios: la grúa se lee recortada contra el cielo y el andamio, sobre la fachada. */
const COLOR_OBRA = '#1f3d2c';

export function crearObras(trazado: Trazado): Obras {
  const material = new MeshLambertMaterial({ color: COLOR_OBRA });
  const geometria = caja();
  const luz = new MeshBasicMaterial({ color: new Color(COLORES.estrellas).multiplyScalar(0.9), toneMapped: false });
  const plumas: Group[] = [];
  const luces: Mesh[] = [];

  const objetos = trazado.obras.map((o) => {
    const e = trazado.edificios[o.edificio];
    const obra = new Group();
    const pieza = (ax: number, ay: number, az: number, x: number, y: number, z: number, padre: Group = obra) => {
      const p = new Mesh(geometria, material);
      p.scale.set(ax, ay, az);
      p.position.set(x, y, z);
      padre.add(p);
      return p;
    };

    // Grúa: mástil en un lado de la azotea y pluma paralela a la fachada, hacia el centro
    const alto = 7;
    const xMastil = e.x + o.lado * (e.ancho / 2 - 0.5);
    pieza(0.3, alto, 0.3, xMastil, e.alto, e.z);
    pieza(0.16, 1.2, 0.16, xMastil, e.alto + alto + 0.25, e.z);
    const pluma = new Group();
    pluma.position.set(xMastil, e.alto + alto, e.z);
    const hacia = -o.lado;
    pieza(6.2, 0.22, 0.22, (hacia * 6.2) / 2, 0, 0, pluma);
    pieza(2.2, 0.22, 0.22, (-hacia * 2.2) / 2, 0, 0, pluma);
    pieza(0.8, 0.6, 0.5, -hacia * 1.9, -0.3, 0, pluma); // contrapeso
    pieza(0.6, 0.5, 0.5, hacia * 0.45, -0.5, 0, pluma); // cabina
    pieza(0.04, 2.6, 0.04, hacia * 4, -2.6, 0, pluma); // cable
    pieza(0.25, 0.22, 0.25, hacia * 4, -2.8, 0, pluma); // gancho
    const punta = new Mesh(new BoxGeometry(0.14, 0.14, 0.14), luz);
    punta.position.set(hacia * 6.2, 0.18, 0);
    pluma.add(punta);
    obra.add(pluma);
    plumas.push(pluma);
    luces.push(punta);

    // Andamio delante de la fachada, de la calle hasta la planta de debajo del ventanal
    const z = fachada(e) + 0.3;
    const arriba = PRIMERA_PLANTA + (o.plantas - 1) * PLANTA_ALTO + 0.5;
    const tramos = Math.max(1, Math.round(e.ancho / 1.8));
    for (let k = 0; k <= tramos; k++) {
      pieza(0.07, arriba, 0.07, e.x - e.ancho / 2 + 0.1 + (k * (e.ancho - 0.2)) / tramos, 0, z);
    }
    for (let p = 0; p < o.plantas; p++) {
      pieza(e.ancho - 0.1, 0.07, 0.5, e.x, PRIMERA_PLANTA - 0.6 + p * PLANTA_ALTO, z - 0.15);
      pieza(e.ancho - 0.1, 0.04, 0.04, e.x, PRIMERA_PLANTA - 0.05 + p * PLANTA_ALTO, z + 0.08); // barandilla
    }
    return obra;
  });

  let apagadas = false;
  return {
    objetos,
    actualizar: (t, conMovimiento) => {
      plumas.forEach((p, i) => (p.rotation.y = conMovimiento ? Math.sin(t * 0.11 + i) * 0.35 : 0));
      luces.forEach((l) => (l.visible = !apagadas && (!conMovimiento || Math.sin(t * Math.PI) > -0.2)));
    },
    apagar: () => (apagadas = true),
  };
}

// --- Solar «Tu proyecto aquí» --------------------------------------------------------

export interface Solar {
  objeto: Group;
  objetivo: Objetivo;
  /** El tablero se ilumina un poco al señalarlo. */
  actualizar(): void;
  apagar(): void;
}

export function crearSolar(trazado: Trazado): Solar {
  const { solar } = trazado;
  const material = new MeshLambertMaterial({ color: COLOR_OBRA });
  const geometria = caja();
  const grupo = new Group();
  const pieza = (ax: number, ay: number, az: number, x: number, y: number, z: number) => {
    const p = new Mesh(geometria, material);
    p.scale.set(ax, ay, az);
    p.position.set(x, y, z);
    grupo.add(p);
  };

  // Valla de obra a ras de calle, con postes
  pieza(solar.ancho, 1.1, 0.06, solar.x, 0, solar.z);
  const postes = Math.max(2, Math.round(solar.ancho / 1.2));
  for (let k = 0; k <= postes; k++) pieza(0.1, 1.25, 0.1, solar.x - solar.ancho / 2 + (k * solar.ancho) / postes, 0, solar.z + 0.05);

  // Cartel sobre dos postes, con su tablero tenuemente iluminado (por debajo del umbral del bloom)
  const c = solar.cartel;
  const pie = c.y - c.alto / 2;
  pieza(0.1, pie, 0.1, c.x - c.ancho / 2 + 0.3, 0, c.z);
  pieza(0.1, pie, 0.1, c.x + c.ancho / 2 - 0.3, 0, c.z);
  pieza(c.ancho, c.alto, 0.08, c.x, pie, c.z);
  const apagado = new Color(COLORES.estrellas).multiplyScalar(0.05);
  const tablero = new Mesh(new PlaneGeometry(c.ancho - 0.16, c.alto - 0.16), new MeshBasicMaterial({ color: apagado.clone(), toneMapped: false }));
  tablero.position.set(c.x, c.y, c.z + 0.05);
  grupo.add(tablero);

  // Zona de toque: el cartel y la valla
  const toque = new Mesh(new PlaneGeometry(Math.max(c.ancho, solar.ancho), c.y + c.alto / 2 + 0.3), new MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
  toque.position.set(c.x, (c.y + c.alto / 2 + 0.3) / 2, solar.z + 0.1);
  grupo.add(toque);
  const objetivo: Objetivo = { id: '#contacto', posicion: new Vector3(c.x, c.y, c.z + 0.05), tamano: { ancho: c.ancho, alto: c.alto }, brillo: 0, toque };
  toque.userData.objetivo = objetivo;
  return {
    objeto: grupo,
    objetivo,
    actualizar: () => tablero.material.color.copy(apagado).multiplyScalar(1 + objetivo.brillo * 1.5),
    apagar: () => apagado.set(COLORES.apagada),
  };
}
