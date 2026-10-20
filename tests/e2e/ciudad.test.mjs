// Pruebas de extremo a extremo de la portada (la ciudad), sus destinos (fichas, catálogo, Sobre mí
// y Contacto) y la 404.
//
//   npm run build && npm run e2e
//
// Arrancan `astro preview` con la API de Astro y usan Chrome (CHROME_PATH, por defecto
// /usr/bin/google-chrome). Sin GPU (CI), E2E_NIVEL=bajo fuerza a montar la ciudad aunque WebGL
// vaya por software, y E2E_GPU=swiftshader usa ese WebGL.

import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { preview } from 'astro';
import { chromium } from 'playwright-core';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PUERTO = 4399;
const B = `http://localhost:${PUERTO}`;
const NIVEL = process.env.E2E_NIVEL;
const ARGS =
  process.env.E2E_GPU === 'swiftshader'
    ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
    : ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--use-angle=default'];
const ESCRITORIO = { viewport: { width: 1440, height: 900 } };
const MOVIL = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

/** Ruta con el nivel forzado si hace falta (sin GPU). */
const url = (ruta) => B + ruta + (NIVEL ? `${ruta.includes('?') ? '&' : '?'}nivel=${NIVEL}` : '');

let servidor;
let navegador;
before(async () => {
  servidor = await preview({ root, logLevel: 'error', server: { port: PUERTO } });
  // Playwright desactiva el bfcache por defecto: la vuelta con Atrás lo necesita
  navegador = await chromium.launch({
    executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome',
    ignoreDefaultArgs: ['--disable-back-forward-cache'],
    args: ARGS,
  });
});
after(async () => {
  await navegador?.close();
  await servidor?.stop();
});

async function pagina(contexto = ESCRITORIO) {
  const ctx = await navegador.newContext(contexto);
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  return { ctx, page, errores };
}

const viva = (page) => page.waitForSelector('[data-ciudad][data-estado="vivo"]', { timeout: 20_000 });

/**
 * Centro en pantalla de algo de la ciudad (la primera app, o `id`: un slug, #apps, #sobre-mi o
 * #contacto), con la misma cuenta que el CSS de los enlaces del póster.
 */
const centro = (page, encuadre = 'ancho', id) =>
  page.evaluate(
    ({ encuadre, id }) => {
      const s = document.querySelector('[data-ciudad]').getBoundingClientRect();
      const aspecto = encuadre === 'ancho' ? 2.4 : 1.2;
      const a =
        id === '#contacto'
          ? document.querySelector('[data-rotulo="#contacto"]')
          : document.querySelector(id ? `.ventana-poster[data-id="${id}"]${id.startsWith('#') ? '' : `.en-${encuadre}`}` : `.ventana-poster.en-${encuadre}`);
      const v = (n) => parseFloat(a.style.getPropertyValue(n));
      const [x, y] = a.classList.contains('en-los-dos')
        ? encuadre === 'ancho' ? [v('--xa'), v('--ya')] : [v('--xb'), v('--yb')]
        : [v('--x'), v('--y')];
      return { x: s.x + s.width / 2 + (x - 0.5) * s.height * aspecto, y: s.y + y * s.height, href: a.getAttribute('href') };
    },
    { encuadre, id },
  );

/** Espera a que la ciudad esté en reposo: sin vuelo y sin destello. */
async function enReposo(page, max = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < max) {
    const ok = await page
      .evaluate(() => !document.querySelector('[data-ciudad]')?.dataset.vuelo && !document.documentElement.dataset.destello)
      .catch(() => false);
    if (ok) return true;
    await page.waitForTimeout(100);
  }
  return false;
}

const sinBarra = (u) => u.replace(/\/$/, '');

