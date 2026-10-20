// Motor del juego «La ciudad»: el barrio en tercera persona. El jugador anda, corre y salta por
// las calles; entra en el edificio de cada app (su sala, con la demo en la pantalla grande) y
// desde el estudio y el solar va a Sobre mí y a Contacto. Se carga diferido; no depende de Astro.
// Los controles (teclado, ratón y táctil) y el HUD son HTML: llaman a esta API.

import { gsap } from 'gsap';
import { PerspectiveCamera, Vector3, type BufferGeometry, type Material, type Mesh } from 'three';
import { crearEscena, texturaHalo } from '../ciudad/escena';
import { Pintor } from '../ciudad/render';
import { MedidorFps, nivelInferior, type Nivel, type NivelVivo } from '../ciudad/rendimiento';
import { crearCalles, crearEdificiosJuego, crearSitios, type DatosApp } from './escenario';
import { rayoLibre, separar } from './fisica';
import { ALCANCE, LIMITE, MANZANA, alturaSuelo, trazarMundo, type Puerta } from './mundo';
import { cargarModelo, crearPersonaje, type Personaje } from './personaje';
import { SALA, crearSala, type Punto } from './sala';
import { crearSonido } from './sonido';

export type { DatosApp } from './escenario';

/** Lo que se puede hacer con la tecla de acción donde está el jugador. */
export interface Cerca {
  id: string;
  accion: 'entrar' | 'visitar' | 'demo' | 'ficha' | 'salir';
}

export interface OpcionesJuego {
  nivel: Nivel;
  /** Modelo propio del personaje (glTF con idle, walk, run y jump). */
  modelo?: string;
  textos: { estudio: string; solar: string };
  silenciado?: boolean;
  /** Canvas 2D del minimapa. */
  minimapa?: HTMLCanvasElement;
  /** Cambia lo que hay al alcance de la tecla de acción. */
  alCerca?: (c: Cerca | null) => void;
  /** Se entra en la sala de una app (su slug) o se vuelve a la calle (null). */
  alSala?: (slug: string | null) => void;
  /** Ir a una página: la ficha de una app (slug), `#sobre-mi` o `#contacto`. */
  alNavegar?: (id: string) => void;
  /** Abrir la demo de una app. */
  alDemo?: (slug: string) => void;
  /** Fundido a negro alrededor de un cambio de sitio (entrar o salir de una sala). */
  fundir?: (cambio: () => void) => Promise<void>;
  alFallar?: () => void;
}

export interface Juego {
  readonly listo: Promise<void>;
  /** Llegada: la cámara baja del cielo hasta quedar detrás del jugador. */
  llegar(): Promise<void>;
  /** Despegue antes de volver a la portada: la cámara sube al cielo. */
  despegar(): Promise<void>;
  /** Empieza (o sigue) la partida: el jugador responde a los controles. */
  jugar(): void;
  /** Arranca el sonido (necesita un gesto del usuario: una tecla o un toque). */
  sonar(): Promise<void>;
  pausar(): void;
  /** Lo que se pide andar (-1..1): adelante y a la derecha. */
  mover(adelante: number, lado: number): void;
  correr(si: boolean): void;
  saltar(): void;
  /** Gira la cámara alrededor del jugador (píxeles de arrastre o de ratón). */
  girarCamara(dx: number, dy: number): void;
  acercar(delta: number): void;
  /** La tecla de acción: entrar, salir, abrir la demo… */
  accion(): void;
  silenciar(si: boolean): void;
  readonly silenciado: boolean;
  destruir(): void;
}

const VELOCIDAD = { andar: 3.6, correr: 7.2, aceleracion: 12, salto: 8.2, gravedad: 24 } as const;
const RADIO_JUGADOR = 0.35;
const CAMARA = { distancia: 5.5, min: 2.2, max: 10, altura: 1.45, cabeceo: 0.32 } as const;

const ceder = () => new Promise<void>((r) => setTimeout(r, 0));

