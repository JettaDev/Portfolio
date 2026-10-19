// Nivel de calidad según el dispositivo y medidor de FPS. No importa three: la portada
// puede decidir si carga la ciudad sin descargar el motor.

export type Nivel = 'alto' | 'medio' | 'bajo' | 'estatico';
export type NivelVivo = Exclude<Nivel, 'estatico'>;

const ORDEN: Nivel[] = ['alto', 'medio', 'bajo', 'estatico'];

interface Dispositivo {
  navigator: Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  matchMedia: (q: string) => MediaQueryList;
  location: Location;
}

function hayWebGL2(): boolean {
  try {
    // Sin aceleración (renderizado por software) la ciudad no se mueve con soltura: mejor el póster
    return !!document.createElement('canvas').getContext('webgl2', { failIfMajorPerformanceCaveat: true });
  } catch {
    return false;
  }
}

/**
 * Elige el nivel al cargar. Parámetros de prueba: `?nivel=alto|medio|bajo|estatico` y `?ligero` (= bajo).
 */
export function detectarNivel(entorno: Dispositivo = window): Nivel {
  const params = new URLSearchParams(entorno.location.search);
  const forzado = params.get('nivel') as Nivel | null;
  if (forzado && ORDEN.includes(forzado)) return forzado;
  if (params.has('ligero')) return 'bajo';

  const nav = entorno.navigator;
  if (nav.connection?.saveData || !hayWebGL2()) return 'estatico';
  const nucleos = nav.hardwareConcurrency || 8;
  const memoria = nav.deviceMemory || 8;
  if (entorno.matchMedia('(pointer: coarse)').matches) return nucleos <= 4 || memoria <= 3 ? 'bajo' : 'medio';
  return nucleos <= 4 || memoria <= 4 ? 'bajo' : 'alto';
}

export function nivelInferior(nivel: NivelVivo): Nivel {
  return ORDEN[ORDEN.indexOf(nivel) + 1];
}

/**
 * Mide los FPS entre los segundos `desde` y `hasta` de tiempo visible en reposo. Da su veredicto
 * una sola vez: `'lento'` si quedan por debajo del umbral.
 */
export class MedidorFps {
  private tiempo = 0;
  private fotogramas = 0;
  private terminado = false;

  constructor(
    private readonly desde = 1,
    private readonly hasta = 3,
    private readonly umbral = 40,
  ) {}

  registrar(dt: number): 'ok' | 'lento' | null {
    if (this.terminado) return null;
    this.tiempo += dt;
    if (this.tiempo > this.desde) this.fotogramas++;
    if (this.tiempo < this.hasta) return null;
    this.terminado = true;
    return this.fotogramas / (this.tiempo - this.desde) < this.umbral ? 'lento' : 'ok';
  }
}
