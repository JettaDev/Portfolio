// Ambiente: la lluvia (con la calzada mojada reflejando farolas, ventanales y escaparates) y el
// cielo según la hora del visitante (amanecer, tarde, atardecer, noche). Lo decide la portada;
// el póster siempre es de noche y sin lluvia. Los cambios se funden despacio: al aparecer el
// canvas sobre el póster no hay salto.

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  FogExp2,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  type Points,
  type PointsMaterial,
  type Scene,
  type ShaderMaterial,
} from 'three';
import { COLORES } from './escena';
import type { Trazado } from './trazado';

export type Clima = 'despejado' | 'lluvia';

/** Algunos días llueve: el mismo día, para todos igual. */
export function climaDelDia(fecha: Date): Clima {
  const dia = `${fecha.getFullYear()}-${fecha.getMonth()}-${fecha.getDate()}`;
  let h = 7;
  for (const c of dia) h = Math.imul(h ^ c.charCodeAt(0), 0x9e3779b1) >>> 0;
  return ((h >>> 8) % 100) / 100 < 0.3 ? 'lluvia' : 'despejado';
}

/** Momento del día con su peso (0–1), para mezclar los tonos del cielo. */
interface Tono {
  arriba: string;
  horizonte: string;
  niebla: string;
  estrellas: number;
  /** Altura (seno del ángulo) hasta la que llega el color del horizonte. */
  banda: number;
}
const NOCHE: Tono = { arriba: COLORES.cielo, horizonte: COLORES.horizonte, niebla: COLORES.niebla, estrellas: 0.8, banda: 0.3 };
const TONOS: Record<'amanecer' | 'tarde' | 'atardecer' | 'noche', Tono> = {
  // Amanecer: el horizonte se aclara hacia un verde agua y un poco de luz cálida
  amanecer: { arriba: '#122a2c', horizonte: '#6b6a4c', niebla: '#26392f', estrellas: 0.2, banda: 0.75 },
  // Tarde (de día): la hora azul, todavía con las ventanas encendidas
  tarde: { arriba: '#16313d', horizonte: '#3f6466', niebla: '#1d3a34', estrellas: 0.1, banda: 0.8 },
  // Atardecer: el horizonte se enciende de naranja tenue bajo el verde
  atardecer: { arriba: '#121f22', horizonte: '#7a5532', niebla: '#2b2e22', estrellas: 0.35, banda: 0.7 },
  noche: NOCHE,
};

/** Tono del cielo para una hora (0–24): tramos con transiciones de una hora. */
export function tonoDeLaHora(hora: number): Tono {
  const tramos: [number, keyof typeof TONOS][] = [
    [5, 'noche'],
    [7, 'amanecer'],
    [9.5, 'tarde'],
    [17.5, 'atardecer'],
    [20.5, 'noche'],
  ];
  // Hora de inicio de cada tramo; entre un tramo y el siguiente, una hora de mezcla
  let actual: keyof typeof TONOS = 'noche';
  let anterior: keyof typeof TONOS = 'noche';
  let desde = 0;
  for (const [inicio, nombre] of tramos) {
    if (hora >= inicio) {
      anterior = actual;
      actual = nombre;
      desde = inicio;
    }
  }
  const mezcla = Math.min(1, (hora - desde) / 1);
  const a = TONOS[anterior];
  const b = TONOS[actual];
  const color = (x: string, y: string) => '#' + new Color(x).lerp(new Color(y), mezcla).getHexString();
  const numero = (x: number, y: number) => x + (y - x) * mezcla;
  return {
    arriba: color(a.arriba, b.arriba),
    horizonte: color(a.horizonte, b.horizonte),
    niebla: color(a.niebla, b.niebla),
    estrellas: numero(a.estrellas, b.estrellas),
    banda: numero(a.banda, b.banda),
  };
}

export interface Ambiente {
  objeto: Group;
  /** Cambia el tiempo (se funde en unos segundos). */
  clima(c: Clima): void;
  readonly lloviendo: boolean;
  /** Cielo de una hora (0–24) o el de noche (`null`), fundiéndose desde el actual. */
  hora(h: number | null): void;
  actualizar(dt: number, conMovimiento: boolean): void;
}

