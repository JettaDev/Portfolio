// El barrio del juego en three: edificios con ventanas pintadas en el shader (una sola llamada de
// dibujo para todos), aceras, calzada con sus rayas y pasos de cebra, farolas, árboles, coches
// aparcados y las fachadas de los sitios: el estudio, el solar y un edificio por app con su
// letrero de neón, su puerta iluminada y su captura en el escaparate.

import {
  AdditiveBlending,
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  OctahedronGeometry,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  SRGBColorSpace,
  TextureLoader,
  UniformsLib,
  UniformsUtils,
  Vector3,
  type Texture,
} from 'three';
import { COLORES } from '../ciudad/escena';
import { BORDILLO, COCHE, CUADRA, MANZANA, RADIO, type Mundo, type Puerta } from './mundo';

export interface DatosApp {
  slug: string;
  title: string;
  hue: string;
  cover: { src: string };
}

const m = new Matrix4();
const q = new Quaternion();
const v = new Vector3();
const s = new Vector3();
const ARRIBA = new Vector3(0, 1, 0);
const TUMBADO = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2);

function colocar(malla: InstancedMesh, k: number, x: number, y: number, z: number, ancho: number, alto: number, fondo: number, giro = 0) {
  q.setFromAxisAngle(ARRIBA, giro);
  malla.setMatrixAt(k, m.compose(v.set(x, y + alto / 2, z), q, s.set(ancho, alto, fondo)));
}

// --- Letreros: texto en un canvas, sin archivos externos ----------------------------------

/** Texto pintado en un canvas (la fuente de la página ya está cargada). */
export function texturaTexto(texto: string, { color = '#ffffff', fondo = '', alto = 128, peso = 700, relleno = 0.35 } = {}): { textura: CanvasTexture; aspecto: number } {
  const c = document.createElement('canvas');
  const g = c.getContext('2d')!;
  const fuente = `${peso} ${alto * 0.62}px "Bricolage Grotesque Variable", system-ui, sans-serif`;
  g.font = fuente;
  const ancho = Math.ceil(g.measureText(texto).width + alto * relleno * 2);
  c.width = ancho;
  c.height = alto;
  if (fondo) {
    g.fillStyle = fondo;
    g.fillRect(0, 0, ancho, alto);
  }
  g.font = fuente;
  g.fillStyle = color;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(texto, ancho / 2, alto * 0.54);
  const textura = new CanvasTexture(c);
  textura.colorSpace = SRGBColorSpace;
  textura.anisotropy = 4;
  return { textura, aspecto: ancho / alto };
}

// --- Edificios: ventanas en el shader ---------------------------------------------------

const TONOS_VENTANA = ['#9fc4d8', '#c8d8c0', '#7fa8b8', '#e6eee4', '#b5d0c4'];

