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
async function pintar(viewport, consulta) {
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
  await pagina.close();
  return { png, ventanas, slugs };
}

async function guardar(png, archivo, calidad = 88) {
  mkdirSync(dirname(archivo), { recursive: true });
  const info = await sharp(png).webp({ quality: calidad }).toFile(archivo);
  console.log(`${archivo.replace(root + '/', '')}: ${info.width}×${info.height}, ${Math.round(info.size / 1024)} KB`);
  return info;
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
} finally {
  await navegador.close();
  await servidor.stop();
}
