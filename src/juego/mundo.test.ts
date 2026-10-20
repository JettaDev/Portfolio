import { describe, expect, test } from 'vitest';
import { separar, rayoLibre } from './fisica';
import { ALCANCE, LIMITE, MAX_APPS, alturaSuelo, BORDILLO, trazarMundo, type Caja } from './mundo';

const solapan = (a: Caja, b: Caja) => Math.abs(a.x - b.x) < (a.ancho + b.ancho) / 2 && Math.abs(a.z - b.z) < (a.fondo + b.fondo) / 2;

describe('el barrio del juego', () => {
  const slugs = ['uno', 'dos', 'tres'];
  const mundo = trazarMundo(slugs);

  test('es determinista', () => {
    expect(trazarMundo(slugs)).toEqual(mundo);
  });

  test('hay una puerta por app, el estudio y el solar', () => {
    const ids = mundo.puertas.map((p) => p.id).sort();
    expect(ids).toEqual(['#contacto', '#sobre-mi', ...slugs].sort());
  });

  test('admite hasta MAX_APPS apps y no pasa de ahí', () => {
    const muchas = Array.from({ length: MAX_APPS + 3 }, (_, k) => `app-${k}`);
    expect(trazarMundo(muchas).puertas.filter((p) => p.sitio === 'app')).toHaveLength(MAX_APPS);
  });

  test('ningún edificio se solapa con otro ni con un coche', () => {
    const cajas = [...mundo.edificios];
    for (let a = 0; a < cajas.length; a++) for (let b = a + 1; b < cajas.length; b++) expect(solapan(cajas[a], cajas[b])).toBe(false);
    const coches = mundo.cajas.slice(mundo.edificios.length + 1);
    for (const c of coches) for (const e of mundo.edificios) expect(solapan(c, e)).toBe(false);
  });

  test('la salida está libre, en la calle, y se ve el estudio de frente', () => {
    const { salida } = mundo;
    expect(separar(salida.x, salida.z, 0.4, mundo.cajas, mundo.circulos)).toEqual({ x: salida.x, z: salida.z });
    const estudio = mundo.puertas.find((p) => p.id === '#sobre-mi')!;
    expect(estudio.z).toBeLessThan(salida.z);
    expect(Math.abs(estudio.x - salida.x)).toBeLessThan(1);
  });

  test('delante de cada puerta se puede estar (dentro del alcance y sin chocar)', () => {
    for (const p of mundo.puertas) {
      const x = p.x + Math.sin(p.giro) * 1.2;
      const z = p.z + Math.cos(p.giro) * 1.2;
      const libre = separar(x, z, 0.4, mundo.cajas, mundo.circulos);
      expect(Math.hypot(libre.x - p.x, libre.z - p.z)).toBeLessThan(ALCANCE);
      expect(Math.abs(libre.x) < LIMITE && Math.abs(libre.z) < LIMITE).toBe(true);
    }
  });

  test('la acera está más alta que la calzada', () => {
    expect(alturaSuelo(0, 0)).toBe(BORDILLO);
    expect(alturaSuelo(0, 17)).toBe(0);
  });
});

describe('choques', () => {
  const caja = { x: 0, z: 0, ancho: 2, fondo: 2, alto: 5 };
  test('empuja fuera de una caja por el lado más cercano', () => {
    const p = separar(0.9, 0, 0.5, [caja], []);
    expect(p.x).toBeCloseTo(1.5);
    expect(p.z).toBeCloseTo(0);
  });
  test('rodea la esquina', () => {
    const p = separar(1.2, 1.2, 0.5, [caja], []);
    expect(Math.hypot(p.x - 1, p.z - 1)).toBeCloseTo(0.5);
  });
  test('el rayo de la cámara se corta antes del edificio', () => {
    const t = rayoLibre({ x: 0, y: 1, z: 5 }, { x: 0, y: 1, z: -5 }, [caja], 0);
    expect(t).toBeCloseTo(0.4);
    expect(rayoLibre({ x: 5, y: 1, z: 5 }, { x: 5, y: 1, z: -5 }, [caja])).toBe(1);
  });
});
