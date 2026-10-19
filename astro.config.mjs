// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://portfolio.igp06.workers.dev',

  // CSS dentro del HTML: una petición menos antes del primer pintado (~13 KB comprimido).
  build: { inlineStylesheets: 'always' },

  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: { prefixDefaultLocale: false },
  },

  vite: {
    plugins: [tailwindcss()],
    // El motor de la ciudad (three + gsap) es un único chunk diferido de ~640 KB sin comprimir (~170 KB gzip).
    build: { chunkSizeWarningLimit: 700 },
  },

  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !page.includes('/404'),
      i18n: { defaultLocale: 'es', locales: { es: 'es-ES', en: 'en-US' } },
    }),
  ],
});
