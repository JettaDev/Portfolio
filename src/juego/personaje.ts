// El personaje: un muñeco low-poly hecho con cajas (gorro caléndula, chaqueta verde y mochila)
// con su animación de estar, andar, correr y saltar calculada a mano. Si hay un modelo propio
// (`/juego/personaje.glb` con las animaciones idle, walk, run y jump) se usa ese.

import {
  AnimationMixer,
  Box3,
  BoxGeometry,
  CanvasTexture,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PlaneGeometry,
  type AnimationAction,
  type Object3D,
} from 'three';

/** Lo que el jugador le dice al personaje en cada fotograma. */
export interface Pose {
  /** Velocidad en el suelo (unidades por segundo). */
  velocidad: number;
  enElAire: boolean;
  dt: number;
}

export interface Personaje {
  objeto: Group;
  animar(p: Pose): void;
}

/** Altura del personaje: una planta mide 1,15, así que es algo más alto que una puerta de 2,5 / 1,4. */
export const ALTO = 1.75;

function sombra(halo: CanvasTexture): Mesh {
  const s = new Mesh(new PlaneGeometry(1.1, 1.1), new MeshBasicMaterial({ map: halo, color: '#000000', transparent: true, opacity: 0.55, depthWrite: false }));
  s.rotation.x = -Math.PI / 2;
  s.position.y = 0.02;
  return s;
}

export function crearPersonaje(halo: CanvasTexture): Personaje {
  const raiz = new Group();
  const cuerpo = new Group();
  raiz.add(cuerpo, sombra(halo));
  const caja = new BoxGeometry(1, 1, 1);
  const pieza = (padre: Object3D, color: string, x: number, y: number, z: number, a: number, h: number, f: number) => {
    // Algo de luz propia: de noche y a contraluz de las farolas no se quedaría en una silueta
    const m = new Mesh(caja, new MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.2 }));
    m.scale.set(a, h, f);
    m.position.set(x, y, z);
    padre.add(m);
    return m;
  };
  /** Articulación: un grupo en el punto de giro, con la pieza colgando debajo. */
  const articulacion = (padre: Object3D, x: number, y: number, z: number) => {
    const g = new Group();
    g.position.set(x, y, z);
    padre.add(g);
    return g;
  };

  const piel = '#e2b48f';
  const chaqueta = '#2f6b49';
  const pantalon = '#1a2a22';
  const calzado = '#0b1410';

  const cadera = articulacion(cuerpo, 0, 0.92, 0);
  pieza(cadera, pantalon, 0, 0.04, 0, 0.42, 0.16, 0.24);
  const torso = articulacion(cadera, 0, 0.1, 0);
  pieza(torso, chaqueta, 0, 0.3, 0, 0.5, 0.6, 0.28);
  pieza(torso, '#e6eee4', 0, 0.42, 0.145, 0.16, 0.3, 0.01); // camiseta asomando
  // Mochila
  pieza(torso, '#123222', 0, 0.3, -0.22, 0.38, 0.44, 0.16);
  pieza(torso, '#ffb547', 0, 0.44, -0.305, 0.12, 0.05, 0.01);

  const cuello = articulacion(torso, 0, 0.62, 0);
  const cabeza = articulacion(cuello, 0, 0.04, 0);
  pieza(cabeza, piel, 0, 0.18, 0, 0.34, 0.34, 0.32);
  // Gorro caléndula con su vuelta
  pieza(cabeza, '#ffb547', 0, 0.37, -0.01, 0.37, 0.14, 0.35);
  pieza(cabeza, '#e89a24', 0, 0.31, 0, 0.38, 0.05, 0.36);
  // Ojos
  pieza(cabeza, '#0a1d13', -0.08, 0.2, 0.162, 0.05, 0.07, 0.01);
  pieza(cabeza, '#0a1d13', 0.08, 0.2, 0.162, 0.05, 0.07, 0.01);

  const brazos = [-1, 1].map((lado) => {
    const hombro = articulacion(torso, lado * 0.33, 0.55, 0);
    pieza(hombro, chaqueta, 0, -0.2, 0, 0.15, 0.42, 0.16);
    const codo = articulacion(hombro, 0, -0.4, 0);
    pieza(codo, chaqueta, 0, -0.12, 0, 0.13, 0.24, 0.14);
    pieza(codo, piel, 0, -0.29, 0, 0.11, 0.1, 0.11);
    return { hombro, codo };
  });
  const piernas = [-1, 1].map((lado) => {
    const muslo = articulacion(cadera, lado * 0.12, 0, 0);
    pieza(muslo, pantalon, 0, -0.22, 0, 0.17, 0.44, 0.19);
    const rodilla = articulacion(muslo, 0, -0.44, 0);
    pieza(rodilla, pantalon, 0, -0.2, 0, 0.16, 0.4, 0.18);
    pieza(rodilla, calzado, 0, -0.43, 0.04, 0.18, 0.1, 0.28);
    return { muslo, rodilla };
  });

  let fase = 0;
  let tiempo = 0;
  let aire = 0;
  const suave = (actual: number, objetivo: number, dt: number, rapidez = 12) => actual + (objetivo - actual) * Math.min(1, dt * rapidez);

  return {
    objeto: raiz,
    animar: ({ velocidad, enElAire, dt }) => {
      tiempo += dt;
      // La zancada avanza con lo andado: los pies no patinan
      fase += velocidad * dt * 2.3;
      const marcha = Math.min(1, velocidad / 3.2);
      const carrera = Math.max(0, Math.min(1, (velocidad - 3.2) / 3.2));
      aire = suave(aire, enElAire ? 1 : 0, dt, 10);
      const amplitud = (0.55 + carrera * 0.35) * marcha * (1 - aire);
      const sen = Math.sin(fase);

      piernas.forEach(({ muslo, rodilla }, k) => {
        const s = k === 0 ? sen : -sen;
        muslo.rotation.x = suave(muslo.rotation.x, s * amplitud - aire * (k === 0 ? 0.9 : 0.2), dt, 18);
        rodilla.rotation.x = suave(rodilla.rotation.x, Math.max(0, -Math.cos(fase + (k === 0 ? 0 : Math.PI))) * amplitud * 1.3 + aire * (k === 0 ? 1.2 : 0.5), dt, 18);
      });
      brazos.forEach(({ hombro, codo }, k) => {
        const s = k === 0 ? -sen : sen;
        hombro.rotation.x = suave(hombro.rotation.x, s * amplitud * 0.9 - aire * 2.4, dt, 14);
        hombro.rotation.z = suave(hombro.rotation.z, (k === 0 ? -1 : 1) * (0.06 + aire * 0.35), dt, 10);
        codo.rotation.x = suave(codo.rotation.x, -0.2 - marcha * 0.5 - carrera * 0.5, dt, 12);
      });
      // Bote al andar, respiración parada e inclinación hacia delante al correr
      const respira = Math.sin(tiempo * 2.2) * 0.012 * (1 - marcha);
      cadera.position.y = 0.92 + Math.abs(Math.cos(fase)) * 0.06 * marcha * (1 - aire) + respira;
      torso.rotation.x = suave(torso.rotation.x, marcha * 0.08 + carrera * 0.18, dt, 8);
      cabeza.rotation.x = -torso.rotation.x * 0.6;
      torso.rotation.y = Math.sin(fase) * 0.08 * marcha;
    },
  };
}

