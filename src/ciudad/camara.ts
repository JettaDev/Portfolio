// Cámara: encuadre según el aspecto, parallax con el puntero, vuelos de ida y vuelta hasta lo
// que se pulsa (un ventanal, el escaparate, el estudio o el cartel del solar) y el paseo a pie de
// calle en primera persona.

import { MathUtils, PerspectiveCamera, Vector2, Vector3 } from 'three';
import { gsap } from 'gsap';
import { CALLE, CAMARA, PARALLAX, distanciaCamara, encuadrePara, type Encuadre, type Trazado } from './trazado';
import type { Objetivo } from './ventanas';

/** Duración del vuelo de ida. */
export const DURACION_VUELO = 1.1;
/** La vuelta sale rápida desde el objetivo y frena al llegar al reposo. */
export const DURACION_VUELTA = 1.05;
const TAN = Math.tan(((CAMARA.fov / 2) * Math.PI) / 180);

/** Distancia a la que se queda la cámara delante de un objetivo: lo justo para que llene la pantalla de alto. */
export const distanciaDeLlegada = (o: Objetivo) => o.tamano.alto / 2 / TAN;

/** El paseo: a la altura de los ojos, por la acera y la calzada, sin dar la espalda a la ciudad. */
export const PASEO = {
  ojos: 1.7,
  /** Unidades por segundo (una planta mide 1,15) y lo que se acelera con Mayús. */
  velocidad: 3.2,
  carrera: 2,
  /** Giro máximo a cada lado (detrás de la calle no hay ciudad) y mirada arriba y abajo. */
  giro: 1,
  arriba: 0.95,
  abajo: -0.4,
  /** Radianes por segundo al girar con las flechas. */
  giroTeclado: 1.4,
  /** Hasta dónde se puede andar calle arriba y calle abajo. */
  largo: 30,
  /** Se empieza en medio de la calzada, mirando a la tienda un poco hacia arriba. */
  inicio: { x: 0, cabeceo: 0.22 },
  duracion: 1.4,
} as const;

/** Campo de visión del paseo: unos 85° en horizontal, entre 50° y 75° en vertical. */
const fovDePaseo = (aspecto: number) =>
  MathUtils.clamp(MathUtils.radToDeg(2 * Math.atan(Math.tan(MathUtils.degToRad(42.5)) / aspecto)), 50, 75);

interface Punto {
  posicion: Vector3;
  mira: Vector3;
  brillo: number;
}

export class CamaraCiudad {
  readonly camara = new PerspectiveCamera(CAMARA.fov, 1, 0.1, 1200);
  /** Punto al que mira la cámara (animable). */
  readonly mira = new Vector3(CAMARA.mira.x, CAMARA.mira.y, CAMARA.mira.z);
  /** Posición de reposo según el encuadre. */
  private readonly reposo = new Vector3();
  private readonly puntero = new Vector2();
  private vuelo: gsap.core.Timeline | null = null;
  /** Paseo en curso: posición a ras de suelo, giro y cabeceo de la mirada. */
  private paseo: { x: number; z: number; giro: number; cabeceo: number; ojos: number } | null = null;
  /** Lo que se pide andar (-1..1): adelante y a la derecha. */
  private readonly paso = new Vector2();
  private carrera = false;
  /** Giro continuo pedido con el teclado (-1..1, a la derecha). */
  private giro = 0;
  private aspecto = 1;
  /** Campo de visión con el que se calculó la proyección (el paseo y los vuelos lo animan). */
  private fovProyectado: number = CAMARA.fov;

  constructor(private readonly trazado: Trazado) {}

  get enReposo(): boolean {
    return this.vuelo === null;
  }

  get paseando(): boolean {
    return this.paseo !== null;
  }

