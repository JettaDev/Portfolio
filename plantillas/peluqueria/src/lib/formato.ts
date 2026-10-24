// Pequeñas utilidades de formato propias de la plantilla (valen en build y en el navegador).
import { formatearPrecio } from '@comun/enlaces.ts';

/** «28 €», «desde 85 €» o el texto de «gratis» si el precio es 0. */
export const precioTexto = (precio: number | undefined, desde = false, gratis = 'Gratis') =>
  precio === 0 ? gratis : formatearPrecio(precio, desde);

/** "09:30" → "9:30". */
export const horaCorta = (hhmm: string) => hhmm.replace(/^0(\d)/, '$1');

/** «Marta Ruiz» → «MR». */
export const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');

/** "09:30" → 570. */
export const minutos = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h! * 60 + m!;
};

/** 570 → "9:30". */
export const deMinutos = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
