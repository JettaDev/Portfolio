// Pruebas de extremo a extremo de la portada (la ciudad), la ficha y la 404.
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

/** Centro de un ventanal en pantalla, con la misma cuenta que el CSS de los enlaces del póster. */
const centro = (page, clase = 'en-ancho') =>
  page.evaluate((clase) => {
    const a = document.querySelector(`.ventana-poster.${clase}`);
    const s = document.querySelector('[data-ciudad]').getBoundingClientRect();
    const x = parseFloat(a.style.getPropertyValue('--x'));
    const y = parseFloat(a.style.getPropertyValue('--y'));
    const aspecto = clase === 'en-ancho' ? 2.4 : 1.2;
    return { x: s.x + s.width / 2 + (x - 0.5) * s.height * aspecto, y: s.y + y * s.height, href: a.getAttribute('href') };
  }, clase);

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

    test('Tab llega a todas las apps y Enter entra', async () => {
      const { ctx, page } = await pagina();
      await page.goto(url(ruta), { waitUntil: 'load' });
      await viva(page);
      const slugs = await page.evaluate(() => JSON.parse(document.querySelector('[data-datos-ciudad]').textContent).map((d) => d.slug));
      const vistos = new Set();
      for (let i = 0; i < 15 && vistos.size < slugs.length; i++) {
        await page.keyboard.press('Tab');
        const s = await page.evaluate(() => document.activeElement?.dataset?.slug);
        if (s) vistos.add(s);
      }
      assert.deepEqual([...vistos].sort(), [...slugs].sort());
      await page.focus(`a[data-slug="${slugs[0]}"]`);
      await page.keyboard.press('Enter');
      await page.waitForURL(`**/apps/${slugs[0]}**`, { timeout: 8000 });
      await ctx.close();
    });
  });
}

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
  test('sin scroll horizontal, el dedo baja por la ciudad y el toque entra', async () => {
    const { ctx, page } = await pagina(MOVIL);
    await page.goto(url('/'), { waitUntil: 'load' });
    await viva(page);
    const [ancho, vista] = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    assert.ok(ancho <= vista, `sin scroll horizontal (${ancho} > ${vista})`);
    // Deslizar el dedo sobre el canvas tiene que hacer scroll (touch-action: pan-y)
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 600 }] });
    for (let k = 1; k <= 10; k++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y: 600 - k * 30 }] });
      await page.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(300);
    assert.ok((await page.evaluate(() => scrollY)) > 100, 'el gesto sobre la ciudad desplaza la página');
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(600);
    const p = await centro(page, 'en-alto');
    await page.touchscreen.tap(p.x, p.y);
    await page.waitForURL('**/apps/**', { timeout: 8000 });
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
    const p = await centro(page);
    await page.mouse.click(p.x, p.y);
    await page.waitForURL('**/apps/**', { timeout: 8000 });
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
