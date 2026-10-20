// Choques del jugador (un círculo en planta) con los edificios, los coches, las farolas y los
// árboles, y el rayo de la cámara contra los edificios. Puro, sin three.

import type { Caja, Circulo } from './mundo';

/** Empuja un círculo fuera de las cajas y los círculos que pisa. Devuelve la posición corregida. */
export function separar(x: number, z: number, r: number, cajas: readonly Caja[], circulos: readonly Circulo[]): { x: number; z: number } {
  // Dos pasadas: al salir de una caja se puede caer en la de al lado (esquinas)
  for (let pasada = 0; pasada < 2; pasada++) {
    for (const c of cajas) {
      const mx = c.ancho / 2;
      const mz = c.fondo / 2;
      const dx = x - c.x;
      const dz = z - c.z;
      if (Math.abs(dx) > mx + r || Math.abs(dz) > mz + r) continue;
      // Punto de la caja más cercano al centro del círculo
      const px = Math.max(-mx, Math.min(mx, dx));
      const pz = Math.max(-mz, Math.min(mz, dz));
      const ex = dx - px;
      const ez = dz - pz;
      const d = Math.hypot(ex, ez);
      if (d > 0) {
        if (d >= r) continue;
        x += (ex / d) * (r - d);
        z += (ez / d) * (r - d);
      } else {
        // El centro está dentro: sale por el lado más cercano
        const sx = mx - Math.abs(dx);
        const sz = mz - Math.abs(dz);
        if (sx < sz) x = c.x + Math.sign(dx || 1) * (mx + r);
        else z = c.z + Math.sign(dz || 1) * (mz + r);
      }
    }
    for (const c of circulos) {
      const dx = x - c.x;
      const dz = z - c.z;
      const d = Math.hypot(dx, dz);
      const minimo = r + c.r;
      if (d >= minimo) continue;
      if (d === 0) {
        x += minimo;
        continue;
      }
      x = c.x + (dx / d) * minimo;
      z = c.z + (dz / d) * minimo;
    }
  }
  return { x, z };
}

/**
 * Fracción (0–1) del segmento de `a` a `b` que se recorre antes de entrar en una caja (con su
 * altura). Sirve para que la cámara no se meta dentro de un edificio.
 */
export function rayoLibre(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
  cajas: readonly Caja[],
  margen = 0.3,
): number {
  let t = 1;
  const d = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  for (const c of cajas) {
    const min = [c.x - c.ancho / 2 - margen, -1, c.z - c.fondo / 2 - margen];
    const max = [c.x + c.ancho / 2 + margen, c.alto + margen, c.z + c.fondo / 2 + margen];
    const o = [a.x, a.y, a.z];
    const v = [d.x, d.y, d.z];
    let entrada = 0;
    let salida = t;
    let corta = true;
    for (let k = 0; k < 3; k++) {
      if (Math.abs(v[k]) < 1e-9) {
        if (o[k] < min[k] || o[k] > max[k]) {
          corta = false;
          break;
        }
        continue;
      }
      let t1 = (min[k] - o[k]) / v[k];
      let t2 = (max[k] - o[k]) / v[k];
      if (t1 > t2) [t1, t2] = [t2, t1];
      entrada = Math.max(entrada, t1);
      salida = Math.min(salida, t2);
      if (entrada > salida) {
        corta = false;
        break;
      }
    }
    if (corta && entrada < t) t = entrada;
  }
  return t;
}
