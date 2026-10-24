import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import config from './config.ts';

// PLANTILLA_SITE / PLANTILLA_BASE / PLANTILLA_OUT los pone el build del portfolio para servirla en una subruta.
// En la web de un cliente no hace falta tocarlos: se usa config.meta.url.
const site = process.env.PLANTILLA_SITE ?? config.meta.url;
const comun = fileURLToPath(new URL('../_comun', import.meta.url));

export default defineConfig({
  site,
  base: process.env.PLANTILLA_BASE ?? '/',
  outDir: process.env.PLANTILLA_OUT ?? './dist',
  trailingSlash: 'ignore',
  build: { inlineStylesheets: 'always', format: 'directory' },
  vite: {
    resolve: { alias: { '@comun': comun } },
    server: { fs: { allow: ['..'] } },
  },
});
