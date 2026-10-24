// Genera public/og.png (1200 × 630) a partir del config, con Chrome y playwright-core.
//   node scripts/og.mjs        (desde la carpeta de la plantilla; CHROME_PATH para otra ruta de Chrome)
// Necesita las herramientas de plantillas/ instaladas (npm install en plantillas/).
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { chromium } from 'playwright-core';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const { default: c } = await import(pathToFileURL(join(raiz, 'config.ts')).href);
const fuente = (ruta) => pathToFileURL(join(raiz, 'node_modules', ruta)).href;
const col = c.tema.colores;
const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[m]);

const filas = [
  ['M12 21V5M5 11l7-7 7 7', c.textos.panelPermisos, c.catalogo.items.map((i) => i.codigo).join('\u2002')],
  ['M6 18 18 6M8 6h10v10', c.textos.panelLlegar, c.contacto.direccion.calle],
  ['M3 12h16M13 5l7 7-7 7', 'Llamar', c.contacto.telefonoVisible],
];

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:T;src:url(${fuente('@fontsource-variable/overpass/files/overpass-latin-wght-normal.woff2')});font-weight:100 900}
@font-face{font-family:X;src:url(${fuente('@fontsource-variable/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-wght-normal.woff2')});font-weight:200 800}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;background:${col.fondo};color:${col.texto};font-family:X;position:relative;overflow:hidden}
.izq{position:absolute;left:72px;top:64px;width:560px}
.logo{display:flex;align-items:center;gap:16px;font-family:T}
.disco{width:72px;height:72px;border-radius:50%;background:${col.primario};color:#fff;display:grid;place-items:center;box-shadow:inset 0 0 0 3px ${col.primario},inset 0 0 0 5px #fff}
.disco svg{width:54px}
.logo small{display:block;font-size:17px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${col.textoSuave}}
.logo b{display:block;font-size:40px;font-weight:850;line-height:1}
h1{font-family:T;font-weight:900;font-size:104px;line-height:.93;letter-spacing:-.03em;margin-top:56px}
p{font-size:26px;color:${col.textoSuave};margin-top:26px}
.cartel{position:absolute;right:64px;top:92px;width:470px}
.panel{position:relative;background:${col.primario};color:${col.textoSobrePrimario};border-radius:18px;padding:10px}
.panel:before{content:'';position:absolute;inset:8px;border:3px solid #fff;border-radius:12px}
.fila{display:grid;grid-template-columns:44px 1fr;align-items:center;gap:14px;padding:22px 22px 18px;font-family:T}
.fila+.fila{border-top:3px solid #fff}
.fila b{display:block;font-size:30px;font-weight:800;line-height:1.05}
.fila span{display:block;font-size:22px;font-weight:600;margin-top:4px}
.poste{position:absolute;top:100%;width:14px;height:200px;background:${col.textoSuave}}
.baliza{position:absolute;left:0;right:0;bottom:0;height:22px;background:repeating-linear-gradient(-45deg,${col.acento} 0 22px,${col.texto} 22px 44px)}
</style></head><body>
<div class="izq">
  <div class="logo"><span class="disco">${c.negocio.logo.svg ?? ''}</span><span><small>${esc(c.textos.tipo)}</small><b>${esc(c.negocio.logo.texto)}</b></span></div>
  <h1>${esc(c.textos.titular)}</h1>
  <p>${esc(c.textos.antetitulo)}</p>
</div>
<div class="cartel"><div class="panel">${filas.map(([f, t, v]) => `<div class="fila"><svg viewBox="0 0 24 24" width="40" height="40"><path d="${f}" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="square"/></svg><div><b>${esc(t)}</b><span>${esc(v)}</span></div></div>`).join('')}</div>
<span class="poste" style="left:26%"></span><span class="poste" style="right:26%"></span></div>
<div class="baliza"></div>
</body></html>`;

const navegador = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
try {
  const p = await navegador.newPage({ viewport: { width: 1200, height: 630 } });
  // Desde un archivo local para que Chrome cargue las fuentes de node_modules.
  const tmp = mkdtempSync(join(tmpdir(), 'og-'));
  writeFileSync(join(tmp, 'og.html'), html);
  await p.goto(pathToFileURL(join(tmp, 'og.html')).href, { waitUntil: 'load' });
  rmSync(tmp, { recursive: true, force: true });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: join(raiz, 'public', 'og.png') });
  console.log('public/og.png generado (1200 × 630).');
} finally {
  await navegador.close();
}
