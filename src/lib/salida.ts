// «La ventana sale»: la transición entre la ciudad y sus páginas. Al pulsar un ventanal, la ciudad
// se oscurece alrededor de él, la cámara se acerca y la ventana se despega de la fachada como una
// ventana de navegador (marco de su color, barra y captura). Esa ventana es el elemento que la
// view transition entre documentos lleva hasta su sitio en la página (`view-transition-name:
// salida`). Al volver, la ventana de la página encoge y regresa a su hueco en el edificio.
// Con el escaparate, el estudio y el solar sale el trozo de ciudad pulsado (un recorte del canvas).
//
// sessionStorage (lo lee el script inline del <head> de Base.astro antes del primer pintado):
//   ciudad:llegada   ruta de la página a la que se va: allí su [data-ventana-destino] recibe el nombre
//   ciudad:desde     { slug, href } del sitio del que se sale: al volver a la portada, encoge hasta él
//   ciudad:anterior  ruta de la página que se acaba de dejar (la escribe cada pagehide)

export type Rect = { x: number; y: number; ancho: number; alto: number };

/** Ruta sin barra final, para comparar /apps/x con /apps/x/. */
export const ruta = (p: string) => p.replace(/(.)\/$/, '$1');

const reducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Antes de navegar desde la ciudad: la página de destino sabrá que llega la ventana. */
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

/** Espera a que acabe la view transition en curso (si la hay), como mucho `max` ms. */
export async function finTransicion(max = 1500): Promise<void> {
  const html = document.documentElement;
  await new Promise(requestAnimationFrame);
  for (let t0 = performance.now(); html.hasAttribute('data-transicion') && performance.now() - t0 < max; ) await new Promise(requestAnimationFrame);
}

// --- El velo: la ciudad se oscurece alrededor de lo pulsado -----------------------------

/**
 * Un rectángulo transparente sobre lo pulsado con una sombra enorme alrededor: oscurece todo
 * menos el hueco. Sigue al objetivo mientras la cámara se mueve.
 */
export class Velo {
  private seguir = 0;
  constructor(private readonly el: HTMLElement) {}

  colocar(r: Rect, margen = 6): void {
    const s = this.el.style;
    s.transform = `translate(${(r.x - margen).toFixed(1)}px, ${(r.y - margen).toFixed(1)}px)`;
    s.width = `${(r.ancho + margen * 2).toFixed(1)}px`;
    s.height = `${(r.alto + margen * 2).toFixed(1)}px`;
  }

  /** Oscurece y sigue a `rect()` hasta que se llame a `parar`. */
  oscurecer(rect: () => Rect | null): void {
    cancelAnimationFrame(this.seguir);
    const paso = () => {
      const r = rect();
      if (r) this.colocar(r);
      this.seguir = requestAnimationFrame(paso);
    };
    paso();
    this.el.dataset.activo = '';
  }

  parar(): void {
    cancelAnimationFrame(this.seguir);
  }

  aclarar(): void {
    this.parar();
    delete this.el.dataset.activo;
  }
}

// --- La ventana que sale ------------------------------------------------------------------

export interface Ventana {
  el: HTMLElement;
  /** Se despega del hueco: aparecen el marco y la barra a su alrededor y crece un poco. */
  salir(): Promise<void>;
  /** Vuelve a su hueco (en `r`): pierde marco y barra y se funde. */
  entrar(r: Rect): Promise<void>;
  quitar(): void;
}

/** Duraciones (ms): sin prisa, para que todo se vea dulce. */
export const DURACION = { despegue: 700, regreso: 440 };

/**
 * Coloca la ventana de modo que su contenido (la captura o el recorte) cubra exactamente `r`, el
 * hueco en pantalla, con el marco y la barra recortados (clip-path). Al salir, el recorte se abre.
 */
export function crearVentana(plantilla: HTMLElement, r: Rect, rellenar: (cuerpo: HTMLElement) => void): Ventana {
  const el = plantilla.cloneNode(true) as HTMLElement;
  el.hidden = false;
  const cuerpo = el.querySelector<HTMLElement>('[data-cuerpo]')!;
  rellenar(cuerpo);
  Object.assign(el.style, { position: 'fixed', left: '0px', top: '0px', zIndex: '45', visibility: 'hidden', pointerEvents: 'none' });
  document.body.append(el);

  // Medidas del marco: lo que sobresale del contenido por cada lado
  const ancho = r.ancho;
  el.style.width = `${ancho}px`;
  const caja = el.getBoundingClientRect();
  const c = cuerpo.getBoundingClientRect();
  // El ancho del elemento incluye el marco: se ajusta para que el contenido mida `r.ancho`
  const lados = caja.width - c.width;
  el.style.width = `${ancho + lados}px`;
  const final = el.getBoundingClientRect();
  const dentro = cuerpo.getBoundingClientRect();
  const borde = { arriba: dentro.top - final.top, izquierda: dentro.left - final.left, derecha: final.right - dentro.right, abajo: final.bottom - dentro.bottom };
  // El contenido sobre el hueco: el elemento empieza más arriba y a la izquierda
  const x = r.x - borde.izquierda;
  const y = r.y - borde.arriba + (r.alto - dentro.height) / 2;
  el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  const radio = getComputedStyle(el).borderTopLeftRadius || '0px';
  const soloHueco = `inset(${borde.arriba}px ${borde.derecha}px ${borde.abajo}px ${borde.izquierda}px round 2px)`;
  const entera = `inset(0px 0px 0px 0px round ${radio})`;
  el.style.clipPath = soloHueco;
  el.style.visibility = 'visible';
  el.style.transformOrigin = '0 0';
  const quieta = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  // Al despegarse sube un poco y crece desde su centro: se separa de la fachada
  const crece = 1.035;
  const fuera = `translate(${(x - (final.width * (crece - 1)) / 2).toFixed(1)}px, ${(y - 6 - (final.height * (crece - 1)) / 2).toFixed(1)}px) scale(${crece})`;

  return {
    el,
    salir: async () => {
      if (reducido()) {
        el.style.clipPath = entera;
        return;
      }
      // Primero aparece sobre la ventana de la fachada (sin salto de color) y luego se abre el marco
      await el.animate(
        [
          { clipPath: soloHueco, transform: quieta, opacity: 0, easing: 'ease-out' },
          { clipPath: soloHueco, transform: quieta, opacity: 1, offset: 0.3, easing: 'cubic-bezier(0.33, 1, 0.68, 1)' },
          { clipPath: entera, transform: fuera, opacity: 1 },
        ],
        { duration: DURACION.despegue, fill: 'forwards' },
      ).finished;
    },
    entrar: async (destino) => {
      // Mismo cálculo hacia el hueco de ahora (la cámara puede haberse movido)
      const escala = destino.ancho / dentro.width;
      const dx = destino.x - borde.izquierda * escala;
      const dy = destino.y - borde.arriba * escala;
      const enHueco = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${escala.toFixed(4)})`;
      if (reducido()) return;
      el.getAnimations().forEach((a) => a.cancel());
      await el.animate(
        [
          { clipPath: entera, transform: fuera, opacity: 1, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' },
          { clipPath: soloHueco, transform: enHueco, opacity: 1, offset: 0.7, easing: 'ease-in-out' },
          { clipPath: soloHueco, transform: enHueco, opacity: 0 },
        ],
        { duration: DURACION.regreso, fill: 'forwards' },
      ).finished;
    },
    quitar: () => el.remove(),
  };
}
