# Plantillas para negocios locales

Cuatro webs de demostración para negocios de Guadalajara, listas para adaptarlas a un cliente real en menos de una hora. Cada una es un sitio **estático** (Astro 7) sin base de datos ni backend: los formularios preparan un mensaje de WhatsApp o de correo con lo elegido.

| Plantilla | Negocio ficticio | Carpeta | Demo en el portfolio |
| --- | --- | --- | --- |
| Restaurante / mesón | Mesón La Trébede | `restaurante/` | `/plantillas/restaurante/` |
| Peluquería / estética | Atelier Malva | `peluqueria/` | `/plantillas/peluqueria/` |
| Autoescuela | Autoescuela Rotonda | `autoescuela/` | `/plantillas/autoescuela/` |
| Fisioterapia | Clínica Eje | `fisioterapia/` | `/plantillas/fisioterapia/` |

Los diseños aprobados de cada una están en [DISENOS.md](DISENOS.md).

## Estructura

```
plantillas/
  _comun/                 código compartido (sin dependencias)
    tipos.ts              esquema del config: ConfigPlantilla<Item, Extra>
    horario.ts            «abierto ahora», horario agrupado, openingHours de schema.org
    enlaces.ts            tel:, wa.me, mailto:, mensaje prellenado, precios y duraciones
    seo.ts                JSON-LD LocalBusiness y vCard
    contraste.ts          contraste WCAG y parejas de color obligatorias
    validar.ts            `npm run comprobar`: errores del config, contraste y restos de la demo
    cliente/              scripts del navegador: modo demo y estado del horario
    componentes/          Cabeza (SEO), Demo, BarraAcciones, EstadoHorario, TextoLegal
    comun.test.ts         pruebas (node --test)
  _base/                  esqueleto mínimo del que parte cada plantilla
  _indice/                página índice de las demos (public/plantillas/index.html)
  restaurante/ peluqueria/ autoescuela/ fisioterapia/
    config.ts             ← ÚNICO archivo que se edita por cliente
    README.md             qué tiene la plantilla y checklist de adaptación
    astro.config.ts, tsconfig.json, package.json
    public/               favicon.svg, og.png (1200×630) e imágenes sustituibles
    src/                  layouts, componentes, páginas, estilos y scripts propios
  build.mjs               compila hacia ../public/plantillas/<slug>/
  verificar.mjs           capturas, axe, enlaces, terceros, datos reales y Lighthouse
  exportar.mjs            saca una plantilla a una carpeta independiente para un cliente
  indice.mjs              miniaturas y og.png del índice de demos (_indice/)
  CHECKLIST-CALIDAD.md    lo que debe cumplir cada plantilla antes de darla por buena
  PLANTILLA-README.md     modelo del README de cada plantilla
```

## Contrato común

Lo que comparten las cuatro, para que adaptar cualquiera sea igual de rápido:

1. **Un solo archivo por cliente: `config.ts`.** Cumple `ConfigPlantilla` de `_comun/tipos.ts`. Las claves de primer nivel son las mismas en las cuatro: `demo`, `meta`, `negocio`, `contacto`, `horario`, `accionPrincipal`, `formulario`, `redes`, `tema`, `textos`, `catalogo`, `equipo`, `faq`, `legal`, `extra`. Solo cambian los campos extra de cada elemento del catálogo y el bloque `extra`.
2. **Nada de datos del negocio fuera del config.** Ni en los `.astro` ni en los estilos: textos, precios, colores, teléfonos y enlaces salen siempre del config. Las ilustraciones SVG no llevan el nombre del negocio grabado.
3. **Colores como variables CSS.** Cada clave de `tema.colores` se publica como `--c-<clave-en-kebab>` (`textoSuave` → `--c-texto-suave`). Los estilos solo usan esas variables; `npm run comprobar` verifica el contraste.
4. **Componentes obligatorios** de `_comun/componentes/`: `Cabeza` (título, descripción, Open Graph, JSON-LD, noindex en demo), `Demo` (aviso y diálogo), `BarraAcciones` (barra fija en móvil), `EstadoHorario` y `TextoLegal` (aviso legal y privacidad). Cada plantilla los reviste con su estilo, sin cambiar su función.
5. **Páginas:** `/`, `/aviso-legal/`, `/privacidad/`, `/contacto.vcf`, `/robots.txt` y 404.
6. **Formularios sin servidor.** Construyen el texto con `construirMensaje()` y lo abren con `abrir(enlaceFormulario(...))` de `_comun/cliente/demo.ts`. En modo demo se muestra el mensaje en un diálogo en vez de enviarlo.
7. **Modo demo** (`demo: true`): `noindex`, aviso visible y diálogo en lugar de llamar o enviar. Teléfonos ficticios `949 000 1XX` y WhatsApp `649 000 1XX`, correo `@ejemplo.es` y NIF `B00000000`.
8. **Sin terceros.** Fuentes autoalojadas con `@fontsource`; ni CDNs, ni Google Fonts, ni analíticas, ni mapas incrustados. Así no hace falta banner de cookies. El mapa es un enlace a Google Maps.
9. **Imágenes sin copyright:** ilustraciones SVG o CSS propias o marcadores de posición diseñados, todos sustituibles desde `public/` y referenciados desde el config.
10. **Mobile-first y accesible:** WCAG 2.2 AA, objetivos táctiles de 44 px como mínimo, `prefers-reduced-motion` respetado y un solo `h1` por página.

## Comandos

Desde `plantillas/`:

```bash
npm install                      # herramientas de verificación (una vez)
npm test                         # pruebas de _comun
node build.mjs [slug]            # compila hacia ../public/plantillas/<slug>/
node verificar.mjs <slug>        # verificación completa (tras el build; Lighthouse ×3, mediana)
node exportar.mjs <slug> <dest>  # carpeta independiente para un cliente
node indice.mjs                  # miniaturas del índice (tras el build; luego otro build para copiarlas)
```

Dentro de cada plantilla: `npm run dev`, `npm run build`, `npm run comprobar`.

Desde la raíz del portfolio: `npm run plantillas` compila todas en `public/plantillas/`, que se commitea como las demos de las apps.

## Variables de entorno del build

Las pone `build.mjs`; en la web de un cliente no hacen falta.

| Variable | Para qué |
| --- | --- |
| `PLANTILLA_SITE` | Dominio público (por defecto, `config.meta.url`) |
| `PLANTILLA_BASE` | Subruta, p. ej. `/plantillas/restaurante/` |
| `PLANTILLA_OUT` | Carpeta de salida |
