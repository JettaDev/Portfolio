// Compila las plantillas y las deja en ../public/plantillas/<slug>/ para servirlas desde el portfolio.
//
//   node plantillas/build.mjs                 todas
//   node plantillas/build.mjs restaurante     solo una
//
// Cada plantilla es un proyecto Astro independiente (carpeta sin «_» delante y con package.json).

import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = dirname(fileURLToPath(import.meta.url));
const publico = resolve(raiz, '../public/plantillas');
const SITIO = process.env.PLANTILLA_SITE ?? 'https://portfolio.igp06.workers.dev';

export const plantillas = () =>
  readdirSync(raiz, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_') && !d.name.startsWith('.') && d.name !== 'node_modules')
    .filter((d) => existsSync(join(raiz, d.name, 'package.json')))
    .map((d) => d.name);

const correr = (cmd, args, cwd, env = {}) => {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', env: { ...process.env, ...env } });
  if (r.status !== 0) throw new Error(`Falló «${cmd} ${args.join(' ')}» en ${cwd}`);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const pedidas = process.argv.slice(2);
  const lista = pedidas.length ? pedidas : plantillas();
  for (const slug of lista) {
    const dir = join(raiz, slug);
    if (!existsSync(join(dir, 'package.json'))) throw new Error(`No existe la plantilla «${slug}».`);
    console.log(`\n▸ ${slug}`);
    if (!existsSync(join(dir, 'node_modules'))) correr('npm', ['ci', '--no-audit', '--no-fund'], dir);
    correr('npm', ['run', 'comprobar'], dir);
    const destino = join(publico, slug);
    rmSync(destino, { recursive: true, force: true });
    correr('npx', ['astro', 'build'], dir, {
      PLANTILLA_SITE: SITIO,
      PLANTILLA_BASE: `/plantillas/${slug}/`,
      PLANTILLA_OUT: destino,
    });
  }
  // Índice de las demos (lo pinta _indice/index.html, si existe).
  const indice = join(raiz, '_indice');
  if (existsSync(indice)) cpSync(indice, publico, { recursive: true });
  console.log(`\nListo: ${lista.join(', ')} → public/plantillas/`);
}
