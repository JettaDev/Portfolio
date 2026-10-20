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
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
} from 'three';
import { COLORES } from './escena';
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
  grupo: Group;
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
  const { calle } = t;
  const carriles = [calle.bordillo + 2.1, calle.fin - 1.9];
  const luzFaro = new MeshBasicMaterial({ color: new Color('#f4f1e1').multiplyScalar(1.4), toneMapped: false });
  const luzPiloto = new MeshBasicMaterial({ color: new Color('#c8553d').multiplyScalar(0.9), toneMapped: false });
  const cristal = new MeshLambertMaterial({ color: '#1a2a26', emissive: '#16241f', emissiveIntensity: 0.6 });
  const rueda = new MeshLambertMaterial({ color: '#050907' });
  const haz = new MeshBasicMaterial({ map: halo, color: '#f4f1e1', transparent: true, opacity: 0.2, depthWrite: false, blending: AdditiveBlending });
  const coches: Coche[] = Array.from({ length: pocos ? 2 : 4 }, (_, k) => {
    const g = new Group();
    const pieza = (material: MeshLambertMaterial | MeshBasicMaterial, x: number, y: number, z: number, a: number, h: number, f: number) => {
      const p = new Mesh(caja, material);
      p.scale.set(a, h, f);
      p.position.set(x, y, z);
      g.add(p);
    };
    // Mirando a +x; el carril de atrás va al revés (se gira el grupo)
    // Algo de brillo propio: a la luz de las farolas la carrocería se lee contra el asfalto
    const pintura = PINTURA[k % PINTURA.length];
    pieza(new MeshLambertMaterial({ color: pintura, emissive: pintura, emissiveIntensity: 0.35 }), 0, 0.5, 0, 3.6, 0.6, 1.6);
    pieza(cristal, -0.25, 1.02, 0, 1.9, 0.48, 1.42);
    for (const x of [-1.15, 1.15]) for (const z of [-0.78, 0.78]) pieza(rueda, x, 0.28, z, 0.56, 0.56, 0.18);
    for (const z of [-0.55, 0.55]) {
      pieza(luzFaro, 1.81, 0.58, z, 0.04, 0.14, 0.26);
      pieza(luzPiloto, -1.81, 0.6, z, 0.04, 0.12, 0.24);
    }
    // La luz de los faros en el asfalto, alargada hacia delante
    const suelo = new Mesh(new PlaneGeometry(6, 2.6), haz);
    suelo.rotation.x = -Math.PI / 2;
    suelo.position.set(4.6, 0.02, 0);
    g.add(suelo);
    const carril = (k % 2) as 0 | 1;
    g.position.z = carriles[carril];
    g.rotation.y = carril === 1 ? Math.PI : 0;
    g.visible = false;
    grupo.add(g);
    return { grupo: g, carril, velocidad: 0, espera: 1 + k * 3.5 + r(k) * 3 };
  });
  const salir = (c: Coche, k: number, vuelta: number) => {
    c.velocidad = 7 + ruido(semilla, k, vuelta) * 5;
    c.grupo.position.x = c.carril === 0 ? -FIN_CALLE : FIN_CALLE;
    c.grupo.visible = true;
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
  const humo = new SpriteMaterial({ map: halo, color: '#8fa79a', transparent: true, opacity: 0.1, depthWrite: false, fog: true });
  const bocanadas = chimeneas.flatMap(({ e, i }) => {
    const x = e.x + (r(i, 6) - 0.5) * (e.ancho - 1.4);
    const z = e.z + (r(i, 7) - 0.5) * (e.fondo - 1.4);
    const ch = new Mesh(caja, ladrillo);
    ch.scale.set(0.45, 1.3, 0.45);
    ch.position.set(x, e.alto + 0.65, z);
    grupo.add(ch);
    return Array.from({ length: 6 }, (_, k) => {
      const s = new Sprite(humo.clone());
      s.position.set(x, e.alto + 1.4, z);
      grupo.add(s);
      return { s, x, y: e.alto + 1.4, z, fase: k / 6 };
    });
  });

  // --- Avión ----------------------------------------------------------------------------
  const avion = new Group();
  const luzAvion = (color: string, x: number) => {
    const l = new Sprite(new SpriteMaterial({ map: halo, color: new Color(color).multiplyScalar(1.6), transparent: true, depthWrite: false, fog: false, blending: AdditiveBlending, toneMapped: false }));
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
          c.grupo.visible = false;
          return;
        }
        if (!c.grupo.visible) {
          c.espera -= dt;
          if (c.espera <= 0) salir(c, k, vueltas++);
          return;
        }
        c.grupo.position.x += (c.carril === 0 ? 1 : -1) * c.velocidad * dt;
        if (Math.abs(c.grupo.position.x) > FIN_CALLE) {
          c.grupo.visible = false;
          c.espera = 2 + ruido(semilla, k, vueltas, 3) * 9;
        }
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

      // Humo: cada bocanada sube, crece y se desvanece, y vuelve a empezar
      bocanadas.forEach((b) => {
        b.s.visible = conMovimiento;
        if (!conMovimiento) return;
        const f = (tiempo * 0.12 + b.fase) % 1;
        b.s.position.set(b.x + f * 1.6, b.y + f * 4, b.z);
        b.s.scale.setScalar(0.8 + f * 2.6);
        (b.s.material as SpriteMaterial).opacity = 0.13 * Math.sin(f * Math.PI);
      });

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
