// Ventanas: huecos decorativos (una InstancedMesh con parpadeo) y ventanales de las apps.

import {
  AdditiveBlending,
  Color,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  ShaderMaterial,
  SRGBColorSpace,
  TextureLoader,
  UniformsLib,
  UniformsUtils,
  Vector3,
  type CanvasTexture,
  type Object3D,
  type Texture,
} from 'three';
import { COLORES } from './escena';
import { HUECO, TONOS, type Trazado, type VentanaProyecto } from './trazado';

/** Luces frías y tenues de las ventanas decorativas. */
const LUCES_FRIAS = ['#9fc4d6', '#b8d8c8', '#8fb3c9', '#c9dccf', '#a9c7bb'];
/** Luminancia máxima del marco: por debajo del umbral del bloom (0,32), para que no brille. */
const LUMINANCIA_MARCO = 0.24;

export interface DatosVentana {
  slug: string;
  title: string;
  status: 'live' | 'beta' | 'wip';
  hue: string;
  href: string;
  cover: { src: string; width: number; height: number };
  planta?: number;
}

// --- Huecos decorativos --------------------------------------------------------

export interface Huecos {
  malla: InstancedMesh;
  parpadear(dt: number): void;
}

export function crearHuecos(trazado: Trazado): Huecos {
  if (LUCES_FRIAS.length !== TONOS) throw new Error('Faltan tonos de luz fría');
  const { huecos } = trazado;
  const malla = new InstancedMesh(new PlaneGeometry(HUECO.ancho, HUECO.alto), new MeshBasicMaterial({ toneMapped: false }), huecos.length);
  const apagada = new Color(COLORES.apagada);
  const tonos = LUCES_FRIAS.map((c) => new Color(c));
  const encendida = huecos.map((h) => tonos[h.tono].clone().multiplyScalar(h.intensidad));
  const estado = Uint8Array.from(huecos, (h) => (h.encendida ? 1 : 0));

  const m = new Matrix4();
  huecos.forEach((h, i) => {
    malla.setMatrixAt(i, m.makeTranslation(h.x, h.y, h.z));
    malla.setColorAt(i, estado[i] ? encendida[i] : apagada);
  });
  malla.computeBoundingSphere();

  // Solo parpadean las de las tres primeras filas: las de atrás no se notan
  const parpadean = huecos.flatMap((h, i) => (h.fila < 3 ? [i] : []));
  let reloj = 0;
  const parpadear = (dt: number) => {
    reloj += dt;
    if (reloj < 0.12) return;
    reloj = 0;
    const colores = malla.instanceColor!;
    // Una o dos cada vez: se nota sin distraer
    for (let n = 0; n < 2; n++) {
      const i = parpadean[Math.floor(Math.random() * parpadean.length)];
      estado[i] ^= 1;
      malla.setColorAt(i, estado[i] ? encendida[i] : apagada);
      colores.addUpdateRange(i * 3, 3);
    }
    colores.needsUpdate = true;
  };
  return { malla, parpadear };
}

// --- Ventanales de las apps ------------------------------------------------------

/** Lo que se puede señalar en la ciudad: los ventanales, el estudio y el solar. */
export interface Objetivo {
  /** Slug de la app, o el ancla a la que lleva (#sobre-mi, #contacto). */
  id: string;
  posicion: Vector3;
  /** 0 en reposo, 1 resaltado, 1,5 al entrar. Lo anima GSAP. */
  brillo: number;
  toque: Mesh;
}

export interface Ventanal extends Objetivo {
  datos: DatosVentana;
  trazo: VentanaProyecto;
  vidrio: Mesh<PlaneGeometry, ShaderMaterial>;
  halo: Mesh<PlaneGeometry, MeshBasicMaterial>;
}

