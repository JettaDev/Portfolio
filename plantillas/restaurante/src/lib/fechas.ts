// Utilidades de fechas y horas de la plantilla. Sin dependencias: valen en el build y en el navegador.
import { DIAS, NOMBRE_DIA } from '@comun/horario.ts';
import type { Cierre, Dia, Franja } from '@comun/tipos.ts';

const aMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const aHora = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** Día de la semana de una fecha «AAAA-MM-DD». */
export const diaDeFecha = (iso: string): Dia => DIAS[(new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7];

export function sumarDias(iso: string, n: number) {
  const f = new Date(`${iso}T12:00:00Z`);
  f.setUTCDate(f.getUTCDate() + n);
  return f.toISOString().slice(0, 10);
}

/** «sábado 24 de octubre». */
export const fechaLarga = (iso: string) =>
  new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
    .format(new Date(`${iso}T12:00:00Z`))
    .replace(',', '');

/** «sáb 24 oct», para el ticket. */
export const fechaCorta = (iso: string) =>
  new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(new Date(`${iso}T12:00:00Z`))
    .replace(/[,.]/g, '');

export const cierreDe = (iso: string, cierres: Cierre[] = []) => cierres.find((c) => iso >= c.desde && iso <= c.hasta);

export interface Turno {
  nombre: string;
  horas: string[];
}

/**
 * Horas de reserva de un día: las medias horas de cada franja hasta `ultimaMesa` minutos antes del cierre.
 * Si `desdeMin` llega (hoy), quita las que ya han pasado.
 */
export function turnosDelDia(franjas: Franja[], dia: Dia, ultimaMesa: number, desdeMin = -1): Turno[] {
  return franjas
    .filter((f) => f.dias.includes(dia))
    .sort((a, b) => aMin(a.abre) - aMin(b.abre))
    .map((f) => {
      const abre = aMin(f.abre);
      let cierra = aMin(f.cierra);
      if (cierra <= abre) cierra += 24 * 60;
      const horas: string[] = [];
      for (let m = Math.ceil(abre / 30) * 30; m <= cierra - ultimaMesa; m += 30) if (m > desdeMin) horas.push(aHora(m));
      return { nombre: abre < 18 * 60 ? 'Mediodía' : 'Noche', horas };
    })
    .filter((t) => t.horas.length);
}

/** «de martes a viernes», «martes y jueves», «el sábado». */
export function rangoDias(dias: Dia[]) {
  const orden = [...dias].sort((a, b) => DIAS.indexOf(a) - DIAS.indexOf(b));
  const n = orden.map((d) => NOMBRE_DIA[d].toLowerCase());
  if (n.length === 1) return `el ${n[0]}`;
  const seguidos = orden.every((d, i) => i === 0 || DIAS.indexOf(d) === DIAS.indexOf(orden[i - 1]) + 1);
  if (seguidos && n.length > 2) return `de ${n[0]} a ${n.at(-1)}`;
  return `${n.slice(0, -1).join(', ')} y ${n.at(-1)}`;
}
