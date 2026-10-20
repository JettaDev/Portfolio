// Ventanas: huecos decorativos (una InstancedMesh con parpadeo) y ventanales de las apps.

import {
  AdditiveBlending,
  Color,
  DataTexture,
  DoubleSide,
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
  /** Apagón (404): todas las ventanas a oscuras y sin parpadeo. */
  apagar(): void;
  /** Cambia el color de un hueco (la luz de una tele). */
  tenir(i: number, color: Color): void;
  /** Al pasar el ratón: si estaba apagada se enciende (cálida) y si estaba encendida se apaga, un rato. */
  destacar(i: number): void;
  /** Devuelve a su luz las ventanas destacadas cuando pasa su rato. */
  actualizar(dt: number): void;
}

/** `fijas`: huecos que no parpadean (los que tienen una silueta o una tele delante). */
export function crearHuecos(trazado: Trazado, fijas: ReadonlySet<number> = new Set()): Huecos {
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
  const parpadean = huecos.flatMap((h, i) => (h.fila < 3 && !fijas.has(i) ? [i] : []));
  /** Ventanas destacadas al pasar el ratón, con el tiempo que les queda. */
  const destacadas = new Map<number, number>();
  const calida = new Color('#f0d7a8').multiplyScalar(0.2);
  let reloj = 0;
  let apagadas = false;
  const parpadear = (dt: number) => {
    if (apagadas) return;
    reloj += dt;
    if (reloj < 0.12) return;
    reloj = 0;
    const colores = malla.instanceColor!;
    // Una o dos cada vez: se nota sin distraer
    for (let n = 0; n < 2; n++) {
      const i = parpadean[Math.floor(Math.random() * parpadean.length)];
      if (destacadas.has(i)) continue;
      estado[i] ^= 1;
      malla.setColorAt(i, estado[i] ? encendida[i] : apagada);
      colores.addUpdateRange(i * 3, 3);
    }
    colores.needsUpdate = true;
  };
  const apagar = () => {
    apagadas = true;
    huecos.forEach((_, i) => malla.setColorAt(i, apagada));
    malla.instanceColor!.needsUpdate = true;
  };
  /** Cambia el color de un hueco (la luz de una tele). */
  const tenir = (i: number, color: Color) => {
    if (apagadas) return;
    malla.setColorAt(i, color);
    malla.instanceColor!.addUpdateRange(i * 3, 3);
    malla.instanceColor!.needsUpdate = true;
  };
  const pintar = (i: number, color: Color) => {
    malla.setColorAt(i, color);
    malla.instanceColor!.addUpdateRange(i * 3, 3);
    malla.instanceColor!.needsUpdate = true;
  };
  const destacar = (i: number) => {
    if (apagadas || fijas.has(i)) return;
    if (!destacadas.has(i)) pintar(i, estado[i] ? apagada : calida);
    destacadas.set(i, 2.5);
  };
  const actualizar = (dt: number) => {
    for (const [i, resto] of destacadas) {
      if (resto - dt > 0) destacadas.set(i, resto - dt);
      else {
        destacadas.delete(i);
        if (!apagadas) pintar(i, estado[i] ? encendida[i] : apagada);
      }
    }
  };
  return { malla, parpadear, apagar, tenir, destacar, actualizar };
}

// --- Ventanales de las apps ------------------------------------------------------

/** Lo que se puede señalar en la ciudad: los ventanales, el escaparate, el estudio y el solar. */
export interface Objetivo {
  /** Slug de la app, o el sitio del barrio (#apps, #sobre-mi, #contacto). */
  id: string;
  posicion: Vector3;
  /** Lo que mide en la fachada: decide a qué distancia se queda la cámara al volar hasta él. */
  tamano: { ancho: number; alto: number };
  /** Dónde va su rótulo HTML, si lo tiene (el del escaparate, encima del toldo). */
  rotulo?: Vector3;
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
  /** La captura de cada app (en el orden de `datos`), o null si no ha cargado: el escaparate las reutiliza. */
  capturas: Promise<Texture | null>[];
  /** Se resuelve cuando han cargado (o fallado) todas las capturas. */
  listo: Promise<void>;
  /** Apagón: vidrio a oscuras, sin captura, sin halo y con el marco apagado (salvo `excepto`). */
  apagar(excepto?: string): void;
}