  /** `forzado` sirve para pintar el póster «alto» en un lienzo de 1,2:1. */
  encuadrar(aspecto: number, forzado?: Encuadre): void {
    this.aspecto = aspecto;
    this.camara.aspect = aspecto;
    if (this.paseo && this.enReposo) this.camara.fov = fovDePaseo(aspecto);
    this.camara.updateProjectionMatrix();
    const encuadre = forzado ?? encuadrePara(aspecto);
    this.reposo.set(0, CAMARA.y, distanciaCamara(encuadre, this.trazado.mitadAncho, this.trazado.frente));
    if (this.enReposo && !this.paseo) {
      this.camara.position.copy(this.reposo);
      this.camara.lookAt(this.mira);
    }
  }

  private get miraEnReposo(): Vector3 {
    return new Vector3(CAMARA.mira.x, CAMARA.mira.y, CAMARA.mira.z);
  }

  /** Posición del puntero en coordenadas normalizadas (-1..1). */
  apuntar(x: number, y: number): void {
    this.puntero.set(x, y);
  }

  actualizar(conParallax: boolean, dt = 0): void {
    if (this.paseo && this.enReposo) {
      this.andarUnPaso(dt);
    } else if (this.enReposo) {
      // La cámara sigue al puntero con retardo
      const x = conParallax ? this.puntero.x * PARALLAX.x : 0;
      const y = conParallax ? -this.puntero.y * PARALLAX.y : 0;
      const c = this.camara.position;
      c.x += (this.reposo.x + x - c.x) * 0.05;
      c.y += (this.reposo.y + y - c.y) * 0.05;
      c.z = this.reposo.z;
      this.mira.copy(this.miraEnReposo);
    }
    this.camara.lookAt(this.mira);
    if (this.camara.fov !== this.fovProyectado) {
      this.fovProyectado = this.camara.fov;
      this.camara.updateProjectionMatrix();
    }
  }

  // --- Paseo ------------------------------------------------------------------------------

  /** Límites del paseo: de las fachadas al final de la calzada, sin salir de la calle. */
  private get limites() {
    const { calle } = this.trazado;
    return { x: PASEO.largo, delante: calle.fachada + 0.45, detras: calle.fin + 1.5 };
  }

  /** Dirección de la mirada para un giro y un cabeceo (giro 0: de frente a la ciudad). */
  private static mirada(giro: number, cabeceo: number): Vector3 {
    const c = Math.cos(cabeceo);
    return new Vector3(-Math.sin(giro) * c, Math.sin(cabeceo), -Math.cos(giro) * c);
  }

  private colocarEnPaseo(): void {
    const p = this.paseo!;
    this.camara.position.set(p.x, p.ojos, p.z);
    this.mira.copy(this.camara.position).add(CamaraCiudad.mirada(p.giro, p.cabeceo));
  }

  /** Altura de los ojos: sobre la acera se sube el bordillo. */
  private ojosEn(z: number): number {
    return PASEO.ojos + (z < this.trazado.calle.bordillo ? CALLE.bordillo : 0);
  }

  private andarUnPaso(dt: number): void {
    const p = this.paseo!;
    if (this.giro) p.giro = MathUtils.clamp(p.giro - this.giro * PASEO.giroTeclado * dt, -PASEO.giro, PASEO.giro);
    const { x: adelante, y: lado } = this.paso;
    if (adelante || lado) {
      const v = PASEO.velocidad * (this.carrera ? PASEO.carrera : 1) * dt;
      const largo = Math.hypot(adelante, lado) || 1;
      const [a, l] = largo > 1 ? [adelante / largo, lado / largo] : [adelante, lado];
      const sen = Math.sin(p.giro);
      const cos = Math.cos(p.giro);
      let x = p.x + (-sen * a + cos * l) * v;
      let z = p.z + (-cos * a - sen * l) * v;
      // Las farolas no se atraviesan
      const zFarola = this.trazado.calle.bordillo - 0.3;
      for (const fx of this.trazado.calle.farolas) {
        const dx = x - fx;
        const dz = z - zFarola;
        const d = Math.hypot(dx, dz);
        if (d < 0.35 && d > 0) {
          x = fx + (dx / d) * 0.35;
          z = zFarola + (dz / d) * 0.35;
        }
      }
      const { x: lx, delante, detras } = this.limites;
      p.x = MathUtils.clamp(x, -lx, lx);
      p.z = MathUtils.clamp(z, delante, detras);
    }
    // El escalón del bordillo se sube y se baja en un momento, sin salto
    p.ojos += (this.ojosEn(p.z) - p.ojos) * Math.min(1, dt * 12);
    this.colocarEnPaseo();
  }

