// Formulario «Pide tu cita»: anillo de tiempo, días abiertos, franjas, validación y mensaje final.
import { abrir } from '@comun/cliente/demo.ts';
import { construirMensaje, enlaceFormulario, formatearDuracion } from '@comun/enlaces.ts';
import { ahoraEnMadrid, DIAS, NOMBRE_DIA } from '@comun/horario.ts';
import type { Cierre, Dia, Franja } from '@comun/tipos.ts';
import { deMinutos, minutos, precioTexto } from '../lib/formato.ts';
import type { ExtraPeluqueria, Servicio } from '../../config.ts';

interface Datos {
  servicios: Pick<Servicio, 'id' | 'nombre' | 'precio' | 'desde' | 'duracionMin'>[];
  franjas: Franja[];
  cierres: Cierre[];
  extra: ExtraPeluqueria;
  canal: 'whatsapp' | 'email';
  saludo: string;
  contacto: { whatsapp: string; email: string };
  textos: Record<string, string>;
}

type Tramo = { id: 'manana' | 'tarde'; desde: number; hasta: number };
type DiaLibre = { iso: string; dia: Dia; n: number; tramos: Tramo[] };

/** Tiempo mínimo que debe quedar en una franja para ofrecerla. */
const MIN_FRANJA = 60;
/** Hueco entre segmentos del anillo (en centésimas de vuelta). */
const HUECO = 0.9;

const mes = new Intl.DateTimeFormat('es-ES', { month: 'long', timeZone: 'UTC' });

function sumarDias(iso: string, n: number) {
  const f = new Date(`${iso}T12:00:00Z`);
  f.setUTCDate(f.getUTCDate() + n);
  return f;
}

/** Tramos de mañana y tarde que abre un día de la semana. */
function tramosDe(dia: Dia, franjas: Franja[], corte: number): Tramo[] {
  const manana: number[] = [], tarde: number[] = [];
  for (const f of franjas.filter((x) => x.dias.includes(dia))) {
    const a = minutos(f.abre);
    let c = minutos(f.cierra);
    if (c <= a) c = 24 * 60;
    if (Math.min(c, corte) - a >= MIN_FRANJA) manana.push(a, Math.min(c, corte));
    if (c - Math.max(a, corte) >= MIN_FRANJA) tarde.push(Math.max(a, corte), c);
  }
  const tramos: Tramo[] = [];
  if (manana.length) tramos.push({ id: 'manana', desde: Math.min(...manana), hasta: Math.max(...manana) });
  if (tarde.length) tramos.push({ id: 'tarde', desde: Math.min(...tarde), hasta: Math.max(...tarde) });
  return tramos;
}

/** Los próximos `cuantos` días con alguna franja libre, empezando por hoy (hora de Madrid). */
export function diasLibres(d: Pick<Datos, 'franjas' | 'cierres' | 'extra'>, ahora = new Date()): DiaLibre[] {
  const hoy = ahoraEnMadrid(ahora);
  const corte = minutos(d.extra.corteMananaTarde);
  const lista: DiaLibre[] = [];
  for (let n = 0; lista.length < d.extra.diasAntelacion && n < 120; n++) {
    const fecha = sumarDias(hoy.iso, n);
    const iso = fecha.toISOString().slice(0, 10);
    if (d.cierres.some((c) => iso >= c.desde && iso <= c.hasta)) continue;
    const dia = DIAS[(fecha.getUTCDay() + 6) % 7]!;
    let tramos = tramosDe(dia, d.franjas, corte);
    // Hoy solo cuenta lo que aún queda por delante.
    if (n === 0) tramos = tramos.filter((t) => t.hasta - Math.max(t.desde, hoy.minutos) >= MIN_FRANJA);
    if (tramos.length) lista.push({ iso, dia, n, tramos });
  }
  return lista;
}

const fechaLarga = (d: DiaLibre) => {
  const f = new Date(`${d.iso}T12:00:00Z`);
  return `${NOMBRE_DIA[d.dia].toLowerCase()} ${f.getUTCDate()} de ${mes.format(f)}`;
};

