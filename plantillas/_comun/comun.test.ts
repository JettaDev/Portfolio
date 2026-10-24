import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contraste } from './contraste.ts';
import { construirMensaje, enlaceCorreo, enlaceWhatsApp, formatearDuracion, formatearPrecio } from './enlaces.ts';
import { estadoAhora, horarioAgrupado, textoEstado } from './horario.ts';
import { jsonLd, vcard } from './seo.ts';
import type { ConfigPlantilla, Franja } from './tipos.ts';
import { validar } from './validar.ts';

// Fechas en hora de Madrid (octubre = CEST, UTC+2). 2026-10-21 es miércoles.
const madrid = (iso: string) => new Date(`${iso}+02:00`);

const franjas: Franja[] = [
  { dias: ['ma', 'mi', 'ju', 'vi', 'sa'], abre: '13:00', cierra: '16:00' },
  { dias: ['vi', 'sa'], abre: '20:30', cierra: '01:00' },
];

test('abierto dentro de una franja', () => {
  assert.deepEqual(estadoAhora(franjas, [], madrid('2026-10-21T14:00:00')), { abierto: true, cierra: '16:00' });
});

test('cerrado entre franjas: abre hoy o otro día', () => {
  const e = estadoAhora(franjas, [], madrid('2026-10-21T17:00:00'));
  assert.equal(textoEstado(e), 'Cerrado · abre mañana a las 13:00');
  const lunes = estadoAhora(franjas, [], madrid('2026-10-26T10:00:00'));
  assert.equal(textoEstado(lunes), 'Cerrado · abre mañana a las 13:00');
  const domingo = estadoAhora(franjas, [], madrid('2026-10-25T12:00:00'));
  assert.equal(textoEstado(domingo), 'Cerrado · abre el martes a las 13:00');
});

test('franja que cruza la medianoche', () => {
  // Sábado 00:30 sigue abierto por la franja del viernes.
  assert.deepEqual(estadoAhora(franjas, [], madrid('2026-10-24T00:30:00')), { abierto: true, cierra: '01:00' });
  assert.equal(textoEstado({ abierto: true, cierra: '00:00' }), 'Abierto · cierra a medianoche');
  assert.equal(estadoAhora(franjas, [], madrid('2026-10-24T01:30:00')).abierto, false);
});

test('días de cierre', () => {
  const cierres = [{ desde: '2026-10-21', hasta: '2026-10-22', motivo: 'vacaciones' }];
  const e = estadoAhora(franjas, cierres, madrid('2026-10-21T14:00:00'));
  assert.equal(e.abierto, false);
  assert.equal(textoEstado(e), 'Cerrado (vacaciones) · abre el viernes a las 13:00');
});

test('horario agrupado', () => {
  assert.deepEqual(horarioAgrupado(franjas), [
    { dias: 'Lun', horas: 'Cerrado', desde: 'lu', hasta: 'lu', cerrado: true },
    { dias: 'Mar–Jue', horas: '13:00–16:00', desde: 'ma', hasta: 'ju', cerrado: false },
    { dias: 'Vie–Sáb', horas: '13:00–16:00 · 20:30–01:00', desde: 'vi', hasta: 'sa', cerrado: false },
    { dias: 'Dom', horas: 'Cerrado', desde: 'do', hasta: 'do', cerrado: true },
  ]);
  assert.equal(textoEstado(estadoAhora([{ dias: ['ju'], abre: '09:30', cierra: '14:00' }], [], madrid('2026-10-21T20:00:00'))), 'Cerrado · abre mañana a las 9:30');
});

test('enlaces y formatos', () => {
  assert.equal(enlaceWhatsApp('34 649 000 101', 'Hola & adiós'), 'https://wa.me/34649000101?text=Hola%20%26%20adi%C3%B3s');
  assert.equal(enlaceCorreo('a@b.es', 'Cita', 'Hola mundo'), 'mailto:a@b.es?subject=Cita&body=Hola%20mundo');
  assert.equal(construirMensaje('Hola:', [['Personas', 4], ['Nota', ''], ['Día', 'sábado']]), 'Hola:\n\n• Personas: 4\n• Día: sábado\n\nGracias.');
  assert.equal(formatearPrecio(12.5), '12,50 €');
  assert.equal(formatearPrecio(30, true), 'desde 30 €');
  assert.equal(formatearPrecio(undefined), 'Consultar');
  assert.equal(formatearDuracion(90), '1 h 30 min');
  assert.equal(formatearDuracion(45), '45 min');
});

