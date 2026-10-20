// El póster se genera aparte (npm run poster): si se añade, quita o reordena una app y no se
// regenera, la portada y la 404 enseñarían ventanas que no cuadran con el canvas.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import posiciones from '../assets/ciudad/poster.json';

const raiz = join(__dirname, '../..');

/** Apps publicadas en el orden de la portada (mismo criterio que lib/apps.ts). */
function apps(lang: 'es' | 'en'): string[] {
  const dir = join(raiz, 'src/content/apps', lang);
  return readdirSync(dir)
    .filter((f) => /\.mdx?$/.test(f))
    .map((f) => {
      const cabecera = readFileSync(join(dir, f), 'utf8').split('\n---')[0];
      const campo = (k: string) => cabecera.match(new RegExp(`^${k}:\\s*(.+)$`, 'm'))?.[1].trim();
      return { slug: f.replace(/\.mdx?$/, ''), order: Number(campo('order') ?? 100), year: Number(campo('year') ?? 0), draft: campo('draft') === 'true' };
    })
    .filter((a) => !a.draft)
    .sort((a, b) => a.order - b.order || b.year - a.year)
    .map((a) => a.slug);
}

describe('póster de la ciudad', () => {
  it('tiene las mismas apps, en el mismo orden, que el contenido (ES y EN)', () => {
    expect(apps('en')).toEqual(apps('es'));
    for (const encuadre of ['ancho', 'alto'] as const) {
      const enPoster = posiciones[encuadre].ventanas.map((v) => v.slug).filter((s) => !s.startsWith('#'));
      expect(enPoster, `poster.json (${encuadre}): ejecuta npm run poster`).toEqual(apps('es'));
    }
  });

  it('sitúa el escaparate (con su rótulo), el estudio y el cartel del solar', () => {
    for (const encuadre of ['ancho', 'alto'] as const) {
      const ids = posiciones[encuadre].ventanas.map((v) => v.slug);
      expect(ids).toEqual(expect.arrayContaining(['#apps', '#sobre-mi', '#contacto']));
      const escaparate = posiciones[encuadre].ventanas.find((v) => v.slug === '#apps') as { y: number; ry?: number };
      // El rótulo va encima del toldo, por encima del cristal
      expect(escaparate.ry).toBeLessThan(escaparate.y);
    }
  });
});