export function iniciarCita() {
  const form = document.querySelector<HTMLFormElement>('[data-cita]');
  if (!form) return;
  const d = JSON.parse(form.dataset.datos ?? '{}') as Datos;
  const t = d.textos;
  const $ = <T extends Element = HTMLElement>(sel: string) => form.querySelector<T>(sel)!;
  const casillas = [...form.querySelectorAll<HTMLInputElement>('input[name="servicio"]')];
  const porId = new Map(d.servicios.map((s) => [s.id, s]));

  // ── Pestañas de familia: con JS se ve una familia cada vez ────────────────────
  const pestanas = form.querySelector<HTMLFieldSetElement>('[data-pestanas]');
  const grupos = [...form.querySelectorAll<HTMLFieldSetElement>('[data-familia]')];
  const mostrarFamilia = () => {
    const activa = form.querySelector<HTMLInputElement>('input[name="familia"]:checked')?.value;
    for (const g of grupos) g.hidden = g.dataset.familia !== activa;
  };
  if (pestanas && grupos.length > 1) {
    pestanas.hidden = false;
    form.classList.add('con-pestanas');
    pestanas.addEventListener('change', mostrarFamilia);
    mostrarFamilia();
  }

  // ── Anillo y resumen ─────────────────────────────────────────────────────────
  const segmentos = new Map(
    [...form.querySelectorAll<SVGCircleElement>('[data-segmento]')].map((c) => [c.dataset.segmento!, c]),
  );
  const anillo = $('[data-anillo]');
  const lista = $('[data-lista]');

  const elegidos = () => casillas.filter((c) => c.checked).map((c) => porId.get(c.value)!).filter(Boolean);

  const pintar = () => {
    const sel = elegidos();
    const total = sel.reduce((s, x) => s + x.duracionMin, 0);
    const precio = sel.reduce((s, x) => s + (x.precio ?? 0), 0);
    const desde = sel.some((x) => x.desde || x.precio === undefined);

    // Cada servicio es un tramo del anillo, en el orden de la carta.
    let inicio = 0;
    for (const s of d.servicios) {
      const c = segmentos.get(s.id);
      if (!c) continue;
      const activo = sel.includes(s);
      const largo = activo ? Math.max(0, Math.min((s.duracionMin / d.extra.anilloMaxMin) * 100, 100 - inicio) - HUECO) : 0;
      c.style.strokeDasharray = `${largo} ${100 - largo}`;
      c.style.strokeDashoffset = String(-inicio);
      c.classList.toggle('activo', largo > 0);
      if (activo) inicio = Math.min(100, inicio + (s.duracionMin / d.extra.anilloMaxMin) * 100);
    }
    anillo.classList.toggle('anillo--lleno', total >= d.extra.anilloMaxMin);
    anillo.classList.toggle('anillo--vacio', !sel.length);

    $('[data-precio]').textContent = sel.length ? precioTexto(precio, desde, t.gratis) : '';
    $('[data-dur]').textContent = sel.length ? formatearDuracion(total) : d.extra.textoAnillo;
    $('[data-cuenta-total]').textContent = sel.length
      ? `${sel.length} ${sel.length === 1 ? t.servicioSingular : t.servicioPlural}`
      : '';

    $('[data-vacio]').hidden = sel.length > 0;
    lista.replaceChildren(
      ...sel.map((s) => {
        const li = document.createElement('li');
        const n = document.createElement('span');
        n.textContent = s.nombre;
        const p = document.createElement('span');
        p.textContent = `${formatearDuracion(s.duracionMin)} · ${precioTexto(s.precio, s.desde, t.gratis)}`;
        li.append(n, p);
        return li;
      }),
    );

    // Cuántos hay marcados en cada familia (en la pestaña).
    for (const g of grupos) {
      const n = g.querySelectorAll('input:checked').length;
      const marca = form.querySelector<HTMLElement>(`[data-cuenta="${g.dataset.familia}"]`);
      if (marca) marca.textContent = n ? String(n) : '';
    }
    if (sel.length) ocultarError('servicios');
  };
  form.addEventListener('change', (ev) => {
    if ((ev.target as HTMLInputElement).name === 'servicio') pintar();
  });

  // ── Días y franjas ───────────────────────────────────────────────────────────
  const cajaDias = $('[data-dias]');
  const cajaFranjas = $('[data-franjas]');
  const dias = diasLibres(d);

  const opcion = (name: string, value: string, clase: string, partes: [string, string][], sr?: string) => {
    const label = document.createElement('label');
    label.className = clase;
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = value;
    // El aspecto va en una caja hermana del input (ver global.css).
    const caja = document.createElement('span');
    caja.className = `${clase}__caja`;
    label.append(input, caja);
    for (const [cls, txt] of partes) {
      const s = document.createElement('span');
      s.className = cls;
      s.textContent = txt;
      if (sr) s.setAttribute('aria-hidden', 'true');
      caja.append(s);
    }
    if (sr) {
      const s = document.createElement('span');
      s.className = 'sr';
      s.textContent = sr;
      caja.append(s);
    }
    return label;
  };

  const nombreTramo = (tr: Tramo) => (tr.id === 'manana' ? t.franjaManana : t.franjaTarde);
  const horasTramo = (tr: Tramo) => `${deMinutos(tr.desde)}–${deMinutos(tr.hasta)}`;

  if (!dias.length) {
    cajaDias.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'pista';
    p.textContent = t.sinDias;
    cajaDias.append(p);
  } else {
    cajaDias.replaceChildren(
      ...dias.map((x) => {
        const f = new Date(`${x.iso}T12:00:00Z`);
        const etiqueta = x.n === 0 ? t.hoy : x.n === 1 ? t.manana : NOMBRE_DIA[x.dia].slice(0, 3);
        const relativo = x.n === 0 ? `${t.hoy}, ` : x.n === 1 ? `${t.manana}, ` : '';
        return opcion('dia', x.iso, 'dia', [['dia__sem', etiqueta!], ['dia__num', String(f.getUTCDate())]], `${relativo}${fechaLarga(x)}`);
      }),
    );
  }

  const pintarFranjas = () => {
    const iso = form.querySelector<HTMLInputElement>('input[name="dia"]:checked')?.value;
    const dia = dias.find((x) => x.iso === iso);
    const previa = form.querySelector<HTMLInputElement>('input[name="franja"]:checked')?.value;
    if (!dia) return;
    cajaFranjas.replaceChildren(
      ...dia.tramos.map((tr) => opcion('franja', tr.id, 'franja', [['franja__nombre', nombreTramo(tr)!], ['franja__horas', horasTramo(tr)]])),
    );
    const radios = [...cajaFranjas.querySelectorAll<HTMLInputElement>('input')];
    const misma = radios.find((r) => r.value === previa);
    if (misma) misma.checked = true;
    else if (radios.length === 1) radios[0]!.checked = true;
  };
  form.addEventListener('change', (ev) => {
    const el = ev.target as HTMLInputElement;
    if (el.name === 'dia') {
      pintarFranjas();
      ocultarError('dia');
    }
    if (el.name === 'franja' || el.name === 'dia') {
      if (form.querySelector('input[name="franja"]:checked')) ocultarError('franja');
    }
  });

  // ── Validación y envío ───────────────────────────────────────────────────────
  const nombre = $<HTMLInputElement>('#cita-nombre');
  function ocultarError(campo: string) {
    const e = form.querySelector<HTMLElement>(`[data-error="${campo}"]`);
    if (e) e.hidden = true;
    if (campo === 'nombre') nombre.removeAttribute('aria-invalid');
  }
  nombre.addEventListener('input', () => nombre.value.trim() && ocultarError('nombre'));

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const sel = elegidos();
    const iso = form.querySelector<HTMLInputElement>('input[name="dia"]:checked')?.value;
    const dia = dias.find((x) => x.iso === iso);
    const franjaId = form.querySelector<HTMLInputElement>('input[name="franja"]:checked')?.value;
    const tramo = dia?.tramos.find((tr) => tr.id === franjaId);
    const quien = form.querySelector<HTMLInputElement>('input[name="profesional"]:checked')?.value;

    // Errores en el orden del formulario; el foco va al primero.
    const fallos: [string, HTMLElement | null][] = [];
    if (!sel.length) {
      const g = grupos.find((x) => !x.hidden) ?? grupos[0];
      fallos.push(['servicios', g?.querySelector('input') ?? null]);
    }
    if (!dia) fallos.push(['dia', cajaDias.querySelector('input')]);
    else if (!tramo) fallos.push(['franja', cajaFranjas.querySelector('input')]);
    if (!nombre.value.trim()) {
      fallos.push(['nombre', nombre]);
      nombre.setAttribute('aria-invalid', 'true');
    }
    for (const [campo] of fallos) {
      const e = form.querySelector<HTMLElement>(`[data-error="${campo}"]`);
      if (e) e.hidden = false;
    }
    if (fallos.length) {
      fallos[0]![1]?.focus();
      return;
    }

    const total = sel.reduce((s, x) => s + x.duracionMin, 0);
    const precio = sel.reduce((s, x) => s + (x.precio ?? 0), 0);
    const desde = sel.some((x) => x.desde || x.precio === undefined);
    const texto = construirMensaje(d.saludo, [
      [t.msgServicios!, sel.map((s) => s.nombre).join(', ')],
      [t.msgDuracion!, formatearDuracion(total)],
      [t.msgPrecio!, precioTexto(precio, desde, t.gratis)],
      [t.msgDia!, fechaLarga(dia!)],
      [t.msgFranja!, `${nombreTramo(tramo!)!.toLowerCase()} (${horasTramo(tramo!)})`],
      [t.msgProfesional!, quien || t.profesionalIndiferente],
      [t.msgNombre!, nombre.value],
    ]);
    abrir(enlaceFormulario(d.canal, d.contacto, t.asuntoCorreo ?? '', texto));
  });

  pintar();
}
