// Capturas de las demos para el portfolio: src/assets/plantillas/<slug>.webp (16:10, como las de
// las apps; van dentro de una ventana de navegador en /negocios/ y en /apps/).
// Ejecuta antes `node build.mjs` (usa lo compilado en ../public/plantillas/).
//
//   node plantillas/indice.mjs

import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import { plantillas } from './build.mjs';

const raiz = dirname(fileURLToPath(import.meta.url));
const publico = resolve(raiz, '../public');
const destino = resolve(raiz, '../src/assets/plantillas');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };

const servidor = createServer((req, res) => {
  let f = join(publico, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': TIPOS[extname(f)] ?? 'application/octet-stream' });
  createReadStream(f).pipe(res);
});
await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
const origen = `http://127.0.0.1:${servidor.address().port}`;

const nav = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome' });
mkdirSync(destino, { recursive: true });
try {
  // 1440×900 es 16:10: la captura llena la ventana sin recortes
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  for (const slug of plantillas()) {
    await p.goto(`${origen}/plantillas/${slug}/`, { waitUntil: 'networkidle' });
    // La captura enseña la web como la vería el cliente: sin el aviso de demo
    await p.addStyleTag({ content: '.demo-aviso{display:none!important}' });
    await p.waitForTimeout(1200);
    const info = await sharp(await p.screenshot()).webp({ quality: 82 }).toFile(join(destino, `${slug}.webp`));
    console.log(`src/assets/plantillas/${slug}.webp: ${info.width}×${info.height}, ${Math.round(info.size / 1024)} KB`);
  }
} finally {
  await nav.close();
  servidor.close();
}
