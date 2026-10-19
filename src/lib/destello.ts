// El destello: la capa caléndula sólida que une la ciudad con la ficha de cada app.
// Crece con clip-path desde el ventanal al salir de la portada y se recoge sobre la ventana de
// la ficha al llegar (o sobre el ventanal, al volver). Con «reducir movimiento», solo un fundido.
//
// sessionStorage (lo lee el script inline del <head> de Base.astro antes del primer pintado):
//   ciudad:llegada   ruta de la ficha a la que se va: allí la capa sale ya cubriendo
//   ciudad:desde     { slug, href } de la app desde la que se volverá a la ciudad
//   ciudad:anterior  ruta de la página que se acaba de dejar (la escribe cada pagehide)

const html = document.documentElement;
const capa = () => document.querySelector<HTMLElement>('[data-destello-capa]');
const reducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Ruta sin barra final, para comparar /apps/x con /apps/x/. */
export const ruta = (p: string) => p.replace(/(.)\/$/, '$1');

/** Radio que cubre toda la pantalla desde (x, y). */
const radio = (x: number, y: number) => Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 2;

/** Centro de un elemento, dentro de la pantalla (si está por debajo, la capa se recoge hacia el borde). */
export function centroDe(el: Element | null): { x: number; y: number } {
  if (!el) return { x: innerWidth / 2, y: innerHeight / 2 };
  const r = el.getBoundingClientRect();
  const dentro = (v: number, max: number) => Math.min(Math.max(v, 0), max);
  return { x: dentro(r.left + r.width / 2, innerWidth), y: dentro(r.top + r.height / 2, innerHeight) };
}

/** Cubre la pantalla desde (x, y). Se resuelve con la pantalla ya cubierta. */
export async function cubrir(x: number, y: number, duracion = 400): Promise<void> {
  const el = capa();
  if (!el) return;
  const fundido = reducido();
  el.style.clipPath = fundido ? '' : `circle(0px at ${x}px ${y}px)`;
  el.style.opacity = fundido ? '0' : '';
  html.dataset.destello = 'salida';
  const animacion = fundido
    ? el.animate({ opacity: [0, 1] }, { duration: 300, easing: 'ease-out', fill: 'forwards' })
    : el.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radio(x, y)}px at ${x}px ${y}px)`] }, { duration: duracion, easing: 'cubic-bezier(0.55, 0, 0.75, 0.25)', fill: 'forwards' });
  await animacion.finished;
}

/** Recoge la capa sobre (x, y) y la quita. */
export async function retirar(x: number, y: number, duracion = 650): Promise<void> {
  const el = capa();
  if (!el || !html.hasAttribute('data-destello')) return;
  el.getAnimations().forEach((a) => a.cancel());
  const animacion = reducido()
    ? el.animate({ opacity: [1, 0] }, { duration: 300, easing: 'ease-out', fill: 'forwards' })
    : el.animate({ clipPath: [`circle(${radio(x, y)}px at ${x}px ${y}px)`, `circle(0px at ${x}px ${y}px)`] }, { duration: duracion, easing: 'cubic-bezier(0.25, 1, 0.5, 1)', fill: 'forwards' });
  await animacion.finished;
  delete html.dataset.destello;
  delete html.dataset.regreso;
  el.getAnimations().forEach((a) => a.cancel());
  el.style.clipPath = '';
  el.style.opacity = '';
}

/** Antes de navegar desde la ciudad: la ficha sabrá que tiene que llegar cubierta. */
export function recordarSalida(slug: string, href: string): void {
  try {
    sessionStorage.setItem('ciudad:llegada', ruta(href));
    sessionStorage.setItem('ciudad:desde', JSON.stringify({ slug, href: ruta(href) }));
  } catch {}
}

export function olvidarSalida(): void {
  try {
    sessionStorage.removeItem('ciudad:llegada');
    sessionStorage.removeItem('ciudad:desde');
  } catch {}
}
