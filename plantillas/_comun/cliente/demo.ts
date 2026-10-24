// Modo demo: los enlaces de llamar, WhatsApp y correo no se abren; se muestra qué pasaría.
// En una web real (config.demo = false) `abrir()` navega al enlace sin más.

const PATRON = /^(tel:|mailto:|https:\/\/wa\.me\/)/;

const enDemo = () => document.documentElement.dataset.demo === 'true';

function describir(url: string) {
  if (url.startsWith('tel:')) return { tipo: 'Llamada', destino: url.slice(4), mensaje: '' };
  if (url.startsWith('mailto:')) {
    const [dir, qs = ''] = url.slice(7).split('?');
    const p = new URLSearchParams(qs);
    const asunto = p.get('subject');
    return { tipo: 'Correo', destino: dir, mensaje: [asunto && `Asunto: ${asunto}`, p.get('body')].filter(Boolean).join('\n\n') };
  }
  const u = new URL(url);
  return { tipo: 'WhatsApp', destino: `+${u.pathname.slice(1)}`, mensaje: u.searchParams.get('text') ?? '' };
}

function mostrar(url: string, origen?: HTMLElement | null) {
  const dlg = document.getElementById('demo-dialogo') as HTMLDialogElement | null;
  if (!dlg) return;
  const { tipo, destino, mensaje } = describir(url);
  const poner = (sel: string, txt: string) => {
    const el = dlg.querySelector<HTMLElement>(sel);
    if (el) el.textContent = txt;
  };
  poner('[data-demo-tipo]', tipo === 'Llamada' ? 'Aquí se haría una llamada' : `Aquí se abriría ${tipo === 'Correo' ? 'el correo' : 'WhatsApp'}`);
  poner('[data-demo-destino]', destino);
  const caja = dlg.querySelector<HTMLElement>('[data-demo-mensaje]');
  if (caja) {
    caja.textContent = mensaje;
    caja.hidden = !mensaje;
  }
  dlg.showModal();
  dlg.addEventListener('close', () => origen?.focus(), { once: true });
}

/** Abre un enlace de contacto respetando el modo demo. Úsalo en los formularios. */
export function abrir(url: string) {
  if (enDemo() && PATRON.test(url)) mostrar(url, document.activeElement as HTMLElement);
  else location.href = url;
}

/** Intercepta los clics en enlaces de contacto mientras la web esté en modo demo. */
export function iniciarDemo() {
  if (!enDemo()) return;
  document.addEventListener('click', (ev) => {
    const a = (ev.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    const href = a?.getAttribute('href');
    if (!a || !href || !PATRON.test(href)) return;
    ev.preventDefault();
    mostrar(href, a);
  });
}
