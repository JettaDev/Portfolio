// Render: WebGLRenderer, postproceso con bloom y niveles de calidad.

import { HalfFloatType, Mesh, PlaneGeometry, Scene, Vector2, WebGLRenderer, WebGLRenderTarget, type Material, type PerspectiveCamera } from 'three';
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
  /** Radio del bloom: a media resolución se extiende más por la pantalla, así que va más corto. */
  radio: number;
  /** Densidad de píxeles máxima. */
  dpr: number;
  /** Muestras de antialiasing (MSAA) del render intermedio. */
  muestras: number;
}

export const NIVELES: Record<NivelVivo, Calidad> = {
  alto: { filas: 5, bloom: 1, radio: 0.4, dpr: 2, muestras: 4 },
  medio: { filas: 3, bloom: 0.5, radio: 0.15, dpr: 1.5, muestras: 0 },
  bajo: { filas: 3, bloom: 0, radio: 0, dpr: 1, muestras: 0 },
};

/** Umbral alto: solo brillan los ventanales y la luna, no las ventanas decorativas. */
const BLOOM = { fuerza: 0.9, umbral: 0.32 } as const;

/** Bloom a una fracción de la resolución del lienzo. */
class BloomEscalado extends UnrealBloomPass {
  constructor(
    private readonly escala: number,
    radio: number,
  ) {
    super(new Vector2(1, 1), BLOOM.fuerza, radio, BLOOM.umbral);
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
    /** Densidad de píxeles fija (póster); si no, la del nivel. */
    private readonly dprFijo?: number,
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
    const dpr = this.dprFijo ?? Math.min(window.devicePixelRatio || 1, this.calidad.dpr);
    this.renderer.setPixelRatio(dpr);

    if (this.calidad.bloom > 0) {
      const destino = new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: this.calidad.muestras });
      const composer = new EffectComposer(this.renderer, destino);
      composer.setPixelRatio(dpr);
      composer.addPass(new RenderPass(this.escena, this.camara));
      this.bloom = new BloomEscalado(this.calidad.bloom, this.calidad.radio);
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

  /**
   * Compila los shaders sin bloquear el hilo principal (KHR_parallel_shader_compile): si no,
   * el primer fotograma es una tarea larga. Se compila la variante que se usará: la escena va
   * al render intermedio cuando hay bloom, igual que los pases del bloom.
   */
  async precompilar(): Promise<void> {
    const r = this.renderer;
    if (!this.composer || !this.bloom) {
      await r.compileAsync(this.escena, this.camara);
      return;
    }
    const b = this.bloom;
    const materiales: Material[] = [b.materialHighPassFilter, ...b.separableBlurMaterials, b.compositeMaterial, b.blendMaterial];
    const pases = new Scene();
    const plano = new PlaneGeometry(2, 2);
    materiales.forEach((m) => pases.add(new Mesh(plano, m)));
    const anterior = r.getRenderTarget();
    r.setRenderTarget(this.composer.renderTarget1);
    try {
      await r.compileAsync(this.escena, this.camara);
      await r.compileAsync(pases, this.camara);
    } finally {
      r.setRenderTarget(anterior);
      plano.dispose();
    }
  }

  /** Pinta la escena una vez en un render de 1×1 (mismo tipo que el intermedio) y lo tira. */
  calentar(): void {
    const r = this.renderer;
    const destino = new WebGLRenderTarget(1, 1, { type: HalfFloatType });
    const anterior = r.getRenderTarget();
    r.setRenderTarget(this.composer ? destino : null);
    if (!this.composer) r.setViewport(0, 0, 1, 1);
    r.render(this.escena, this.camara);
    r.setRenderTarget(anterior);
    if (!this.composer) r.setViewport(0, 0, this.tamano.ancho, this.tamano.alto);
    destino.dispose();
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
