// Rellena los elementos [data-estado-horario] con «Abierto · cierra a las…» y les pone data-abierto.
// El HTML ya trae un texto neutro («Ver horario») por si el JS no llega.
import { estadoAhora, textoEstado } from '../horario.ts';
import type { Cierre, Franja } from '../tipos.ts';

export function iniciarEstado() {
  const els = document.querySelectorAll<HTMLElement>('[data-estado-horario]');
  if (!els.length) return;
  const pintar = () => {
    for (const el of els) {
      const franjas = JSON.parse(el.dataset.franjas ?? '[]') as Franja[];
      const cierres = JSON.parse(el.dataset.cierres ?? '[]') as Cierre[];
      const e = estadoAhora(franjas, cierres);
      const destino = el.querySelector<HTMLElement>('[data-estado-texto]') ?? el;
      destino.textContent = textoEstado(e);
      el.dataset.abierto = String(e.abierto);
    }
  };
  pintar();
  setInterval(pintar, 60_000);
}
