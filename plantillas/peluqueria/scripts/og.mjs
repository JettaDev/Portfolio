// Genera public/og.png (1200×630) con el nombre, el eslogan y los colores de config.ts.
// Uso (desde la carpeta de la plantilla): node scripts/og.mjs
// Necesita playwright-core y Chrome (CHROME_PATH o /usr/bin/google-chrome).
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
// playwright-core: el de la plantilla si se instaló (`npm i -D playwright-core`) o el de plantillas/ en el portfolio.
const cargar = (desde) => { try { return createRequire(desde)('playwright-core'); } catch { return null; } };
const pw = cargar(join(raiz, 'package.json')) ?? cargar(join(raiz, '..', 'package.json'));
if (!pw) throw new Error('Falta playwright-core: npm i -D playwright-core');
const { chromium } = pw;
const { default: c } = await import(pathToFileURL(join(raiz, 'config.ts')).href);

const col = c.tema.colores;
const fuente = (ruta) => pathToFileURL(join(raiz, 'node_modules', ruta)).href;
const d = c.contacto.direccion;

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
@font-face{font-family:G;src:url(${fuente('@fontsource/gloock/files/gloock-latin-400-normal.woff2')})}
@font-face{font-family:F;font-weight:300 900;src:url(${fuente('@fontsource-variable/figtree/files/figtree-latin-wght-normal.woff2')})}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:${col.fondo};color:${col.texto};font-family:F;display:grid;grid-template-columns:1fr 430px;overflow:hidden;position:relative}
.texto{padding:84px 0 70px 90px;display:flex;flex-direction:column}
.ante{font-size:21px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:${col.textoSuave};display:flex;gap:14px;align-items:center}
.ante::before{content:'';width:15px;height:20px;border:2.5px solid ${col.primario};border-bottom:0;border-radius:99px 99px 0 0}
h1{font-family:G;font-weight:400;font-size:118px;line-height:.95;letter-spacing:-.02em;margin-top:34px}
.pie{margin-top:auto;font-size:26px;color:${col.textoSuave}}
.pie b{color:${col.primario};font-weight:600}
.arte{position:relative}
.luz{position:absolute;left:60px;right:-60px;top:70px;bottom:0;border-radius:999px 999px 0 0;background:${col.acento};opacity:.55}
svg{position:absolute;left:20px;bottom:-6px;width:380px}
</style></head><body>
<div class="texto"><p class="ante">${c.negocio.eslogan}</p><h1>${c.negocio.nombre}</h1><p class="pie"><b>${c.textos.ctaCita}</b> · ${d.calle}</p></div>
<div class="arte"><div class="luz"></div>
<svg viewBox="0 0 420 560"><defs><linearGradient id="g" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="${col.superficie}"/><stop offset=".55" stop-color="${col.acento}" stop-opacity=".55"/><stop offset="1" stop-color="${col.acento}"/></linearGradient><clipPath id="r"><path d="M86 500V214a124 124 0 0 1 248 0v286Z"/></clipPath></defs>
<path d="M62 506V214a148 148 0 0 1 296 0v292Z" fill="${col.primario}"/>
<path d="M74 502V214a136 136 0 0 1 272 0v288" fill="none" stroke="${col.textoSobrePrimario}" opacity=".35"/>
<path d="M86 500V214a124 124 0 0 1 248 0v286Z" fill="url(#g)"/>
<g clip-path="url(#r)" fill="${col.superficie}"><path d="M96 420 260 96h44L140 420Z" opacity=".55"/><path d="M156 470 322 146h16L172 470Z" opacity=".45"/></g>
<rect x="18" y="506" width="384" height="12" rx="3" fill="${col.texto}"/></svg></div>
</body></html>`;

const navegador = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args: ['--no-sandbox', '--allow-file-access-from-files'] });
const p = await navegador.newPage({ viewport: { width: 1200, height: 630 } });
// Se abre como archivo para que Chrome pueda cargar las fuentes locales.
const tmp = mkdtempSync(join(tmpdir(), 'og-'));
writeFileSync(join(tmp, 'og.html'), html);
await p.goto(pathToFileURL(join(tmp, 'og.html')).href, { waitUntil: 'load' });
await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: join(raiz, 'public', 'og.png') });
await navegador.close();
rmSync(tmp, { recursive: true, force: true });
console.log('public/og.png generado');
