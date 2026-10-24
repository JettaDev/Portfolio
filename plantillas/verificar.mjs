// Verifica una plantilla ya compilada en ../public/plantillas/<slug>/ (ejecuta antes `node build.mjs <slug>`).
//
//   node plantillas/verificar.mjs restaurante                  todo, incluido Lighthouse (móvil)
//   node plantillas/verificar.mjs restaurante --sin-lighthouse
//
// Deja capturas e informe en plantillas/.verificacion/<slug>/ y sale con código 1 si hay errores.
// Comprueba: consola, desbordamiento horizontal, axe (WCAG 2.2 A/AA), metadatos y JSON-LD, un solo h1,
// enlaces internos, peticiones a terceros, tamaño de los objetivos táctiles, contacto a ≤ 2 toques en
// móvil, barra fija, diálogo de demo y posibles datos reales (teléfonos, NIF, correos).

import { createReadStream, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createGzip } from 'node:zlib';
import { createRequire } from 'node:module';
import { dirname, extname, join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const raiz = dirname(fileURLToPath(import.meta.url));
const publico = resolve(raiz, '../public');
const CHROME = process.env.CHROME_PATH ?? '/usr/bin/google-chrome';
const require = createRequire(import.meta.url);
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const slug = process.argv[2];
const conLighthouse = !process.argv.includes('--sin-lighthouse');
if (!slug) {
  console.error('Uso: node plantillas/verificar.mjs <plantilla> [--sin-lighthouse]');
  process.exit(1);
}
const base = `/plantillas/${slug}/`;
if (!existsSync(join(publico, base, 'index.html'))) {
  console.error(`No hay build en public${base}. Ejecuta antes: node plantillas/build.mjs ${slug}`);
  process.exit(1);
}
const salida = join(raiz, '.verificacion', slug);
mkdirSync(salida, { recursive: true });

// ── Servidor estático como el del portfolio ───────────────────────────────────
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2',
  '.json': 'application/json', '.txt': 'text/plain', '.vcf': 'text/vcard', '.ico': 'image/x-icon', '.pdf': 'application/pdf',
};
const servidor = createServer((req, res) => {
  let ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = join(publico, ruta);
  if (!f.startsWith(publico)) return res.writeHead(403).end();
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f) && existsSync(`${f}.html`)) f = `${f}.html`;
  if (!existsSync(f)) {
    const nf = join(publico, base, '404.html');
    res.writeHead(404, { 'content-type': TIPOS['.html'] });
    return existsSync(nf) ? createReadStream(nf).pipe(res) : res.end('404');
  }
  const tipo = TIPOS[extname(f)] ?? 'application/octet-stream';
  // Comprime texto con gzip, como hace Cloudflare en producción.
  const comprimir = /text|javascript|json|svg|vcard/.test(tipo) && /gzip/.test(req.headers['accept-encoding'] ?? '');
  res.writeHead(200, { 'content-type': tipo, 'cache-control': 'no-cache', ...(comprimir ? { 'content-encoding': 'gzip', vary: 'accept-encoding' } : {}) });
  comprimir ? createReadStream(f).pipe(createGzip()).pipe(res) : createReadStream(f).pipe(res);
});
await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
const origen = `http://127.0.0.1:${servidor.address().port}`;
const inicio = `${origen}${base}`;

const errores = [];
const avisos = [];
const hechos = [];
const E = (m) => errores.push(m);
const A = (m) => avisos.push(m);
const H = (m) => hechos.push(m);

const navegador = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