export async function montarJuego(canvas: HTMLCanvasElement, apps: DatosApp[], opciones: OpcionesJuego): Promise<Juego> {
  if (opciones.nivel === 'estatico') throw new Error('Sin WebGL no hay juego');
  let nivel: NivelVivo = opciones.nivel;

  // --- Mundo ---------------------------------------------------------------------------
  const mundo = trazarMundo(apps.map((a) => a.slug));
  const halo = texturaHalo();
  const escena = crearEscena(7, halo, { pocasEstrellas: nivel !== 'alto', niebla: 0.017 });
  await ceder();
  const edificios = crearEdificiosJuego(mundo);
  const calles = crearCalles(mundo, halo);
  await document.fonts?.ready;
  const sitios = crearSitios(mundo, apps, halo, opciones.textos);
  const sala = crearSala(halo);
  escena.add(edificios, calles, sitios.objeto, sala.objeto);
  await ceder();

  let personaje: Personaje = crearPersonaje(halo);
  personaje.objeto.position.set(mundo.salida.x, alturaSuelo(mundo.salida.x, mundo.salida.z), mundo.salida.z);
  personaje.objeto.rotation.y = mundo.salida.giro;
  escena.add(personaje.objeto);
  if (opciones.modelo) {
    cargarModelo(opciones.modelo, halo).then((p) => {
      if (!p) return;
      p.objeto.position.copy(personaje.objeto.position);
      p.objeto.rotation.copy(personaje.objeto.rotation);
      escena.remove(personaje.objeto);
      personaje = p;
      escena.add(p.objeto);
    });
  }

  const camara = new PerspectiveCamera(60, 1, 0.1, 700);
  const pintor = new Pintor(canvas, escena, camara, nivel);
  // De cerca todo brilla más que en la portada (allí la ciudad se ve de lejos): bloom más suave
  const BLOOM_JUEGO = 0.45;
  pintor.atenuarBloom(BLOOM_JUEGO);
  const redimensionar = () => {
    const ancho = Math.max(1, canvas.clientWidth);
    const alto = Math.max(1, canvas.clientHeight);
    pintor.redimensionar(ancho, alto);
    camara.aspect = ancho / alto;
    // En vertical se abre el campo de visión para no ir con anteojeras
    camara.fov = camara.aspect < 1 ? 72 : 60;
    camara.updateProjectionMatrix();
  };
  redimensionar();
  const observador = new ResizeObserver(redimensionar);
  observador.observe(canvas);

  // --- Estado del jugador ----------------------------------------------------------------
  const pos = new Vector3(mundo.salida.x, alturaSuelo(mundo.salida.x, mundo.salida.z), mundo.salida.z);
  const vel = new Vector3();
  let velY = 0;
  let enSuelo = true;
  let rumbo = mundo.salida.giro;
  /** La cámara alrededor del jugador: giro, cabeceo y distancia (las escenas los animan). */
  const vista = { giro: mundo.salida.giro + Math.PI, cabeceo: CAMARA.cabeceo as number, distancia: CAMARA.distancia as number };
  /** En las tomas de cine (llegada y despegue) la cámara no choca con los edificios. */
  let cine = false;
  /** El jugador anda solo hasta un punto (al entrar y salir de los edificios). */
  let guion: { x: number; z: number; velocidad: number; resolver: () => void } | null = null;
  const camPos = new Vector3();
  const pedido = { adelante: 0, lado: 0, correr: false };
  let pedirSalto = false;
  /** La app en cuya sala se está; null en la calle. */
  let enSala: string | null = null;
  let puertaDeSala: Puerta | null = null;
  let cerca: Cerca | null = null;
  let cambiando = false;
  let fasePaso = 0;

  const sonido = crearSonido(!!opciones.silenciado);

  const colocarCamara = (inmediato: boolean, dt: number) => {
    const objetivo = new Vector3(pos.x, pos.y + CAMARA.altura, pos.z);
    // En la sala la cámara va más cerca: no cabe a la distancia de la calle
    const d = enSala ? Math.min(vista.distancia, 3.4) : vista.distancia;
    const c = Math.cos(vista.cabeceo);
    const deseo = new Vector3(objetivo.x + Math.sin(vista.giro) * c * d, objetivo.y + Math.sin(vista.cabeceo) * d, objetivo.z + Math.cos(vista.giro) * c * d);
    if (enSala) {
      // Dentro de la sala, la cámara no sale de las paredes ni pasa del techo
      deseo.x = Math.min(SALA.ancho / 2 - 0.3, Math.max(-SALA.ancho / 2 + 0.3, deseo.x));
      deseo.z = Math.min(SALA.fondo / 2 - 0.3, Math.max(-SALA.fondo / 2 + 0.3, deseo.z));
      deseo.y = Math.min(SALA.y + SALA.alto - 0.4, deseo.y);
    } else if (!cine) {
      const t = rayoLibre(objetivo, deseo, mundo.cajas, 0.25);
      if (t < 1) deseo.lerpVectors(objetivo, deseo, Math.max(0.12, t));
    }
    if (!enSala) deseo.y = Math.max(deseo.y, 0.4);
    if (inmediato) camPos.copy(deseo);
    else {
      // Más deprisa si se acerca (un muro) que si se aleja: nunca se queda dentro de nada
      const acerca = deseo.distanceTo(objetivo) < camPos.distanceTo(objetivo);
      camPos.lerp(deseo, 1 - Math.exp(-(acerca ? 30 : 10) * dt));
    }
    camara.position.copy(camPos);
    camara.lookAt(objetivo);
  };

  const avisarCerca = (c: Cerca | null) => {
    if (c?.id === cerca?.id && c?.accion === cerca?.accion) return;
    cerca = c;
    opciones.alCerca?.(c);
  };

  const buscarCerca = () => {
    if (enSala) {
      let mejor: { tipo: Punto; d: number } | null = null;
      for (const p of sala.puntos) {
        const d = Math.hypot(pos.x - p.x, pos.z - p.z);
        if (d < 1.9 && (!mejor || d < mejor.d)) mejor = { tipo: p.tipo, d };
      }
      const app = apps.find((a) => a.slug === enSala);
      if (!mejor || !app) return avisarCerca(null);
      const accion = mejor.tipo === 'pantalla' ? 'demo' : mejor.tipo === 'ficha' ? 'ficha' : 'salir';
      return avisarCerca({ id: app.slug, accion });
    }
    let mejor: { p: Puerta; d: number } | null = null;
    for (const p of mundo.puertas) {
      const d = Math.hypot(pos.x - p.x, pos.z - p.z);
      if (d < ALCANCE && (!mejor || d < mejor.d)) mejor = { p, d };
    }
    if (!mejor) return avisarCerca(null);
    avisarCerca({ id: mejor.p.id, accion: mejor.p.sitio === 'app' ? 'entrar' : 'visitar' });
  };

  const teletransportar = (x: number, y: number, z: number, mirando: number) => {
    pos.set(x, y, z);
    vel.set(0, 0, 0);
    velY = 0;
    rumbo = mirando;
    vista.giro = mirando + Math.PI;
    vista.cabeceo = CAMARA.cabeceo;
    personaje.objeto.position.copy(pos);
    personaje.objeto.rotation.y = rumbo;
    colocarCamara(true, 0);
  };

  const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
  /** Anda solo hasta (x, z), sin chocar (cruza el umbral de las puertas). */
  const caminarHasta = (x: number, z: number, velocidad = 2.4) => new Promise<void>((resolver) => (guion = { x, z, velocidad, resolver }));
  const moverVista = (a: Partial<typeof vista>, duracion: number, ease = 'power2.inOut') =>
    new Promise<void>((r) => gsap.to(vista, { ...a, duration: duracion, ease, overwrite: true, onComplete: r }));
  /** Giro equivalente a `objetivo` más cercano al actual (para no dar la vuelta larga). */
  const giroCercano = (objetivo: number) => vista.giro + Math.atan2(Math.sin(objetivo - vista.giro), Math.cos(objetivo - vista.giro));
  const fundir = (cambio: () => void) => (opciones.fundir ? opciones.fundir(cambio) : Promise.resolve(cambio()));

  /**
   * Entrar: el jugador va hasta la puerta, la puerta se abre y cruza el umbral mientras se funde;
   * dentro, da unos pasos por la sala y la cámara se coloca detrás.
   */
  const entrarEnSala = async (p: Puerta) => {
    const app = apps.find((a) => a.slug === p.id);
    if (!app || cambiando) return;
    cambiando = true;
    avisarCerca(null);
    const nx = Math.sin(p.giro);
    const nz = Math.cos(p.giro);
    moverVista({ giro: giroCercano(p.giro), cabeceo: 0.18, distancia: 3.8 }, 0.8);
    await caminarHasta(p.x + nx * 1.1, p.z + nz * 1.1, 2.6);
    sonido.puerta();
    await sitios.abrir(p.id, true);
    caminarHasta(p.x - nx * 0.6, p.z - nz * 0.6, 2.2);
    await espera(320);
    await fundir(() => {
      guion = null;
      enSala = app.slug;
      puertaDeSala = p;
      sala.vestir(app, sitios.capturas.get(app.slug));
      sitios.abrir(p.id, false, true);
      gsap.killTweensOf(vista);
      teletransportar(0, SALA.y, SALA.fondo / 2 - 0.5, Math.PI);
      // Dentro, la cámara espera en la sala y ve al jugador cruzar la puerta
      Object.assign(vista, { giro: Math.PI - 0.5, cabeceo: 0.28, distancia: 3.4 });
      colocarCamara(true, 0);
      sonido.dentro(true);
      opciones.alSala?.(app.slug);
    });
    // Y mientras entra, se coloca detrás de él
    moverVista({ giro: giroCercano(0), cabeceo: CAMARA.cabeceo, distancia: CAMARA.distancia }, 1.4, 'power2.inOut');
    await caminarHasta(sala.entrada.x, sala.entrada.z, 2.2);
    cambiando = false;
    buscarCerca();
  };

  /** Salir: hasta la puerta de la sala y, fuera, el jugador sale del edificio hacia la cámara. */
  const salirDeSala = async () => {
    const p = puertaDeSala;
    if (!p || cambiando) return;
    cambiando = true;
    avisarCerca(null);
    moverVista({ giro: giroCercano(Math.PI), cabeceo: 0.2, distancia: 3 }, 0.6);
    await caminarHasta(0, SALA.fondo / 2 - 0.6, 2.4);
    sonido.puerta();
    const nx = Math.sin(p.giro);
    const nz = Math.cos(p.giro);
    await fundir(() => {
      guion = null;
      enSala = null;
      puertaDeSala = null;
      sitios.abrir(p.id, true, true);
      gsap.killTweensOf(vista);
      const x = p.x - nx * 0.4;
      const z = p.z - nz * 0.4;
      teletransportar(x, alturaSuelo(x, z), z, p.giro);
      // La cámara espera en la acera, de cara a la puerta
      Object.assign(vista, { giro: p.giro, cabeceo: 0.22, distancia: 4.6 });
      colocarCamara(true, 0);
      sonido.dentro(false);
      opciones.alSala?.(null);
    });
    await caminarHasta(p.x + nx * 1.8, p.z + nz * 1.8, 2.4);
    sitios.abrir(p.id, false);
    // Se queda en la calle, en diagonal: detrás del jugador estaría metida en la fachada
    await moverVista({ giro: giroCercano(p.giro + 0.9), cabeceo: CAMARA.cabeceo, distancia: CAMARA.distancia }, 0.9);
    cambiando = false;
    buscarCerca();
  };

  // --- Física -------------------------------------------------------------------------
  const andarSolo = (dt: number) => {
    const g = guion!;
    const dx = g.x - pos.x;
    const dz = g.z - pos.z;
    const d = Math.hypot(dx, dz);
    const paso = Math.min(d, g.velocidad * dt);
    if (d < 0.02) {
      guion = null;
      vel.set(0, 0, 0);
      g.resolver();
      return;
    }
    vel.set((dx / d) * g.velocidad, 0, (dz / d) * g.velocidad);
    pos.x += (dx / d) * paso;
    pos.z += (dz / d) * paso;
  };

  const moverJugador = (dt: number) => {
    if (guion) {
      andarSolo(dt);
      pos.y = enSala ? SALA.y : alturaSuelo(pos.x, pos.z);
      enSuelo = true;
      velY = 0;
      animarPersonaje(dt);
      return;
    }
    const quieto = cambiando;
    const adelante = quieto ? 0 : pedido.adelante;
    const lado = quieto ? 0 : pedido.lado;
    // Relativo a la cámara: adelante es hacia donde mira
    const fx = -Math.sin(vista.giro);
    const fz = -Math.cos(vista.giro);
    let dx = fx * adelante + -fz * lado;
    let dz = fz * adelante + fx * lado;
    const largo = Math.hypot(dx, dz);
    if (largo > 1) {
      dx /= largo;
      dz /= largo;
    }
    const rapidez = pedido.correr ? VELOCIDAD.correr : VELOCIDAD.andar;
    // En el aire se controla menos
    const agarre = (enSuelo ? VELOCIDAD.aceleracion : VELOCIDAD.aceleracion * 0.35) * dt;
    vel.x += (dx * rapidez - vel.x) * Math.min(1, agarre);
    vel.z += (dz * rapidez - vel.z) * Math.min(1, agarre);

    let x = pos.x + vel.x * dt;
    let z = pos.z + vel.z * dt;
    if (enSala) {
      const l = sala.limites;
      ({ x, z } = separar(x, z, RADIO_JUGADOR, sala.cajas, []));
      x = Math.min(l.maxX, Math.max(l.minX, x));
      z = Math.min(l.maxZ, Math.max(l.minZ, z));
    } else {
      ({ x, z } = separar(x, z, RADIO_JUGADOR, mundo.cajas, mundo.circulos));
      x = Math.min(LIMITE, Math.max(-LIMITE, x));
      z = Math.min(LIMITE, Math.max(-LIMITE, z));
    }
    // La velocidad real tras los choques (si no, se seguiría empujando contra la pared)
    if (dt > 0) {
      vel.x = (x - pos.x) / dt;
      vel.z = (z - pos.z) / dt;
    }
    pos.x = x;
    pos.z = z;

    // Salto, gravedad y el escalón de la acera (se sube solo)
    const suelo = enSala ? SALA.y : alturaSuelo(x, z);
    if (pedirSalto && enSuelo && !quieto) {
      velY = VELOCIDAD.salto;
      enSuelo = false;
      sonido.salto();
    }
    pedirSalto = false;
    velY -= VELOCIDAD.gravedad * dt;
    pos.y += velY * dt;
    if (pos.y <= suelo || (enSuelo && pos.y - suelo < 0.25)) {
      if (!enSuelo && velY < -6) sonido.aterrizaje();
      pos.y = suelo;
      velY = 0;
      enSuelo = true;
    } else if (pos.y > suelo + 0.05) enSuelo = false;

    animarPersonaje(dt);
  };

  const animarPersonaje = (dt: number) => {
    const velocidad = Math.hypot(vel.x, vel.z);
    if (velocidad > 0.4) {
      const objetivo = Math.atan2(vel.x, vel.z);
      let giro = objetivo - rumbo;
      giro = Math.atan2(Math.sin(giro), Math.cos(giro));
      rumbo += giro * Math.min(1, dt * 14);
    }
    // Pasos: dos por ciclo de zancada
    if (enSuelo && velocidad > 0.6) {
      const antes = Math.floor(fasePaso / Math.PI);
      fasePaso += velocidad * dt * 2.3;
      if (Math.floor(fasePaso / Math.PI) !== antes) sonido.paso(pedido.correr, pos.y > 0.05 && !enSala);
    }
    personaje.objeto.position.copy(pos);
    personaje.objeto.rotation.y = rumbo;
    personaje.animar({ velocidad, enElAire: !enSuelo, dt });
  };

  // --- Minimapa ------------------------------------------------------------------------
  const mapa = opciones.minimapa?.getContext('2d') ?? null;
  const colorDe = (p: Puerta) => apps.find((a) => a.slug === p.id)?.hue ?? (p.sitio === 'estudio' ? '#7fe0a6' : '#ffb547');
  const pintarMapa = () => {
    if (!mapa || enSala) return;
    const c = mapa.canvas;
    const lado = c.width;
    const escala = lado / 90; // se ven unas 90 unidades
    mapa.setTransform(1, 0, 0, 1, 0, 0);
    mapa.clearRect(0, 0, lado, lado);
    mapa.fillStyle = '#08140e';
    mapa.fillRect(0, 0, lado, lado);
    // Norte arriba; el mapa sigue al jugador
    mapa.setTransform(escala, 0, 0, escala, lado / 2 - pos.x * escala, lado / 2 - pos.z * escala);
    mapa.fillStyle = '#183a27';
    for (const m of mundo.manzanas) mapa.fillRect(m.x - MANZANA / 2, m.z - MANZANA / 2, MANZANA, MANZANA);
    mapa.fillStyle = '#2f5640';
    for (const e of mundo.edificios) mapa.fillRect(e.x - e.ancho / 2, e.z - e.fondo / 2, e.ancho, e.fondo);
    for (const p of mundo.puertas) {
      mapa.fillStyle = colorDe(p);
      mapa.beginPath();
      mapa.arc(p.x + Math.sin(p.giro) * 1.5, p.z + Math.cos(p.giro) * 1.5, 1.6, 0, Math.PI * 2);
      mapa.fill();
    }
    // El jugador: una flecha hacia donde mira
    mapa.setTransform(1, 0, 0, 1, lado / 2, lado / 2);
    mapa.rotate(-rumbo + Math.PI);
    mapa.fillStyle = '#e6eee4';
    mapa.beginPath();
    mapa.moveTo(0, -7);
    mapa.lineTo(5, 5);
    mapa.lineTo(0, 2.5);
    mapa.lineTo(-5, 5);
    mapa.closePath();
    mapa.fill();
  };

  // --- Bucle ---------------------------------------------------------------------------
  await pintor.precompilar();
  await ceder();
  colocarCamara(true, 0);
  pintor.calentar();

  const medidor = new MedidorFps(2, 5, 40);
  let anterior = 0;
  let tiempo = 0;
  let cuadro = 0;
  let jugando = false;
  let compilando = false;
  const fotograma = (ahora: number) => {
    const real = anterior ? (ahora - anterior) / 1000 : 0;
    anterior = ahora;
    const dt = Math.min(real, 0.05);
    if (compilando) return;
    if (real > 0 && nivel !== 'bajo' && medidor.registrar(real) === 'lento') {
      nivel = nivelInferior(nivel) as NivelVivo;
      pintor.ajustar(nivel);
      pintor.atenuarBloom(BLOOM_JUEGO);
      compilando = true;
      pintor.precompilar().finally(() => (compilando = false));
      return;
    }
    tiempo += dt;
    if (jugando) moverJugador(dt);
    else personaje.animar({ velocidad: 0, enElAire: false, dt });
    if (jugando && !cambiando) buscarCerca();
    colocarCamara(false, dt);
    sitios.actualizar(tiempo, cerca && !enSala ? cerca.id : null);
    sala.actualizar(tiempo);
    if (cuadro++ % 3 === 0) pintarMapa();
    pintor.pintar();
  };

  let visible = !document.hidden;
  const bucle = () => {
    anterior = 0;
    pintor.renderer.setAnimationLoop(visible ? fotograma : null);
  };
  const alCambiarVisibilidad = () => {
    visible = !document.hidden;
    bucle();
  };
  document.addEventListener('visibilitychange', alCambiarVisibilidad);
  const alPerderContexto = (e: Event) => {
    e.preventDefault();
    pintor.renderer.setAnimationLoop(null);
    opciones.alFallar?.();
  };
  canvas.addEventListener('webglcontextlost', alPerderContexto);
  bucle();

  // Las capturas tardan un poco: no hace falta esperarlas para empezar
  const listo = Promise.resolve();

  return {
    listo,
    llegar: async () => {
      // Desde lo alto, girando, hasta la espalda del jugador
      cine = true;
      cambiando = false;
      const final = { giro: rumbo + Math.PI, cabeceo: CAMARA.cabeceo, distancia: CAMARA.distancia };
      Object.assign(vista, { giro: final.giro + 1.5, cabeceo: 1.2, distancia: 60 });
      colocarCamara(true, 0);
      await moverVista(final, 2.8, 'power3.inOut');
      cine = false;
    },
    despegar: async () => {
      cambiando = true;
      avisarCerca(null);
      cine = true;
      // Primero mira hacia abajo (la cámara se levanta por encima de todo) y luego se aleja
      gsap.to(vista, { cabeceo: 1.4, duration: 0.6, ease: 'power2.out', overwrite: true });
      await new Promise<void>((r) => gsap.to(vista, { distancia: 70, giro: vista.giro + 0.8, duration: 1.5, ease: 'power2.in', onComplete: r }));
    },
    jugar: () => {
      jugando = true;
      sonido.pausar(false);
    },
    sonar: () => sonido.arrancar(),
    pausar: () => {
      jugando = false;
      pedido.adelante = pedido.lado = 0;
      vel.set(0, 0, 0);
      sonido.pausar(true);
      avisarCerca(null);
    },
    mover: (adelante, lado) => {
      pedido.adelante = Math.max(-1, Math.min(1, adelante));
      pedido.lado = Math.max(-1, Math.min(1, lado));
    },
    correr: (si) => (pedido.correr = si),
    saltar: () => (pedirSalto = true),
    girarCamara: (dx, dy) => {
      if (cambiando || cine) return;
      vista.giro -= dx * 0.0042;
      vista.cabeceo = Math.min(1.25, Math.max(-0.15, vista.cabeceo + dy * 0.0035));
    },
    acercar: (delta) => {
      vista.distancia = Math.min(CAMARA.max, Math.max(CAMARA.min, vista.distancia * (1 + delta * 0.001)));
    },
    accion: () => {
      if (!jugando || cambiando || !cerca) return;
      if (cerca.accion === 'entrar') {
        const p = mundo.puertas.find((x) => x.id === cerca!.id);
        if (p) entrarEnSala(p);
      } else if (cerca.accion === 'salir') salirDeSala();
      else if (cerca.accion === 'demo') opciones.alDemo?.(cerca.id);
      else {
        sonido.puerta();
        opciones.alNavegar?.(cerca.id);
      }
    },
    silenciar: (si) => sonido.silenciar(si),
    get silenciado() {
      return sonido.silenciado;
    },
    destruir: () => {
      pintor.renderer.setAnimationLoop(null);
      observador.disconnect();
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
      canvas.removeEventListener('webglcontextlost', alPerderContexto);
      sonido.destruir();
      escena.traverse((o) => {
        const m = o as Mesh<BufferGeometry, Material | Material[]>;
        m.geometry?.dispose();
        (Array.isArray(m.material) ? m.material : m.material ? [m.material] : []).forEach((mat) => mat.dispose());
      });
      sitios.capturas.forEach((t) => t.dispose());
      halo.dispose();
      pintor.destruir();
    },
  };
}