function materialEdificios(): ShaderMaterial {
  return new ShaderMaterial({
    fog: true,
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uPared: { value: new Color(COLORES.edificio) },
        uTecho: { value: new Color('#0a1a11') },
        uCalida: { value: new Color('#f0c98a').multiplyScalar(0.42) },
        uTonos: { value: TONOS_VENTANA.map((t) => new Color(t).multiplyScalar(0.36)) },
      },
    ]),
    vertexShader: /* glsl */ `
      #include <common>
      #include <fog_pars_vertex>
      attribute float semilla;
      varying vec3 vLocal;
      varying vec3 vEscala;
      varying vec3 vNormal;
      varying float vSemilla;
      varying float vAltura;
      void main() {
        mat4 modelo = modelMatrix * instanceMatrix;
        vEscala = vec3(length(modelo[0].xyz), length(modelo[1].xyz), length(modelo[2].xyz));
        vLocal = (position + 0.5) * vEscala;
        vNormal = normalize(mat3(modelo) * normal);
        vSemilla = semilla;
        vec4 mundo = modelo * vec4(position, 1.0);
        vAltura = mundo.y;
        vec4 mvPosition = viewMatrix * mundo;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <common>
      #include <fog_pars_fragment>
      uniform vec3 uPared;
      uniform vec3 uTecho;
      uniform vec3 uCalida;
      uniform vec3 uTonos[5];
      varying vec3 vLocal;
      varying vec3 vEscala;
      varying vec3 vNormal;
      varying float vSemilla;
      varying float vAltura;
      float azar(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      void main() {
        vec3 n = normalize(vNormal);
        // Luz de luna fija y un poco de tono por edificio
        float luz = 0.55 + 0.45 * max(dot(n, normalize(vec3(0.5, 0.7, -0.4))), 0.0);
        vec3 pared = uPared * (0.85 + 0.3 * azar(vec3(vSemilla))) * luz;
        vec3 color = pared;
        if (n.y > 0.5) {
          color = uTecho;
        } else if (n.y > -0.5) {
          bool lado = abs(n.x) > 0.5;
          float ancho = lado ? vEscala.z : vEscala.x;
          float u = lado ? vLocal.z : vLocal.x;
          float columnas = max(1.0, floor((ancho - 0.6) / 0.9));
          float margen = (ancho - columnas * 0.9) / 2.0;
          vec2 celda = vec2((u - margen) / 0.9, (vLocal.y - 1.9) / 1.15);
          vec2 id = floor(celda);
          vec2 f = fract(celda);
          float dentro = step(0.0, celda.x) * step(celda.x, columnas) * step(0.0, celda.y) * step(celda.y, floor((vEscala.y - 2.4) / 1.15));
          float ventana = dentro * step(0.26, f.x) * step(f.x, 0.74) * step(0.2, f.y) * step(f.y, 0.78);
          float h = azar(vec3(id, vSemilla + n.x * 3.0 + n.z * 7.0));
          vec3 vidrio = uPared * 0.45;
          if (h < 0.05) vidrio = uCalida;
          else if (h < 0.27) vidrio = uTonos[int(mod(floor(h * 97.0), 5.0))];
          color = mix(color, vidrio, ventana);
          // Zócalo más oscuro a pie de calle
          color *= mix(0.7, 1.0, smoothstep(0.0, 1.6, vAltura));
        }
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  });
}

export function crearEdificiosJuego(mundo: Mundo): InstancedMesh {
  const malla = new InstancedMesh(new BoxGeometry(1, 1, 1), materialEdificios(), mundo.edificios.length);
  const semillas = new Float32Array(mundo.edificios.length);
  mundo.edificios.forEach((e, k) => {
    colocar(malla, k, e.x, 0, e.z, e.ancho, e.alto, e.fondo);
    semillas[k] = (e.semilla % 1000) / 10;
  });
  malla.geometry.setAttribute('semilla', new InstancedBufferAttribute(semillas, 1));
  malla.computeBoundingSphere();
  return malla;
}

// --- La calle -----------------------------------------------------------------------------

export function crearCalles(mundo: Mundo, halo: CanvasTexture): Group {
  const grupo = new Group();
  const caja = new BoxGeometry(1, 1, 1);
  const extension = (RADIO + 2) * CUADRA * 2;

  const calzada = new Mesh(new PlaneGeometry(extension, extension), new MeshBasicMaterial({ color: COLORES.calzada }));
  calzada.quaternion.copy(TUMBADO);
  calzada.position.y = 0.003;

  // Aceras: un escalón por manzana con el bordillo algo más claro alrededor
  const aceras = new InstancedMesh(caja, new MeshLambertMaterial({ color: COLORES.acera }), mundo.manzanas.length);
  const bordillos = new InstancedMesh(caja, new MeshLambertMaterial({ color: '#1c3628' }), mundo.manzanas.length);
  mundo.manzanas.forEach((mz, k) => {
    colocar(aceras, k, mz.x, 0, mz.z, MANZANA - 0.3, BORDILLO, MANZANA - 0.3);
    colocar(bordillos, k, mz.x, 0, mz.z, MANZANA, BORDILLO - 0.02, MANZANA);
  });

  // Rayas discontinuas en medio de cada calle y pasos de cebra junto a los cruces
  const rayas: { x: number; z: number; giro: number }[] = [];
  const cebras: { x: number; z: number; giro: number }[] = [];
  const n = RADIO + 1;
  for (let k = -n; k < n; k++) {
    const linea = (k + 0.5) * CUADRA;
    for (let t = -n * CUADRA; t <= n * CUADRA; t += 3) {
      const enCruce = Math.abs(((t % CUADRA) + CUADRA) % CUADRA - CUADRA / 2) < (CUADRA - MANZANA) / 2 + 0.5;
      if (enCruce) continue;
      rayas.push({ x: linea, z: t, giro: Math.PI / 2 }, { x: t, z: linea, giro: 0 });
    }
    for (let j = -n; j <= n; j++) {
      const borde = MANZANA / 2 + 0.9;
      for (let franja = -2; franja <= 2; franja++) {
        const o = franja * 1.2;
        cebras.push({ x: linea + o, z: j * CUADRA + borde, giro: Math.PI / 2 }, { x: linea + o, z: j * CUADRA - borde, giro: Math.PI / 2 });
        cebras.push({ x: j * CUADRA + borde, z: linea + o, giro: 0 }, { x: j * CUADRA - borde, z: linea + o, giro: 0 });
      }
    }
  }
  const rayaMalla = new InstancedMesh(new PlaneGeometry(1.4, 0.12), new MeshBasicMaterial({ color: '#2a4536' }), rayas.length);
  rayas.forEach((r, k) => rayaMalla.setMatrixAt(k, m.compose(v.set(r.x, 0.008, r.z), q.setFromAxisAngle(ARRIBA, r.giro).multiply(TUMBADO), s.set(1, 1, 1))));
  const cebraMalla = new InstancedMesh(new PlaneGeometry(2.6, 0.55), new MeshBasicMaterial({ color: '#1f3a2b' }), cebras.length);
  cebras.forEach((c, k) => cebraMalla.setMatrixAt(k, m.compose(v.set(c.x, 0.008, c.z), q.setFromAxisAngle(ARRIBA, c.giro + Math.PI / 2).multiply(TUMBADO), s.set(1, 1, 1))));

  // Farolas: poste, brazo, cabeza de luz fría (pasa el umbral del bloom) y charco de luz
  const nf = mundo.farolas.length;
  const metal = new MeshLambertMaterial({ color: '#2a4636' });
  const postes = new InstancedMesh(caja, metal, nf);
  const brazos = new InstancedMesh(caja, metal, nf);
  const cabezas = new InstancedMesh(caja, new MeshBasicMaterial({ color: new Color(COLORES.farola).multiplyScalar(1.1), toneMapped: false }), nf);
  const charcos = new InstancedMesh(
    new PlaneGeometry(5, 5),
    new MeshBasicMaterial({ map: halo, color: '#9fbfae', transparent: true, opacity: 0.22, depthWrite: false, blending: AdditiveBlending }),
    nf,
  );
  mundo.farolas.forEach((f, k) => {
    const dx = Math.sin(f.giro);
    const dz = Math.cos(f.giro);
    colocar(postes, k, f.x, BORDILLO, f.z, 0.12, 4.4, 0.12);
    colocar(brazos, k, f.x + dx * 0.45, BORDILLO + 4.3, f.z + dz * 0.45, 0.08 + Math.abs(dx) * 0.8, 0.08, 0.08 + Math.abs(dz) * 0.8);
    colocar(cabezas, k, f.x + dx * 0.85, BORDILLO + 4.18, f.z + dz * 0.85, 0.42, 0.1, 0.42);
    charcos.setMatrixAt(k, m.compose(v.set(f.x + dx * 0.8, BORDILLO + 0.01, f.z + dz * 0.8), TUMBADO, s.set(1, 1, 1)));
  });

  // Árboles: tronco y copa facetada
  const na = mundo.arboles.length;
  const troncos = new InstancedMesh(new CylinderGeometry(0.09, 0.13, 1, 6), new MeshLambertMaterial({ color: '#2b2219' }), na);
  const copas = new InstancedMesh(new IcosahedronGeometry(1, 0), new MeshLambertMaterial({ color: '#1d4a30', flatShading: true }), na);
  const alcorques = new InstancedMesh(caja, new MeshLambertMaterial({ color: '#08130d' }), na);
  mundo.arboles.forEach((a, k) => {
    colocar(troncos, k, a.x, BORDILLO, a.z, 1, 1.8 * a.escala, 1);
    copas.setMatrixAt(k, m.compose(v.set(a.x, BORDILLO + 2.6 * a.escala, a.z), q.setFromAxisAngle(ARRIBA, a.x * 7.1), s.set(1.25, 1.45, 1.25).multiplyScalar(a.escala)));
    colocar(alcorques, k, a.x, BORDILLO, a.z, 0.9, 0.012, 0.9);
  });

  // Coches aparcados: carrocería y cabina, con color apagado por coche
  const nc = mundo.coches.length;
  const pintura = ['#3b4a5a', '#5a3b3b', '#3f5a46', '#56523c', '#2c3036', '#6b6f72'];
  const carrocerias = new InstancedMesh(caja, new MeshLambertMaterial(), nc);
  const cabinas = new InstancedMesh(caja, new MeshLambertMaterial({ color: '#101a17' }), nc);
  const faros = new InstancedMesh(caja, new MeshBasicMaterial({ color: '#2a1410' }), nc);
  mundo.coches.forEach((c, k) => {
    colocar(carrocerias, k, c.x, 0.25, c.z, COCHE.largo, 0.75, COCHE.ancho, c.giro);
    colocar(cabinas, k, c.x, 1.0, c.z, COCHE.largo * 0.55, 0.55, COCHE.ancho * 0.92, c.giro);
    colocar(faros, k, c.x, 0.55, c.z, COCHE.largo + 0.04, 0.16, COCHE.ancho * 0.8, c.giro);
    carrocerias.setColorAt(k, new Color(pintura[c.color]));
  });
  // Ruedas: cuatro por coche
  const ruedas = new InstancedMesh(new CylinderGeometry(0.34, 0.34, 0.24, 10), new MeshLambertMaterial({ color: '#070b09' }), nc * 4);
  const rodar = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);
  mundo.coches.forEach((c, k) => {
    [-1, 1].forEach((a, ia) =>
      [-1, 1].forEach((b, ib) => {
        const largo = a * COCHE.largo * 0.32;
        const lado = b * COCHE.ancho * 0.48;
        const [x, z] = c.giro === 0 ? [c.x + largo, c.z + lado] : [c.x + lado, c.z + largo];
        const giro = new Quaternion().setFromAxisAngle(ARRIBA, c.giro).multiply(rodar);
        ruedas.setMatrixAt(k * 4 + ia * 2 + ib, m.compose(v.set(x, 0.34, z), giro, s.set(1, 1, 1)));
      }),
    );
  });

  const mallas = [aceras, bordillos, rayaMalla, cebraMalla, postes, brazos, cabezas, charcos, troncos, copas, alcorques, carrocerias, cabinas, faros, ruedas];
  mallas.forEach((x) => x.computeBoundingSphere());
  grupo.add(calzada, ...mallas);
  return grupo;
}

// --- Fachadas de los sitios -----------------------------------------------------------------

export interface Sitios {
  objeto: Group;
  /** Captura de cada app (también para la pantalla de su sala). */
  capturas: Map<string, Texture>;
  /** Marcadores que flotan sobre las puertas, la luz de las puertas al acercarse… */
  actualizar(t: number, cercana: string | null): void;
}

/** Punto de una fachada: `lado` a lo largo de ella, `alto` y `fuera` hacia la calle. */
function enFachada(p: Puerta, lado: number, alto: number, fuera: number): Vector3 {
  const dx = Math.sin(p.giro);
  const dz = Math.cos(p.giro);
  // A lo largo de la fachada: perpendicular a la normal
  return new Vector3(p.x + dx * fuera + dz * lado, alto, p.z + dz * fuera - dx * lado);
}

function plano(ancho: number, alto: number, material: MeshBasicMaterial, p: Puerta, lado: number, y: number, fuera: number): Mesh {
  const malla = new Mesh(new PlaneGeometry(ancho, alto), material);
  malla.position.copy(enFachada(p, lado, y, fuera));
  malla.rotation.y = p.giro;
  return malla;
}

function neon(texto: string, color: string, alto: number, p: Puerta, y: number, intensidad = 1.6): Mesh {
  const { textura, aspecto } = texturaTexto(texto, { color: '#ffffff' });
  const material = new MeshBasicMaterial({ map: textura, color: new Color(color).multiplyScalar(intensidad), transparent: true, toneMapped: false, depthWrite: false });
  return plano(alto * aspecto, alto, material, p, 0, y, 0.12);
}

export function crearSitios(mundo: Mundo, apps: DatosApp[], halo: CanvasTexture, textos: { estudio: string; solar: string }): Sitios {
  const grupo = new Group();
  const capturas = new Map<string, Texture>();
  const cargador = new TextureLoader();
  const marcadores = new Map<string, { malla: Mesh; base: number }>();
  const luces = new Map<string, MeshBasicMaterial>();
  const caja = new BoxGeometry(1, 1, 1);
  const marco = new MeshLambertMaterial({ color: '#0a1610' });

  for (const p of mundo.puertas) {
    const app = apps.find((a) => a.slug === p.id);
    const hue = app?.hue ?? (p.sitio === 'estudio' ? COLORES.brote : COLORES.calendula);

    if (p.sitio !== 'solar') {
      // Puerta: hueco con luz cálida del interior, marco en el color del sitio y escalón
      const luz = new MeshBasicMaterial({ color: new Color('#ffcf8a').multiplyScalar(0.32), toneMapped: false });
      luces.set(p.id, luz);
      grupo.add(plano(1.5, 2.5, luz, p, 0, BORDILLO + 1.25, 0.03));
      const cerco = new MeshBasicMaterial({ color: new Color(hue).multiplyScalar(1.3), toneMapped: false });
      for (const [lado, y, ancho, alto] of [
        [-0.82, 1.3, 0.12, 2.7],
        [0.82, 1.3, 0.12, 2.7],
        [0, 2.62, 1.76, 0.12],
      ]) {
        grupo.add(plano(ancho, alto, cerco, p, lado, BORDILLO + y, 0.05));
      }
      // Marquesina sobre la puerta
      const marquesina = new Mesh(caja, marco);
      marquesina.scale.set(2.6, 0.12, 1.1);
      marquesina.position.copy(enFachada(p, 0, BORDILLO + 3.05, 0.55));
      marquesina.rotation.y = p.giro;
      grupo.add(marquesina);
      // Charco de luz delante de la puerta
      const charco = new Mesh(new PlaneGeometry(3.4, 3.4), new MeshBasicMaterial({ map: halo, color: '#ffcf8a', transparent: true, opacity: 0.18, depthWrite: false, blending: AdditiveBlending }));
      charco.quaternion.copy(TUMBADO);
      charco.position.copy(enFachada(p, 0, BORDILLO + 0.012, 1.2));
      grupo.add(charco);
    }

    if (p.sitio === 'app' && app) {
      // Letrero de neón con el nombre, en su color, y escaparates con la captura a los lados
      grupo.add(neon(app.title, app.hue, 1.05, p, BORDILLO + 4.1));
      const textura = cargador.load(app.cover.src);
      textura.colorSpace = SRGBColorSpace;
      capturas.set(app.slug, textura);
      const pantalla = new MeshBasicMaterial({ map: textura, color: new Color(0.62, 0.62, 0.62), toneMapped: false });
      for (const lado of [-2.45, 2.45]) {
        grupo.add(plano(2.3, 1.45, pantalla, p, lado, BORDILLO + 1.55, 0.04));
        const cercoPantalla = plano(2.5, 1.65, new MeshBasicMaterial({ color: new Color(app.hue).multiplyScalar(0.5) }), p, lado, BORDILLO + 1.55, 0.02);
        grupo.add(cercoPantalla);
      }
      // Una franja vertical de neón que sube por la fachada
      const franja = plano(0.16, p.alto - 5.2, new MeshBasicMaterial({ color: new Color(app.hue).multiplyScalar(1.2), toneMapped: false }), p, -p.ancho / 2 + 0.55, 4.9 + (p.alto - 5.2) / 2, 0.02);
      grupo.add(franja);
    }

    if (p.sitio === 'estudio') {
      grupo.add(neon(textos.estudio, COLORES.brote, 1.1, p, BORDILLO + 4.1));
      // El ventanal del estudio arriba, con la lámpara encendida
      grupo.add(plano(3.4, 1.8, new MeshBasicMaterial({ color: new Color('#ffcf8a').multiplyScalar(0.5), toneMapped: false }), p, 0, p.alto - 2.6, 0.03));
      grupo.add(plano(0.5, 0.5, new MeshBasicMaterial({ map: halo, color: new Color(COLORES.brote).multiplyScalar(1.4), transparent: true, depthWrite: false, toneMapped: false, blending: AdditiveBlending }), p, 0.9, p.alto - 2.4, 0.05));
    }

    if (p.sitio === 'solar') {
      // Valla de obra y un cartel grande sobre dos postes con su foco
      const s0 = mundo.solar;
      const valla = new Mesh(caja, new MeshLambertMaterial({ color: '#1b3326' }));
      valla.scale.set(s0.ancho, s0.alto, s0.fondo);
      valla.position.set(s0.x, BORDILLO + s0.alto / 2, s0.z);
      grupo.add(valla);
      for (const lado of [-1.6, 1.6]) {
        const poste = new Mesh(caja, marco);
        poste.scale.set(0.14, 5.4, 0.14);
        poste.position.set(s0.x + lado, BORDILLO + 2.7, s0.z - 0.4);
        grupo.add(poste);
      }
      const { textura, aspecto } = texturaTexto(textos.solar, { color: '#0a1d13', fondo: '#f4efe0', alto: 160 });
      const cartel = new Mesh(new PlaneGeometry(4.6, 4.6 / aspecto), new MeshBasicMaterial({ map: textura, color: new Color(0.8, 0.8, 0.8), toneMapped: false }));
      cartel.position.set(s0.x, BORDILLO + 4.6, s0.z - 0.3);
      grupo.add(cartel);
      const foco = new Mesh(new PlaneGeometry(6, 3), new MeshBasicMaterial({ map: halo, color: '#fff3d6', transparent: true, opacity: 0.3, depthWrite: false, blending: AdditiveBlending }));
      foco.position.set(s0.x, BORDILLO + 4.6, s0.z - 0.25);
      grupo.add(foco);
    }

    // Marcador que flota encima: un rombo caléndula que gira (dice «aquí se puede entrar»)
    const marcador = new Mesh(
      new OctahedronGeometry(0.32, 0),
      new MeshBasicMaterial({ color: new Color(p.sitio === 'app' ? hue : COLORES.calendula).multiplyScalar(1.5), toneMapped: false }),
    );
    const base = p.sitio === 'solar' ? BORDILLO + 7.6 : BORDILLO + 5.6;
    marcador.position.copy(enFachada(p, 0, base, p.sitio === 'solar' ? -0.3 : 1));
    marcador.scale.set(1, 1.5, 1);
    marcadores.set(p.id, { malla: marcador, base });
    grupo.add(marcador);
  }

  return {
    objeto: grupo,
    capturas,
    actualizar: (t, cercana) => {
      for (const [id, { malla, base }] of marcadores) {
        malla.rotation.y = t * 1.6;
        malla.position.y = base + Math.sin(t * 2 + base) * 0.18;
        const objetivo = id === cercana ? 1.35 : 1;
        malla.scale.x += (objetivo - malla.scale.x) * 0.15;
        malla.scale.z = malla.scale.x;
        malla.scale.y = malla.scale.x * 1.5;
      }
      // La puerta a la que te acercas se enciende un poco más
      for (const [id, luz] of luces) {
        const objetivo = id === cercana ? 0.45 : 0.32;
        const actual = luz.color.r;
        luz.color.setRGB(1, 0.81, 0.54).multiplyScalar(actual + (objetivo - actual) * 0.12);
      }
    },
  };
}
