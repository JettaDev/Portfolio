// Motor de «La ciudad»: monta la escena en un canvas y la controla.
// Se carga diferido desde la portada; no depende de Astro.

import { Mesh, Raycaster, Vector2, Vector3, type BufferGeometry, type Material } from 'three';
import { gsap } from 'gsap';
import { CamaraCiudad } from './camara';
import { crearDetalles, trazarDetalles } from './detalles';
import { crearVida, elegirHuecosVivos } from './vida';
import { crearAmbiente, type Clima } from './ambiente';
import { crearGato } from './gato';
import { crearCalle, crearEdificios, crearObras, crearSolar } from './edificios';
import { COLORES, crearEscena, texturaHalo } from './escena';
import { Pintor, NIVELES } from './render';
import { MedidorFps, detectarNivel, nivelInferior, type Nivel, type NivelVivo } from './rendimiento';
import { SEMILLA } from './semilla';
import { trazarCiudad, type Encuadre } from './trazado';
import { crearEscaparate, crearEstudio, crearHuecos, crearVentanales, type DatosVentana, type Objetivo } from './ventanas';

export type { DatosVentana } from './ventanas';
export type { Nivel } from './rendimiento';
export type { Encuadre } from './trazado';
export type { Clima } from './ambiente';
export { climaDelDia } from './ambiente';

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
  /** Tiempo: lluvia o despejado (por defecto, despejado, como el póster). */
  clima?: Clima;
  /** Hora local (0–24) para el tono del cielo; sin ella, de noche (como el póster). */
  hora?: number;
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
  /** Se ha descubierto un detalle escondido: el gato (`#gato`) o la luna, que cambia el tiempo (`#luna`). */
  alCuriosidad?: (id: '#gato' | '#luna') => void;
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
  /** Vuelve al reposo: pegada al objetivo al empezar o, con `desdeDondeEste`, desde donde esté la cámara. */
  volverDe(id: string, desdeDondeEste?: boolean): Promise<void>;
  /** Se acerca hasta que el objetivo tiene buen tamaño en pantalla (la ventana sale de ahí). */
  acercarA(id: string): Promise<void>;
  /**
   * Rectángulo del objetivo en pantalla (píxeles CSS, relativo al canvas). Con `ampliar`, uno
   * 16:10 centrado en él y esa vez más ancho: el trozo de ciudad que sale de los sitios.
   */
  rectEnPantalla(id: string, ampliar?: number): { x: number; y: number; ancho: number; alto: number } | null;
  /** Recorte del canvas recién pintado (el rectángulo de `rectEnPantalla` con el mismo `ampliar`). */
  recorte(id: string, ampliar?: number): HTMLCanvasElement | null;
  /** Deja la cámara pegada al objetivo, como al final de `volarA`, o a una fracción del vuelo. */
  situarEn(id: string, progreso?: number): void;
  /** Centro de un objetivo (o de su rótulo) en píxeles CSS, relativo al canvas. */
  enPantalla(id: string, punto?: 'centro' | 'rotulo'): { x: number; y: number } | null;
  reducido(activo: boolean): void;
  /** Deja de pintar (la imagen se queda quieta) o vuelve a hacerlo: al volver con Atrás, mientras dura la view transition. */
  congelar(activo: boolean): void;
  /** Cambia el tiempo (se funde en unos segundos). */
  clima(c: Clima): void;
  readonly lloviendo: boolean;
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
  const vivos = elegirHuecosVivos(trazado, semilla);
  const huecos = crearHuecos(trazado, new Set([...vivos.siluetas, ...vivos.teles]));
  await ceder();
  const ventanales = crearVentanales(trazado, datos, halo);
  const obras = crearObras(trazado);
  const solar = crearSolar(trazado, halo);
  const estudio = crearEstudio(trazado, halo);
  const escaparate = crearEscaparate(trazado, datos, ventanales.capturas, halo);
  // Los neones de los bajos se escriben con la fuente de la página
  await document.fonts?.load('700 40px "Bricolage Grotesque Variable"').catch(() => {});
  const detalles = crearDetalles(trazarDetalles(trazado, semilla), halo);
  await ceder();
  const vida = crearVida(trazado, semilla, huecos, vivos, halo, { pocos: nivel === 'bajo' });
  await ceder();
  // Lo que se refleja en la calzada mojada: farolas, ventanales y el escaparate
  const reflejos = [
    ...trazado.calle.farolas.map((x) => ({ x, color: COLORES.farola, fuerza: 1 })),
    ...trazado.proyectos.map((p) => ({ x: p.x, color: COLORES.calendula, fuerza: 0.55 })),
    { x: trazado.escaparate.x, color: '#f0d7a8', fuerza: 0.5 },
  ];
  const ambiente = crearAmbiente(escena, trazado, halo, reflejos, { gotas: { alto: 1400, medio: 700, bajo: 300 }[nivel] });
  ambiente.clima(opciones.clima ?? 'despejado');
  if (opciones.hora !== undefined) ambiente.hora(opciones.hora);
  const gato = crearGato(trazado);
  escena.add(detalles.objeto, vida.objeto, ambiente.objeto, gato.objeto);
  escena.add(edificios, calle.objeto, huecos.malla, ...ventanales.objetos, ...obras.objetos, solar.objeto, ...estudio.objetos, ...escaparate.objetos);
  if (opciones.apagon) {
    [calle, huecos, obras, solar, estudio, escaparate, detalles, vida, gato].forEach((parte) => parte.apagar());
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
  // El gato no se pulsa como un sitio, pero su etiqueta («Miau») se coloca igual
  porId.set('#gato', { id: '#gato', posicion: gato.posicion, tamano: { ancho: 1, alto: 1 }, brillo: 0, toque: new Mesh() });
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

  // Arrastrar (ratón o dedo) recorre la calle de lado a lado
  let arrastre: { id: number; x: number; t: number; movido: boolean } | null = null;
  // Detalles escondidos: la luna, el gato, las farolas y las ventanas decorativas
  const luna = escena.getObjectByName('luna');
  type Curiosidad = { tipo: 'luna' } | { tipo: 'gato' } | { tipo: 'farola'; k: number } | { tipo: 'hueco'; i: number };
  const buscarCuriosidad = (e: PointerEvent): Curiosidad | null => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    rayo.setFromCamera(ndc, camara.camara);
    const [tocado] = rayo.intersectObjects([gato.toque, calle.toques, ...(luna ? [luna] : []), huecos.malla], true);
    if (!tocado) return null;
    if (tocado.object === gato.toque) return { tipo: 'gato' };
    if (tocado.object === calle.toques) return { tipo: 'farola', k: tocado.instanceId ?? 0 };
    if (tocado.object === huecos.malla) return { tipo: 'hueco', i: tocado.instanceId ?? 0 };
    return { tipo: 'luna' };
  };
  const descubrir = (c: Curiosidad) => {
    if (c.tipo === 'luna') {
      // La luna cambia el tiempo: si llovía escampa, y si no, empieza a llover
      ambiente.clima(ambiente.lloviendo ? 'despejado' : 'lluvia');
      opciones.alCuriosidad?.('#luna');
    } else if (c.tipo === 'gato') {
      gato.saltar();
      opciones.alCuriosidad?.('#gato');
    } else if (c.tipo === 'farola') calle.parpadear(c.k);
    else huecos.destacar(c.i);
  };

  const alMover = (e: PointerEvent) => {
    if (arrastre?.id === e.pointerId && camara.enReposo) {
      const dx = e.clientX - arrastre.x;
      if (Math.abs(dx) > 0 || arrastre.movido) {
        const ahora = performance.now();
        camara.desplazar(-dx * camara.unidadesPorPixel(canvas.clientHeight), Math.max(0.001, (ahora - arrastre.t) / 1000));
        arrastre.x = e.clientX;
        arrastre.t = ahora;
        if (Math.abs(e.clientX - (pulsadoEn?.x ?? e.clientX)) > 10) {
          arrastre.movido = true;
          canvas.style.cursor = 'grabbing';
        }
      }
    }
    if (e.pointerType !== 'mouse' || !camara.enReposo) return; // en táctil no hay hover
    const r = canvas.getBoundingClientRect();
    camara.apuntar(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
    const v = buscar(e);
    if (v !== resaltado) {
      resaltar(v);
      opciones.alPasar?.(v?.id ?? null);
    }
    if (!v && !arrastre?.movido) {
      // Sin nada señalable debajo: las ventanas reaccionan y los detalles escondidos ponen la mano
      const c = buscarCuriosidad(e);
      if (c?.tipo === 'hueco') huecos.destacar(c.i);
      canvas.style.cursor = c && c.tipo !== 'hueco' ? 'pointer' : '';
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
  const alPulsar = (e: PointerEvent) => {
    pulsadoEn = { x: e.clientX, y: e.clientY };
    if (!e.isPrimary || !camara.enReposo) return;
    camara.frenar();
    arrastre = { id: e.pointerId, x: e.clientX, t: performance.now(), movido: false };
  };
  const terminarArrastre = (e: PointerEvent) => {
    if (arrastre?.id !== e.pointerId) return;
    if (arrastre.movido) {
      camara.soltar();
      canvas.style.cursor = resaltado ? 'pointer' : '';
    }
    arrastre = null;
  };
  const alSoltar = (e: PointerEvent) => {
    terminarArrastre(e);
    if (!pulsadoEn || !camara.enReposo || Math.hypot(e.clientX - pulsadoEn.x, e.clientY - pulsadoEn.y) > 10) return;
    pulsadoEn = null;
    const v = buscar(e);
    if (v) opciones.alPulsar?.(v.id);
    else {
      const c = buscarCuriosidad(e);
      if (c) descubrir(c);
    }
  };
  canvas.addEventListener('pointermove', alMover);
  canvas.addEventListener('pointerleave', alSalir);
  canvas.addEventListener('pointerdown', alPulsar);
  canvas.addEventListener('pointerup', alSoltar);
  canvas.addEventListener('pointercancel', terminarArrastre);
  // La rueda (o el gesto de dos dedos del trackpad) también recorre la calle
  const alRodar = (e: WheelEvent) => {
    if (!camara.enReposo) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    camara.desplazar(delta * camara.unidadesPorPixel(canvas.clientHeight) * 0.6, 1 / 30);
    camara.soltar();
  };
  canvas.addEventListener('wheel', alRodar, { passive: true });

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
    huecos.actualizar(dt);
    calle.actualizar(dt);
    gato.actualizar(tiempo, dt, !reducido);
    camara.actualizar(!reducido, dt, !!arrastre?.movido);
    obras.actualizar(tiempo, !reducido);
    detalles.actualizar(tiempo, !reducido);
    vida.actualizar(tiempo, dt, !reducido);
    ambiente.actualizar(dt, !reducido);
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
  let congelada = false;
  const actualizarBucle = () => {
    const activo = enPantalla && paginaActiva && !congelada;
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

  /** Rectángulo de un objetivo en un lienzo de `ancho` × `alto` (CSS o píxeles reales). */
  const rectDe = (id: string, ancho: number, alto: number, ampliar?: number) => {
    const o = porId.get(id);
    if (!o) return null;
    const esquinas = [-1, 1].flatMap((a) => [-1, 1].map((b) => o.posicion.clone().add(new Vector3((a * o.tamano.ancho) / 2, (b * o.tamano.alto) / 2, 0)).project(camara.camara)));
    const xs = esquinas.map((p) => (p.x * 0.5 + 0.5) * ancho);
    const ys = esquinas.map((p) => (-p.y * 0.5 + 0.5) * alto);
    const r = { x: Math.min(...xs), y: Math.min(...ys), ancho: Math.max(...xs) - Math.min(...xs), alto: Math.max(...ys) - Math.min(...ys) };
    if (!ampliar) return r;
    // 16:10 alrededor del objetivo, como las imágenes de las páginas de los sitios
    const w = Math.max(r.ancho * ampliar, r.alto * ampliar * 1.6);
    const h = w / 1.6;
    return { x: r.x + r.ancho / 2 - w / 2, y: r.y + r.alto / 2 - h / 2, ancho: w, alto: h };
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
    volverDe: (id, desdeDondeEste) => {
      const o = objetivo(id);
      gsap.killTweensOf(o);
      if (reducido) {
        camara.reposar();
        o.brillo = 0;
        return Promise.resolve();
      }
      return camara.volverDe(o, desdeDondeEste);
    },
    acercarA: (id) => {
      const o = objetivo(id);
      resaltado = null;
      canvas.style.cursor = '';
      gsap.killTweensOf(o);
      // Qué parte del ancho ocupa al llegar: en vertical, casi todo
      const vertical = camara.camara.aspect < 1;
      // Los sitios se ven con algo de calle alrededor (sale un trozo de ciudad 16:10 más ancho que ellos)
      const fraccion = id === '#apps' ? (vertical ? 0.5 : 0.26) : id.startsWith('#') ? (vertical ? 0.32 : 0.16) : vertical ? 0.78 : 0.36;
      return reducido ? Promise.resolve() : camara.acercarA(o, fraccion);
    },
    rectEnPantalla: (id, ampliar) => rectDe(id, canvas.clientWidth, canvas.clientHeight, ampliar),
    recorte: (id, ampliar) => {
      const r = rectDe(id, canvas.width, canvas.height, ampliar);
      if (!r) return null;
      // Se pinta y se copia en la misma tarea: después el búfer del canvas ya no es legible
      pintor.pintar();
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(r.ancho));
      c.height = Math.max(1, Math.round(r.alto));
      c.getContext('2d')!.drawImage(canvas, r.x, r.y, r.ancho, r.alto, 0, 0, c.width, c.height);
      return c;
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
    congelar: (activo) => {
      congelada = activo;
      actualizarBucle();
    },
    clima: (c) => ambiente.clima(c),
    get lloviendo() {
      return ambiente.lloviendo;
    },
    destruir: () => {
      pintor.renderer.setAnimationLoop(null);
      observadorTamano.disconnect();
      observadorVisible.disconnect();
      canvas.removeEventListener('pointermove', alMover);
      canvas.removeEventListener('pointerleave', alSalir);
      canvas.removeEventListener('pointerdown', alPulsar);
      canvas.removeEventListener('pointerup', alSoltar);
      canvas.removeEventListener('pointercancel', terminarArrastre);
      canvas.removeEventListener('wheel', alRodar);
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