  /** Lo que se pide andar, de -1 a 1: adelante (negativo, atrás), a la derecha y girar a la derecha. */
  andar(adelante: number, lado: number, carrera = false, giro = 0): void {
    this.paso.set(MathUtils.clamp(adelante, -1, 1), MathUtils.clamp(lado, -1, 1));
    this.carrera = carrera;
    this.giro = MathUtils.clamp(giro, -1, 1);
  }

  /** Gira la mirada (radianes): a la derecha y hacia arriba. */
  girar(derecha: number, arriba: number): void {
    const p = this.paseo;
    if (!p || !this.enReposo) return;
    p.giro = MathUtils.clamp(p.giro - derecha, -PASEO.giro, PASEO.giro);
    p.cabeceo = MathUtils.clamp(p.cabeceo + arriba, PASEO.abajo, PASEO.arriba);
  }

  /** Baja a pie de calle (o vuelve al reposo). Se resuelve al llegar; sin `animado`, de golpe. */
  pasear(activo: boolean, animado: boolean): Promise<void> {
    this.vuelo?.kill();
    this.vuelo = null;
    this.andar(0, 0);
    if (activo) {
      const z = (this.trazado.calle.bordillo + this.trazado.calle.fin) / 2 + 1.5;
      this.paseo = { x: PASEO.inicio.x, z, giro: 0, cabeceo: PASEO.inicio.cabeceo, ojos: this.ojosEn(z) };
    }
    const destino = activo
      ? (() => {
          const p = this.paseo!;
          const posicion = new Vector3(p.x, p.ojos, p.z);
          return { posicion, mira: posicion.clone().add(CamaraCiudad.mirada(p.giro, p.cabeceo)), fov: fovDePaseo(this.aspecto) };
        })()
      : { posicion: this.reposo.clone(), mira: this.miraEnReposo, fov: CAMARA.fov };
    const terminar = () => {
      this.vuelo = null;
      if (!activo) this.paseo = null;
    };
    if (!animado) {
      this.camara.position.copy(destino.posicion);
      this.mira.copy(destino.mira);
      this.camara.fov = destino.fov;
      terminar();
      this.camara.lookAt(this.mira);
      return Promise.resolve();
    }
    const viaje = { duration: PASEO.duracion, ease: 'power2.inOut' };
    const linea = gsap
      .timeline({ paused: true })
      .to(this.camara.position, { ...destino.posicion, ...viaje }, 0)
      .to(this.mira, { ...destino.mira, ...viaje }, 0)
      .to(this.camara, { fov: destino.fov, ...viaje }, 0);
    this.vuelo = linea;
    return new Promise((resolver) =>
      linea
        .eventCallback('onComplete', () => {
          terminar();
          resolver();
        })
        .play(),
    );
  }

  /** Fuera del paseo sin animación (al volar a un sitio o volver de él). */
  private dejarElPaseo(): void {
    this.paseo = null;
    this.andar(0, 0);
  }

  /** Dónde se queda la cámara al llegar a un objetivo: delante de él, a su distancia de llegada. */
  private llegada(o: Objetivo): Punto {
    const p = o.posicion;
    return { posicion: new Vector3(p.x, p.y, p.z + distanciaDeLlegada(o)), mira: p.clone(), brillo: 1.5 };
  }

