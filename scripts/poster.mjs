// Genera los pósters de la ciudad: la misma escena que pinta el canvas (misma semilla, sin
// parallax ni parpadeo), para que la portada la enseñe al instante y el canvas se funda encima
// sin salto.
//
//   npm run poster
//
// Deja en src/assets/ciudad/:
//   poster-ancho.webp   3000×1250 (2,4:1), encuadre «ancho», nivel alto
//   poster-alto.webp    1680×1400 (1,2:1), encuadre «alto», nivel medio (el de los móviles)
//   poster.json         posición relativa (0–1) de cada ventanal en cada póster, para los
//                       enlaces que sustituyen al canvas sin WebGL
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
];

const servidor = await dev({ root, logLevel: 'warn', server: { port: PUERTO }, devToolbar: { enabled: false } });
const navegador = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome',
  args: ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--use-angle=default'],
});

try {
  mkdirSync(salida, { recursive: true });
  const posiciones = {};

  for (const p of POSTERS) {
    const pagina = await navegador.newPage({ viewport: p.viewport });
    const errores = [];
    pagina.on('pageerror', (e) => errores.push(e.message));
    await pagina.goto(`${URL_PRUEBAS}?poster&nivel=${p.nivel}&encuadre=${p.nombre}&dpr=1`);
    await pagina.waitForFunction(() => window.poster, null, { timeout: 30_000 });
    // Unos fotogramas más para que el bloom y las texturas estén asentados
    await pagina.waitForTimeout(500);
    if (errores.length) throw new Error(errores.join('\n'));

    const png = await pagina.locator('#ciudad').screenshot({ animations: 'disabled' });
    const archivo = join(salida, `poster-${p.nombre}.webp`);
    const info = await sharp(png).webp({ quality: 88 }).toFile(archivo);
    posiciones[p.nombre] = { ancho: info.width, alto: info.height, ventanas: (await pagina.evaluate(() => window.poster)).ventanas };
    console.log(`${archivo.replace(root + '/', '')}: ${info.width}×${info.height}, ${Math.round(info.size / 1024)} KB`);
    await pagina.close();
  }

  writeFileSync(join(salida, 'poster.json'), JSON.stringify(posiciones, null, 2) + '\n');
  console.log('src/assets/ciudad/poster.json');
} finally {
  await navegador.close();
  await servidor.stop();
}
