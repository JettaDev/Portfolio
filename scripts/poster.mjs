// Genera los pósters de la ciudad: la misma escena que pinta el canvas (misma semilla, sin
// parallax ni parpadeo), para que la portada la enseñe al instante y el canvas se funda encima
// sin salto.
//
//   npm run poster
//
// Deja en src/assets/ciudad/:
//   poster-ancho.webp   3000×1250 (2,4:1), encuadre «ancho», nivel alto
//   poster-alto.webp    1680×1400 (1,2:1), encuadre «alto», nivel medio (el de los móviles)
//   poster-apagon-*.webp  los mismos encuadres con todas las luces apagadas (la 404)
//   poster.json         posición relativa (0–1) de cada ventanal, del estudio y del cartel en
//                       cada póster, para los enlaces que sustituyen al canvas sin WebGL
//   og/sitio.webp       fondos de las imágenes Open Graph (1600×630; npm run og les pone el
//   og/<slug>.webp      texto encima): la ciudad entera, y la ciudad apagada con solo el
//                       ventanal de esa app encendido y la cámara a medio camino de él
//   sitios/<id>.webp    el estudio y el solar vistos de cerca (1600×1000), para las páginas de
//                       Sobre mí y Contacto; sitios.json guarda dónde cae el cartel del solar
//   fachadas/<slug>.webp  el edificio de cada app a medio vuelo, recortado con su ventanal en el
//                       centro: el fondo de la portada de su ficha, donde la ventana del
//                       navegador tapa el ventanal (npm run poster -- --fachadas: solo estas)
//
// Arranca su propio servidor de desarrollo (la página /pruebas/ciudad/ solo existe en desarrollo) y usa
// Chrome con GPU (CHROME_PATH, por defecto /usr/bin/google-chrome). Hay que regenerarlo al
// añadir, quitar o reordenar apps, o al cambiar la escena.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dev } from 'astro';
import { chromium } from 'playwright-core';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const salida = join(root, 'src/assets/ciudad');
const PUERTO = 4398;
const URL_PRUEBAS = `http://localhost:${PUERTO}/pruebas/ciudad/`;

const POSTERS = [
  // A densidad 1: las estrellas miden píxeles fijos y deben salir como en una pantalla real.
  // El nivel decide filas, bloom y estrellas.
  { nombre: 'ancho', viewport: { width: 3000, height: 1250 }, nivel: 'alto' },
  { nombre: 'alto', viewport: { width: 1680, height: 1400 }, nivel: 'medio' },
  // La 404: la misma ciudad con todo apagado (la ventana que parpadea es HTML)
  { nombre: 'apagon-ancho', encuadre: 'ancho', viewport: { width: 3000, height: 1250 }, nivel: 'alto', apagon: true },
  { nombre: 'apagon-alto', encuadre: 'alto', viewport: { width: 1680, height: 1400 }, nivel: 'medio', apagon: true },
];

const servidor = await dev({ root, logLevel: 'warn', server: { port: PUERTO }, devToolbar: { enabled: false } });
const navegador = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome',
  args: ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--use-angle=default'],
});

/** Pinta la escena con esos parámetros y devuelve la captura del canvas y las posiciones. */
async function pintar(viewport, consulta, medir) {
  const pagina = await navegador.newPage({ viewport });
  const errores = [];
  pagina.on('pageerror', (e) => errores.push(e.message));
  await pagina.goto(`${URL_PRUEBAS}?poster&dpr=1&${consulta}`);
  await pagina.waitForFunction(() => window.poster, null, { timeout: 30_000 });
  // Unos fotogramas más para que el bloom y las texturas estén asentados
  await pagina.waitForTimeout(500);
  if (errores.length) throw new Error(errores.join('\n'));
  const png = await pagina.locator('#ciudad').screenshot({ animations: 'disabled' });
  const { ventanas } = await pagina.evaluate(() => window.poster);
  const slugs = await pagina.evaluate(() => JSON.parse(document.getElementById('datos-ciudad').textContent).map((d) => d.slug));
  // Posición relativa de un objetivo con la cámara como esté ahora (no en reposo)
  const medida = medir
    ? await pagina.evaluate((id) => {
        const c = document.getElementById('ciudad');
        const p = window.ciudad.enPantalla(id);
        return { x: p.x / c.clientWidth, y: p.y / c.clientHeight };
      }, medir)
    : null;
  await pagina.close();
  return { png, ventanas, slugs, medida };
}

