// Compila las demos de las apps y las deja en public/demo/<slug>/.
//
// Cada app se copia a una carpeta temporal (sin .env, así que arranca con sus datos
// simulados), se le aplican los ajustes de la demo y se compila con su propia
// toolchain. Los repositorios de las apps no se tocan.
//
//   node demos/build.mjs              todas
//   node demos/build.mjs futbol7      solo una
//
// Rutas de las apps: por defecto ../<Carpeta>; se pueden cambiar con DEMO_SRC_<SLUG>.

import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const work = join(root, 'node_modules', '.cache', 'demos');

const SKIP = new Set(['node_modules', '.git', '.next', '.open-next', '.wrangler', 'dist', 'out', 'test-results', 'playwright-report', 'coverage']);

/** @typedef {{ file: string, from: string, to: string }} Patch */

const DEMOS = [
  {
    slug: 'futbol7',
    folder: 'Futbol7App',
    /** @type {Patch[]} */
    patches: [
      {
        file: 'src/data/AppData.tsx',
        from: "(await import('./mockAdapter')).mockAdapter;",
        to: "(await import('./mockAdapter')).mockAdapter;\nif (!supabaseConfigured) await (await import('./portfolioSeed')).seedPortfolioDemo(ADAPTER);",
      },
      {
        file: 'src/ui/DemoTools.tsx',
        from: 'mockAdapter.resetDemo();\n            reload().catch(() => {});',
        to: "mockAdapter.resetDemo();\n            (await import('../data/portfolioSeed')).forgetPortfolioSeed();\n            location.reload();\n            void reload;",
      },
      { file: 'src/ui/DemoTools.tsx', from: "onClick={() => {\n            mockAdapter.resetDemo();", to: "onClick={async () => {\n            mockAdapter.resetDemo();" },
      { file: 'src/screens/Access.tsx', from: 'src="/icons/icono.svg"', to: "src={`${import.meta.env.BASE_URL}icons/icono.svg`}" },
      // Sin service worker: la demo vive dentro de otra web.
      { file: 'src/main.tsx', from: "import.meta.env.PROD && 'serviceWorker' in navigator", to: "false" },
      { file: 'index.html', from: '    <link rel="manifest" href="/manifest.webmanifest" />\n', to: '    <meta name="robots" content="noindex" />\n' },
    ],
    remove: [],
    build: (base) => ['npx', ['vite', 'build', '--base', `${base}/`, '--outDir', 'dist-demo', '--emptyOutDir']],
    out: 'dist-demo',
    prune: ['sw.js', '_headers', 'manifest.webmanifest'],
  },
  {
    slug: 'focusprime',
    folder: 'FocusPrime',
    patches: [
      {
        file: 'src/components/entrenamiento/sesion.tsx',
        from: 'window.location.pathname.startsWith("/entrenamientos")',
        to: 'window.location.pathname.includes("/entrenamientos")',
      },
      {
        file: 'src/app/layout.tsx',
        from: '<head>',
        to: '<head>\n        <meta name="robots" content="noindex" />',
        optional: true,
      },
    ],
    // Rutas de servidor: con la fuente simulada no se usan y no caben en una exportación estática.
    remove: ['src/app/api', 'src/app/auth', 'src/proxy.ts'],
    files: {
      'next.config.ts': (base, dir) => `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "${base}",
  trailingSlash: true,
  images: { unoptimized: true },
  typedRoutes: true,
  turbopack: {
    root: ${JSON.stringify(dir)},
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
`,
    },
    build: () => ['npx', ['next', 'build']],
    out: 'out',
    prune: [],
  },
];

function run(cmd, args, cwd) {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !/^(VITE_|NEXT_PUBLIC_)/.test(k)),
  );
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', env: { ...env, NEXT_TELEMETRY_DISABLED: '1' } });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} falló (${r.status})`);
}

function buildDemo(demo) {
  const source = resolve(process.env[`DEMO_SRC_${demo.slug.toUpperCase()}`] ?? join(root, '..', demo.folder));
  if (!existsSync(join(source, 'package.json'))) throw new Error(`No encuentro ${demo.folder} en ${source}`);
  if (!existsSync(join(source, 'node_modules'))) throw new Error(`Falta npm install en ${source}`);

  const base = `/demo/${demo.slug}`;
  const dir = join(work, demo.slug);
  console.log(`\n▸ ${demo.slug}: ${source}`);

  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  cpSync(source, dir, {
    recursive: true,
    filter: (src) => {
      const name = basename(src);
      if (src === source) return true;
      if (dirname(src) === source && (SKIP.has(name) || (name.startsWith('.') && statSync(src).isDirectory()))) return false;
      return !name.startsWith('.env') || name === '.env.example';
    },
  });
  // Enlaces duros en vez de un enlace simbólico: Turbopack no sigue enlaces fuera de su raíz.
  run('cp', ['-al', join(source, 'node_modules'), join(dir, 'node_modules')], root);

  for (const path of demo.remove) rmSync(join(dir, path), { recursive: true, force: true });

  const overlay = join(root, 'demos', demo.slug, 'overlay');
  if (existsSync(overlay)) cpSync(overlay, dir, { recursive: true });

  for (const [path, content] of Object.entries(demo.files ?? {})) writeFileSync(join(dir, path), content(base, dir));

  for (const p of demo.patches) {
    const file = join(dir, p.file);
    const text = readFileSync(file, 'utf8');
    if (!text.includes(p.from)) {
      if (p.optional) continue;
      throw new Error(`Ajuste sin aplicar en ${p.file}: ha cambiado el código de la app`);
    }
    writeFileSync(file, text.replace(p.from, p.to));
  }

  const [cmd, args] = demo.build(base);
  run(cmd, args, dir);

  const target = join(root, 'public', 'demo', demo.slug);
  rmSync(target, { recursive: true, force: true });
  cpSync(join(dir, demo.out), target, { recursive: true });
  for (const path of demo.prune) rmSync(join(target, path), { recursive: true, force: true });
  console.log(`✓ ${demo.slug} → ${relative(root, target)}/`);
}

const only = process.argv.slice(2);
for (const demo of DEMOS) if (!only.length || only.includes(demo.slug)) buildDemo(demo);
