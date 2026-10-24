// Horario: estado «abierto ahora» y texto agrupado por días. Sin dependencias; vale en build y en el navegador.
import type { Cierre, Dia, Franja } from './tipos.ts';

export const DIAS: Dia[] = ['lu', 'ma', 'mi', 'ju', 'vi', 'sa', 'do'];
export const NOMBRE_DIA: Record<Dia, string> = {
  lu: 'Lunes', ma: 'Martes', mi: 'Miércoles', ju: 'Jueves', vi: 'Viernes', sa: 'Sábado', do: 'Domingo',
};
export const ABREV_DIA: Record<Dia, string> = { lu: 'Lun', ma: 'Mar', mi: 'Mié', ju: 'Jue', vi: 'Vie', sa: 'Sáb', do: 'Dom' };
const SCHEMA_DIA: Record<Dia, string> = {
  lu: 'Monday', ma: 'Tuesday', mi: 'Wednesday', ju: 'Thursday', vi: 'Friday', sa: 'Saturday', do: 'Sunday',
};

const min = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Fecha y hora en Madrid, sea cual sea la zona del navegador. */
// Crear el formateador cuesta CPU: se hace una vez y solo cuando se usa.
let formateador: Intl.DateTimeFormat | undefined;

export function ahoraEnMadrid(fecha: Date = new Date()) {
  formateador ??= new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid', weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  const partes = Object.fromEntries(formateador.formatToParts(fecha).map((p) => [p.type, p.value]));
  const indice = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(partes.weekday);
  return {
    dia: DIAS[indice],
    minutos: Number(partes.hour) * 60 + Number(partes.minute),
    iso: `${partes.year}-${partes.month}-${partes.day}`,
  };
}

const diaAnterior = (d: Dia) => DIAS[(DIAS.indexOf(d) + 6) % 7];
const diaSiguiente = (d: Dia) => DIAS[(DIAS.indexOf(d) + 1) % 7];

/** Suma días a una fecha "AAAA-MM-DD". */
export function sumarDias(iso: string, n: number) {
  const f = new Date(`${iso}T12:00:00Z`);
  f.setUTCDate(f.getUTCDate() + n);
  return f.toISOString().slice(0, 10);
}

const enCierre = (iso: string, cierres: Cierre[] = []) => cierres.find((c) => iso >= c.desde && iso <= c.hasta);

export type Estado =
  | { abierto: true; cierra: string }
  | { abierto: false; abre?: { dia: Dia; hora: string; hoy: boolean; manana: boolean }; motivo?: string };

/** ¿Está abierto ahora? Si no, cuándo abre (busca hasta 7 días). */
export function estadoAhora(franjas: Franja[], cierres: Cierre[] = [], fecha: Date = new Date()): Estado {
  const { dia, minutos, iso } = ahoraEnMadrid(fecha);
  const cierreHoy = enCierre(iso, cierres);

  if (!cierreHoy) {
    for (const f of franjas) {
      const a = min(f.abre), c = min(f.cierra);
      const cruza = c <= a;
      if (f.dias.includes(dia) && minutos >= a && (cruza || minutos < c)) return { abierto: true, cierra: f.cierra };
    }
  }
  // Franja de ayer que cruza la medianoche (y ayer no era día de cierre).
  if (!enCierre(sumarDias(iso, -1), cierres)) {
    for (const f of franjas) {
      const a = min(f.abre), c = min(f.cierra);
      if (c <= a && f.dias.includes(diaAnterior(dia)) && minutos < c) return { abierto: true, cierra: f.cierra };
    }
  }

  for (let n = 0; n < 8; n++) {
    const d = n === 0 ? dia : DIAS[(DIAS.indexOf(dia) + n) % 7];
    if (enCierre(sumarDias(iso, n), cierres)) continue;
    const candidatas = franjas
      .filter((f) => f.dias.includes(d) && (n > 0 || min(f.abre) > minutos))
      .sort((x, y) => min(x.abre) - min(y.abre));
    if (candidatas.length) {
      return {
        abierto: false,
        abre: { dia: d, hora: candidatas[0].abre, hoy: n === 0, manana: n === 1 },
        motivo: cierreHoy?.motivo,
      };
    }
  }
  return { abierto: false, motivo: cierreHoy?.motivo };
}

/** «09:30» → «9:30», como se dice en voz alta. */
export const horaLegible = (hhmm: string) => hhmm.replace(/^0(\d)/, '$1');

/** «Abierto · cierra a las 23:30», «Cerrado · abre mañana a las 9:00». */
export function textoEstado(e: Estado): string {
  if (e.abierto) return e.cierra === '00:00' ? 'Abierto · cierra a medianoche' : `Abierto · cierra a las ${horaLegible(e.cierra)}`;
  if (!e.abre) return e.motivo ? `Cerrado · ${e.motivo}` : 'Cerrado';
  const cuando = e.abre.hoy ? 'hoy' : e.abre.manana ? 'mañana' : `el ${NOMBRE_DIA[e.abre.dia].toLowerCase()}`;
  return `Cerrado${e.motivo ? ` (${e.motivo})` : ''} · abre ${cuando} a las ${horaLegible(e.abre.hora)}`;
}

/**
 * Filas agrupadas para pintar el horario: [{ dias: 'Lun–Vie', horas: '13:00–16:00 · 20:00–23:30', desde: 'lu', hasta: 'vi', cerrado: false }].
 * `desde`/`hasta` sirven para marcar el día de hoy; `cerrado` para poner otro texto en vez de «Cerrado».
 */
export function horarioAgrupado(franjas: Franja[]) {
  const horasDe = (d: Dia) =>
    franjas
      .filter((f) => f.dias.includes(d))
      .sort((a, b) => min(a.abre) - min(b.abre))
      .map((f) => `${f.abre}–${f.cierra}`)
      .join(' · ') || 'Cerrado';

  const filas: { dias: string; horas: string; desde: Dia; hasta: Dia }[] = [];
  for (const d of DIAS) {
    const h = horasDe(d);
    const ultima = filas.at(-1);
    if (ultima && ultima.horas === h && diaSiguiente(ultima.hasta) === d) ultima.hasta = d;
    else filas.push({ dias: '', horas: h, desde: d, hasta: d });
  }
  for (const f of filas) f.dias = f.desde === f.hasta ? ABREV_DIA[f.desde] : `${ABREV_DIA[f.desde]}–${ABREV_DIA[f.hasta]}`;
  return filas.map(({ dias, horas, desde, hasta }) => ({ dias, horas, desde, hasta, cerrado: horas === 'Cerrado' }));
}

/** openingHoursSpecification de schema.org. */
export function horarioSchema(franjas: Franja[]) {
  return franjas.map((f) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: f.dias.map((d) => SCHEMA_DIA[d]),
    opens: f.abre,
    closes: f.cierra,
  }));
}
