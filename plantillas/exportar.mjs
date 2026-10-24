// Saca una plantilla a una carpeta independiente para la web de un cliente real.
//
//   node plantillas/exportar.mjs restaurante ../clientes/meson-pepe
//
// Copia la plantilla (sin node_modules ni dist) y mete _comun/ dentro como ./comun,
// reescribiendo las rutas «../_comun» → «./comun». El resultado no depende del portfolio.

import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = dirname(fileURLToPath(import.meta.url));
const [slug, destinoArg] = process.argv.slice(2);
if (!slug || !destinoArg) {
  console.error('Uso: node plantillas/exportar.mjs <plantilla> <carpeta-destino>');
  process.exit(1);
}
const origen = join(raiz, slug);
const destino = resolve(destinoArg);
if (!existsSync(join(origen, 'config.ts'))) throw new Error(`No existe la plantilla «${slug}».`);
if (existsSync(destino)) throw new Error(`La carpeta ${destino} ya existe; elige otra.`);

const fuera = new Set(['node_modules', 'dist', '.astro', '.verificacion']);
cpSync(origen, destino, { recursive: true, filter: (p) => !fuera.has(p.split('/').at(-1)) });
cpSync(join(raiz, '_comun'), join(destino, 'comun'), {
  recursive: true,
  filter: (p) => !p.endsWith('.test.ts'),
});

// Reescribe las rutas al código común en todos los archivos de texto que las usen.
const textos = ['package.json', 'astro.config.ts', 'tsconfig.json', 'config.ts'];
for (const f of textos) {
  const ruta = join(destino, f);
  if (!existsSync(ruta)) continue;
  writeFileSync(ruta, readFileSync(ruta, 'utf8').replaceAll('../_comun', './comun'));
}
// Dentro de comun/ las rutas relativas no cambian.

console.log(`Plantilla «${slug}» exportada en ${destino}

Siguientes pasos:
  cd ${destinoArg}
  git init            (y añade los archivos de agente a .git/info/exclude si los hubiera)
  npm install
  edita config.ts     (checklist del README)
  npm run comprobar && npm run build`);
