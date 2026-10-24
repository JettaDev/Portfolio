// Comprueba un config antes de publicar: campos obligatorios, formatos, contraste y restos de la demo.
// Uso desde una plantilla:  node ../_comun/validar.ts ./config.ts   (o `npm run comprobar`)
import { PAREJAS_OBLIGATORIAS, contraste } from './contraste.ts';
import { DIAS } from './horario.ts';
import type { ConfigPlantilla, ItemBase } from './tipos.ts';

type Config = ConfigPlantilla<ItemBase, unknown>;

export interface Resultado {
  errores: string[];
  avisos: string[];
}

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export function validar(c: Config): Resultado {
  const errores: string[] = [];
  const avisos: string[] = [];
  const e = (m: string) => errores.push(m);
  const a = (m: string) => avisos.push(m);

  if (!/^https?:\/\/.+\/$/.test(c.meta.url)) e('meta.url debe ser una URL absoluta terminada en «/».');
  if (c.meta.titulo.length > 65) a(`meta.titulo tiene ${c.meta.titulo.length} caracteres (mejor ≤ 60).`);
  if (c.meta.descripcion.length < 70 || c.meta.descripcion.length > 160)
    a(`meta.descripcion tiene ${c.meta.descripcion.length} caracteres (mejor 120-155).`);

  if (!/^\+\d{9,15}$/.test(c.contacto.telefono)) e('contacto.telefono debe ir en formato +34XXXXXXXXX, sin espacios.');
  if (c.contacto.whatsapp && !/^\d{10,15}$/.test(c.contacto.whatsapp))
    e('contacto.whatsapp: solo dígitos con prefijo de país (p. ej. 34612345678).');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.contacto.email)) e('contacto.email no parece un correo.');
  if (!/^https:\/\//.test(c.contacto.mapsUrl)) e('contacto.mapsUrl debe ser un enlace https.');
  if (!c.contacto.whatsapp && (c.accionPrincipal.tipo === 'whatsapp' || c.formulario.canal === 'whatsapp'))
    e('La acción principal o el formulario usan WhatsApp, pero contacto.whatsapp está vacío.');

  if (!c.horario.franjas.length) e('horario.franjas está vacío.');
  for (const f of c.horario.franjas) {
    if (!HORA.test(f.abre) || !HORA.test(f.cierra)) e(`Franja con hora mal escrita: ${f.abre}–${f.cierra} (usa HH:MM).`);
    for (const d of f.dias) if (!DIAS.includes(d)) e(`Día desconocido en el horario: «${d}».`);
  }
  for (const ci of c.horario.cierres ?? [])
    if (!FECHA.test(ci.desde) || !FECHA.test(ci.hasta) || ci.desde > ci.hasta) e(`Cierre con fechas mal escritas: ${ci.desde} → ${ci.hasta}.`);

  for (const [t, f, minimo] of PAREJAS_OBLIGATORIAS) {
    const ct = c.tema.colores[t], cf = c.tema.colores[f];
    if (!ct || !cf) { e(`Falta el color tema.colores.${!ct ? t : f}.`); continue; }
    const r = contraste(ct, cf);
    if (r < minimo) e(`Contraste ${t} sobre ${f}: ${r}:1 (mínimo ${minimo}:1).`);
  }

  const cats = new Set(c.catalogo.categorias.map((x) => x.id));
  const ids = new Set<string>();
  for (const it of c.catalogo.items) {
    if (!cats.has(it.categoria)) e(`El elemento «${it.nombre}» usa la categoría inexistente «${it.categoria}».`);
    if (ids.has(it.id)) e(`id repetido en el catálogo: «${it.id}».`);
    ids.add(it.id);
    if (it.precio !== undefined && (!Number.isFinite(it.precio) || it.precio < 0)) e(`Precio raro en «${it.nombre}».`);
  }

  for (const campo of ['titular', 'nif', 'domicilio', 'email'] as const)
    if (!c.legal[campo]) e(`legal.${campo} está vacío (lo exige el aviso legal).`);

  // Restos de la demo que no deben llegar a una web real.
  if (!c.demo) {
    const texto = JSON.stringify(c);
    if (/949 ?000|\+34949000|34649000|ejemplo\.(es|com)|B00000000|ficticio/i.test(texto))
      e('demo es false pero quedan datos de la demo (teléfonos 949 000…, ejemplo.es, NIF B00000000 o «ficticio»).');
    if (/TODO|PENDIENTE|lorem ipsum/i.test(texto)) e('Quedan textos «TODO», «PENDIENTE» o «lorem ipsum».');
  }

  return { errores, avisos };
}

// Ejecución directa: node validar.ts ruta/al/config.ts
if (import.meta.url === `file://${process.argv[1]}` && process.argv[2]) {
  const { pathToFileURL } = await import('node:url');
  const { resolve } = await import('node:path');
  const mod = await import(pathToFileURL(resolve(process.argv[2])).href);
  const { errores, avisos } = validar(mod.default);
  for (const m of avisos) console.log(`aviso  ${m}`);
  for (const m of errores) console.log(`ERROR  ${m}`);
  console.log(errores.length ? `\n${errores.length} error(es).` : '\nConfig correcto.');
  process.exit(errores.length ? 1 : 0);
}
