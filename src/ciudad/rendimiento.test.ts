import { describe, expect, it } from 'vitest';
import { MedidorFps, detectarNivel, nivelInferior } from './rendimiento';

const entorno = (search: string) =>
  ({ location: { search }, navigator: {}, matchMedia: () => ({ matches: false }) }) as unknown as Parameters<typeof detectarNivel>[0];

describe('MedidorFps', () => {
  const medir = (fps: number, segundos: number) => {
    const m = new MedidorFps();
    let veredicto = null;
    for (let i = 0; i < fps * segundos && !veredicto; i++) veredicto = m.registrar(1 / fps);
    return veredicto;
  };

  it('a 60 fps da el visto bueno y a 25 pide bajar', () => {
    expect(medir(60, 4)).toBe('ok');
    expect(medir(25, 4)).toBe('lento');
  });

  it('no da veredicto antes del segundo 3 ni lo repite', () => {
    const m = new MedidorFps();
    for (let i = 0; i < 170; i++) expect(m.registrar(1 / 60)).toBeNull();
    let veredictos = 0;
    for (let i = 0; i < 200; i++) if (m.registrar(1 / 60)) veredictos++;
    expect(veredictos).toBe(1);
  });
});

describe('niveles', () => {
  it('se bajan de uno en uno', () => {
    expect(nivelInferior('alto')).toBe('medio');
    expect(nivelInferior('medio')).toBe('bajo');
    expect(nivelInferior('bajo')).toBe('estatico');
  });

  it('se pueden forzar por parámetro', () => {
    expect(detectarNivel(entorno('?nivel=medio'))).toBe('medio');
    expect(detectarNivel(entorno('?ligero'))).toBe('bajo');
    expect(detectarNivel(entorno('?nivel=raro&ligero'))).toBe('bajo');
  });
});
