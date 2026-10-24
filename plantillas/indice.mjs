// Genera las miniaturas del índice de demos (_indice/capturas/<slug>.webp) y su imagen Open Graph (_indice/og.png).
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
const indice = join(raiz, '_indice');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };

// Sirve public/ y, para /plantillas/ (índice), la carpeta _indice/ sin compilar.
const servidor = createServer((req, res) => {
  const ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = ruta.startsWith('/plantillas/') && existsSync(join(indice, ruta.slice(12) || 'index.html'))
    ? join(indice, ruta.slice(12) || 'index.html')
    : join(publico, ruta);
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': TIPOS[extname(f)] ?? 'application/octet-stream' });
  createReadStream(f).pipe(res);
});
await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
const origen = `http://127.0.0.1:${servidor.address().port}`;

const nav = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome' });
mkdirSync(join(indice, 'capturas'), { recursive: true });
try {
  const movil = await nav.newContext({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await movil.newPage();
  for (const slug of plantillas()) {
    await p.goto(`${origen}/plantillas/${slug}/`, { waitUntil: 'networkidle' });
    // La miniatura enseña la web como la vería el cliente: sin el aviso de demo.
    await p.addStyleTag({ content: '.demo-aviso{display:none!important}' });
    await p.waitForTimeout(1500);
    const png = await p.screenshot();
    await sharp(png).resize(390 * 1.5).webp({ quality: 78 }).toFile(join(indice, 'capturas', `${slug}.webp`));
    console.log(`captura: ${slug}`);
  }
  const og = await nav.newContext({ viewport: { width: 1200, height: 630 } });
  const q = await og.newPage();
  await q.goto(`${origen}/plantillas/`, { waitUntil: 'networkidle' });
  await q.addStyleTag({ content: 'header.marco{display:none} h1{margin-top:3.25rem!important} .lista{margin-top:2.5rem!important}' });
  await q.waitForTimeout(800);
  await q.screenshot({ path: join(indice, 'og.png') });
  console.log('og.png');
} finally {
  await nav.close();
  servidor.close();
}
