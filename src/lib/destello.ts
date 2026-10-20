// El destello: la capa caléndula sólida que une la ciudad con sus destinos (la ficha de cada app,
// el catálogo, Sobre mí y Contacto). Crece con clip-path desde lo que se pulsa al salir de la
// portada y se recoge sobre la ventana de la página al llegar (o sobre el objetivo, al volver).
// Con «reducir movimiento», solo un fundido.
//
// sessionStorage (lo lee el script inline del <head> de Base.astro antes del primer pintado):
//   ciudad:llegada   ruta de la página a la que se va: allí la capa sale ya cubriendo
//   ciudad:desde     { slug, href } del objetivo desde el que se volverá a la ciudad
//   ciudad:anterior  ruta de la página que se acaba de dejar (la escribe cada pagehide)
//   ciudad:origen    centro en pantalla de [data-destello-destino] al dejar la página: al volver,
//                    la capa crece desde ahí (view transition)

const html = document.documentElement;
const capa = () => document.querySelector<HTMLElement>('[data-destello-capa]');
const reducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

type Punto = { x: number; y: number };

/** Ruta sin barra final, para comparar /apps/x con /apps/x/. */
export const ruta = (p: string) => p.replace(/(.)\/$/, '$1');

/** Radio que cubre toda la pantalla desde (x, y). */
const radio = ({ x, y }: Punto) => Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 2;

/** Centro de un elemento, dentro de la pantalla (si está por debajo, la capa se recoge hacia el borde). */
export function centroDe(el: Element | null): Punto {
  if (!el) return { x: innerWidth / 2, y: innerHeight / 2 };
  const r = el.getBoundingClientRect();
  const dentro = (v: number, max: number) => Math.min(Math.max(v, 0), max);
  return { x: dentro(r.left + r.width / 2, innerWidth), y: dentro(r.top + r.height / 2, innerHeight) };
}

/** Curvas (0–1 → 0–1). */
const curvas = {
  /** Arranca suave y acelera: el círculo se abre paso y llena la pantalla de golpe. */
  entrada: (t: number) => t * t * (0.35 + 0.65 * t),
  /** Sale rápido y frena: el círculo se recoge enseguida y se posa sobre su destino. */
  salida: (t: number) => 1 - (1 - t) ** 3,
};

interface Circulo {
  /** Radio al principio y al final, en fracción del que cubre toda la pantalla. */
  desde: number;
  hasta: number;
  duracion: number;
  curva: (t: number) => number;
  /** Centro del círculo en cada fotograma: puede seguir a algo que se mueve. */
  centro: () => Punto;
  /** Tamaño mínimo (px) al que se recoge: el del objetivo en pantalla, si se conoce. */
  minimo?: () => number;
}

/** Anima el círculo de la capa fotograma a fotograma (con WAAPI no se puede seguir a un punto que se mueve). */
function animar(el: HTMLElement, c: Circulo): Promise<void> {
  return new Promise((resolver) => {
    const t0 = performance.now();
    const paso = (ahora: number) => {
      const t = Math.min(1, (ahora - t0) / c.duracion);
      const p = c.centro();
      const f = c.desde + (c.hasta - c.desde) * c.curva(t);
      const r = Math.max(f * radio(p), c.minimo ? c.minimo() * (1 - t) : 0);
      el.style.clipPath = `circle(${r.toFixed(1)}px at ${p.x.toFixed(1)}px ${p.y.toFixed(1)}px)`;
      if (t < 1) requestAnimationFrame(paso);
      else resolver();
    };
    requestAnimationFrame(paso);
  });
}

/**
 * Cubre la pantalla desde `centro` (un punto fijo o uno que se mueve). Se resuelve con la
 * pantalla ya cubierta.
 */
export async function cubrir(centro: Punto | (() => Punto), duracion = 380): Promise<void> {
  const el = capa();
  if (!el) return;
  el.getAnimations().forEach((a) => a.cancel());
  const donde = typeof centro === 'function' ? centro : () => centro;
  html.dataset.destello = 'salida';
  if (reducido()) {
    el.style.clipPath = '';
    await el.animate({ opacity: [0, 1] }, { duration: 300, easing: 'ease-out', fill: 'forwards' }).finished;
    return;
  }
  el.style.opacity = '';
  await animar(el, { desde: 0, hasta: 1, duracion, curva: curvas.entrada, centro: donde });
  el.style.clipPath = '';
}

/**
 * Recoge la capa sobre `centro` (fijo o que se mueve) y la quita. `minimo` da el tamaño del
 * objetivo en pantalla: el círculo no se encoge por debajo de él hasta el final.
 */
export async function retirar(centro: Punto | (() => Punto), duracion = 650, minimo?: () => number): Promise<void> {
  const el = capa();
  if (!el || !html.hasAttribute('data-destello')) return;
  el.getAnimations().forEach((a) => a.cancel());
  const donde = typeof centro === 'function' ? centro : () => centro;
  if (reducido()) await el.animate({ opacity: [1, 0] }, { duration: 300, easing: 'ease-out', fill: 'forwards' }).finished;
  else await animar(el, { desde: 1, hasta: 0, duracion, curva: curvas.salida, centro: donde, minimo });
  delete html.dataset.destello;
  delete html.dataset.regreso;
  el.getAnimations().forEach((a) => a.cancel());
  el.style.clipPath = '';
  el.style.opacity = '';
}

/** Antes de navegar desde la ciudad: la página de destino sabrá que tiene que llegar cubierta. */
export function recordarSalida(id: string, href: string): void {
  try {
    sessionStorage.setItem('ciudad:llegada', ruta(href));
    sessionStorage.setItem('ciudad:desde', JSON.stringify({ slug: id, href: ruta(href) }));
  } catch {}
}

export function olvidarSalida(): void {
  try {
    sessionStorage.removeItem('ciudad:llegada');
    sessionStorage.removeItem('ciudad:desde');
  } catch {}
}