async function abrir(url, viewport, nombre) {
  const ctx = await navegador.newContext({
    viewport,
    deviceScaleFactor: viewport.width < 600 ? 2 : 1,
    isMobile: viewport.width < 600,
    hasTouch: viewport.width < 600,
    reducedMotion: 'no-preference',
  });
  const p = await ctx.newPage();
  const consola = [];
  const terceros = new Set();
  p.on('console', (m) => m.type() === 'error' && consola.push(m.text()));
  p.on('pageerror', (e) => consola.push(String(e)));
  p.on('request', (r) => {
    const u = new URL(r.url());
    if (!['127.0.0.1', 'localhost'].includes(u.hostname) && !u.protocol.startsWith('data')) terceros.add(u.origin);
  });
  const resp = await p.goto(url, { waitUntil: 'networkidle' });
  await p.waitForTimeout(2000);
  if (resp?.status() !== 200) E(`${nombre}: respuesta ${resp?.status()}`);
  for (const c of consola) E(`${nombre}: error de consola: ${c}`);
  for (const t of terceros) E(`${nombre}: petición a un tercero: ${t} (todo debe ser local, sin CDNs ni Google Fonts)`);
  return { ctx, p };
}

async function axe(p, nombre) {
  await p.addScriptTag({ content: AXE });
  const r = await p.evaluate(async () =>
    // eslint-disable-next-line no-undef
    (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } })).violations.map((v) => ({
      id: v.id, impacto: v.impact, ayuda: v.help, nodos: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
    })),
  );
  for (const v of r) E(`${nombre}: axe ${v.id} (${v.impacto}): ${v.ayuda} → ${v.nodos.join(' | ')}`);
  if (!r.length) H(`${nombre}: axe sin infracciones WCAG A/AA`);
}