for (const [lang, ruta] of [['es', '/'], ['en', '/en/']]) {
  describe(`portada (${lang})`, () => {
    test('clic en un ventanal: vuelo, ficha y Atrás vuelve al reposo', async () => {
      const { ctx, page, errores } = await pagina();
      await page.goto(url(ruta), { waitUntil: 'load' });
      await viva(page);
      const p = await centro(page);
      await page.mouse.click(p.x, p.y);
      await page.waitForURL('**/apps/**', { timeout: 8000 });
      assert.equal(sinBarra(new URL(page.url()).pathname), sinBarra(p.href));
      assert.ok(await enReposo(page), 'el destello se retira en la ficha');
      await page.goBack({ waitUntil: 'commit' });
      assert.ok(await enReposo(page), 'la ciudad vuelve al reposo');
      assert.equal(await page.evaluate(() => document.activeElement?.dataset.slug), p.href.split('/').pop(), 'el foco vuelve al enlace de la app');
      assert.deepEqual(errores, []);
      await ctx.close();
    });

    test('Tab llega a todas las apps y a los rótulos del barrio, y Enter entra', async () => {
      const { ctx, page } = await pagina();
      await page.goto(url(ruta), { waitUntil: 'load' });
      await viva(page);
      const slugs = await page.evaluate(() => JSON.parse(document.querySelector('[data-datos-ciudad]').textContent).map((d) => d.slug));
      const esperados = [...slugs, '#apps', '#contacto'];
      const vistos = new Set();
      for (let i = 0; i < 20 && vistos.size < esperados.length; i++) {
        await page.keyboard.press('Tab');
        const s = await page.evaluate(() => document.activeElement?.dataset?.slug ?? document.activeElement?.dataset?.rotulo);
        if (s) vistos.add(s);
      }
      assert.deepEqual([...vistos].sort(), [...esperados].sort());
      await page.focus(`a[data-slug="${slugs[0]}"]`);
      await page.keyboard.press('Enter');
      await page.waitForURL(`**/apps/${slugs[0]}**`, { timeout: 8000 });
      await ctx.close();
    });

    test('escaparate, estudio y solar llevan a su página con vuelo, y el logo vuelve a la ciudad', async () => {
      const { ctx, page, errores } = await pagina();
      const paginas = lang === 'es' ? { '#apps': '/apps', '#sobre-mi': '/sobre-mi', '#contacto': '/contacto' } : { '#apps': '/en/apps', '#sobre-mi': '/en/about', '#contacto': '/en/contact' };
      for (const [id, destino] of Object.entries(paginas)) {
        await page.goto(url(ruta), { waitUntil: 'load' });
        await viva(page);
        const p = await centro(page, 'ancho', id);
        await page.mouse.click(p.x, p.y);
        await page.waitForURL((u) => sinBarra(u.pathname) === destino, { timeout: 8000 });
        assert.ok(await enReposo(page), `el destello se retira en ${destino}`);
        await page.click('header a[translate="no"]');
        await page.waitForURL((u) => u.pathname === ruta, { timeout: 8000 });
        assert.ok(await enReposo(page), `la ciudad vuelve al reposo desde ${destino}`);
        assert.equal(await page.evaluate(() => document.documentElement.dataset.destello), undefined);
      }
      assert.deepEqual(errores, []);
      await ctx.close();
    });
  });
}

describe('portada a pantalla completa', () => {
  for (const [ancho, alto] of [[1440, 900], [768, 1024], [390, 844], [320, 568], [844, 390]]) {
    test(`sin scroll a ${ancho}×${alto}`, async () => {
      const { ctx, page } = await pagina({ viewport: { width: ancho, height: alto } });
      await page.goto(url('/'), { waitUntil: 'load' });
      const [sw, sh, iw, ih] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight, innerWidth, innerHeight]);
      assert.ok(sw <= iw && sh <= ih, `la portada cabe en la pantalla (${sw}×${sh} en ${iw}×${ih})`);
      // Los chips de las apps se ven enteros
      const chips = await page.$$eval('a[data-slug]', (as) => as.map((a) => a.getBoundingClientRect()).map((r) => r.bottom <= innerHeight && r.right <= innerWidth));
      assert.ok(chips.every(Boolean), 'los chips caben');
      assert.equal(await page.$('footer'), null, 'sin pie');
      await ctx.close();
    });
  }
});

describe('páginas de la ciudad', () => {
  test('catálogo con todas las apps, cabecera con la página actual y cambio de idioma', async () => {
    const { ctx, page } = await pagina();
    await page.goto(B + '/apps/', { waitUntil: 'load' });
    const slugs = await page.$$eval('article h2 a', (as) => as.map((a) => a.getAttribute('href')));
    assert.ok(slugs.length >= 2, 'hay apps en el catálogo');
    assert.equal(await page.getAttribute('header nav a[aria-current="page"]', 'href'), '/apps/');
    await page.goto(B + '/sobre-mi/', { waitUntil: 'load' });
    assert.equal(await page.getAttribute('header a[hreflang="en"]', 'href'), '/en/about/');
    await page.goto(B + '/en/contact/', { waitUntil: 'load' });
    assert.equal(await page.getAttribute('header a[hreflang="es"]', 'href'), '/contacto/');
    assert.match(await page.textContent('main'), /@/);
    await ctx.close();
  });
});