export function crearVentanales(trazado: Trazado, datos: DatosVentana[], halo: CanvasTexture): Ventanales {
  const objetos: Object3D[] = [];
  const texturas: Texture[] = [];
  const cargador = new TextureLoader();
  const luz = new Color(COLORES.calendula);
  let haloBase = 0.22;
  const apagada = new Color(COLORES.apagada);
  const cargas: Promise<Texture | null>[] = [];
  const marcos: Mesh<PlaneGeometry, MeshBasicMaterial>[] = [];

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
          // Un ventanal apagado ya tiene la luz a oscuras: la captura no se ve
          if (!uniforms.luz.value.equals(apagada)) uniforms.hayCaptura.value = 1;
          return textura;
        })
        // Sin captura, el ventanal es solo luz: no es motivo para no pintar la ciudad
        .catch(() => null),
    );

    // Marco fino del color de la app, por debajo del umbral del bloom
    const tono = new Color(d.hue);
    const luminancia = tono.r * 0.299 + tono.g * 0.587 + tono.b * 0.114;
    if (luminancia > LUMINANCIA_MARCO) tono.multiplyScalar(LUMINANCIA_MARCO / luminancia);
    const marco = new Mesh(new PlaneGeometry(trazo.ancho + 0.1, trazo.alto + 0.1), new MeshBasicMaterial({ color: tono, toneMapped: false }));
    marco.position.copy(posicion).z -= 0.005;
    marcos.push(marco);

    const brillo = new Mesh(
      new PlaneGeometry(trazo.ancho * 2.1, trazo.alto * 2.8),
      new MeshBasicMaterial({ map: halo, color: COLORES.calendula, transparent: true, opacity: haloBase, depthWrite: false, blending: AdditiveBlending }),
    );
    brillo.position.copy(posicion).z += 0.01;

    // Zona de toque invisible, mucho mayor que el ventanal: imprescindible en móvil
    const toque = new Mesh(new PlaneGeometry(2.4, 2), new MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
    toque.position.copy(posicion).z += 0.02;

    objetos.push(brillo, marco, vidrio, toque);
    const ventanal: Ventanal = { id: d.slug, datos: d, trazo, posicion, tamano: { ancho: trazo.ancho, alto: trazo.alto }, brillo: 0, toque, vidrio, halo: brillo };
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
    sinBloom: (activo) => (haloBase = activo ? 0.42 : 0.22),
    texturas,
    capturas: cargas,
    listo: Promise.all(cargas).then(() => {}),
    apagar: (excepto) => {
      lista.forEach((v, i) => {
        if (v.id === excepto) return;
        v.vidrio.material.uniforms.luz.value.set(COLORES.apagada);
        v.vidrio.material.uniforms.hayCaptura.value = 0;
        v.halo.visible = false;
        marcos[i].material.color.set(COLORES.apagada);
      });
    },
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
  apagar(): void;
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

  const objetivo: Objetivo = { id: '#sobre-mi', posicion, tamano: { ancho: e.ancho, alto: e.alto }, brillo: 0, toque };
  toque.userData.objetivo = objetivo;
  return {
    objetivo,
    objetos: [resplandor, marco, vidrio, toque],
    actualizar: () => {
      uniforms.brillo.value = objetivo.brillo;
      resplandor.material.opacity = resplandor.visible ? 0.12 + Math.min(objetivo.brillo, 1) * 0.25 : 0;
    },
    apagar: () => {
      uniforms.luz.value.set(COLORES.apagada);
      resplandor.visible = false;
      marco.material.color.set(COLORES.apagada);
    },
  };
}