async function guardar(png, archivo, calidad = 88) {
  mkdirSync(dirname(archivo), { recursive: true });
  const info = await sharp(png).webp({ quality: calidad }).toFile(archivo);
  console.log(`${archivo.replace(root + '/', '')}: ${info.width}×${info.height}, ${Math.round(info.size / 1024)} KB`);
  return info;
}

/** El edificio de cada app con su ventanal en el centro exacto de la imagen. */
async function fachadas(slugs) {
  const VISTA = { width: 2400, height: 1500 };
  for (const slug of slugs) {
    const r = await pintar(VISTA, `nivel=alto&encuadre=ancho&encendida=${slug}&acercar=${process.env.ACERCAR ?? 0.4}`, slug);
    const cx = r.medida.x * VISTA.width;
    const cy = r.medida.y * VISTA.height;
    const mitadAncho = Math.floor(Math.min(cx, VISTA.width - cx));
    const mitadAlto = Math.floor(Math.min(cy, VISTA.height - cy));
    const recorte = await sharp(r.png)
      .extract({ left: Math.round(cx - mitadAncho), top: Math.round(cy - mitadAlto), width: mitadAncho * 2, height: mitadAlto * 2 })
      .resize({ width: Math.min(1920, mitadAncho * 2) })
      .toBuffer();
    await guardar(recorte, join(salida, `fachadas/${slug}.webp`), 82);
  }
}

if (process.argv.includes('--fachadas')) {
  try {
    const r = await pintar({ width: 800, height: 500 }, 'nivel=bajo');
    await fachadas(r.slugs);
  } finally {
    await navegador.close();
    await servidor.stop();
  }
  process.exit(0);
}

try {
  const posiciones = {};
  let slugs = [];
  for (const p of POSTERS) {
    const r = await pintar(p.viewport, `nivel=${p.nivel}&encuadre=${p.encuadre ?? p.nombre}${p.apagon ? '&apagon' : ''}`);
    const info = await guardar(r.png, join(salida, `poster-${p.nombre}.webp`));
    posiciones[p.nombre] = { ancho: info.width, alto: info.height, ventanas: r.ventanas };
    slugs = r.slugs;
  }

  // Fondos de las imágenes Open Graph
  const OG = { width: 1600, height: 630 };
  await guardar((await pintar(OG, 'nivel=alto&encuadre=ancho')).png, join(salida, 'og/sitio.webp'), 90);
  for (const slug of slugs) {
    const r = await pintar(OG, `nivel=alto&encuadre=ancho&apagon&encendida=${slug}&acercar=0.45`);
    await guardar(r.png, join(salida, `og/${slug}.webp`), 90);
  }

  writeFileSync(join(salida, 'poster.json'), JSON.stringify(posiciones, null, 2) + '\n');
  console.log('src/assets/ciudad/poster.json');

  // El estudio y el solar de cerca, a medio vuelo: la imagen de Sobre mí y de Contacto
  const SITIO = { width: 1600, height: 1000 };
  const sitios = {};
  for (const [nombre, id, acercar] of [['sobre-mi', '#sobre-mi', 0.6], ['contacto', '#contacto', 0.5]]) {
    const r = await pintar(SITIO, `nivel=alto&encuadre=ancho&encendida=${encodeURIComponent(id)}&acercar=${acercar}`, id);
    await guardar(r.png, join(salida, `sitios/${nombre}.webp`), 90);
    sitios[nombre] = r.medida;
  }
  writeFileSync(join(salida, 'sitios/sitios.json'), JSON.stringify(sitios, null, 2) + '\n');
  console.log('src/assets/ciudad/sitios/sitios.json');

  await fachadas(slugs);
} finally {
  await navegador.close();
  await servidor.stop();
}