test('contraste WCAG', () => {
  assert.equal(contraste('#000000', '#ffffff'), 21);
  assert.equal(contraste('#7A1F2B', '#FBF6EC'), 9.47);
});

const config: ConfigPlantilla = {
  demo: true,
  meta: { url: 'https://ejemplo.es/', titulo: 'Negocio de prueba · Guadalajara', descripcion: 'Descripción de prueba con longitud suficiente para no generar avisos en el validador del config de la plantilla.', idioma: 'es', imagenOg: '/og.png' },
  negocio: { nombre: 'Negocio de prueba', nombreCorto: 'Prueba', eslogan: 'x', tipoSchema: 'LocalBusiness', logo: { texto: 'Prueba' } },
  contacto: {
    telefono: '+34949000101', telefonoVisible: '949 000 101', whatsapp: '34649000101', email: 'hola@ejemplo.es',
    direccion: { calle: 'Calle Mayor 1', codigoPostal: '19001', localidad: 'Guadalajara', provincia: 'Guadalajara', pais: 'ES' },
    geo: { lat: 40.63, lng: -3.16 }, mapsUrl: 'https://maps.google.com/?q=40.63,-3.16',
  },
  horario: { franjas },
  accionPrincipal: { tipo: 'whatsapp', texto: 'WhatsApp' },
  formulario: { canal: 'whatsapp', saludo: 'Hola' },
  redes: { instagram: 'https://instagram.com/x' },
  tema: { colores: { fondo: '#FBF6EC', superficie: '#FFFFFF', texto: '#231F1A', textoSuave: '#5A5048', primario: '#7A1F2B', textoSobrePrimario: '#FBF6EC', acento: '#55652A', borde: '#D9CFBF' } },
  textos: {},
  catalogo: { titulo: 'Carta', categorias: [{ id: 'a', nombre: 'A' }], items: [{ id: 'x', categoria: 'a', nombre: 'X', precio: 3 }] },
  equipo: [],
  faq: [],
  legal: { titular: 'Prueba S.L.', nif: 'B00000000', domicilio: 'Calle Mayor 1, Guadalajara', email: 'hola@ejemplo.es' },
  extra: {} as Record<string, never>,
};

test('jsonLd y vcard', () => {
  const j = jsonLd(config);
  assert.equal(j['@type'], 'LocalBusiness');
  assert.equal(j.image, 'https://ejemplo.es/og.png');
  assert.equal(j.openingHoursSpecification[0].dayOfWeek[0], 'Tuesday');
  assert.deepEqual(j.sameAs, ['https://instagram.com/x']);
  assert.match(vcard(config), /^BEGIN:VCARD\r\n[\s\S]*TEL;TYPE=WORK,VOICE:\+34949000101\r\n[\s\S]*END:VCARD\r\n$/);
});

test('validar: config de demo correcto', () => {
  assert.deepEqual(validar(config), { errores: [], avisos: [] });
});

test('validar: detecta errores y restos de la demo', () => {
  const malo = structuredClone(config);
  malo.demo = false;
  malo.contacto.telefono = '949 000 101';
  malo.tema.colores.textoSuave = '#B0A898';
  malo.catalogo.items.push({ id: 'x', categoria: 'zzz', nombre: 'Y' });
  const { errores } = validar(malo);
  assert.ok(errores.some((e) => e.includes('contacto.telefono')));
  assert.ok(errores.some((e) => e.includes('textoSuave sobre fondo')));
  assert.ok(errores.some((e) => e.includes('id repetido')));
  assert.ok(errores.some((e) => e.includes('categoría inexistente')));
  assert.ok(errores.some((e) => e.includes('datos de la demo')));
});
