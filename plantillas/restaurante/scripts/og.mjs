// Genera public/og.png (1200×630) con la identidad del config: nombre, eslogan, dirección y colores.
//
//   node scripts/og.mjs
//
// Necesita playwright-core (en el portfolio ya está en plantillas/node_modules; en una plantilla
// exportada: `npm i -D playwright-core`) y Chrome. Ruta de Chrome: CHROME_PATH o /usr/bin/google-chrome.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const { default: c } = await import(pathToFileURL(join(raiz, 'config.ts')).href);
const col = c.tema.colores;
const fuente = (ruta) => pathToFileURL(join(raiz, 'node_modules', ruta)).href;
const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[m]);
const precio = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2 }).format(c.extra.menuDelDia.precio);
const antes = c.negocio.nombre.endsWith(c.negocio.logo.texto) ? c.negocio.nombre.slice(0, -c.negocio.logo.texto.length).trim() : '';

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:'Young Serif';src:url(${fuente('@fontsource/young-serif/files/young-serif-latin-400-normal.woff2')})}
@font-face{font-family:'Public Sans';font-weight:100 900;src:url(${fuente('@fontsource-variable/public-sans/files/public-sans-latin-wght-normal.woff2')})}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;overflow:hidden;background:${col.fondo};color:${col.texto};font-family:'Public Sans';position:relative}
.marco{position:absolute;inset:28px;border:1.5px solid ${col.borde};outline:1.5px solid ${col.borde};outline-offset:-10px}
.texto{position:absolute;left:96px;top:96px;width:640px}
.antes{font-size:22px;font-weight:700;letter-spacing:.3em;text-transform:uppercase;color:${col.primario}}
h1{font-family:'Young Serif';font-weight:400;font-size:132px;line-height:.95;letter-spacing:-.02em;margin-top:14px}
.eslogan{font-size:34px;line-height:1.25;margin-top:26px;color:${col.textoSuave};max-width:16em}
.dir{margin-top:34px;font-size:24px;font-weight:600;display:flex;gap:12px;align-items:center}
.dir i{width:14px;height:14px;background:${col.primario};transform:rotate(45deg);display:block}
.ticket{position:absolute;right:96px;top:78px;width:340px;padding:54px 32px 34px;background:${col.superficie};transform:rotate(3deg);
filter:drop-shadow(0 18px 18px rgb(35 31 26/.16));
-webkit-mask:conic-gradient(from -45deg at bottom,#0000,#000 1deg 89deg,#0000 90deg) bottom/16px 51% repeat-x,conic-gradient(from 135deg at top,#0000,#000 1deg 89deg,#0000 90deg) top/16px 51% repeat-x}
.chin{position:absolute;right:246px;top:58px;width:40px;height:40px;border-radius:50%;background:${col.primario};z-index:2;box-shadow:inset -6px -6px 0 rgb(0 0 0/.18)}
.k{font-size:15px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:${col.textoSuave};text-align:center}
.t{font-family:'Young Serif';font-size:38px;color:${col.primario};text-align:center;margin-top:6px}
.p{height:6px;margin:22px -30px;background:radial-gradient(circle,${col.papelOscuro ?? col.borde} 2.4px,transparent 2.8px) 0 50%/11px 6px repeat-x}
.l{font-size:21px;line-height:1.55}
.l b{display:block;font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:${col.acento};margin-top:8px}
.pr{display:flex;align-items:baseline;gap:10px;font-weight:600;font-size:20px}
.pr span{flex:1;border-bottom:3px dotted ${col.borde}}
.pr strong{font-family:'Young Serif';font-weight:400;font-size:46px;color:${col.primario}}
.mantel{position:absolute;left:0;right:0;bottom:0;height:24px;
background:repeating-linear-gradient(90deg,${col.primario}38 0 12px,transparent 12px 24px),repeating-linear-gradient(0deg,${col.primario}38 0 12px,transparent 12px 24px)}
</style></head><body>
<div class="marco"></div>
<div class="texto">
  ${antes ? `<p class="antes">${esc(antes)}</p>` : ''}
  <h1>${esc(c.negocio.logo.texto)}</h1>
  <p class="eslogan">${esc(c.negocio.eslogan)}</p>
  <p class="dir"><i></i>${esc(c.contacto.direccion.calle)} · ${esc(c.contacto.direccion.localidad)}</p>
</div>
<div class="chin"></div>
<div class="ticket">
  <p class="k">Hoy en la casa</p>
  <p class="t">${esc(c.textos.menuDelDiaTitulo ?? 'Menú del día')}</p>
  <div class="p"></div>
  <p class="l"><b>Primeros</b>${esc(c.extra.menuDelDia.primeros[0])}</p>
  <p class="l"><b>Segundos</b>${esc(c.extra.menuDelDia.segundos[0])}</p>
  <div class="p"></div>
  <p class="pr">Precio<span></span><strong>${precio} €</strong></p>
</div>
<div class="mantel"></div>
</body></html>`;

const tmp = join(raiz, 'scripts', '.og.html');
writeFileSync(tmp, html);
const nav = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args: ['--no-sandbox', '--allow-file-access-from-files'] });
const p = await nav.newPage({ viewport: { width: 1200, height: 630 } });
await p.goto(pathToFileURL(tmp).href);
await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: join(raiz, 'public', 'og.png') });
await nav.close();
const { rmSync } = await import('node:fs');
rmSync(tmp);
console.log('public/og.png generado (1200×630).');