// --- Escaparate de la tienda ----------------------------------------------------------

// El interior de la tienda: luz cálida y tenue (por debajo del umbral del bloom), más clara
// arriba, con el suelo en sombra. Delante, las tarjetas de las apps (mallas aparte).
const fragmentEscaparate = /* glsl */ `
  #include <common>
  #include <fog_pars_fragment>
  uniform vec3 fondo;
  uniform vec3 calida;
  uniform float brillo;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv;
    vec3 color = fondo + calida * (0.55 + 0.45 * smoothstep(0.15, 1.0, p.y)) * (1.0 + brillo * 0.6);
    color = mix(color, fondo * 0.4, step(p.y, 0.08));
    // El dintel, a contraluz
    color *= 1.0 - 0.85 * step(0.94, p.y);
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
    #include <fog_fragment>
  }`;

/** Luz de las capturas expuestas: por debajo del umbral del bloom, para que no brillen como los ventanales. */
const LUZ_TARJETA = 0.34;

export interface Escaparate {
  objetivo: Objetivo;
  objetos: Object3D[];
  actualizar(): void;
  apagar(): void;
}

/**
 * El escaparate es una luna de cristal ancha con luz cálida dentro y, expuesta, una tarjeta por
 * app como las del catálogo: su captura 16:10 con un marco fino en su `hue` y un pie oscuro.
 * Caben todas: con más apps, las tarjetas se encogen (y pasan a dos filas desde la quinta).
 */
