import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import {
  CALLE,
  CAMARA,
  MANZANA,
  PARALLAX,
  distanciaCamara,
  encuadrePara,
  trazarCiudad,
  type AppEnCiudad,
  type Edificio,
  type Trazado,
  type VentanaProyecto,
} from './trazado';

const apps = (n: number): AppEnCiudad[] =>
  Array.from({ length: n }, (_, i) => ({ slug: `app-${i}`, status: (['live', 'beta', 'wip'] as const)[i % 3] }));

const ASPECTOS = { escritorio: 16 / 9, 'tableta horizontal': 4 / 3, 'ventana casi cuadrada': 1.19, movil: 9 / 19.5, 'móvil estrecho': 9 / 21 };
const CANTIDADES = [1, 2, 3, 6, 10];

const esquinas = (p: Pick<VentanaProyecto, 'x' | 'y' | 'z' | 'ancho' | 'alto'>) =>
  [-1, 1].flatMap((sx) => [-1, 1].map((sy) => new Vector3(p.x + (sx * p.ancho) / 2, p.y + (sy * p.alto) / 2, p.z)));

function camaraEnReposo(t: Trazado, aspecto: number, dx = 0, dy = 0) {
  const camara = new PerspectiveCamera(CAMARA.fov, aspecto, 0.1, 1200);
  camara.position.set(dx, CAMARA.y + dy, distanciaCamara(encuadrePara(aspecto), t.mitadAncho, t.frente));
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

  it.each(CANTIDADES)('con %i apps, cada una tiene su edificio y la primera va en el lote de la manzana', (n) => {
    const t = trazarCiudad(apps(n));
    expect(t.proyectos).toHaveLength(n);
    expect(new Set(t.proyectos.map((p) => p.edificio)).size).toBe(n);
    expect(t.proyectos.map((p) => p.slug)).toEqual(apps(n).map((a) => a.slug));
    const primera = t.edificios[t.proyectos[0].edificio];
    expect(primera.fila).toBe(0);
    expect(primera.x).toBe(MANZANA.lote.x);
    expect(Math.max(...t.proyectos.map((p) => p.fila))).toBeLessThan(3);
  });

  it('las apps siguientes van en torres de detrás, cerca del centro', () => {
    const t = trazarCiudad(apps(3));
    for (const p of t.proyectos.slice(1)) {
      expect(p.fila).toBeGreaterThan(0);
      expect(Math.abs(p.x)).toBeLessThan(7);
    }
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

  it.each(CANTIDADES)('con %i apps, el solar es un lote vacío junto a la tienda y no es de ninguna app', (n) => {
    const t = trazarCiudad(apps(n));
    const lote = t.edificios[t.solar.edificio];
    const tienda = t.edificios[t.tienda];
    expect(lote.fila).toBe(0);
    expect(lote.vacio).toBe(true);
    expect(lote.x - lote.ancho / 2 - (tienda.x + tienda.ancho / 2)).toBeCloseTo(MANZANA.separacion);
    expect(t.proyectos.map((p) => p.edificio)).not.toContain(t.solar.edificio);
    expect(t.huecos.some((h) => Math.abs(h.x - lote.x) < lote.ancho / 2 && Math.abs(h.z - t.solar.z) < 0.1)).toBe(false);
  });

  it.each(CANTIDADES)('con %i apps, la tienda está en el centro de la calle, con el escaparate abajo y el estudio arriba', (n) => {
    const t = trazarCiudad(apps(n));
    const tienda = t.edificios[t.tienda];
    expect(tienda.fila).toBe(0);
    expect(tienda.x).toBe(MANZANA.tienda.x);
    expect(t.proyectos.map((p) => p.edificio)).not.toContain(t.tienda);
    expect(t.escaparate.edificio).toBe(t.tienda);
    expect(t.estudio.edificio).toBe(t.tienda);
    // El escaparate cabe en la fachada, a pie de calle, y el estudio es la última planta
    expect(t.escaparate.ancho).toBeLessThan(tienda.ancho);
    expect(t.escaparate.y - t.escaparate.alto / 2).toBeLessThan(1);
    expect(tienda.alto - (t.estudio.y + t.estudio.alto / 2)).toBeLessThan(1.6);
    // Los huecos de la tienda empiezan por encima del rótulo y ninguno pisa el estudio
    const enTienda = t.huecos.filter((h) => Math.abs(h.x - tienda.x) < tienda.ancho / 2 && Math.abs(h.z - t.escaparate.z) < 0.1);
    expect(enTienda.length).toBeGreaterThan(0);
    for (const h of enTienda) {
      expect(h.y - 0.31).toBeGreaterThan(t.escaparate.toldo.y + 0.9);
      expect(Math.abs(h.x - t.estudio.x) < 0.21 + t.estudio.ancho / 2 && Math.abs(h.y - t.estudio.y) < 0.31 + t.estudio.alto / 2).toBe(false);
    }
  });

  it('la manzana y la calle no dependen de las apps', () => {
    const [a, b] = [trazarCiudad(apps(1)), trazarCiudad(apps(10))];
    for (const k of ['escaparate', 'estudio', 'solar', 'calle', 'tienda'] as const) expect(b[k]).toEqual(a[k]);
  });

  it('todas las fachadas de la fila de delante dan a la calle y las farolas no tapan los sitios', () => {
    const t = trazarCiudad(apps(3));
    for (const e of t.edificios.filter((e) => e.fila === 0)) expect(e.z + e.fondo / 2).toBeCloseTo(CALLE.fachada);
    const tapa = (x: number, r: { x: number; ancho: number }) => Math.abs(x - r.x) < r.ancho / 2 + 0.2;
    for (const x of t.calle.farolas) {
      expect(tapa(x, t.escaparate)).toBe(false);
      expect(tapa(x, t.solar.cartel)).toBe(false);
    }
    expect(t.calle.bordillo).toBeGreaterThan(t.calle.fachada);
    expect(t.calle.fin).toBeGreaterThan(t.calle.bordillo);
  });

  it('el estudio y el escaparate no se repiten como ventanal de app', () => {
    const t = trazarCiudad(apps(10));
    for (const p of t.proyectos) expect(p.edificio).not.toBe(t.tienda);
  });

  it('solo las apps en desarrollo tienen obra', () => {
    const t = trazarCiudad(apps(6));
    expect(t.obras.map((o) => o.slug)).toEqual(t.proyectos.filter((p) => p.status === 'wip').map((p) => p.slug));
  });

  for (const [nombre, aspecto] of Object.entries(ASPECTOS)) {
    it.each(CANTIDADES)(`con %i apps, el estudio, el escaparate y el cartel del solar caben y se ven (${nombre})`, (n) => {
      const t = trazarCiudad(apps(n));
      const camara = camaraEnReposo(t, aspecto);
      for (const v of [...esquinas(t.estudio), ...esquinas(t.escaparate), ...esquinas(t.solar.cartel)]) {
        const ndc = v.clone().project(camara);
        expect(Math.abs(ndc.x)).toBeLessThan(1);
        expect(Math.abs(ndc.y)).toBeLessThan(1);
      }
      for (const [dx, dy] of [[0, 0], [-PARALLAX.x, -PARALLAX.y], [PARALLAX.x, PARALLAX.y]]) {
        const ojo = camaraEnReposo(t, aspecto, dx, dy).position;
        for (const v of [...esquinas(t.estudio), ...esquinas(t.escaparate)]) {
          expect(t.edificios.filter((e, i) => i !== t.tienda && corta(ojo, v, e))).toEqual([]);
        }
      }
    });

    it(`se ve la calle: la acera delante de la tienda queda dentro del encuadre (${nombre})`, () => {
      const t = trazarCiudad(apps(2));
      const camara = camaraEnReposo(t, aspecto);
      const acera = new Vector3(0, CALLE.fachada > 0 ? 0.12 : 0, (t.calle.fachada + t.calle.bordillo) / 2).project(camara);
      expect(acera.y).toBeGreaterThan(-1);
      // …y no se queda en medio de la pantalla: la calle es el pie del encuadre
      expect(acera.y).toBeLessThan(-0.3);
    });

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
