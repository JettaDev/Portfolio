// Render: WebGLRenderer, postproceso con bloom y niveles de calidad.

import { HalfFloatType, Vector2, WebGLRenderer, WebGLRenderTarget, type PerspectiveCamera, type Scene } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import type { NivelVivo } from './rendimiento';

interface Calidad {
  /** Filas de edificios visibles (de delante a atrás). */
  filas: number;
  /** Resolución del bloom respecto al lienzo; 0 = sin bloom (halos de sprite). */
  bloom: number;
  /** Densidad de píxeles máxima. */
  dpr: number;
  /** Muestras de antialiasing (MSAA) del render intermedio. */
  muestras: number;
}

export const NIVELES: Record<NivelVivo, Calidad> = {
  alto: { filas: 5, bloom: 1, dpr: 2, muestras: 4 },
  medio: { filas: 3, bloom: 0.5, dpr: 1.5, muestras: 0 },
  bajo: { filas: 3, bloom: 0, dpr: 1, muestras: 0 },
};

/** Umbral alto: solo brillan los ventanales y la luna, no las ventanas decorativas. */
const BLOOM = { fuerza: 0.9, radio: 0.4, umbral: 0.32 } as const;

/** Bloom a una fracción de la resolución del lienzo. */
class BloomEscalado extends UnrealBloomPass {
  constructor(private readonly escala: number) {
    super(new Vector2(1, 1), BLOOM.fuerza, BLOOM.radio, BLOOM.umbral);
  }

  override setSize(ancho: number, alto: number): void {
    super.setSize(Math.max(1, Math.round(ancho * this.escala)), Math.max(1, Math.round(alto * this.escala)));
  }
}

export class Pintor {
  readonly renderer: WebGLRenderer;
  private composer: EffectComposer | null = null;
  private bloom: BloomEscalado | null = null;
  private calidad: Calidad = NIVELES.alto;
  private tamano = { ancho: 1, alto: 1 };

  constructor(
    canvas: HTMLCanvasElement,
    private readonly escena: Scene,
    private readonly camara: PerspectiveCamera,
    nivel: NivelVivo,
  ) {
    // Sin antialias en el lienzo: con bloom se pinta en un render intermedio, que lleva su propio MSAA
    this.renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.ajustar(nivel);
  }

  get filas(): number {
    return this.calidad.filas;
  }

  ajustar(nivel: NivelVivo): void {
    this.calidad = NIVELES[nivel];
    this.soltarComposer();
    const dpr = Math.min(window.devicePixelRatio || 1, this.calidad.dpr);
    this.renderer.setPixelRatio(dpr);

    if (this.calidad.bloom > 0) {
      const destino = new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: this.calidad.muestras });
      const composer = new EffectComposer(this.renderer, destino);
      composer.setPixelRatio(dpr);
      composer.addPass(new RenderPass(this.escena, this.camara));
      this.bloom = new BloomEscalado(this.calidad.bloom);
      composer.addPass(this.bloom);
      composer.addPass(new OutputPass());
      this.composer = composer;
    }
    this.redimensionar(this.tamano.ancho, this.tamano.alto);
  }

  redimensionar(ancho: number, alto: number): void {
    this.tamano = { ancho, alto };
    this.renderer.setSize(ancho, alto, false);
    this.composer?.setSize(ancho, alto);
  }

  /** Atenúa el bloom (0–1): cerca de un ventanal la captura llena la pantalla y no debe deslumbrar. */
  atenuarBloom(factor: number): void {
    if (this.bloom) this.bloom.strength = BLOOM.fuerza * factor;
  }

  pintar(): void {
    if (this.composer) this.composer.render();
    else this.renderer.render(this.escena, this.camara);
  }

  private soltarComposer(): void {
    this.composer?.passes.forEach((p) => p.dispose());
    this.composer?.dispose();
    this.composer = null;
    this.bloom = null;
  }

  destruir(): void {
    this.soltarComposer();
    this.renderer.dispose();
  }
}
