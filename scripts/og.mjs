// Genera las imágenes Open Graph (1200×630) en public/og/<lang>/:
//   index.png          la del sitio (portada, Sobre mí, 404…)
//   <slug>.png         una por app, con su captura dentro de la ventana de navegador
//
//   npm run og
//
// Lee títulos, taglines y portadas de src/content/apps y los textos de src/i18n/ui.ts.
// Usa Chrome (CHROME_PATH, por defecto /usr/bin/google-chrome) con la tipografía del sitio.

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LANGS = ['es', 'en'];
const SITE = new URL(readFileSync(join(root, 'astro.config.mjs'), 'utf8').match(/site:\s*'([^']+)'/)[1]).host;

const font = pathToFileURL(
  join(root, 'node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-opsz-normal.woff2'),
).href;

/** Frontmatter de una línea por campo: basta para title, tagline, cover, hue, stack… */
function frontmatter(file) {
  const head = readFileSync(file, 'utf8').split('\n---\n')[0];
  const get = (key) => head.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1].trim().replace(/^"(.*)"$/, '$1');
  return {
    title: get('title'),
    tagline: get('tagline'),
    domain: get('domain'),
    hue: get('hue') ?? '#7fe0a6',
    order: Number(get('order') ?? 100),
    draft: get('draft') === 'true',
    stack: (get('stack') ?? '').replace(/^\[|\]$/g, '').split(',').map((s) => s.trim()).filter(Boolean),
    cover: pathToFileURL(resolve(dirname(file), get('cover'))).href,
  };
}

function apps(lang) {
  const dir = join(root, 'src/content/apps', lang);
  return readdirSync(dir)
    .filter((f) => /\.mdx?$/.test(f))
    .map((f) => ({ slug: f.replace(/\.mdx?$/, ''), ...frontmatter(join(dir, f)) }))
    .filter((a) => !a.draft)
    .sort((a, b) => a.order - b.order);
}

const ui = readFileSync(join(root, 'src/i18n/ui.ts'), 'utf8');
const text = (key, lang) => [...ui.matchAll(new RegExp(`'${key.replace('.', '\\.')}':\\s*'([^']+)'`, 'g'))][LANGS.indexOf(lang)][1];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
/** Texto con las palabras con guion («7-a-side») sin partir. */
const prose = (s) => esc(s).replace(/\S*\w-\w\S*/g, (w) => `<span style="white-space:nowrap">${w}</span>`);

const logo = `<svg width="34" height="34" viewBox="0 0 26 26"><rect x="1" y="5" width="24" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><rect x="1" y="3" width="11" height="6" rx="2.5" fill="#ffb547"/></svg>`;