  /**
   * Línea de ida, de `desde` hasta el objetivo. Avanza deprisa y frena al llegar; el destello
   * cubre la pantalla antes de que frene del todo (Ciudad.astro), así que la captura no llega a
   * quedarse quieta a pantalla completa.
   */
  private lineaDeIda(o: Objetivo, desde: Punto): gsap.core.Timeline {
    this.vuelo?.kill();
    const hasta = this.llegada(o);
    const viaje = { duration: DURACION_VUELO, ease: 'power3.inOut' };
    const linea = gsap
      .timeline({ paused: true })
      .fromTo(this.camara.position, { ...desde.posicion }, { ...hasta.posicion, ...viaje }, 0)
      .fromTo(this.mira, { ...desde.mira }, { ...hasta.mira, ...viaje }, 0)
      // Desde el paseo, el campo de visión vuelve al de siempre: la llegada se calcula con él
      .fromTo(this.camara, { fov: this.camara.fov }, { fov: CAMARA.fov, ...viaje }, 0)
      .fromTo(o, { brillo: desde.brillo }, { brillo: hasta.brillo, duration: 0.9, ease: 'power2.in' }, 0.15);
    this.vuelo = linea;
    return linea;
  }

  /** Vuelo de ida desde donde esté la cámara. Se resuelve al llegar; la cámara se queda pegada al objetivo. */
  volarA(o: Objetivo): Promise<void> {
    const linea = this.lineaDeIda(o, { posicion: this.camara.position.clone(), mira: this.mira.clone(), brillo: o.brillo });
    return new Promise((resolver) => linea.eventCallback('onComplete', () => resolver()).play());
  }

  /**
   * Coloca la cámara pegada al objetivo, sin animación (al volver a la portada sin bfcache), o en
   * un punto intermedio del vuelo (`progreso` < 1, para las imágenes Open Graph).
   */
  situar(o: Objetivo, progreso = 1): void {
    this.dejarElPaseo();
    this.camara.fov = CAMARA.fov;
    const reposo = { posicion: this.reposo.clone(), mira: this.miraEnReposo, brillo: 0 };
    this.lineaDeIda(o, reposo).progress(progreso);
    this.camara.lookAt(this.mira);
  }

  /**
   * Vuelo de vuelta: arranca pegado al objetivo y sale ya en marcha (no es la ida al revés, que
   * arrancaría parada y dejaría la captura quieta a pantalla completa). Frena al llegar al reposo.
   */
  volverDe(o: Objetivo): Promise<void> {
    this.vuelo?.kill();
    this.dejarElPaseo();
    this.camara.fov = CAMARA.fov;
    const desde = this.llegada(o);
    this.camara.position.copy(desde.posicion);
    this.mira.copy(desde.mira);
    const viaje = { duration: DURACION_VUELTA, ease: 'power2.out' };
    const linea = gsap
      .timeline({ paused: true })
      .to(this.camara.position, { ...this.reposo, ...viaje }, 0)
      // La mirada se suelta del objetivo un poco más tarde: al principio aún se ve de frente
      .to(this.mira, { ...this.miraEnReposo, duration: DURACION_VUELTA, ease: 'power3.inOut' }, 0)
      .fromTo(o, { brillo: desde.brillo }, { brillo: 0, duration: 0.8, ease: 'power2.out' }, 0);
    this.vuelo = linea;
    return new Promise((resolver) =>
      linea
        .eventCallback('onComplete', () => {
          this.vuelo = null;
          resolver();
        })
        .play(),
    );
  }

  /** Vuelve al reposo sin animación (movimiento reducido o cancelación). */
  reposar(): void {
    this.vuelo?.kill();
    this.vuelo = null;
    this.dejarElPaseo();
    this.camara.fov = CAMARA.fov;
    this.mira.copy(this.miraEnReposo);
    this.camara.position.copy(this.reposo);
    this.camara.lookAt(this.mira);
  }

  destruir(): void {
    this.vuelo?.kill();
    this.vuelo = null;
  }
}
