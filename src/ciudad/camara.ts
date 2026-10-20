// Cámara: encuadre según el aspecto, parallax con el puntero y vuelos de ida y vuelta hasta lo
// que se pulsa (un ventanal, el escaparate, el estudio o el cartel del solar).

import { PerspectiveCamera, Vector2, Vector3 } from 'three';
import { gsap } from 'gsap';
import { CAMARA, PARALLAX, distanciaCamara, encuadrePara, type Encuadre, type Trazado } from './trazado';
import type { Objetivo } from './ventanas';

/** Duración del vuelo de ida. */
export const DURACION_VUELO = 1.1;
/** La vuelta sale rápida desde el objetivo y frena al llegar al reposo. */
export const DURACION_VUELTA = 1.05;
const TAN = Math.tan(((CAMARA.fov / 2) * Math.PI) / 180);

/** Distancia a la que se queda la cámara delante de un objetivo: lo justo para que llene la pantalla de alto. */
export const distanciaDeLlegada = (o: Objetivo) => o.tamano.alto / 2 / TAN;

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

  constructor(private readonly trazado: Trazado) {}

  get enReposo(): boolean {
    return this.vuelo === null;
  }

  /** `forzado` sirve para pintar el póster «alto» en un lienzo de 1,2:1. */
  encuadrar(aspecto: number, forzado?: Encuadre): void {
    this.camara.aspect = aspecto;
    this.camara.updateProjectionMatrix();
    const encuadre = forzado ?? encuadrePara(aspecto);
    this.reposo.set(0, CAMARA.y, distanciaCamara(encuadre, this.trazado.mitadAncho, this.trazado.frente));
    if (this.enReposo) {
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

  actualizar(conParallax: boolean): void {
    if (this.enReposo) {
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
    this.mira.copy(this.miraEnReposo);
    this.camara.position.copy(this.reposo);
    this.camara.lookAt(this.mira);
  }

  destruir(): void {
    this.vuelo?.kill();
    this.vuelo = null;
  }
}