function page(body) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face { font-family: Bricolage; src: url(${font}) format('woff2'); font-weight: 200 800; }
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; overflow: hidden; background: #10291c; color: #e6eee4;
    font-family: Bricolage, sans-serif; font-optical-sizing: auto; position: relative; }
  .marca { position: absolute; left: 72px; top: 64px; display: flex; align-items: center; gap: 12px; font-size: 30px; font-weight: 700; letter-spacing: -0.01em; }
  .pie { position: absolute; left: 72px; bottom: 60px; width: 490px; }
  h1 { overflow: hidden; }
  h1 { font-weight: 700; letter-spacing: -0.035em; line-height: 0.92; font-variation-settings: 'opsz' 96; text-wrap: balance; }
  .tagline { margin-top: 22px; font-size: 30px; line-height: 1.25; color: rgb(230 238 228 / 0.9); text-wrap: pretty; }
  .chips { margin-top: 28px; display: flex; gap: 10px; }
  .chip { background: #183a27; border-radius: 8px; padding: 7px 13px; font-size: 21px; color: rgb(230 238 228 / 0.9); }
  .url { margin-top: 26px; font-size: 22px; color: #93ad9c; }
  .ventana { position: absolute; left: 600px; top: 112px; width: 760px; border: 2px solid #2f5640; border-radius: 18px;
    background: #0a1d13; overflow: hidden; box-shadow: 0 40px 120px -30px rgb(0 0 0 / 0.85); }
  .pestanas { display: flex; gap: 4px; padding: 12px 14px 0; }
  .pestana { display: flex; align-items: center; gap: 10px; padding: 12px 20px; border-radius: 12px 12px 0 0; font-size: 19px; font-weight: 500; color: #93ad9c; }
  .pestana.activa { background: #183a27; color: #e6eee4; }
  .punto { width: 10px; height: 10px; border-radius: 50%; }
  .barra { background: #183a27; padding: 11px 14px; }
  .direccion { display: flex; align-items: center; gap: 10px; background: rgb(10 29 19 / 0.7); border-radius: 8px; padding: 8px 14px; font-size: 17px; color: #93ad9c; }
  .ventana img { display: block; width: 100%; }
  .acento { position: absolute; left: 0; top: 0; bottom: 0; width: 12px; }
  </style></head><body>${body}</body></html>`;
}

const ventana = (tabs, domain, cover) => `
  <div class="ventana">
    <div class="pestanas">${tabs.map((t, i) => `<div class="pestana${i === 0 ? ' activa' : ''}"><span class="punto" style="background:${t.hue}"></span>${esc(t.title)}</div>`).join('')}</div>
    <div class="barra"><div class="direccion"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>${esc(domain)}</div></div>
    <img src="${cover}">
  </div>`;

function appCard(app, all) {
  // La pestaña activa es la app; las demás quedan detrás, como en la portada del sitio.
  const tabs = [app, ...all.filter((a) => a.slug !== app.slug)];
  const size = 96;
  return page(`
    <div class="acento" style="background:${app.hue}"></div>
    <div class="marca">${logo}JettaDev</div>
    <div class="pie">
      <h1 style="font-size:${size}px">${esc(app.title)}</h1>
      <p class="tagline">${prose(app.tagline)}</p>
      <div class="chips">${app.stack.slice(0, 3).map((s) => `<span class="chip">${esc(s)}</span>`).join('')}</div>
    </div>
    ${ventana(tabs, app.domain, app.cover)}`);
}

function siteCard(lang, all) {
  return page(`
    <div class="acento" style="background:#ffb547"></div>
    <div class="marca">${logo}JettaDev</div>
    <div class="pie">
      <h1 style="font-size:70px">${esc(text('hero.title', lang))}</h1>
      <p class="url">${esc(SITE)}</p>
    </div>
    ${ventana(all, all[0].domain, all[0].cover)}`);
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome' });
const tab = await browser.newPage({ viewport: { width: 1200, height: 630 } });
// Desde un archivo local para que Chrome cargue la fuente y las capturas (file://).
const tmp = join(root, 'node_modules/.cache/og/card.html');
mkdirSync(dirname(tmp), { recursive: true });
async function render(html, out) {
  writeFileSync(tmp, html);
  await tab.goto(pathToFileURL(tmp).href, { waitUntil: 'load' });
  await tab.evaluate(async () => {
    await document.fonts.ready;
    // El titular se reduce hasta que ninguna palabra se salga de su columna.
    const h1 = document.querySelector('h1');
    let size = parseFloat(getComputedStyle(h1).fontSize);
    while (h1.scrollWidth > h1.clientWidth && size > 48) h1.style.fontSize = `${(size -= 2)}px`;
  });
  mkdirSync(dirname(out), { recursive: true });
  await tab.screenshot({ path: out });
  console.log(`✓ ${out.slice(root.length + 1)}`);
}

for (const lang of LANGS) {
  const all = apps(lang);
  await render(siteCard(lang, all), join(root, 'public/og', lang, 'index.png'));
  for (const app of all) await render(appCard(app, all), join(root, 'public/og', lang, `${app.slug}.png`));
}
await browser.close();
