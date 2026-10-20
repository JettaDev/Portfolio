// La vida de la ciudad: coches que pasan por la calle con sus faros, siluetas en algunas ventanas
// encendidas, teles que parpadean, humo en las chimeneas y un avión que cruza el cielo de vez en
// cuando. Todo lo que se mueve se queda quieto (o no está) con movimiento reducido: así se pinta
// el póster. Las ventanas de las siluetas y las teles se eligen con su propio azar.

import {
  AdditiveBlending,
  BoxGeometry,
  CanvasTexture,
  Color,
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

const ARRIBA = new Vector3(0, 1, 0);
import { ruido } from './semilla';
import { HUECO, type Trazado } from './trazado';
import type { Huecos } from './ventanas';

/** Huecos con alguien dentro (siluetas) y con la tele puesta: no parpadean. */
export function elegirHuecosVivos(t: Trazado, semilla: number): { siluetas: number[]; teles: number[] } {
  const libres = t.huecos
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => h.encendida && h.fila <= 1 && Math.abs(h.x) < 26 && t.proyectos.every((p) => Math.hypot(p.x - h.x, p.y - h.y) > 2.5));
  const orden = [...libres].sort((a, b) => ruido(semilla ^ 0x51e7, a.i) - ruido(semilla ^ 0x51e7, b.i));
  return { siluetas: orden.slice(0, 12).map((x) => x.i), teles: orden.slice(12, 16).map((x) => x.i) };
}

