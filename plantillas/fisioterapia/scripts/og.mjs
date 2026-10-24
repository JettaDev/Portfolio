// Genera public/og.png (1200×630) a partir del config y de la figura del mapa.
// Uso (desde la plantilla, con las herramientas de plantillas/ instaladas: `cd .. && npm ci`):
//   node scripts/og.mjs
// Chrome: /usr/bin/google-chrome o la ruta de CHROME_PATH.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, '..');
const require = createRequire(join(raiz, '../package.json'));
const { chromium } = require('playwright-core');
const { default: c } = await import(pathToFileURL(join(raiz, 'config.ts')).href);
const { CABEZA, MEDIA, VISTA, AREAS } = await import(pathToFileURL(join(raiz, 'src/figura.ts')).href);

const col = c.tema.colores;
const fuente = (f) => pathToFileURL(join(raiz, 'node_modules/@fontsource-variable', f)).href;
const zona = AREAS.lumbar[0];
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:S;src:url(${fuente('source-serif-4/files/source-serif-4-latin-wght-normal.woff2')});font-weight:200 900}
@font-face{font-family:M;src:url(${fuente('manrope/files/manrope-latin-wght-normal.woff2')});font-weight:200 800}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:${col.fondo};color:${col.texto};font-family:M;display:grid;grid-template-columns:1fr 380px;overflow:hidden}
.t{padding:88px 0 76px 92px;display:flex;flex-direction:column}
.a{font-size:20px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${col.primario};display:flex;align-items:center;gap:16px}
.a:before{content:'';width:40px;height:2px;background:${col.acento}}
h1{font-family:S;font-weight:420;font-size:96px;line-height:1;letter-spacing:-.02em;margin-top:30px}
.e{font-family:S;font-size:34px;line-height:1.25;margin-top:22px;max-width:26ch;color:${col.texto}}
.p{margin-top:auto;font-size:22px;color:${col.textoSuave};font-weight:600}
.f{background:${col.superficie};border-left:1px solid ${col.borde};display:grid;place-items:center}
svg{height:540px;overflow:visible}
</style></head><body>
<div class="t"><p class="a">${esc(c.textos.antetitulo)}</p><h1>${esc(c.negocio.nombre)}</h1>
<p class="e">${esc(c.negocio.eslogan)}</p>
<p class="p">${esc(c.contacto.direccion.calle)} · ${esc(c.contacto.telefonoVisible)}</p></div>
<div class="f"><svg viewBox="0 0 ${VISTA.ancho} ${VISTA.alto}">
<line x1="120" y1="0" x2="120" y2="${VISTA.alto}" stroke="${col.primario}" stroke-opacity=".35" stroke-dasharray="2 5"/>
<ellipse cx="${zona.cx}" cy="${zona.cy}" rx="${zona.rx}" ry="${zona.ry}" fill="${col.primarioSuave ?? col.fondo}" stroke="${col.primario}" stroke-dasharray="3 3"/>
<g fill="none" stroke="${col.texto}" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round">
<ellipse cx="${CABEZA.cx}" cy="${CABEZA.cy}" rx="${CABEZA.rx}" ry="${CABEZA.ry}"/><path d="${MEDIA}"/><path d="${MEDIA}" transform="translate(${VISTA.ancho} 0) scale(-1 1)"/></g>
<circle cx="${zona.cx}" cy="${zona.cy}" r="6" fill="${col.primario}"/><circle cx="${zona.cx}" cy="${zona.cy}" r="12" fill="none" stroke="${col.acento}" stroke-width="1.5"/>
</svg></div></body></html>`;

const nav = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--allow-file-access-from-files'],
});
const p = await nav.newPage({ viewport: { width: 1200, height: 630 } });
// Desde un archivo (no desde about:blank) para que Chrome cargue las fuentes locales.
const tmp = mkdtempSync(join(tmpdir(), 'og-'));
writeFileSync(join(tmp, 'og.html'), html);
await p.goto(pathToFileURL(join(tmp, 'og.html')).href, { waitUntil: 'load' });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(300);
await p.screenshot({ path: join(raiz, 'public/og.png') });
await nav.close();
rmSync(tmp, { recursive: true, force: true });
console.log('public/og.png generado');
