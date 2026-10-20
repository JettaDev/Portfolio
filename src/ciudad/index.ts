// Motor de «La ciudad»: monta la escena en un canvas y la controla.
// Se carga diferido desde la portada; no depende de Astro.

import { Mesh, Raycaster, Vector2, Vector3, type BufferGeometry, type Material } from 'three';
import { gsap } from 'gsap';
import { CamaraCiudad } from './camara';
import { crearCalle, crearEdificios, crearObras, crearSolar } from './edificios';
import { crearEscena, texturaHalo } from './escena';
import { Pintor, NIVELES } from './render';
import { MedidorFps, detectarNivel, nivelInferior, type Nivel, type NivelVivo } from './rendimiento';
import { SEMILLA } from './semilla';
import { trazarCiudad, type Encuadre } from './trazado';
import { crearEscaparate, crearEstudio, crearHuecos, crearVentanales, type DatosVentana, type Objetivo } from './ventanas';

export type { DatosVentana } from './ventanas';
export type { Nivel } from './rendimiento';
export type { Encuadre } from './trazado';

export interface OpcionesCiudad {
  semilla?: number;
  /** Nivel de calidad; por defecto se detecta. `'estatico'` no monta nada (se queda el póster). */
  nivel?: Nivel;
  /** Sin parallax, parpadeo ni vuelo. */
  reducido?: boolean;
  /** Encuadre fijo; por defecto, según el aspecto del canvas (el póster «alto» lo fuerza). */
  encuadre?: Encuadre;
  /** Densidad de píxeles fija (póster). */
  dpr?: number;
  /** Apagón: la ciudad con todas las luces apagadas (póster de la 404). */
  apagon?: boolean;
  /** Con apagón, el único ventanal que sigue encendido (imágenes Open Graph). */
  encendida?: string;
  /**
   * El puntero entra o sale de algo señalable: un ventanal (su slug), el escaparate (`#apps`),
   * el estudio (`#sobre-mi`) o el solar (`#contacto`).
   */
  alPasar?: (id: string | null) => void;
  /** Clic o toque sobre algo señalable (mismos ids que `alPasar`). */
  alPulsar?: (id: string) => void;
  /** El primer fotograma con las capturas cargadas ya está en pantalla: se puede fundir el canvas sobre el póster. */
  alPrimerFrame?: () => void;
  /** El medidor de FPS ha bajado la calidad. */
  alCambiarNivel?: (nivel: Nivel) => void;
  /** Se ha perdido el contexto WebGL: hay que volver al póster. */
  alFallar?: () => void;
}

export interface Ciudad {
  readonly nivel: Nivel;
  /** Se resuelve cuando han cargado las capturas de los ventanales. */
  readonly listo: Promise<void>;
  /** Ilumina un ventanal, el escaparate, el estudio o el solar (hover o foco en HTML), o nada con `null`. */
  resaltar(id: string | null): void;
  /** Vuela hasta un objetivo (mismos ids que `alPasar`); se resuelve con la cámara pegada a él. */
  volarA(id: string): Promise<void>;
  /** Arranca pegada al objetivo y vuelve al reposo. */
  volverDe(id: string): Promise<void>;
  /** Deja la cámara pegada al objetivo, como al final de `volarA`, o a una fracción del vuelo. */
  situarEn(id: string, progreso?: number): void;
  /** Centro de un objetivo (o de su rótulo) en píxeles CSS, relativo al canvas. */
  enPantalla(id: string, punto?: 'centro' | 'rotulo'): { x: number; y: number } | null;
  reducido(activo: boolean): void;
  destruir(): void;
}

/** Devuelve el hilo principal al navegador entre pasos del montaje: ninguno es una tarea larga. */
const ceder = () => new Promise<void>((r) => setTimeout(r, 0));

