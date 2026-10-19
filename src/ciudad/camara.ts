// Cámara: encuadre según el aspecto, parallax con el puntero, descenso a la calle con el scroll
// y vuelo hasta un ventanal.

import { PerspectiveCamera, Vector2, Vector3 } from 'three';
import { gsap } from 'gsap';
import { CAMARA, PARALLAX, distanciaCamara, encuadrePara, type Encuadre, type Trazado } from './trazado';
import type { Ventanal } from './ventanas';

/** Duración del vuelo de ida; la vuelta va un poco más rápida. */
export const DURACION_VUELO = 1.1;
/** Distancia a la que se queda la cámara delante del ventanal: lo justo para llenar la pantalla. */
const CERCA = 1.1;
/** Al bajar del todo: la cámara a la altura de los ojos, algo más cerca y mirando a la calle. */
const DESCENSO = { y: 3.6, z: 10, mira: 8 };

export class CamaraCiudad {
  readonly camara = new PerspectiveCamera(CAMARA.fov, 1, 0.1, 1200);
  /** Punto al que mira la cámara (animable). */
  readonly mira = new Vector3(CAMARA.mira.x, CAMARA.mira.y, CAMARA.mira.z);
  /** Posición de reposo según el encuadre, y la de ahora con el descenso aplicado. */
  private readonly reposo = new Vector3();
  private readonly base = new Vector3();
  private bajada = 0;
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
    this.descender(this.bajada);
    if (this.enReposo) {
      this.camara.position.copy(this.base);
      this.camara.lookAt(this.mira);
    }
  }

  /** Descenso a la calle (0 arriba, 1 abajo del todo), suavizado con smoothstep. */
  descender(d: number): void {
    this.bajada = d;
    const e = d * d * (3 - 2 * d);
    this.base.set(this.reposo.x, this.reposo.y - DESCENSO.y * e, this.reposo.z - DESCENSO.z * e);
  }

  /** Punto al que mira la cámara en reposo, con el descenso aplicado. */
  private miraEnReposo(): Vector3 {
    const e = this.bajada * this.bajada * (3 - 2 * this.bajada);
    return new Vector3(CAMARA.mira.x, CAMARA.mira.y - DESCENSO.mira * e, CAMARA.mira.z);
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
      c.x += (this.base.x + x - c.x) * 0.05;
      c.y += (this.base.y + y - c.y) * 0.05;
      c.z = this.base.z;
      this.mira.copy(this.miraEnReposo());
    }
    this.camara.lookAt(this.mira);
  }

  /** Línea de vuelo desde un punto de partida explícito hasta el ventanal. */
  private lineaDeVuelo(v: Ventanal, desde: { posicion: Vector3; mira: Vector3; brillo: number }): gsap.core.Timeline {
    this.vuelo?.kill();
    const p = v.posicion;
    const viaje = { duration: DURACION_VUELO, ease: 'power3.inOut' };
    // La cámara avanza hasta quedarse frente al ventanal mientras gira hacia él, y el ventanal se enciende
    const linea = gsap
      .timeline({ paused: true })
      .fromTo(this.camara.position, { ...desde.posicion }, { x: p.x, y: p.y, z: p.z + CERCA, ...viaje }, 0)
      .fromTo(this.mira, { ...desde.mira }, { x: p.x, y: p.y, z: p.z, ...viaje }, 0)
      .fromTo(v, { brillo: desde.brillo }, { brillo: 1.5, duration: 0.9, ease: 'power2.in' }, 0.15);
    this.vuelo = linea;
    return linea;
  }

  /** Vuelo de ida desde donde esté la cámara. Se resuelve al llegar; la cámara se queda pegada al ventanal. */
  volarA(v: Ventanal): Promise<void> {
    const linea = this.lineaDeVuelo(v, { posicion: this.camara.position.clone(), mira: this.mira.clone(), brillo: v.brillo });
    return new Promise((resolver) => linea.eventCallback('onComplete', () => resolver()).play());
  }

  /** Línea de vuelo desde el reposo, parada al final: la cámara queda pegada al ventanal. */
  private lineaDesdeReposo(v: Ventanal): gsap.core.Timeline {
    return this.lineaDeVuelo(v, { posicion: this.base.clone(), mira: this.miraEnReposo(), brillo: 0 }).progress(1);
  }

  /**
   * Coloca la cámara pegada al ventanal, sin animación (al volver a la portada sin bfcache), o en
   * un punto intermedio del vuelo (`progreso` < 1, para las imágenes Open Graph).
   */
  situar(v: Ventanal, progreso = 1): void {
    this.lineaDesdeReposo(v).progress(progreso);
    this.camara.lookAt(this.mira);
  }

  /** Vuelo de vuelta: arranca pegada al ventanal y hace el recorrido inverso hasta el reposo. */
  volverDe(v: Ventanal): Promise<void> {
    const linea = this.lineaDesdeReposo(v);
    return new Promise((resolver) =>
      linea
        .eventCallback('onReverseComplete', () => {
          this.vuelo = null;
          resolver();
        })
        .timeScale(1.2)
        .reverse(),
    );
  }

  /** Vuelve al reposo sin animación (movimiento reducido o cancelación). */
  reposar(): void {
    this.vuelo?.progress(0).kill();
    this.vuelo = null;
    this.mira.copy(this.miraEnReposo());
    this.camara.position.copy(this.base);
    this.camara.lookAt(this.mira);
  }

  destruir(): void {
    this.vuelo?.kill();
    this.vuelo = null;
  }
}
