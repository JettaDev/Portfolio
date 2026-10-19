import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import {
  CAMARA,
  PARALLAX,
  distanciaCamara,
  trazarCiudad,
  type AppEnCiudad,
  type Edificio,
  type Trazado,
  type VentanaProyecto,
} from './trazado';

const apps = (n: number): AppEnCiudad[] =>
  Array.from({ length: n }, (_, i) => ({ slug: `app-${i}`, status: (['live', 'beta', 'wip'] as const)[i % 3] }));

const ASPECTOS = { escritorio: 16 / 9, movil: 9 / 19.5 };
const CANTIDADES = [1, 2, 3, 6, 10];

const esquinas = (p: VentanaProyecto) =>
  [-1, 1].flatMap((sx) => [-1, 1].map((sy) => new Vector3(p.x + (sx * p.ancho) / 2, p.y + (sy * p.alto) / 2, p.z)));

function camaraEnReposo(t: Trazado, aspecto: number, dx = 0, dy = 0) {
  const camara = new PerspectiveCamera(CAMARA.fov, aspecto, 0.1, 1200);
  camara.position.set(dx, CAMARA.y + dy, distanciaCamara(aspecto, t.mitadAncho, t.frente));
  camara.lookAt(CAMARA.mira.x, CAMARA.mira.y, CAMARA.mira.z);
  camara.updateMatrixWorld();
  return camara;
}

/** ¿Corta el segmento origen → destino la caja del edificio? (método de las placas) */
function corta(origen: Vector3, destino: Vector3, e: Edificio): boolean {
  const min = [e.x - e.ancho / 2, 0, e.z - e.fondo / 2];
  const max = [e.x + e.ancho / 2, e.alto, e.z + e.fondo / 2];
  const o = origen.toArray();
  const d = destino.clone().sub(origen).toArray();
  let entrada = 0;
  let salida = 1;
  for (let k = 0; k < 3; k++) {
    if (Math.abs(d[k]) < 1e-9) {
      if (o[k] < min[k] || o[k] > max[k]) return false;
      continue;
    }
    let t1 = (min[k] - o[k]) / d[k];
    let t2 = (max[k] - o[k]) / d[k];
    if (t1 > t2) [t1, t2] = [t2, t1];
    entrada = Math.max(entrada, t1);
    salida = Math.min(salida, t2);
    if (entrada > salida) return false;
  }
  return true;
}

describe('trazarCiudad', () => {
  it('con la misma semilla sale la misma ciudad', () => {
    expect(trazarCiudad(apps(3), 7)).toEqual(trazarCiudad(apps(3), 7));
    expect(trazarCiudad(apps(3), 7).edificios).not.toEqual(trazarCiudad(apps(3), 8).edificios);
  });

  it('añadir una app no mueve los edificios ni cambia las ventanas encendidas', () => {
    const antes = trazarCiudad(apps(2));
    const despues = trazarCiudad(apps(3));
    const planta = ({ x, z, ancho, fondo }: Edificio) => ({ x, z, ancho, fondo });
    expect(despues.edificios.map(planta)).toEqual(antes.edificios.map(planta));
    const clave = (h: { x: number; y: number; z: number }) => `${h.x.toFixed(3)}:${h.y.toFixed(3)}:${h.z.toFixed(3)}`;
    const encendidas = new Map(antes.huecos.map((h) => [clave(h), h.encendida]));
    for (const h of despues.huecos) {
      if (encendidas.has(clave(h))) expect(h.encendida).toBe(encendidas.get(clave(h)));
    }
  });

  it.each(CANTIDADES)('con %i apps, cada una tiene su edificio y la fila de delante se llena primero', (n) => {
    const t = trazarCiudad(apps(n));
    expect(t.proyectos).toHaveLength(n);
    expect(new Set(t.proyectos.map((p) => p.edificio)).size).toBe(n);
    expect(t.proyectos.map((p) => p.slug)).toEqual(apps(n).map((a) => a.slug));
    const filas = t.proyectos.map((p) => p.fila);
    const delante = t.edificios.filter((e, i) => e.fila === 0 && !filas.includes(i)).length;
    if (filas.some((f) => f > 0)) expect(filas.filter((f) => f === 0).length).toBeGreaterThanOrEqual(2);
    expect(delante).toBeGreaterThan(0);
    expect(Math.max(...filas)).toBeLessThan(3);
  });

  it('las dos primeras apps quedan a lados opuestos del centro', () => {
    const [a, b] = trazarCiudad(apps(2)).proyectos;
    expect(Math.sign(a.x)).not.toBe(Math.sign(b.x));
  });

  it('respeta la planta pedida en el MDX', () => {
    const t = trazarCiudad([{ slug: 'a', status: 'live', planta: 5 }]);
    expect(t.proyectos[0].planta).toBe(5);
  });

  it.each(CANTIDADES)('con %i apps, ningún hueco decorativo se solapa con un ventanal', (n) => {
    const t = trazarCiudad(apps(n));
    const marco = 0.06;
    for (const p of t.proyectos) {
      for (const h of t.huecos) {
        if (Math.abs(h.z - p.z) > 0.1) continue;
        const solapaX = Math.abs(h.x - p.x) < 0.21 + p.ancho / 2 + marco;
        const solapaY = Math.abs(h.y - p.y) < 0.31 + p.alto / 2 + marco;
        expect(solapaX && solapaY).toBe(false);
      }
    }
  });

  for (const [nombre, aspecto] of Object.entries(ASPECTOS)) {
    it.each(CANTIDADES)(`con %i apps, todos los ventanales caben en el encuadre (${nombre})`, (n) => {
      const t = trazarCiudad(apps(n));
      const camara = camaraEnReposo(t, aspecto);
      for (const p of t.proyectos) {
        for (const v of esquinas(p)) {
          const ndc = v.project(camara);
          expect(Math.abs(ndc.x)).toBeLessThan(1);
          expect(Math.abs(ndc.y)).toBeLessThan(1);
        }
      }
    });

    it.each(CANTIDADES)(`con %i apps, ningún edificio tapa un ventanal (${nombre})`, (n) => {
      const t = trazarCiudad(apps(n));
      for (const [dx, dy] of [[0, 0], [-PARALLAX.x, -PARALLAX.y], [PARALLAX.x, PARALLAX.y]]) {
        const ojo = camaraEnReposo(t, aspecto, dx, dy).position;
        for (const p of t.proyectos) {
          for (const v of esquinas(p)) {
            const tapan = t.edificios.filter((e, i) => i !== p.edificio && corta(ojo, v, e));
            expect(tapan).toEqual([]);
          }
        }
      }
    });
  }

  it('los cortes por fila cuadran con los edificios y los huecos', () => {
    const t = trazarCiudad(apps(2));
    expect(t.cortes.edificios).toHaveLength(5);
    expect(t.cortes.edificios.at(-1)).toBe(t.edificios.length);
    expect(t.cortes.huecos.at(-1)).toBe(t.huecos.length);
    const tres = t.cortes.huecos[2];
    expect(t.huecos.slice(0, tres).every((h) => h.fila < 3)).toBe(true);
    expect(t.huecos.slice(tres).every((h) => h.fila >= 3)).toBe(true);
  });
});