export function crearEscaparate(trazado: Trazado, datos: DatosVentana[], capturas: Promise<Texture | null>[], halo: CanvasTexture): Escaparate {
  const e = trazado.escaparate;
  const posicion = new Vector3(e.x, e.y, e.z);
  const uniforms = UniformsUtils.merge([
    UniformsLib.fog,
    { fondo: { value: new Color(COLORES.tienda).multiplyScalar(0.5) }, calida: { value: new Color(COLORES.calendula).multiplyScalar(0.035) }, brillo: { value: 0 } },
  ]);
  const vidrio = new Mesh(new PlaneGeometry(e.ancho, e.alto), new ShaderMaterial({ uniforms, vertexShader, fragmentShader: fragmentEscaparate, fog: true }));
  vidrio.position.copy(posicion);

  // Tarjetas: en una fila (dos desde la quinta app), centradas un poco por encima del suelo de la tienda
  const n = datos.length;
  const filas = n > 4 ? 2 : 1;
  const porFila = Math.ceil(n / filas);
  const hueco = 0.14;
  const util = { ancho: e.ancho * 0.86, alto: e.alto * 0.72 };
  const ancho = Math.min(1.3, (util.ancho - hueco * (porFila - 1)) / porFila, ((util.alto - hueco * (filas - 1)) / filas - 0.08) * 1.6);
  const alto = ancho / 1.6;
  const tarjetas: Mesh<PlaneGeometry, MeshBasicMaterial>[] = [];
  const piezas: Object3D[] = [];
  const pie = new MeshBasicMaterial({ color: '#081510', toneMapped: false });
  // Textura provisional del color del interior: con un mapa desde el principio, poner la captura
  // no cambia el programa del material (cambiarlo obligaría a recompilar el shader en pleno vuelo)
  const provisional = new DataTexture(Uint8Array.from([...new Color(COLORES.tienda).toArray().map((v) => Math.round(v * 255)), 255]), 1, 1);
  provisional.needsUpdate = true;
  datos.forEach((d, i) => {
    const fila = Math.floor(i / porFila);
    const enFila = fila === filas - 1 ? n - porFila * (filas - 1) : porFila;
    const col = i - fila * porFila;
    const x = e.x + (col - (enFila - 1) / 2) * (ancho + hueco);
    const y = e.y + 0.08 + ((filas - 1) / 2 - fila) * (alto + hueco + 0.08);
    const z = e.z + 0.02;

    const tono = new Color(d.hue);
    const luminancia = tono.r * 0.299 + tono.g * 0.587 + tono.b * 0.114;
    if (luminancia > LUMINANCIA_MARCO) tono.multiplyScalar(LUMINANCIA_MARCO / luminancia);
    const marco = new Mesh(new PlaneGeometry(ancho + 0.05, alto + 0.05), new MeshBasicMaterial({ color: tono, toneMapped: false }));
    marco.position.set(x, y, z - 0.004);
    // Hasta que llega la captura, la tarjeta es un rectángulo del color del interior
    const tarjeta = new Mesh(new PlaneGeometry(ancho, alto), new MeshBasicMaterial({ map: provisional, toneMapped: false }));
    tarjeta.position.set(x, y, z);
    const base = new Mesh(new PlaneGeometry(ancho * 0.4, 0.08), pie);
    base.position.set(x, y - alto / 2 - 0.06, z);
    capturas[i]?.then((t) => {
      if (!t || !tarjeta.visible) return;
      tarjeta.material.map = t;
      tarjeta.material.color.setScalar(LUZ_TARJETA);
    });
    tarjetas.push(tarjeta);
    piezas.push(marco, tarjeta, base);
  });

  // Marco del escaparate y toldo inclinado hacia la calle
  const oscuro = new MeshBasicMaterial({ color: '#0b1a12', toneMapped: false });
  const marco = new Mesh(new PlaneGeometry(e.ancho + 0.16, e.alto + 0.16), oscuro);
  marco.position.copy(posicion).z -= 0.005;
  const toldo = new Mesh(new PlaneGeometry(e.toldo.ancho, e.toldo.vuelo), new MeshBasicMaterial({ color: '#1d3b2a', side: DoubleSide }));
  toldo.position.set(e.x, e.toldo.y, e.z + (e.toldo.vuelo / 2) * Math.cos(0.5));
  toldo.rotation.x = -Math.PI / 2 + 0.5;
  toldo.position.y -= (e.toldo.vuelo / 2) * Math.sin(0.5);

  // La luz cálida de la tienda cae sobre la acera
  const charco = new Mesh(
    new PlaneGeometry(e.ancho * 1.6, 2.2),
    new MeshBasicMaterial({ map: halo, color: '#b39066', transparent: true, opacity: 0.14, depthWrite: false, blending: AdditiveBlending }),
  );
  charco.rotation.x = -Math.PI / 2;
  charco.position.set(e.x, 0.13, e.z + 1);

  const toque = new Mesh(new PlaneGeometry(e.ancho + 0.4, e.alto + 0.8), new MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
  toque.position.set(e.x, e.y + 0.2, e.z + 0.75);

  const rotulo = new Vector3(e.x, e.toldo.y + 0.55, e.z);
  const objetivo: Objetivo = { id: '#apps', posicion, tamano: { ancho: e.ancho, alto: e.alto }, rotulo, brillo: 0, toque };
  toque.userData.objetivo = objetivo;
  return {
    objetivo,
    objetos: [marco, vidrio, ...piezas, toldo, charco, toque],
    actualizar: () => {
      uniforms.brillo.value = objetivo.brillo;
      charco.material.opacity = charco.visible ? 0.14 + Math.min(objetivo.brillo, 1) * 0.1 : 0;
      for (const t of tarjetas) if (t.material.map !== provisional) t.material.color.setScalar(LUZ_TARJETA * (1 + Math.min(objetivo.brillo, 1) * 0.35));
    },
    apagar: () => {
      uniforms.fondo.value.set(COLORES.apagada);
      uniforms.calida.value.setScalar(0);
      tarjetas.forEach((t) => (t.visible = false));
      piezas.forEach((p) => (p.visible = false));
      charco.visible = false;
    },
  };
}
