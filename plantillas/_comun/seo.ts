// JSON-LD LocalBusiness y tarjeta de contacto (.vcf) a partir del config.
import { horarioSchema } from './horario.ts';
import type { ConfigPlantilla, ItemBase } from './tipos.ts';

type Config = ConfigPlantilla<ItemBase, unknown>;

export function jsonLd(c: Config) {
  const d = c.contacto.direccion;
  const sameAs = [c.redes.instagram, c.redes.facebook, c.redes.tiktok].filter(Boolean);
  return {
    '@context': 'https://schema.org',
    '@type': c.negocio.tipoSchema,
    '@id': `${c.meta.url}#negocio`,
    name: c.negocio.nombre,
    description: c.meta.descripcion,
    url: c.meta.url,
    image: new URL(c.meta.imagenOg.replace(/^\//, ''), c.meta.url).href,
    telephone: c.contacto.telefono,
    email: c.contacto.email,
    ...(c.negocio.rangoPrecios ? { priceRange: c.negocio.rangoPrecios } : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: d.calle,
      postalCode: d.codigoPostal,
      addressLocality: d.localidad,
      addressRegion: d.provincia,
      addressCountry: d.pais,
    },
    geo: { '@type': 'GeoCoordinates', latitude: c.contacto.geo.lat, longitude: c.contacto.geo.lng },
    hasMap: c.contacto.mapsUrl,
    openingHoursSpecification: horarioSchema(c.horario.franjas),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');

/** vCard 3.0 para «Añadir a contactos». */
export function vcard(c: Config) {
  const d = c.contacto.direccion;
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${esc(c.negocio.nombre)}`,
    `ORG:${esc(c.negocio.nombre)}`,
    `TEL;TYPE=WORK,VOICE:${c.contacto.telefono}`,
    ...(c.contacto.whatsapp ? [`TEL;TYPE=CELL:+${c.contacto.whatsapp}`] : []),
    `EMAIL;TYPE=WORK:${c.contacto.email}`,
    `ADR;TYPE=WORK:;;${esc(d.calle)};${esc(d.localidad)};${esc(d.provincia)};${d.codigoPostal};${d.pais}`,
    `URL:${c.meta.url}`,
    'END:VCARD',
    '',
  ].join('\r\n');
}
