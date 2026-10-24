// Mapa del cuerpo: elegir una zona resalta su área en la figura, lista las especialidades que la
// tratan y filtra la sección de especialidades. Solo navegación: la zona no se guarda en ningún
// sitio (ni URL, ni almacenamiento, ni formulario).

export function iniciarMapa() {
  const mapa = document.querySelector<HTMLElement>('[data-mapa]');
  if (!mapa) return;

  const botones = [...document.querySelectorAll<HTMLButtonElement>('button[data-zona]')];
  const areas = [...mapa.querySelectorAll<SVGGElement>('[data-area]')];
  const resultados = [...mapa.querySelectorAll<HTMLElement>('[data-resultado]')];
  const estado = mapa.querySelector<HTMLElement>('[data-resultado-estado]')!;
  const textoVacio = estado.textContent ?? '';

  const esps = [...document.querySelectorAll<HTMLElement>('[data-esp]')];
  const grupos = [...document.querySelectorAll<HTMLElement>('[data-grupo]')];
  const filtro = document.querySelector<HTMLElement>('[data-filtro]');
  const filtroZona = filtro?.querySelector<HTMLElement>('[data-filtro-zona]');
  const filtroCuenta = filtro?.querySelector<HTMLElement>('[data-filtro-cuenta]');

  // Nombre visible de cada zona, sacado del propio HTML (la lista de texto).
  const nombres = new Map(
    botones
      .filter((b) => b.classList.contains('zona'))
      .map((b) => [b.dataset.zona!, b.querySelector('span')?.textContent?.trim() ?? b.dataset.zona!]),
  );

  let actual: string | null = null;
  const trata = (el: HTMLElement, zona: string) => (el.dataset.zonas ?? '').split(' ').includes(zona);

  function elegir(zona: string | null) {
    actual = zona;
    for (const b of botones) b.setAttribute('aria-pressed', String(b.dataset.zona === zona));
    for (const a of areas) a.classList.toggle('activa', a.dataset.area === zona);
    mapa!.classList.toggle('con-zona', !!zona);

    let n = 0;
    for (const r of resultados) {
      const si = !!zona && trata(r, zona);
      r.hidden = !si;
      if (si) n++;
    }
    // Filtra la lista de especialidades y oculta los grupos que se queden vacíos.
    for (const e of esps) e.hidden = !!zona && !trata(e, zona);
    for (const g of grupos) g.hidden = !g.querySelector('[data-esp]:not([hidden])');
    document.querySelector('.especialidades__lista')?.classList.toggle('filtrada', !!zona);

    if (zona) {
      const nombre = nombres.get(zona) ?? zona;
      const total = esps.length;
      estado.textContent = n
        ? `${nombre}: ${n} ${n === 1 ? 'especialidad la trata' : 'especialidades la tratan'}.`
        : `${nombre}: pregúntanos y te orientamos.`;
      if (filtro && filtroZona && filtroCuenta) {
        filtro.hidden = false;
        filtroZona.textContent = nombre.toLowerCase();
        filtroCuenta.textContent = `${n} de ${total}.`;
      }
    } else {
      estado.textContent = textoVacio;
      if (filtro) filtro.hidden = true;
    }
  }

  for (const b of botones) {
    b.addEventListener('click', () => elegir(actual === b.dataset.zona ? null : b.dataset.zona!));
  }

  // «Ver todas»: quita el filtro y deja el foco en el título de la sección (el botón desaparece).
  filtro?.querySelector('[data-filtro-quitar]')?.addEventListener('click', () => {
    elegir(null);
    document.querySelector<HTMLElement>('#t-especialidades')?.focus();
  });

  // «Ver especialidad»: baja hasta ella, la marca un momento y lleva el foco a su título.
  mapa.addEventListener('click', (ev) => {
    const a = (ev.target as Element).closest<HTMLAnchorElement>('a[data-ver]');
    if (!a) return;
    const destino = document.getElementById(`esp-${a.dataset.ver}`);
    if (!destino) return;
    ev.preventDefault();
    const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
    destino.scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', block: 'center' });
    destino.querySelector<HTMLElement>('h4')?.focus({ preventScroll: true });
    destino.classList.remove('destello');
    void destino.offsetWidth;
    destino.classList.add('destello');
  });
}