describe('paseo a pie de calle', () => {
  test('el botón baja a la calle, las teclas andan y Esc vuelve con el foco en el botón', async () => {
    const { ctx, page, errores } = await pagina();
    await page.goto(url('/'), { waitUntil: 'load' });
    await viva(page);
    await page.click('[data-pasear]');
    assert.ok(await page.evaluate(() => document.querySelector('[data-ciudad]').hasAttribute('data-paseo')));
    assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute('data-salir')), true, 'el foco pasa a «Salir del paseo»');
    await page.waitForTimeout(1600);
    assert.equal(await page.isVisible('h1'), false, 'la portada se aparta');
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(500);
    await page.keyboard.up('KeyW');
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute('data-pasear')), true, 'el foco vuelve al botón');
    assert.equal(await page.isVisible('[data-paseo-mandos]'), false);
    assert.deepEqual(errores, []);
    await ctx.close();
  });
});

describe('movimiento reducido', () => {
  test('sin vuelo: navega enseguida y vuelve al reposo', async () => {
    const { ctx, page } = await pagina({ ...ESCRITORIO, reducedMotion: 'reduce' });
    await page.goto(url('/'), { waitUntil: 'load' });
    await viva(page);
    const p = await centro(page);
    const t0 = Date.now();
    await page.mouse.click(p.x, p.y);
    await page.waitForURL('**/apps/**', { timeout: 8000 });
    assert.ok(Date.now() - t0 < 1500, `navega sin vuelo (${Date.now() - t0} ms)`);
    await page.goBack({ waitUntil: 'commit' });
    assert.ok(await enReposo(page));
    await ctx.close();
  });
});

describe('móvil 390×844', () => {
  test('sin scroll, el toque en un ventanal entra y el del escaparate lleva al catálogo', async () => {
    const { ctx, page } = await pagina(MOVIL);
    await page.goto(url('/'), { waitUntil: 'load' });
    await viva(page);
    const [sw, sh, iw, ih] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight, innerWidth, innerHeight]);
    assert.ok(sw <= iw && sh <= ih, `sin scroll (${sw}×${sh} en ${iw}×${ih})`);
    const p = await centro(page, 'alto');
    await page.touchscreen.tap(p.x, p.y);
    await page.waitForURL('**/apps/**', { timeout: 8000 });
    await page.goBack({ waitUntil: 'commit' });
    assert.ok(await enReposo(page), 'la ciudad vuelve al reposo');
    const e = await centro(page, 'alto', '#apps');
    await page.touchscreen.tap(e.x, e.y);
    await page.waitForURL((u) => sinBarra(u.pathname) === '/apps', { timeout: 8000 });
    await ctx.close();
  });
});

describe('sin WebGL', () => {
  test('se queda el póster y sus ventanales son enlaces', async () => {
    const b = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args: ['--disable-webgl', '--disable-webgl2'] });
    const page = await (await b.newContext(ESCRITORIO)).newPage();
    await page.goto(B + '/', { waitUntil: 'load' });
    await page.waitForTimeout(2500);
    assert.equal(await page.evaluate(() => document.querySelector('[data-ciudad]').dataset.estado), 'poster');
    for (const [id, destino] of [[undefined, null], ['#apps', '/apps'], ['#sobre-mi', '/sobre-mi'], ['#contacto', '/contacto']]) {
      await page.goto(B + '/', { waitUntil: 'load' });
      const p = await centro(page, 'ancho', id);
      await page.mouse.click(p.x, p.y);
      if (destino) await page.waitForURL((u) => sinBarra(u.pathname) === destino, { timeout: 8000 });
      else await page.waitForURL('**/apps/**', { timeout: 8000 });
    }
    await b.close();
  });
});

describe('404', () => {
  test('apagón con la ventana encendida que lleva al inicio, en ES y EN', async () => {
    const { ctx, page } = await pagina();
    for (const [ruta, inicio, titulo] of [['/no-existe', '/', 'Esta página no existe'], ['/en/no-existe', '/en/', 'This page doesn’t exist']]) {
      const r = await page.goto(B + ruta, { waitUntil: 'load' });
      assert.equal(r.status(), 404);
      await page.waitForFunction((t) => document.querySelector('h1')?.textContent.trim() === t, titulo);
      assert.equal(await page.getAttribute('.encendida', 'href'), inicio);
    }
    await ctx.close();
  });
});
