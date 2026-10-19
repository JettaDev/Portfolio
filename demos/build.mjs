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
    folder: 'FocusPrime-V2',
    // La API (Hono + Better Auth + Drizzle) se ejecuta en el navegador sobre SQLite en WebAssembly:
    // ver demos/focusprime/overlay/src/demo/.
    patches: [
      { file: 'index.html', from: 'src="/src/app/main.tsx"', to: 'src="/src/demo/entrada.ts"' },
      { file: 'index.html', from: '<meta charset="UTF-8" />', to: '<meta charset="UTF-8" />\n    <meta name="robots" content="noindex" />' },
      { file: 'src/app/main.tsx', from: '  routeTree,\n', to: '  routeTree,\n  basepath: import.meta.env.BASE_URL,\n' },
      // Sesión por token Bearer: el navegador no deja a la página poner ni leer cookies en peticiones
      // y respuestas que crea ella misma.
      {
        file: 'src/worker/auth.ts',
        from: 'import { emailOTP } from "better-auth/plugins/email-otp"',
        to: 'import { emailOTP } from "better-auth/plugins/email-otp"\nimport { bearer } from "better-auth/plugins/bearer"',
      },
      { file: 'src/worker/auth.ts', from: '    plugins: [\n', to: '    plugins: [\n      bearer(),\n' },
      // Sin correo: el código queda a mano para entrar sola y para enseñarlo en un aviso.
      {
        file: 'src/worker/auth.ts',
        from: 'console.log(`[OTP de desarrollo] ${type} ${email}: ${otp}`)',
        to: ';(globalThis as { __codigoDemo?: string }).__codigoDemo = otp',
      },
    ],
    remove: [],
    files: {
      'vite.demo.config.ts': (base) => `import { fileURLToPath, URL } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  base: "${base}/",
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "./src/app/routes",
      generatedRouteTree: "./src/app/routeTree.gen.ts",
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: [
      { find: "@shared", replacement: fileURLToPath(new URL("./src/shared", import.meta.url)) },
      { find: "@", replacement: fileURLToPath(new URL("./src/app", import.meta.url)) },
      { find: /^sql\\.js$/, replacement: ${JSON.stringify(join(root, 'node_modules/sql.js/dist/sql-wasm-browser.js'))} },
      { find: /^sql\\.js\\/(.*)$/, replacement: ${JSON.stringify(join(root, 'node_modules/sql.js'))} + "/$1" },
    ],
  },
  build: { outDir: "dist-demo", emptyOutDir: true },
})
`,
    },
    build: () => ['npx', ['vite', 'build', '--config', 'vite.demo.config.ts']],
    out: 'dist-demo',
    prune: ['_headers'],
    // Es una SPA: cada pantalla tiene su .html para que recargar en ella no dé un 404.
    pages: ['hoy', 'habitos', 'progreso', 'perfil', 'acceso', 'bienvenida'],
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
  for (const page of demo.pages ?? []) cpSync(join(target, 'index.html'), join(target, `${page}.html`));
  console.log(`✓ ${demo.slug} → ${relative(root, target)}/`);
}

const only = process.argv.slice(2);
for (const demo of DEMOS) if (!only.length || only.includes(demo.slug)) buildDemo(demo);