/** Silueta de una persona (cabeza y hombros) pintada en un canvas. */
function texturaSilueta(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 96;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(32, 34, 13, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.moveTo(8, 96);
  g.quadraticCurveTo(8, 56, 32, 54);
  g.quadraticCurveTo(56, 56, 56, 96);
  g.fill();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export interface Vida {
  objeto: Group;
  actualizar(t: number, dt: number, conMovimiento: boolean): void;
  apagar(): void;
}

interface Coche {
  x: number;
  visible: boolean;
  carril: 0 | 1;
  velocidad: number;
  /** Segundos que faltan para volver a salir (fuera de la calle). */
  espera: number;
}

/** Hasta dónde llegan los coches por los lados antes de dar la vuelta (fuera de la vista). */
const FIN_CALLE = 75;
const PINTURA = ['#46596b', '#6b4040', '#44695a', '#6b6448', '#3a4048', '#7c8288'];

export function crearVida(t: Trazado, semilla: number, huecos: Huecos, elegidos: { siluetas: number[]; teles: number[] }, halo: CanvasTexture, { pocos = false } = {}): Vida {
  const grupo = new Group();
  const caja = new BoxGeometry(1, 1, 1);
  const r = (...n: number[]) => ruido(semilla ^ 0x71da, ...n);

  // --- Coches ------------------------------------------------------------------------
  // Todos los coches comparten mallas instanciadas (una por pieza): pocas llamadas de dibujo.
  // Sin luz propia (colores planos, como las ventanas): de noche se leen por los faros
  const { calle } = t;
  const carriles = [calle.bordillo + 2.1, calle.fin - 1.9];
  const n = pocos ? 2 : 4;
  const tumbado = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2);
  /** Piezas de un coche mirando a +x: malla, posición, tamaño y si va tumbada (la luz en el suelo). */
  const piezas: { malla: InstancedMesh; local: Matrix4[] }[] = [];
  const pieza = (material: MeshBasicMaterial, cajas: [number, number, number, number, number, number][], geometria: BoxGeometry | PlaneGeometry = caja, enSuelo = false) => {
    const malla = new InstancedMesh(geometria, material, n * cajas.length);
    malla.frustumCulled = false;
    const local = cajas.map(([x, y, z, a, h, f]) => new Matrix4().compose(new Vector3(x, y, z), enSuelo ? tumbado : new Quaternion(), new Vector3(a, h, f)));
    piezas.push({ malla, local });
    grupo.add(malla);
    return malla;
  };
  const carrocerias = pieza(new MeshBasicMaterial({ toneMapped: false }), [[0, 0.5, 0, 3.6, 0.6, 1.6]]);
  for (let k = 0; k < n; k++) carrocerias.setColorAt(k, new Color(PINTURA[k % PINTURA.length]).multiplyScalar(0.3));
  pieza(new MeshBasicMaterial({ color: '#16241f' }), [[-0.25, 1.02, 0, 1.9, 0.48, 1.42]]);
  pieza(
    new MeshBasicMaterial({ color: '#050907' }),
    [-1.15, 1.15].flatMap((x) => [-0.78, 0.78].map((z): [number, number, number, number, number, number] => [x, 0.28, z, 0.56, 0.56, 0.18])),
  );
  const luces = pieza(new MeshBasicMaterial({ toneMapped: false }), [-0.55, 0.55].flatMap((z): [number, number, number, number, number, number][] => [[1.81, 0.58, z, 0.04, 0.14, 0.26], [-1.81, 0.6, z, 0.04, 0.12, 0.24]]));
  const faro = new Color('#f4f1e1').multiplyScalar(1.4);
  const piloto = new Color('#c8553d').multiplyScalar(0.9);
  for (let k = 0; k < n; k++) [faro, piloto, faro, piloto].forEach((c, j) => luces.setColorAt(k * 4 + j, c));
  // La luz de los faros en el asfalto, alargada hacia delante
  pieza(new MeshBasicMaterial({ map: halo, color: '#f4f1e1', transparent: true, opacity: 0.2, depthWrite: false, blending: AdditiveBlending }), [[4.6, 0.02, 0, 6, 2.6, 1]], new PlaneGeometry(1, 1), true);

  const coches: Coche[] = Array.from({ length: n }, (_, k) => {
    const carril = (k % 2) as 0 | 1;
    return { x: 0, carril, velocidad: 0, visible: false, espera: 1 + k * 3.5 + r(k) * 3 };
  });
  const oculto = new Matrix4().makeScale(0, 0, 0);
  const matriz = new Matrix4();
  const colocarCoche = (c: Coche, k: number) => {
    const base = new Matrix4().compose(new Vector3(c.x, 0, carriles[c.carril]), new Quaternion().setFromAxisAngle(ARRIBA, c.carril === 1 ? Math.PI : 0), new Vector3(1, 1, 1));
    for (const { malla, local } of piezas) {
      local.forEach((l, j) => malla.setMatrixAt(k * local.length + j, c.visible ? matriz.multiplyMatrices(base, l) : oculto));
      malla.instanceMatrix.needsUpdate = true;
    }
  };
  coches.forEach(colocarCoche);
  const salir = (c: Coche, k: number, vuelta: number) => {
    c.velocidad = 7 + ruido(semilla, k, vuelta) * 5;
    c.x = c.carril === 0 ? -FIN_CALLE : FIN_CALLE;
    c.visible = true;
  };
  let vueltas = 0;

  // --- Siluetas y teles -----------------------------------------------------------------
  const silueta = texturaSilueta();
  const sombra = new MeshBasicMaterial({ map: silueta, color: '#0a1611', transparent: true, depthWrite: false });
  const siluetas = elegidos.siluetas.map((i, k) => {
    const h = t.huecos[i];
    const s = new Mesh(new PlaneGeometry(HUECO.ancho * 0.62, HUECO.alto * 0.82), sombra);
    s.position.set(h.x, h.y - HUECO.alto * 0.1, h.z + 0.004);
    grupo.add(s);
    return { malla: s, x: h.x, fase: r(k, 1) * 10, ritmo: 0.15 + r(k, 2) * 0.25 };
  });
  const teles = elegidos.teles.map((i) => ({ i, base: new Color('#7aa6d6') }));
  const tele = new Color();

  // --- Humo de las chimeneas ------------------------------------------------------------
  // En azoteas de las filas del medio, cerca del centro: se recortan contra el cielo
  const chimeneas = t.edificios
    .map((e, i) => ({ e, i }))
    .filter(({ e, i }) => !e.vacio && e.fila >= 2 && e.fila <= 3 && Math.abs(e.x) < 30 && t.proyectos.every((p) => p.edificio !== i) && r(i, 5) < 0.18)
    .slice(0, pocos ? 0 : 4);
  const ladrillo = new MeshLambertMaterial({ color: '#1d3326' });
  // Planos de cara a la cámara con el halo (mismo material que el resto de luces: sin shader nuevo)
  const plano = new PlaneGeometry(1, 1);
  const focos = chimeneas.map(({ e, i }) => {
    const x = e.x + (r(i, 6) - 0.5) * (e.ancho - 1.4);
    const z = e.z + (r(i, 7) - 0.5) * (e.fondo - 1.4);
    const ch = new Mesh(caja, ladrillo);
    ch.scale.set(0.45, 1.3, 0.45);
    ch.position.set(x, e.alto + 0.65, z);
    grupo.add(ch);
    return { x, y: e.alto + 1.4, z };
  });
  const PUFOS = 6;
  // El humo crece al subir y se deshace encogiendo (un solo material para todas las bocanadas)
  const humo = new InstancedMesh(plano, new MeshBasicMaterial({ map: halo, color: '#8fa79a', transparent: true, opacity: 0.09, depthWrite: false }), Math.max(1, focos.length * PUFOS));
  humo.count = focos.length * PUFOS;
  humo.frustumCulled = false;
  grupo.add(humo);
  const bocanadas = focos.flatMap((f) => Array.from({ length: PUFOS }, (_, k) => ({ ...f, fase: k / PUFOS })));

  // --- Avión ----------------------------------------------------------------------------
  const avion = new Group();
  const luzAvion = (color: string, x: number) => {
    const l = new Mesh(plano, new MeshBasicMaterial({ map: halo, color: new Color(color).multiplyScalar(1.6), transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false }));
    l.scale.setScalar(2.4);
    l.position.x = x;
    avion.add(l);
    return l;
  };
  const destello = luzAvion('#f4f1e1', 0);
  const fija = luzAvion('#c8553d', -3);
  fija.scale.setScalar(1.6);
  avion.visible = false;
  grupo.add(avion);
  let vuelo = { x: 0, espera: 6 + r(9) * 10 };

  let apagada = false;
  return {
    objeto: grupo,
    actualizar: (tiempo, dt, conMovimiento) => {
      if (apagada) return;
      // Coches: salen de un lado, cruzan y desaparecen por el otro; luego esperan un rato
      coches.forEach((c, k) => {
        if (!conMovimiento) {
          if (c.visible) {
            c.visible = false;
            colocarCoche(c, k);
          }
          return;
        }
        if (!c.visible) {
          c.espera -= dt;
          if (c.espera <= 0) salir(c, k, vueltas++);
          else return;
        }
        c.x += (c.carril === 0 ? 1 : -1) * c.velocidad * dt;
        if (Math.abs(c.x) > FIN_CALLE) {
          c.visible = false;
          c.espera = 2 + ruido(semilla, k, vueltas, 3) * 9;
        }
        colocarCoche(c, k);
      });

      // Siluetas: alguien que cruza la habitación despacio, de lado a lado
      siluetas.forEach((s) => {
        const ir = conMovimiento ? Math.sin(tiempo * s.ritmo + s.fase) : 0;
        s.malla.position.x = s.x + ir * HUECO.ancho * 0.22;
      });
      // Teles: la luz cambia a saltos, entre azul y blanco
      teles.forEach((tv, k) => {
        const cambio = conMovimiento ? Math.floor(tiempo * 4 + k * 1.7) : 0;
        const v = 0.1 + ruido(semilla, tv.i, cambio) * 0.12;
        huecos.tenir(tv.i, tele.copy(tv.base).lerp(new Color('#e6eee4'), ruido(semilla, tv.i, cambio, 1) * 0.5).multiplyScalar(v));
      });

      // Humo: cada bocanada sube, crece y se deshace, y vuelve a empezar
      humo.visible = conMovimiento && bocanadas.length > 0;
      if (humo.visible) {
        bocanadas.forEach((b, k) => {
          const f = (tiempo * 0.12 + b.fase) % 1;
          const lado = (0.8 + f * 2.6) * Math.sin(f * Math.PI);
          humo.setMatrixAt(k, matriz.compose(new Vector3(b.x + f * 1.6, b.y + f * 4, b.z), new Quaternion(), new Vector3(lado, lado, 1)));
        });
        humo.instanceMatrix.needsUpdate = true;
      }

      // Avión: cruza muy alto de izquierda a derecha, con su destello
      if (!conMovimiento) {
        avion.visible = false;
        return;
      }
      if (!avion.visible) {
        vuelo.espera -= dt;
        if (vuelo.espera <= 0) {
          vuelo = { x: -260, espera: 0 };
          avion.position.set(vuelo.x, 95 + r(Math.floor(tiempo)) * 25, -240);
          avion.visible = true;
        }
      } else {
        avion.position.x += dt * 9;
        destello.visible = tiempo % 1.3 < 0.12;
        if (avion.position.x > 260) {
          avion.visible = false;
          vuelo.espera = 25 + r(Math.floor(tiempo), 4) * 30;
        }
      }
    },
    apagar: () => {
      apagada = true;
      grupo.visible = false;
    },
  };
}
