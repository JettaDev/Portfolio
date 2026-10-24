// Contraste WCAG 2.x entre dos colores hexadecimales.

function luminancia(hex: string) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((x) => x + x).join('') : h.slice(0, 6);
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(full.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(a: string, b: string) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100;
}

/** Parejas que debe cumplir cualquier tema: [texto, fondo, mínimo]. */
export const PAREJAS_OBLIGATORIAS: [string, string, number][] = [
  ['texto', 'fondo', 4.5],
  ['textoSuave', 'fondo', 4.5],
  ['texto', 'superficie', 4.5],
  ['textoSuave', 'superficie', 4.5],
  ['textoSobrePrimario', 'primario', 4.5],
  // El primario se usa en enlaces y bordes de botones sobre el fondo.
  ['primario', 'fondo', 4.5],
];