export function crearAmbiente(escena: Scene, t: Trazado, halo: CanvasTexture, reflejos: { x: number; color: string; fuerza: number }[], { gotas = 1200 } = {}): Ambiente {
  const grupo = new Group();
  const cielo = escena.getObjectByName('cielo') as Mesh<BufferGeometry, ShaderMaterial> | undefined;
  const estrellas = escena.getObjectByName('estrellas') as Points<BufferGeometry, PointsMaterial> | undefined;
  const niebla = escena.fog as FogExp2 | null;
  const densidadBase = niebla?.density ?? 0;
  const { calle } = t;

  // --- Lluvia: trazos que caen en una caja delante de la cámara --------------------------
  const CAJA = { x: 45, y: 34, zMin: -6, zMax: 30 };
  const largo = 0.55;
  const posiciones = new Float32Array(gotas * 6);
  const velocidades = new Float32Array(gotas);
  for (let k = 0; k < gotas; k++) {
    const x = (Math.random() * 2 - 1) * CAJA.x;
    const y = Math.random() * CAJA.y;
    const z = CAJA.zMin + Math.random() * (CAJA.zMax - CAJA.zMin);
    posiciones.set([x, y, z, x - 0.08, y - largo, z], k * 6);
    velocidades[k] = 20 + Math.random() * 8;
  }
  const geometria = new BufferGeometry();
  geometria.setAttribute('position', new BufferAttribute(posiciones, 3));
  const materialLluvia = new LineBasicMaterial({ color: '#a9c4b6', transparent: true, opacity: 0, depthWrite: false });
  const lluvia = new LineSegments(geometria, materialLluvia);
  lluvia.frustumCulled = false;
  lluvia.visible = false;
  grupo.add(lluvia);

  // --- Calzada mojada: reflejos alargados de las luces hacia la cámara -------------------
  const charcos: MeshBasicMaterial[] = [];
  const zReflejo = (calle.bordillo + calle.fin) / 2 + 1;
  for (const r of reflejos) {
    const material = new MeshBasicMaterial({ map: halo, color: r.color, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending });
    const reflejo = new Mesh(new PlaneGeometry(0.7, calle.fin - calle.bordillo + 2), material);
    reflejo.rotation.x = -Math.PI / 2;
    reflejo.position.set(r.x, 0.012, zReflejo);
    reflejo.userData.fuerza = r.fuerza;
    grupo.add(reflejo);
    charcos.push(material);
  }
  // Brillo general del asfalto mojado
  const brilloCalle = new MeshBasicMaterial({ color: '#9fbfae', transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending });
  const asfalto = new Mesh(new PlaneGeometry(160, calle.fin - calle.bordillo), brilloCalle);
  asfalto.rotation.x = -Math.PI / 2;
  asfalto.position.set(0, 0.008, (calle.bordillo + calle.fin) / 2);
  grupo.add(asfalto);

  // --- Estado y fundidos ---------------------------------------------------------------
  let lluviaObjetivo = 0;
  let lluviaActual = 0;
  const tono = { arriba: new Color(COLORES.cielo), horizonte: new Color(COLORES.horizonte), niebla: new Color(COLORES.niebla), estrellas: NOCHE.estrellas, banda: NOCHE.banda };
  let objetivo: Tono = NOCHE;
  const destino = { arriba: new Color(), horizonte: new Color(), niebla: new Color() };
  const fijarDestino = (x: Tono) => {
    objetivo = x;
    destino.arriba.set(x.arriba);
    destino.horizonte.set(x.horizonte);
    destino.niebla.set(x.niebla);
  };
  fijarDestino(NOCHE);

  return {
    objeto: grupo,
    clima: (c) => (lluviaObjetivo = c === 'lluvia' ? 1 : 0),
    get lloviendo() {
      return lluviaObjetivo > 0;
    },
    hora: (h) => fijarDestino(h === null ? NOCHE : tonoDeLaHora(h)),
    actualizar: (dt, conMovimiento) => {
      // Fundidos: unos 2,5 s
      const k = Math.min(1, dt * 1.2);
      lluviaActual += (lluviaObjetivo - lluviaActual) * Math.min(1, dt * 0.8);
      tono.arriba.lerp(destino.arriba, k);
      tono.horizonte.lerp(destino.horizonte, k);
      tono.niebla.lerp(destino.niebla, k);
      tono.estrellas += (objetivo.estrellas - tono.estrellas) * k;
      tono.banda += (objetivo.banda - tono.banda) * k;
      if (cielo) {
        cielo.material.uniforms.arriba.value.copy(tono.arriba);
        cielo.material.uniforms.banda.value = tono.banda;
        // Con lluvia, el horizonte se cierra hacia el gris de la niebla
        cielo.material.uniforms.abajo.value.copy(tono.horizonte).lerp(tono.niebla, lluviaActual * 0.5);
      }
      if (estrellas) estrellas.material.opacity = tono.estrellas * (1 - lluviaActual * 0.85);
      if (niebla) {
        niebla.color.copy(tono.niebla);
        niebla.density = densidadBase * (1 + lluviaActual * 0.35);
      }

      // Lluvia que cae (con movimiento reducido no cae, pero la calle sigue mojada)
      lluvia.visible = conMovimiento && lluviaActual > 0.01;
      materialLluvia.opacity = 0.32 * lluviaActual;
      if (lluvia.visible) {
        for (let g = 0; g < gotas; g++) {
          const i = g * 6;
          const bajada = velocidades[g] * dt;
          posiciones[i + 1] -= bajada;
          posiciones[i + 4] -= bajada;
          posiciones[i] -= bajada * 0.15;
          posiciones[i + 3] -= bajada * 0.15;
          if (posiciones[i + 4] < 0) {
            const x = (Math.random() * 2 - 1) * CAJA.x;
            const z = CAJA.zMin + Math.random() * (CAJA.zMax - CAJA.zMin);
            posiciones.set([x, CAJA.y, z, x - 0.08, CAJA.y - largo, z], i);
          }
        }
        geometria.attributes.position.needsUpdate = true;
      }
      charcos.forEach((m, j) => (m.opacity = lluviaActual * 0.22 * (grupo.children[j + 1].userData.fuerza as number)));
      brilloCalle.opacity = lluviaActual * 0.025;
    },
  };
}