try {
  // ── Portada en móvil ─────────────────────────────────────────────────────────
  {
    const { ctx, p } = await abrir(inicio, { width: 390, height: 844 }, 'móvil 390');
    await p.screenshot({ path: join(salida, 'movil-390-inicio.png') });
    await p.screenshot({ path: join(salida, 'movil-390-completa.png'), fullPage: true });

    const ancho = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (ancho > 0) E(`móvil 390: desbordamiento horizontal de ${ancho}px`);

    // Barra fija visible y con acciones.
    const barra = await p.evaluate(() => {
      const b = document.querySelector('.barra-acciones');
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return { visible: getComputedStyle(b).display !== 'none' && r.bottom <= innerHeight + 1 && r.height > 0, enlaces: [...b.querySelectorAll('a')].map((a) => a.getAttribute('href')) };
    });
    if (!barra?.visible) E('móvil 390: no se ve la barra de acciones fija (.barra-acciones)');
    else H(`móvil 390: barra fija con ${barra.enlaces.length} acciones`);

    // A 1 toque: teléfono y mapa (barra). A ≤ 2 toques: horario (visible en la primera pantalla o enlazado).
    const contacto = await p.evaluate(() => {
      const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0 && s.visibility !== 'hidden'; };
      const enlaces = [...document.querySelectorAll('a[href]')].filter(vis).map((a) => a.getAttribute('href'));
      return {
        tel: enlaces.some((h) => h.startsWith('tel:')),
        mapa: enlaces.some((h) => /google\.[a-z.]+\/maps|maps\.google|maps\.app\.goo\.gl/.test(h)),
        horario: [...document.querySelectorAll('[data-estado-horario]')].some(vis) || enlaces.some((h) => /#horario/.test(h)) || !!document.querySelector('#horario') && [...document.querySelectorAll('a[href*="horario"], button[aria-controls*="horario"]')].some(vis),
      };
    });
    if (!contacto.tel) E('móvil 390: no hay un enlace tel: visible en la primera pantalla');
    if (!contacto.mapa) E('móvil 390: no hay un enlace a Google Maps visible en la primera pantalla');
    if (!contacto.horario) E('móvil 390: el horario no está a ≤ 2 toques (ni estado visible ni enlace a #horario en la primera pantalla)');
    if (contacto.tel && contacto.mapa && contacto.horario) H('móvil 390: teléfono, mapa y horario alcanzables desde la primera pantalla');

    // Objetivos táctiles: botones y enlaces que no están dentro de un párrafo.
    const pequenos = await p.evaluate(() =>
      [...document.querySelectorAll('a[href], button, input, select, textarea, [role="button"], summary, label')]
        .filter((el) => !el.closest('p, li > p, .texto-legal, dd') && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden')
        .map((el) => { const r = el.getBoundingClientRect(); return { r, t: (el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 30), tag: el.tagName }; })
        .filter(({ r, tag }) => r.width > 0 && r.right > 0 && r.left < innerWidth && tag !== 'LABEL' && (r.height < 44 || r.width < 44))
        .map(({ r, t }) => `${t} (${Math.round(r.width)}×${Math.round(r.height)})`),
    );
    if (pequenos.length) A(`móvil 390: ${pequenos.length} objetivos táctiles < 44 px: ${pequenos.slice(0, 8).join(', ')}`);
    else H('móvil 390: todos los objetivos táctiles ≥ 44 px');

    // Diálogo de demo al pulsar la acción principal de la barra.
    const principal = p.locator('.barra-acciones a').first();
    const href = await principal.getAttribute('href');
    if (/^(tel:|mailto:|https:\/\/wa\.me)/.test(href ?? '')) {
      await principal.click();
      const abierto = await p.locator('#demo-dialogo[open]').count();
      if (!abierto) E('móvil 390: la acción principal no abre el diálogo de demo');
      else {
        H('móvil 390: la acción principal abre el diálogo de demo');
        await p.screenshot({ path: join(salida, 'movil-390-dialogo-demo.png') });
        await p.keyboard.press('Escape');
      }
    } else H(`móvil 390: la acción principal lleva a ${href}`);

    await axe(p, 'móvil 390');
    await ctx.close();
  }

  // ── Portada en escritorio ────────────────────────────────────────────────────
  {
    const { ctx, p } = await abrir(inicio, { width: 1440, height: 900 }, 'escritorio 1440');
    await p.screenshot({ path: join(salida, 'escritorio-1440-inicio.png') });
    await p.screenshot({ path: join(salida, 'escritorio-1440-completa.png'), fullPage: true });
    const ancho = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (ancho > 0) E(`escritorio 1440: desbordamiento horizontal de ${ancho}px`);
    const contacto = await p.evaluate(() => {
      const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.top < innerHeight && r.bottom > 0; };
      const enlaces = [...document.querySelectorAll('a[href]')].filter(vis).map((a) => a.getAttribute('href'));
      return enlaces.some((h) => /^(tel:|https:\/\/wa\.me)/.test(h)) || enlaces.some((h) => h.startsWith('#'));
    });
    if (!contacto) E('escritorio 1440: no hay acción de contacto visible en la primera pantalla');

    // Teclado: el primer Tab debe llevar al enlace «Saltar al contenido» o a algo visible con foco.
    await p.keyboard.press('Tab');
    const foco = await p.evaluate(() => { const a = document.activeElement; const s = a && getComputedStyle(a); return a && a !== document.body ? { t: a.textContent?.trim().slice(0, 40), outline: s.outlineStyle !== 'none' || s.boxShadow !== 'none' } : null; });
    if (!foco) E('escritorio 1440: Tab no enfoca nada');
    else if (!foco.outline) A(`escritorio 1440: el primer foco («${foco.t}») no tiene contorno visible`);
    else H(`escritorio 1440: primer Tab → «${foco.t}» con foco visible`);

    await axe(p, 'escritorio 1440');
    await ctx.close();
  }

  // ── Metadatos, enlaces y datos de toda la plantilla ──────────────────────────
  {
    const ctx = await navegador.newContext();
    const p = await ctx.newPage();
    const visitadas = new Set();
    const pendientes = [inicio];
    const externos = new Set();
    const recursos = new Set();
    while (pendientes.length) {
      const url = pendientes.shift();
      if (visitadas.has(url)) continue;
      visitadas.add(url);
      const nombre = url.replace(origen, '');
      const previa = await p.request.get(url);
      if (previa.status() !== 200) { E(`${nombre}: respuesta ${previa.status()}`); continue; }
      if (!(previa.headers()['content-type'] ?? '').includes('html')) continue;
      await p.goto(url, { waitUntil: 'domcontentloaded' });
      const d = await p.evaluate(() => ({
        lang: document.documentElement.lang,
        titulo: document.title,
        desc: document.querySelector('meta[name="description"]')?.content,
        og: document.querySelector('meta[property="og:image"]')?.content,
        h1: document.querySelectorAll('h1').length,
        ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent),
        enlaces: [...document.querySelectorAll('a[href]')].map((a) => a.href),
        recursos: [...document.querySelectorAll('img[src], link[href], script[src], source[srcset]')].map((e) => e.src || e.href || e.srcset?.split(' ')[0]).filter(Boolean),
        imgSinAlt: [...document.querySelectorAll('img:not([alt])')].length,
        texto: document.documentElement.outerHTML,
      }));
      if (d.lang !== 'es') E(`${nombre}: <html lang> no es «es»`);
      if (!d.titulo) E(`${nombre}: sin <title>`);
      if (!d.desc) E(`${nombre}: sin meta description`);
      if (!d.og?.startsWith('http')) E(`${nombre}: og:image ausente o no absoluta`);
      if (d.h1 !== 1) E(`${nombre}: ${d.h1} h1 (debe haber exactamente 1)`);
      if (d.imgSinAlt) E(`${nombre}: ${d.imgSinAlt} imágenes sin alt`);
      for (const j of d.ld) {
        try {
          const o = JSON.parse(j);
          if (url === inicio) H(`JSON-LD ${o['@type']} válido (${o.name}, ${o.openingHoursSpecification?.length ?? 0} franjas)`);
        } catch { E(`${nombre}: JSON-LD no es JSON válido`); }
      }
      if (url === inicio && !d.ld.length) E('portada: falta el JSON-LD LocalBusiness');

      // Datos que parecen reales: teléfonos españoles fuera de los rangos ficticios 949 000 / 649 000.
      const tels = [...d.texto.matchAll(/(?<![\d.])(?:\+34[\s.]?)?([6789]\d{2})[\s.]?(\d{3})[\s.]?(\d{3})(?![\d.])/g)]
        .map((m) => `${m[1]}${m[2]}${m[3]}`)
        .filter((t) => !/^(949000|649000)/.test(t));
      if (tels.length) A(`${nombre}: números que parecen teléfonos reales: ${[...new Set(tels)].slice(0, 5).join(', ')} (revisa que sean ficticios)`);
      const correos = [...d.texto.matchAll(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g)].map((m) => m[0]).filter((c) => !/ejemplo\.(es|com)$|\.(png|svg|webp)$/.test(c));
      if (correos.length) A(`${nombre}: correos fuera de ejemplo.es: ${[...new Set(correos)].join(', ')}`);

      for (const e of d.enlaces) {
        const u = new URL(e);
        if (u.origin === origen) {
          u.hash = '';
          if (u.pathname.startsWith(base) && !visitadas.has(u.href)) pendientes.push(u.href);
          else if (!u.pathname.startsWith(base)) E(`${nombre}: enlace interno fuera de la plantilla: ${u.pathname}`);
        } else if (u.protocol.startsWith('http')) externos.add(u.origin + u.pathname);
      }
      for (const rc of d.recursos) if (rc.startsWith(origen)) recursos.add(rc);
    }
    for (const rc of recursos) {
      const r = await p.request.get(rc);
      if (r.status() !== 200) E(`recurso roto: ${rc.replace(origen, '')} (${r.status()})`);
    }
    // Página 404 propia.
    const r404 = await p.goto(`${inicio}no-existe/`);
    if (r404?.status() !== 404 || !(await p.locator('h1').count())) A('la 404 no responde con su propia página');
    H(`${visitadas.size} URL internas recorridas, ${recursos.size} recursos comprobados`);
    if (externos.size) H(`enlaces externos: ${[...externos].join(', ')}`);

    // axe en las páginas secundarias.
    for (const sub of ['aviso-legal/', 'privacidad/']) {
      if (!visitadas.has(inicio + sub)) { E(`falta la página ${sub}`); continue; }
      await p.goto(inicio + sub);
      await axe(p, sub);
    }
    await ctx.close();
  }

  // ── Lighthouse (móvil, con la simulación por defecto) ────────────────────────
  if (conLighthouse) {
    const lh = join(raiz, 'node_modules', '.bin', 'lighthouse');
    const pasadas = Number(process.env.LH_PASADAS ?? 3);
    const tandas = [];
    for (let i = 0; i < pasadas; i++) {
      const json = join(salida, `lighthouse-${i + 1}.json`);
      rmSync(json, { force: true });
      // Lighthouse a veces no sale tras cerrar Chrome: límite de tiempo y vale si escribió el informe.
      const r = await promisify(execFile)(lh, [inicio, '--quiet', '--output=json', `--output-path=${json}`, '--only-categories=performance,accessibility,best-practices,seo', '--chrome-flags=--headless=new --no-sandbox'], { env: { ...process.env, CHROME_PATH: CHROME }, encoding: 'utf8', timeout: 180_000, killSignal: 'SIGKILL', maxBuffer: 64 << 20 }).catch((e) => e);
      if (!existsSync(json)) { A(`Lighthouse (pasada ${i + 1}) no pudo ejecutarse: ${(r.stderr || '').split('\n').slice(-3).join(' ')}`); continue; }
      const informe = JSON.parse(readFileSync(json, 'utf8'));
      const cat = informe.categories;
      // El modo demo lleva noindex a propósito: se calcula también el SEO sin esa auditoría.
      const sinNoindex = cat.seo.auditRefs.filter((a) => a.weight > 0 && a.id !== 'is-crawlable');
      const puntua = (refs) => Math.round((100 * refs.reduce((s, a) => s + a.weight * (informe.audits[a.id].score ?? 1), 0)) / refs.reduce((s, a) => s + a.weight, 0));
      tandas.push({
        rendimiento: Math.round(cat.performance.score * 100),
        accesibilidad: Math.round(cat.accessibility.score * 100),
        buenasPracticas: Math.round(cat['best-practices'].score * 100),
        seo: Math.round(cat.seo.score * 100),
        seoSinNoindexDemo: puntua(sinNoindex),
        lcp: informe.audits['largest-contentful-paint']?.displayValue,
        cls: informe.audits['cumulative-layout-shift']?.displayValue,
        cpu: informe.environment?.benchmarkIndex,
      });
    }
    if (tandas.length) {
      // Mediana por nota: una sola pasada varía mucho si la máquina está cargada.
      const mediana = (k) => { const v = tandas.map((t) => t[k]).sort((a, b) => a - b); return v[Math.floor((v.length - 1) / 2)]; };
      const notas = Object.fromEntries(['rendimiento', 'accesibilidad', 'buenasPracticas', 'seo', 'seoSinNoindexDemo'].map((k) => [k, mediana(k)]));
      H(`Lighthouse móvil (mediana de ${tandas.length}): ${JSON.stringify(notas)}`);
      H(`pasadas: ${tandas.map((t) => `rend. ${t.rendimiento}, LCP ${t.lcp}, CLS ${t.cls}, CPU ${Math.round(t.cpu)}`).join(' | ')}`);
      for (const [k, v] of Object.entries(notas)) if (k !== 'seo' && v < 90) E(`Lighthouse ${k} = ${v} (< 90, mediana)`);
    }
  } else A('Lighthouse omitido (--sin-lighthouse)');
} finally {
  await navegador.close();
  servidor.close();
}

const informe = { plantilla: slug, fecha: new Date().toISOString(), errores, avisos, comprobado: hechos };
writeFileSync(join(salida, 'informe.json'), JSON.stringify(informe, null, 2));
console.log(`\n=== Verificación de «${slug}» ===`);
for (const h of hechos) console.log(`  ok     ${h}`);
for (const a of avisos) console.log(`  aviso  ${a}`);
for (const e of errores) console.log(`  ERROR  ${e}`);
console.log(`\nCapturas e informe en plantillas/.verificacion/${slug}/`);
console.log(errores.length ? `${errores.length} error(es).` : 'Sin errores.');
process.exit(errores.length ? 1 : 0);
