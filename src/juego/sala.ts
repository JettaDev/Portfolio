// La sala de cada app: un local bajo la calle (la misma sala para todas, vestida con el color, el
// nombre y la captura de la app en la que se entra). Pantalla gigante al fondo con la demo, un
// mostrador con la ficha, muebles y la puerta para volver a la calle.

import {
  AdditiveBlending,
  BackSide,
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PlaneGeometry,
  PointLight,
  type Texture,
} from 'three';
import type { Caja } from './mundo';
import { texturaTexto } from './escenario';

/** La sala está muy por debajo del suelo: desde dentro no se ve nada de la calle. */
export const SALA = { y: -60, ancho: 14, fondo: 11, alto: 5 } as const;

export type Punto = 'pantalla' | 'ficha' | 'salida';

export interface Sala {
  objeto: Group;
  /** Muebles (en coordenadas del mundo; la y de las cajas es relativa al suelo de la sala). */
  cajas: Caja[];
  limites: { minX: number; maxX: number; minZ: number; maxZ: number };
  entrada: { x: number; z: number; giro: number };
  puntos: { tipo: Punto; x: number; z: number }[];
  /** Viste la sala para una app. */
  vestir(app: { title: string; hue: string }, captura: Texture | undefined): void;
  actualizar(t: number): void;
}

