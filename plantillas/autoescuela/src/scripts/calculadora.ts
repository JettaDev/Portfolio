// Calculadora del carnet: recalcula el desglose, enlaza las placas de permisos y prepara el mensaje de matrícula.
import { abrir } from '@comun/cliente/demo.ts';
import { construirMensaje, enlaceFormulario, formatearPrecio } from '@comun/enlaces.ts';
import { presupuesto, type Pack, type PermisoPrecio } from '../lib/precio.ts';

interface Datos {
  tasa: number;
  minutos: number;
  permisos: PermisoPrecio[];
  packs: Pack[];
  canal: 'whatsapp' | 'email';
  saludo: string;
  contacto: { whatsapp: string; email: string };
}

const MIN = 1, MAX = 80;

export function iniciarCalculadora() {
  const form = document.getElementById('form-matricula') as HTMLFormElement | null;
  const json = document.getElementById('datos-calc');
  if (!form || !json) return;
  const d = JSON.parse(json.textContent ?? '{}') as Datos;

  const $ = <T extends Element>(sel: string) => form.querySelector<T>(sel)!;
  const clases = $<HTMLInputElement>('#clases');
  const bloqueModo = $<HTMLFieldSetElement>('[data-calc-modo]');
  const bloqueClases = $<HTMLElement>('[data-calc-clases]');
  const lineas = $<HTMLElement>('[data-recibo-lineas]');
  const total = $<HTMLElement>('[data-recibo-total]');

  const radio = (nombre: string) => form.querySelector<HTMLInputElement>(`input[name="${nombre}"]:checked`);
  const permiso = () => d.permisos.find((p) => p.id === radio('permiso')?.value) ?? d.permisos[0];
  const pack = () => d.packs.find((p) => p.id === radio('modo')?.value);
  const numClases = () => Math.min(MAX, Math.max(MIN, Math.round(Number(clases.value)) || MIN));

  function pintar() {
    const p = permiso();
    const pk = pack();
    const r = presupuesto(p, d.tasa, numClases(), pk);

    bloqueClases.hidden = !!pk;
    $('[data-precio-clase]').textContent = `${formatearPrecio(p.precioClase)} cada una`;
    $('[data-ayuda-codigo]').textContent = p.codigo;
    $('[data-ayuda-clases]').textContent = String(p.clasesRecomendadas);
    $('[data-recibo-permiso]').textContent = `${p.codigo} · ${p.nombre}`;

    // Desglose: se reconstruye con nodos (nada de innerHTML).
    lineas.replaceChildren(
      ...r.lineas.map((l) => {
        const fila = document.createElement('div');
        const dt = document.createElement('dt');
        const dd = document.createElement('dd');
        dt.textContent = l.etiqueta;
        if (l.detalle) {
          const s = document.createElement('small');
          s.textContent = l.detalle;
          dt.append(s);
        }
        dd.textContent = formatearPrecio(l.importe);
        fila.append(dt, dd);
        return fila;
      }),
    );
    if (total.textContent !== formatearPrecio(r.total)) {
      total.textContent = formatearPrecio(r.total);
      total.classList.remove('cambia');
      void total.offsetWidth; // reinicia la animación del total
      total.classList.add('cambia');
    }
    return { p, pk, r };
  }

  // Muestra solo los packs del permiso elegido (y vuelve a «sueltas» si el pack marcado no es suyo).
  function packsDelPermiso() {
    const p = permiso();
    let hay = false;
    for (const el of form!.querySelectorAll<HTMLElement>('[data-pack-de]')) {
      const suyo = el.dataset.packDe === p.id;
      el.hidden = !suyo;
      hay ||= suyo;
    }
    bloqueModo.hidden = !hay;
    if (pack() && pack()!.permiso !== p.id) form!.querySelector<HTMLInputElement>('input[name="modo"][value="sueltas"]')!.checked = true;
  }

  // Al cambiar de permiso: sus packs y sus clases recomendadas.
  function alCambiarPermiso() {
    packsDelPermiso();
    clases.value = String(permiso().clasesRecomendadas);
    pintar();
  }

  form.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.name === 'permiso') alCambiarPermiso();
    else if (t.name === 'modo') pintar();
    else if (t === clases) {
      clases.value = String(numClases());
      pintar();
    }
  });
  clases.addEventListener('input', () => clases.value !== '' && pintar());

  for (const b of form.querySelectorAll<HTMLButtonElement>('[data-paso]')) {
    b.addEventListener('click', () => {
      clases.value = String(Math.min(MAX, Math.max(MIN, numClases() + Number(b.dataset.paso))));
      pintar();
    });
  }

  // Placas de «¿Qué carnet quieres?»: eligen el permiso y bajan a la calculadora.
  document.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[data-permiso]');
    if (!a) return;
    const r = form.querySelector<HTMLInputElement>(`input[name="permiso"][value="${a.dataset.permiso}"]`);
    if (!r) return;
    e.preventDefault();
    r.checked = true;
    alCambiarPermiso();
    const suave = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('reserva')?.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'start' });
    r.focus({ preventScroll: true });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const { p, pk, r } = pintar();
    const datos = new FormData(form);
    const texto = construirMensaje(d.saludo, [
      ['Permiso', `${p.codigo} (${p.nombre.toLowerCase()})`],
      ['Prácticas', pk ? `${pk.nombre}, ${pk.clases} clases` : `${numClases()} clases sueltas de ${d.minutos} min`],
      ['Total orientativo', `${formatearPrecio(r.total)} con la tasa de la DGT`],
      ['Turno preferido', String(datos.get('turno') ?? '')],
      ['Nombre', String(datos.get('nombre') ?? '')],
    ]);
    abrir(enlaceFormulario(d.canal, d.contacto, `Matrícula · permiso ${p.codigo}`, texto));
  });
  // El HTML ya llega con el presupuesto inicial. Solo se repinta si el navegador restauró otra elección
  // (recarga o botón atrás).
  const restaurado = () =>
    !form.querySelector<HTMLInputElement>('input[name="permiso"]:checked')?.defaultChecked ||
    !form.querySelector<HTMLInputElement>('input[name="modo"]:checked')?.defaultChecked ||
    clases.value !== clases.defaultValue;
  const sincronizar = () => {
    if (restaurado()) {
      packsDelPermiso();
      pintar();
    }
  };
  sincronizar();
  addEventListener('pageshow', (e) => e.persisted && sincronizar());
}
