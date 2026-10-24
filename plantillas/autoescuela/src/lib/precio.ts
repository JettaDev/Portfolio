// Presupuesto del carnet: lo usan la página (estado inicial sin JS) y la calculadora del navegador.

export interface PermisoPrecio {
  id: string;
  codigo: string;
  nombre: string;
  matricula: number;
  teorico: number;
  precioClase: number;
  clasesRecomendadas: number;
  tasaDGT?: number;
}

export interface Pack {
  id: string;
  permiso: string;
  nombre: string;
  clases: number;
  precio: number;
  nota?: string;
}

export interface Linea {
  etiqueta: string;
  importe: number;
  detalle?: string;
}

/** Redondeo a céntimos para no arrastrar decimales de coma flotante. */
const cent = (n: number) => Math.round(n * 100) / 100;

/**
 * Líneas del desglose y total. Con pack: precio del pack + tasa.
 * Sin pack: matrícula + teórico (si lo hay) + clases × precio + tasa.
 */
export function presupuesto(p: PermisoPrecio, tasaGeneral: number, clases: number, pack?: Pack) {
  const tasa = p.tasaDGT ?? tasaGeneral;
  const lineas: Linea[] = pack
    ? [{ etiqueta: pack.nombre, detalle: pack.nota ?? `${pack.clases} clases`, importe: pack.precio }]
    : [
        { etiqueta: 'Matrícula', importe: p.matricula },
        ...(p.teorico > 0 ? [{ etiqueta: 'Curso teórico', importe: p.teorico }] : []),
        { etiqueta: 'Clases prácticas', detalle: `${clases} × ${p.precioClase} €`, importe: cent(clases * p.precioClase) },
      ];
  lineas.push({ etiqueta: 'Tasa de examen DGT', detalle: 'a comprobar', importe: tasa });
  return { lineas, total: cent(lineas.reduce((s, l) => s + l.importe, 0)) };
}