/** Carga el modelo propio si existe; si falla, null (se queda el muñeco). */
export async function cargarModelo(url: string, halo: CanvasTexture): Promise<Personaje | null> {
  try {
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const gltf = await new GLTFLoader().loadAsync(url);
    const modelo = gltf.scene;
    // A la altura del muñeco, con los pies en el suelo
    modelo.updateMatrixWorld(true);
    const caja = new Box3().setFromObject(modelo);
    const alto = caja.max.y - caja.min.y || 1;
    modelo.scale.multiplyScalar(ALTO / alto);
    modelo.position.y -= caja.min.y * (ALTO / alto);
    const raiz = new Group();
    raiz.add(modelo, sombra(halo));
    const mezclador = new AnimationMixer(modelo);
    const accion = (nombre: string): AnimationAction | null => {
      const clip = gltf.animations.find((a) => a.name.toLowerCase().includes(nombre));
      return clip ? mezclador.clipAction(clip) : null;
    };
    const acciones = { idle: accion('idle'), walk: accion('walk'), run: accion('run'), jump: accion('jump') };
    let actual: AnimationAction | null = null;
    const poner = (a: AnimationAction | null) => {
      if (!a || a === actual) return;
      a.reset().fadeIn(0.2).play();
      actual?.fadeOut(0.2);
      actual = a;
    };
    return {
      objeto: raiz,
      animar: ({ velocidad, enElAire, dt }) => {
        if (enElAire) poner(acciones.jump ?? acciones.idle);
        else if (velocidad > 4) poner(acciones.run ?? acciones.walk);
        else if (velocidad > 0.3) poner(acciones.walk ?? acciones.idle);
        else poner(acciones.idle);
        mezclador.update(dt);
      },
    };
  } catch {
    return null;
  }
}