export async function montarCiudad(canvas: HTMLCanvasElement, datos: DatosVentana[], opciones: OpcionesCiudad = {}): Promise<Ciudad> {
  let nivel = opciones.nivel ?? detectarNivel();
  if (nivel === 'estatico') throw new Error('Nivel estático: se muestra el póster, sin montar la ciudad');
  let reducido = opciones.reducido ?? false;
  const semilla = opciones.semilla ?? SEMILLA;

  // --- Escena ------------------------------------------------------------------
  const trazado = trazarCiudad(
    datos.map(({ slug, status, planta }) => ({ slug, status, planta })),
    semilla,
  );
  await ceder();
  const halo = texturaHalo();
  const escena = crearEscena(semilla, halo, { pocasEstrellas: nivel !== 'alto' });
  const edificios = crearEdificios(trazado);
  const calle = crearCalle(trazado, halo);
  await ceder();
  const huecos = crearHuecos(trazado);
  await ceder();
  const ventanales = crearVentanales(trazado, datos, halo);
  const obras = crearObras(trazado);
  const solar = crearSolar(trazado, halo);
  const estudio = crearEstudio(trazado, halo);
  const escaparate = crearEscaparate(trazado, datos, ventanales.capturas, halo);
  escena.add(edificios, calle.objeto, huecos.malla, ...ventanales.objetos, ...obras.objetos, solar.objeto, ...estudio.objetos, ...escaparate.objetos);
  if (opciones.apagon) {
    [calle, huecos, obras, solar, estudio, escaparate].forEach((parte) => parte.apagar());
    ventanales.apagar(opciones.encendida);
  }
  await ceder();

  const camara = new CamaraCiudad(trazado);
  const pintor = new Pintor(canvas, escena, camara.camara, nivel, opciones.dpr);

  const aplicarNivel = (n: NivelVivo) => {
    const filas = NIVELES[n].filas;
    edificios.count = trazado.cortes.edificios[filas - 1];
    huecos.malla.count = trazado.cortes.huecos[filas - 1];
    ventanales.sinBloom(NIVELES[n].bloom === 0);
    pintor.ajustar(n);
  };
  aplicarNivel(nivel);

  const redimensionar = () => {
    const ancho = Math.max(1, canvas.clientWidth);
    const alto = Math.max(1, canvas.clientHeight);
    pintor.redimensionar(ancho, alto);
    camara.encuadrar(ancho / alto, opciones.encuadre);
  };
  redimensionar();
  const observadorTamano = new ResizeObserver(redimensionar);
  observadorTamano.observe(canvas);
  await ceder();
  await pintor.precompilar();
  await ceder();
  // Un render a 1×1 sube a la GPU geometrías, instancias y texturas: si no, todo eso cae en el
  // primer fotograma de verdad y lo convierte en una tarea larga
  pintor.calentar();
  await ceder();

  // --- Ventanales, escaparate, estudio y solar: resaltar, buscar y tocar ----------------------
  const objetivos: Objetivo[] = [...ventanales.lista, escaparate.objetivo, estudio.objetivo, solar.objetivo];
  const porId = new Map(objetivos.map((o) => [o.id, o]));
  // La calle: a pie de acera delante de la tienda, a la altura de los ojos. No se señala ni se
  // pulsa en el canvas (no tiene toque): es adonde vuela la cámara para entrar en el juego
  const aPieDeCalle: Objetivo = { id: '#calle', posicion: new Vector3(0, 2.2, trazado.calle.fachada), tamano: { ancho: 4, alto: 3.4 }, brillo: 0, toque: new Mesh() };
  porId.set(aPieDeCalle.id, aPieDeCalle);
  /** 0 lejos, 1 con la cámara a su distancia de llegada (misma cuenta que la captura de los ventanales). */
  const cercania = (o: Objetivo) => Math.min(1, Math.max(0, (14 - camara.camara.position.distanceTo(o.posicion)) / 11.5));
  const toques = objetivos.map((o) => o.toque);
  let resaltado: Objetivo | null = null;

  const resaltar = (v: Objetivo | null) => {
    if (v === resaltado) return;
    if (resaltado) gsap.to(resaltado, { brillo: 0, duration: 0.4, ease: 'power2.out', overwrite: true });
    resaltado = v;
    if (v) gsap.to(v, { brillo: 1, duration: 0.35, ease: 'power2.out', overwrite: true });
    canvas.style.cursor = v ? 'pointer' : '';
  };

  const rayo = new Raycaster();
  const ndc = new Vector2();
  const buscar = (e: PointerEvent): Objetivo | null => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    rayo.setFromCamera(ndc, camara.camara);
    return (rayo.intersectObjects(toques, false)[0]?.object.userData.objetivo as Objetivo) ?? null;
  };

  const alMover = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || !camara.enReposo) return; // en táctil no hay hover
    const r = canvas.getBoundingClientRect();
    camara.apuntar(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
    const v = buscar(e);
    if (v !== resaltado) {
      resaltar(v);
      opciones.alPasar?.(v?.id ?? null);
    }
  };
  const alSalir = () => {
    camara.apuntar(0, 0);
    if (!resaltado) return;
    resaltar(null);
    opciones.alPasar?.(null);
  };
  // Clic o toque: solo si el puntero apenas se ha movido (no es un arrastre)
  let pulsadoEn: { x: number; y: number } | null = null;
  const alPulsar = (e: PointerEvent) => (pulsadoEn = { x: e.clientX, y: e.clientY });
  const alSoltar = (e: PointerEvent) => {
    if (!pulsadoEn || !camara.enReposo || Math.hypot(e.clientX - pulsadoEn.x, e.clientY - pulsadoEn.y) > 10) return;
    pulsadoEn = null;
    const v = buscar(e);
    if (v) opciones.alPulsar?.(v.id);
  };
  canvas.addEventListener('pointermove', alMover);
  canvas.addEventListener('pointerleave', alSalir);
  canvas.addEventListener('pointerdown', alPulsar);
  canvas.addEventListener('pointerup', alSoltar);

  // --- Bucle, pausa y medición ----------------------------------------------------------
  const medidor = new MedidorFps();
  // Mientras se compilan los shaders del nivel nuevo no se pinta: el canvas conserva el último fotograma
  let compilando = false;
  let anterior = 0;
  let primerFrame = false;
  let capturas = false;
  let tiempo = 0;
  ventanales.listo.then(() => (capturas = true));

  const fotograma = (ahora: number) => {
    const real = anterior ? (ahora - anterior) / 1000 : 0;
    anterior = ahora;
    const dt = Math.min(real, 0.1);

    if (compilando) return;
    if (camara.enReposo && real > 0 && nivel !== 'bajo') {
      if (medidor.registrar(real) === 'lento') {
        nivel = nivelInferior(nivel as NivelVivo);
        aplicarNivel(nivel as NivelVivo);
        compilando = true;
        pintor.precompilar().finally(() => (compilando = false));
        opciones.alCambiarNivel?.(nivel);
        return;
      }
    }
    if (!reducido) {
      tiempo += dt;
      huecos.parpadear(dt);
    }
    camara.actualizar(!reducido);
    obras.actualizar(tiempo, !reducido);
    estudio.actualizar();
    solar.actualizar();
    escaparate.actualizar();
    // Cerca de un ventanal (o de otro sitio) el bloom se atenúa: lo que llena la pantalla no deslumbra
    const revelado = Math.max(ventanales.actualizar(camara.camara.position, tiempo), ...[escaparate, estudio, solar].map((s) => cercania(s.objetivo)));
    pintor.atenuarBloom(1 - revelado);
    pintor.pintar();

    if (!primerFrame && capturas) {
      primerFrame = true;
      // Un fotograma más para que el navegador lo haya presentado antes de avisar
      requestAnimationFrame(() => opciones.alPrimerFrame?.());
    }
  };

  // Solo se pinta con el canvas en pantalla y la pestaña visible
  let enPantalla = true;
  let paginaActiva = !document.hidden;
  const actualizarBucle = () => {
    const activo = enPantalla && paginaActiva;
    anterior = 0;
    pintor.renderer.setAnimationLoop(activo ? fotograma : null);
  };
  const observadorVisible = new IntersectionObserver(([e]) => {
    enPantalla = e.isIntersecting;
    actualizarBucle();
  });
  observadorVisible.observe(canvas);
  const alCambiarVisibilidad = () => {
    paginaActiva = !document.hidden;
    actualizarBucle();
  };
  const alOcultarPagina = () => {
    paginaActiva = false;
    actualizarBucle();
  };
  const alMostrarPagina = () => {
    paginaActiva = !document.hidden;
    actualizarBucle();
  };
  document.addEventListener('visibilitychange', alCambiarVisibilidad);
  addEventListener('pagehide', alOcultarPagina);
  addEventListener('pageshow', alMostrarPagina);

  const alPerderContexto = (e: Event) => {
    e.preventDefault();
    pintor.renderer.setAnimationLoop(null);
    opciones.alFallar?.();
  };
  canvas.addEventListener('webglcontextlost', alPerderContexto);

  actualizarBucle();

  // --- API ---------------------------------------------------------------------------
  const objetivo = (id: string) => {
    const o = porId.get(id);
    if (!o) throw new Error(`No hay nada en la ciudad para «${id}»`);
    return o;
  };

  return {
    get nivel() {
      return nivel;
    },
    listo: ventanales.listo,
    resaltar: (id) => resaltar(id ? (porId.get(id) ?? null) : null),
    volarA: (id) => {
      const o = objetivo(id);
      resaltado = null;
      canvas.style.cursor = '';
      gsap.killTweensOf(o);
      return reducido ? Promise.resolve() : camara.volarA(o);
    },
    volverDe: (id) => {
      const o = objetivo(id);
      gsap.killTweensOf(o);
      if (reducido) {
        camara.reposar();
        o.brillo = 0;
        return Promise.resolve();
      }
      return camara.volverDe(o);
    },
    situarEn: (id, progreso) => {
      const o = objetivo(id);
      gsap.killTweensOf(o);
      resaltado = null;
      camara.situar(o, progreso);
    },
    enPantalla: (id, punto = 'centro') => {
      const o = porId.get(id);
      if (!o) return null;
      const p = (punto === 'rotulo' && o.rotulo ? o.rotulo : o.posicion).clone().project(camara.camara);
      return { x: (p.x * 0.5 + 0.5) * canvas.clientWidth, y: (-p.y * 0.5 + 0.5) * canvas.clientHeight };
    },
    reducido: (activo) => {
      reducido = activo;
    },
    destruir: () => {
      pintor.renderer.setAnimationLoop(null);
      observadorTamano.disconnect();
      observadorVisible.disconnect();
      canvas.removeEventListener('pointermove', alMover);
      canvas.removeEventListener('pointerleave', alSalir);
      canvas.removeEventListener('pointerdown', alPulsar);
      canvas.removeEventListener('pointerup', alSoltar);
      canvas.removeEventListener('webglcontextlost', alPerderContexto);
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
      removeEventListener('pagehide', alOcultarPagina);
      removeEventListener('pageshow', alMostrarPagina);
      camara.destruir();
      objetivos.forEach((v) => gsap.killTweensOf(v));

      // Memoria de la GPU: geometrías, materiales, texturas y renderer
      edificios.dispose();
      huecos.malla.dispose();
      escena.traverse((o) => {
        const m = o as Mesh<BufferGeometry, Material | Material[]>;
        m.geometry?.dispose();
        (Array.isArray(m.material) ? m.material : m.material ? [m.material] : []).forEach((mat) => mat.dispose());
      });
      halo.dispose();
      ventanales.texturas.forEach((t) => t.dispose());
      escena.clear();
      pintor.destruir();
    },
  };
}
