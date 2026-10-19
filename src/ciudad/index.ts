// Motor de «La ciudad»: monta la escena en un canvas y la controla.
// Se carga diferido desde la portada; no depende de Astro.

import { Raycaster, Vector2, type BufferGeometry, type Material, type Mesh } from 'three';
import { gsap } from 'gsap';
import { CamaraCiudad } from './camara';
import { crearEdificios } from './edificios';
import { crearEscena, texturaHalo } from './escena';
import { Pintor, NIVELES } from './render';
import { MedidorFps, detectarNivel, nivelInferior, type Nivel, type NivelVivo } from './rendimiento';
import { SEMILLA } from './semilla';
import { trazarCiudad, type Encuadre } from './trazado';
import { crearHuecos, crearVentanales, type DatosVentana, type Ventanal } from './ventanas';

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
  /** El puntero entra o sale de un ventanal. */
  alPasar?: (slug: string | null) => void;
  /** Clic o toque sobre un ventanal. */
  alPulsar?: (slug: string) => void;
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
  /** Ilumina un ventanal (hover o foco en la lista HTML), o ninguno con `null`. */
  resaltar(slug: string | null): void;
  /** Vuela hasta el ventanal; se resuelve con la cámara pegada a él. */
  volarA(slug: string): Promise<void>;
  /** Arranca pegada al ventanal y vuelve al reposo. */
  volverDe(slug: string): Promise<void>;
  /** Centro del ventanal en píxeles CSS, relativo al canvas. */
  enPantalla(slug: string): { x: number; y: number } | null;
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
  const halo = texturaHalo();
  const escena = crearEscena(semilla, halo, { pocasEstrellas: nivel !== 'alto' });
  const edificios = crearEdificios(trazado);
  const huecos = crearHuecos(trazado);
  const ventanales = crearVentanales(trazado, datos, halo);
  escena.add(edificios, huecos.malla, ...ventanales.objetos);
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

  // --- Ventanales: resaltar, buscar y tocar ------------------------------------------
  const porSlug = new Map(ventanales.lista.map((v) => [v.datos.slug, v]));
  let resaltado: Ventanal | null = null;

  const resaltar = (v: Ventanal | null) => {
    if (v === resaltado) return;
    if (resaltado) gsap.to(resaltado, { brillo: 0, duration: 0.4, ease: 'power2.out', overwrite: true });
    resaltado = v;
    if (v) gsap.to(v, { brillo: 1, duration: 0.35, ease: 'power2.out', overwrite: true });
    canvas.style.cursor = v ? 'pointer' : '';
  };

  const rayo = new Raycaster();
  const ndc = new Vector2();
  const buscar = (e: PointerEvent): Ventanal | null => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    rayo.setFromCamera(ndc, camara.camara);
    return (rayo.intersectObjects(ventanales.toques, false)[0]?.object.userData.ventanal as Ventanal) ?? null;
  };

  const alMover = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || !camara.enReposo) return; // en táctil no hay hover
    const r = canvas.getBoundingClientRect();
    camara.apuntar(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
    const v = buscar(e);
    if (v !== resaltado) {
      resaltar(v);
      opciones.alPasar?.(v?.datos.slug ?? null);
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
    if (v) opciones.alPulsar?.(v.datos.slug);
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
    if (!reducido) huecos.parpadear(dt);
    camara.actualizar(!reducido);
    const revelado = ventanales.actualizar(camara.camara.position);
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
  const ventanal = (slug: string) => {
    const v = porSlug.get(slug);
    if (!v) throw new Error(`No hay ventana para «${slug}»`);
    return v;
  };

  return {
    get nivel() {
      return nivel;
    },
    listo: ventanales.listo,
    resaltar: (slug) => resaltar(slug ? ventanal(slug) : null),
    volarA: (slug) => {
      const v = ventanal(slug);
      resaltado = null;
      canvas.style.cursor = '';
      gsap.killTweensOf(v);
      return reducido ? Promise.resolve() : camara.volarA(v);
    },
    volverDe: (slug) => {
      const v = ventanal(slug);
      gsap.killTweensOf(v);
      if (reducido) {
        camara.reposar();
        v.brillo = 0;
        return Promise.resolve();
      }
      return camara.volverDe(v);
    },
    enPantalla: (slug) => {
      const v = porSlug.get(slug);
      if (!v) return null;
      const p = v.posicion.clone().project(camara.camara);
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
      ventanales.lista.forEach((v) => gsap.killTweensOf(v));

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