const vertexShader = /* glsl */ `
  #include <fog_pars_vertex>
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;

// En reposo la luz caléndula tapa casi del todo la captura; al acercarse se ve la app.
const fragmentShader = /* glsl */ `
  #include <common>
  #include <fog_pars_fragment>
  uniform sampler2D captura;
  uniform float hayCaptura;
  uniform vec3 luz;
  uniform float brillo;
  uniform float revelar;
  uniform float vaiven;
  uniform float tiempo;
  varying vec2 vUv;
  void main() {
    vec3 calida = luz * (1.0 + brillo * 0.9);
    // En beta, la luz viene de una lámpara que se balancea dentro
    float foco = 0.5 + 0.28 * sin(tiempo * 1.4);
    calida *= mix(1.0, 0.78 + 0.38 * exp(-pow((vUv.x - foco) * 2.6, 2.0)), vaiven);
    vec3 app = texture2D(captura, vUv).rgb;
    float mezcla = hayCaptura * mix(0.14, 1.0, revelar);
    gl_FragColor = vec4(mix(calida, app, mezcla), 1.0);
    #include <colorspace_fragment>
    #include <fog_fragment>
  }`;

export interface Ventanales {
  lista: Ventanal[];
  objetos: Object3D[];
  toques: Mesh[];
  /**
   * Brillo, halo y cuánto se ve la captura según la distancia de la cámara.
   * Devuelve cuánto se ve la captura más cercana (0–1). `t` mueve la lámpara de las apps en beta.
   */
  actualizar(camara: Vector3, t: number): number;
  /** Sin bloom, el halo tiene que compensar la luz que falta. */
  sinBloom(activo: boolean): void;
  texturas: Texture[];
  /** Se resuelve cuando han cargado (o fallado) todas las capturas. */
  listo: Promise<void>;
}

export function crearVentanales(trazado: Trazado, datos: DatosVentana[], halo: CanvasTexture): Ventanales {
  const objetos: Object3D[] = [];
  const texturas: Texture[] = [];
  const cargador = new TextureLoader();
  const luz = new Color(COLORES.calendula);
  let haloBase = 0.3;
  const cargas: Promise<void>[] = [];

  const lista = trazado.proyectos.map((trazo, i): Ventanal => {
    const d = datos[i];
    const posicion = new Vector3(trazo.x, trazo.y, trazo.z);

    const uniforms = UniformsUtils.merge([
      UniformsLib.fog,
      {
        hayCaptura: { value: 0 },
        luz: { value: luz.clone() },
        brillo: { value: 0 },
        revelar: { value: 0 },
        vaiven: { value: d.status === 'beta' ? 1 : 0 },
        tiempo: { value: 0 },
      },
    ]);
    uniforms.captura = { value: null };
    const vidrio = new Mesh(new PlaneGeometry(trazo.ancho, trazo.alto), new ShaderMaterial({ uniforms, vertexShader, fragmentShader, fog: true }));
    vidrio.position.copy(posicion);
    cargas.push(
      cargador
        .loadAsync(d.cover.src)
        .then((textura) => {
          textura.colorSpace = SRGBColorSpace;
          texturas.push(textura);
          uniforms.captura.value = textura;
          uniforms.hayCaptura.value = 1;
        })
        // Sin captura, el ventanal es solo luz: no es motivo para no pintar la ciudad
        .catch(() => {}),
    );

    // Marco fino del color de la app, por debajo del umbral del bloom
    const tono = new Color(d.hue);
    const luminancia = tono.r * 0.299 + tono.g * 0.587 + tono.b * 0.114;
    if (luminancia > LUMINANCIA_MARCO) tono.multiplyScalar(LUMINANCIA_MARCO / luminancia);
    const marco = new Mesh(new PlaneGeometry(trazo.ancho + 0.1, trazo.alto + 0.1), new MeshBasicMaterial({ color: tono, toneMapped: false }));
    marco.position.copy(posicion).z -= 0.005;

    const brillo = new Mesh(
      new PlaneGeometry(trazo.ancho * 2.6, trazo.alto * 3.4),
      new MeshBasicMaterial({ map: halo, color: COLORES.calendula, transparent: true, opacity: haloBase, depthWrite: false, blending: AdditiveBlending }),
    );
    brillo.position.copy(posicion).z += 0.01;

    // Zona de toque invisible, mucho mayor que el ventanal: imprescindible en móvil
    const toque = new Mesh(new PlaneGeometry(2.4, 2), new MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
    toque.position.copy(posicion).z += 0.02;

    objetos.push(brillo, marco, vidrio, toque);
    const ventanal: Ventanal = { id: d.slug, datos: d, trazo, posicion, brillo: 0, toque, vidrio, halo: brillo };
    toque.userData.objetivo = ventanal;
    return ventanal;
  });

  const actualizar = (camara: Vector3, t: number) => {
    let maximo = 0;
    for (const v of lista) {
      const u = v.vidrio.material.uniforms;
      u.brillo.value = v.brillo;
      u.tiempo.value = t;
      const distancia = camara.distanceTo(v.posicion);
      u.revelar.value = Math.min(1, Math.max(0, (14 - distancia) / 11.5));
      maximo = Math.max(maximo, u.revelar.value);
      // El halo se apaga al acercarse: si no, vela la captura
      v.halo.material.opacity = (haloBase + Math.min(v.brillo, 1.5) * 0.45) * (1 - u.revelar.value);
      v.halo.scale.setScalar(1 + v.brillo * 0.5);
    }
    return maximo;
  };

  return {
    lista,
    objetos,
    toques: lista.map((v) => v.toque),
    actualizar,
    sinBloom: (activo) => (haloBase = activo ? 0.5 : 0.3),
    texturas,
    listo: Promise.all(cargas).then(() => {}),
  };
}

// --- Estudio de JettaDev ------------------------------------------------------------

// Un cuarto en penumbra con una lámpara de escritorio encendida en brote. Siluetas por SDF,
// en coordenadas del ventanal (x de 0 a 1,6; y de 0 a 1).
const fragmentEstudio = /* glsl */ `
  #include <common>
  #include <fog_pars_fragment>
  uniform vec3 luz;
  uniform float brillo;
  varying vec2 vUv;
  float segmento(vec2 p, vec2 a, vec2 b, float r) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h) - r;
  }
  void main() {
    vec2 p = vec2(vUv.x * 1.6, vUv.y);
    vec2 bombilla = vec2(0.66, 0.5);
    float halo = exp(-dot(p - bombilla, p - bombilla) * 16.0);
    float charco = exp(-(pow(p.x - 0.58, 2.0) * 7.0 + pow(p.y - 0.17, 2.0) * 70.0));
    vec3 color = luz * (0.1 + (0.8 * halo + 0.45 * charco) * (1.0 + brillo * 0.8));
    // Mesa, pie, brazos y pantalla de la lámpara, a contraluz
    float sombra = step(p.y, 0.15);
    sombra = max(sombra, step(segmento(p, vec2(1.06, 0.17), vec2(1.26, 0.17), 0.025), 0.0));
    sombra = max(sombra, step(segmento(p, vec2(1.16, 0.18), vec2(1.0, 0.56), 0.016), 0.0));
    sombra = max(sombra, step(segmento(p, vec2(1.0, 0.56), vec2(0.8, 0.64), 0.016), 0.0));
    sombra = max(sombra, step(segmento(p, vec2(0.82, 0.65), vec2(0.64, 0.53), 0.05), 0.0));
    color = mix(color, luz * 0.02, sombra * 0.9);
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
    #include <fog_fragment>
  }`;

export interface Estudio {
  objetivo: Objetivo;
  objetos: Object3D[];
  actualizar(): void;
}

export function crearEstudio(trazado: Trazado, halo: CanvasTexture): Estudio {
  const e = trazado.estudio;
  const posicion = new Vector3(e.x, e.y, e.z);
  const uniforms = UniformsUtils.merge([UniformsLib.fog, { luz: { value: new Color(COLORES.brote) }, brillo: { value: 0 } }]);
  const vidrio = new Mesh(new PlaneGeometry(e.ancho, e.alto), new ShaderMaterial({ uniforms, vertexShader, fragmentShader: fragmentEstudio, fog: true }));
  vidrio.position.copy(posicion);

  const tono = new Color(COLORES.brote);
  tono.multiplyScalar(LUMINANCIA_MARCO / (tono.r * 0.299 + tono.g * 0.587 + tono.b * 0.114));
  const marco = new Mesh(new PlaneGeometry(e.ancho + 0.1, e.alto + 0.1), new MeshBasicMaterial({ color: tono, toneMapped: false }));
  marco.position.copy(posicion).z -= 0.005;

  const resplandor = new Mesh(
    new PlaneGeometry(e.ancho * 2.2, e.alto * 3),
    new MeshBasicMaterial({ map: halo, color: COLORES.brote, transparent: true, opacity: 0.12, depthWrite: false, blending: AdditiveBlending }),
  );
  resplandor.position.copy(posicion).z += 0.01;

  const toque = new Mesh(new PlaneGeometry(2.4, 2), new MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
  toque.position.copy(posicion).z += 0.02;

  const objetivo: Objetivo = { id: '#sobre-mi', posicion, brillo: 0, toque };
  toque.userData.objetivo = objetivo;
  return {
    objetivo,
    objetos: [resplandor, marco, vidrio, toque],
    actualizar: () => {
      uniforms.brillo.value = objetivo.brillo;
      resplandor.material.opacity = 0.12 + Math.min(objetivo.brillo, 1) * 0.25;
    },
  };
}
