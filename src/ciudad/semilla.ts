/** Semilla por defecto: con ella el póster y el canvas pintan la misma ciudad. */
export const SEMILLA = 7;

/** Generador pseudoaleatorio con semilla (mulberry32): devuelve números en [0, 1). */
export function aleatorio(semilla: number): () => number {
  let s = semilla | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Valor fijo en [0, 1) para unas coordenadas. Sirve para que cada hueco de ventana
 * tenga siempre el mismo estado aunque cambie el número de apps.
 */
export function ruido(semilla: number, ...n: number[]): number {
  let h = semilla | 0;
  for (const v of n) {
    h = Math.imul(h ^ (v | 0), 0x9e3779b1);
    h = (h << 13) | (h >>> 19);
  }
  // Mezcla final de murmur3
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