export function crearSala(halo: CanvasTexture): Sala {
  const grupo = new Group();
  grupo.position.y = SALA.y;
  const { ancho, fondo, alto } = SALA;
  const caja = new BoxGeometry(1, 1, 1);
  const cajas: Caja[] = [];
  const mueble = (material: MeshLambertMaterial | MeshBasicMaterial, x: number, y: number, z: number, a: number, h: number, f: number, choca = true) => {
    const malla = new Mesh(caja, material);
    malla.scale.set(a, h, f);
    malla.position.set(x, y + h / 2, z);
    grupo.add(malla);
    if (choca) cajas.push({ x, z, ancho: a, fondo: f, alto: SALA.y + y + h });
    return malla;
  };

  // Paredes, suelo y techo
  const paredes = new Mesh(caja, new MeshLambertMaterial({ color: '#173a28', side: BackSide }));
  paredes.scale.set(ancho, alto, fondo);
  paredes.position.y = alto / 2;
  const suelo = new Mesh(new PlaneGeometry(ancho, fondo), new MeshLambertMaterial({ color: '#2a2017' }));
  suelo.rotation.x = -Math.PI / 2;
  suelo.position.y = 0.01;
  grupo.add(paredes, suelo);

  // Alfombra y franja de luz a media altura, en el color de la app
  const acento = new MeshBasicMaterial({ color: '#ffffff' });
  const acentoSuave = new MeshLambertMaterial({ color: '#ffffff' });
  const alfombra = new Mesh(new PlaneGeometry(6, 4), acentoSuave);
  alfombra.rotation.x = -Math.PI / 2;
  alfombra.position.set(0, 0.02, 0.6);
  grupo.add(alfombra);
  for (const [x, z, giro, largo] of [
    [0, -fondo / 2 + 0.02, 0, ancho],
    [-ancho / 2 + 0.02, 0, Math.PI / 2, fondo],
    [ancho / 2 - 0.02, 0, -Math.PI / 2, fondo],
    [0, fondo / 2 - 0.02, Math.PI, ancho],
  ] as const) {
    const franja = new Mesh(new PlaneGeometry(largo, 0.08), acento);
    franja.position.set(x, 1.1, z);
    franja.rotation.y = giro;
    grupo.add(franja);
  }

  // Pantalla gigante al fondo, con su marco
  const pantalla = new MeshBasicMaterial({ color: new Color(0.5, 0.5, 0.5), toneMapped: false });
  const lienzo = new Mesh(new PlaneGeometry(7.2, 4.5), pantalla);
  lienzo.position.set(0, 2.55, -fondo / 2 + 0.08);
  const marco = new Mesh(new PlaneGeometry(7.6, 4.9), acento);
  marco.position.set(0, 2.55, -fondo / 2 + 0.05);
  const resplandor = new Mesh(new PlaneGeometry(12, 8), new MeshBasicMaterial({ map: halo, transparent: true, opacity: 0.18, depthWrite: false, blending: AdditiveBlending }));
  resplandor.position.set(0, 2.55, -fondo / 2 + 0.04);
  grupo.add(resplandor, marco, lienzo);
  // Tarima delante de la pantalla (no se atraviesa: la pantalla se mira desde el borde)
  mueble(new MeshLambertMaterial({ color: '#0d2117' }), 0, 0, -fondo / 2 + 0.7, 7.8, 0.25, 1.2);

  // Rótulo de neón con el nombre en la pared de la izquierda
  const rotulo = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ transparent: true, toneMapped: false, depthWrite: false }));
  rotulo.position.set(-ancho / 2 + 0.06, 3.2, -0.5);
  rotulo.rotation.y = Math.PI / 2;
  grupo.add(rotulo);

  // Mostrador a la derecha con un monitor que enseña la captura
  const madera = new MeshLambertMaterial({ color: '#4a3424' });
  mueble(madera, 4.6, 0, -0.5, 1.2, 1.05, 3);
  const monitor = new Mesh(new PlaneGeometry(1.1, 0.7), pantalla);
  monitor.position.set(4.3, 1.55, -0.5);
  monitor.rotation.y = -Math.PI / 2 + 0.35;
  grupo.add(monitor);
  mueble(new MeshLambertMaterial({ color: '#0a1610' }), 4.75, 1.05, -0.5, 0.08, 0.5, 0.08, false);

  // Sofá, mesa baja, estanterías y plantas
  const tela = new MeshLambertMaterial({ color: '#21503a' });
  mueble(tela, -4, 0, 2.6, 3, 0.45, 1.1);
  mueble(tela, -4, 0.45, 3.05, 3, 0.55, 0.25, false);
  mueble(madera, -4, 0, 1.2, 1.6, 0.4, 0.8);
  const estante = new MeshLambertMaterial({ color: '#2f2419' });
  for (const x of [-5.8, -4.3]) {
    mueble(estante, x, 0, -fondo / 2 + 0.35, 1.3, 2.6, 0.5);
  }
  const libros = ['#c86f4f', '#7fb6ff', '#e6eee4', '#62d6a4', '#ffb547'];
  for (let k = 0; k < 12; k++) {
    const x = -6.3 + (k % 6) * 0.42 + (k >= 6 ? 0 : 0);
    const y = k < 6 ? 0.9 : 1.75;
    mueble(new MeshLambertMaterial({ color: libros[k % libros.length] }), x + (k % 2) * 0.05, y, -fondo / 2 + 0.35, 0.22, 0.5 + (k % 3) * 0.08, 0.36, false);
  }
  const maceta = new CylinderGeometry(0.3, 0.24, 0.6, 10);
  const hojas = new IcosahedronGeometry(0.6, 0);
  for (const [x, z] of [
    [6.2, -4.6],
    [-6.2, 4.4],
    [6.2, 4.4],
  ]) {
    const m = new Mesh(maceta, new MeshLambertMaterial({ color: '#5c3d2a' }));
    m.position.set(x, 0.3, z);
    const h = new Mesh(hojas, new MeshLambertMaterial({ color: '#2f7a4c', flatShading: true }));
    h.position.set(x, 1.05, z);
    h.scale.set(1, 1.3, 1);
    grupo.add(m, h);
    cajas.push({ x, z, ancho: 0.7, fondo: 0.7, alto: SALA.y + 1.6 });
  }

  // Lámparas del techo
  const lampara = new MeshBasicMaterial({ color: new Color('#ffe2b8').multiplyScalar(1.2), toneMapped: false });
  for (const x of [-3.5, 0, 3.5]) {
    const l = new Mesh(caja, lampara);
    l.scale.set(1.6, 0.06, 0.5);
    l.position.set(x, alto - 0.05, 0.5);
    grupo.add(l);
  }
  const luz = new PointLight('#ffd9a8', 26, 22, 1.4);
  luz.position.set(0, alto - 0.6, 0.5);
  grupo.add(luz);

  // Puerta de salida, detrás de la entrada
  const puerta = new Mesh(new PlaneGeometry(1.5, 2.5), new MeshBasicMaterial({ color: new Color('#cfe3ff').multiplyScalar(0.35), toneMapped: false }));
  puerta.position.set(0, 1.25, fondo / 2 - 0.04);
  puerta.rotation.y = Math.PI;
  const cercoPuerta = new Mesh(new PlaneGeometry(1.8, 2.75), acento);
  cercoPuerta.position.set(0, 1.37, fondo / 2 - 0.03);
  cercoPuerta.rotation.y = Math.PI;
  grupo.add(cercoPuerta, puerta);

  return {
    objeto: grupo,
    cajas,
    limites: { minX: -ancho / 2 + 0.5, maxX: ancho / 2 - 0.5, minZ: -fondo / 2 + 0.5, maxZ: fondo / 2 - 0.5 },
    entrada: { x: 0, z: fondo / 2 - 2.6, giro: Math.PI },
    puntos: [
      { tipo: 'pantalla', x: 0, z: -fondo / 2 + 1.9 },
      { tipo: 'ficha', x: 3.5, z: -0.5 },
      { tipo: 'salida', x: 0, z: fondo / 2 - 0.6 },
    ],
    vestir: (app, captura) => {
      const color = new Color(app.hue);
      acento.color.copy(color).multiplyScalar(0.75);
      acentoSuave.color.copy(color).multiplyScalar(0.35);
      (resplandor.material as MeshBasicMaterial).color.copy(color);
      pantalla.map = captura ?? null;
      pantalla.needsUpdate = true;
      const r = rotulo.material as MeshBasicMaterial;
      r.map?.dispose();
      const { textura, aspecto } = texturaTexto(app.title);
      r.map = textura;
      r.color.copy(color).multiplyScalar(1.6);
      r.needsUpdate = true;
      rotulo.scale.set(1.1 * aspecto, 1.1, 1);
    },
    actualizar: (t) => {
      // La luz de la pantalla respira un poco
      (resplandor.material as MeshBasicMaterial).opacity = 0.16 + Math.sin(t * 1.3) * 0.03;
    },
  };
}
