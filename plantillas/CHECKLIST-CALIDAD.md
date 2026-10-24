# Checklist de calidad

Cada plantilla se da por buena solo si cumple todo esto. Lo marcado con ⚙︎ lo comprueba `node verificar.mjs <slug>`. El resto se revisa a mano, mirando las capturas de `.verificacion/<slug>/`.

## Contrato
- [ ] ⚙︎ `npm run comprobar` pasa sin errores (esquema, formatos, contraste del tema).
- [ ] Todos los textos, precios, colores, teléfonos y enlaces salen de `config.ts`. Prueba: cambiar el nombre, el teléfono y el color primario en el config se refleja en toda la web.
- [ ] Usa los componentes de `_comun/componentes/` (Cabeza, Demo, BarraAcciones, EstadoHorario, TextoLegal).
- [ ] Los formularios usan `construirMensaje` + `abrir(enlaceFormulario(...))`. No hay `fetch`, `action=` ni almacenamiento de datos.
- [ ] `README.md` de la plantilla escrito a partir de `PLANTILLA-README.md`.

## Móvil (390 px) — lo primero
- [ ] ⚙︎ Barra fija inferior visible con la acción principal, llamar y cómo llegar.
- [ ] ⚙︎ Teléfono y Google Maps a 1 toque; horario a 2 toques como mucho (estado visible o enlace a `#horario`).
- [ ] ⚙︎ Sin desbordamiento horizontal.
- [ ] ⚙︎ Objetivos táctiles de 44 × 44 px como mínimo (los enlaces dentro de un párrafo no cuentan).
- [ ] En la primera pantalla se entiende **qué es el negocio y dónde está** sin hacer scroll (prueba de los 5 segundos).
- [ ] Texto base ≥ 16 px y líneas de 75 caracteres como mucho.
- [ ] La barra fija no tapa el final de la página ni los botones de los formularios.

## Escritorio (1440 px)
- [ ] ⚙︎ Acción de contacto visible en la primera pantalla (cabecera).
- [ ] La composición aprovecha el ancho: no es la versión móvil estirada.

## Accesibilidad (WCAG 2.2 AA)
- [ ] ⚙︎ axe sin infracciones en `/`, `/aviso-legal/` y `/privacidad/`, en móvil y escritorio.
- [ ] ⚙︎ Un solo `h1` por página, `lang="es"` e imágenes con `alt` (las decorativas, `alt=""`).
- [ ] ⚙︎ El primer Tab va a «Saltar al contenido», con foco visible.
- [ ] Todo funciona con teclado: filtros, selectores, calculadoras, acordeones y diálogos (Escape cierra y el foco vuelve a su sitio).
- [ ] Los cambios dinámicos (precio total, filtros aplicados) se anuncian con `aria-live="polite"`.
- [ ] Los controles personalizados tienen el rol y el estado correctos (`aria-pressed`, `aria-expanded`, `aria-checked`…), o mejor aún, son controles nativos.
- [ ] Con `prefers-reduced-motion: reduce` no hay animaciones de desplazamiento ni parallax.
- [ ] El color nunca es la única señal: los alérgenos llevan nombre o icono con texto, y «abierto/cerrado» lleva texto.

## Rendimiento y SEO
- [ ] ⚙︎ Lighthouse móvil ≥ 90 en Rendimiento, Accesibilidad y Buenas prácticas. SEO ≥ 90 sin contar el `noindex` de la demo (el informe da las dos cifras).
- [ ] ⚙︎ Sin peticiones a terceros: fuentes con `@fontsource`, SVG en línea o en `public/`.
- [ ] ⚙︎ `<title>`, meta description, `og:image` absoluta (1200 × 630, `public/og.png`) y JSON-LD válido del tipo correcto.
- [ ] JS total de la portada < 30 KB comprimido. Nada de librerías de UI para cosas que caben en 50 líneas.
- [ ] Fuentes: 2 familias como mucho, con subset latino y `font-display: swap`. Solo se precarga la del titular.

## Enlaces y datos
- [ ] ⚙︎ Todos los enlaces internos y recursos responden 200. La 404 es propia.
- [ ] ⚙︎ No aparecen teléfonos, correos ni NIF que parezcan reales. Solo `949 000 1XX`, `649 000 1XX`, `@ejemplo.es` y `B00000000`.
- [ ] Ningún nombre, logo ni marca de un negocio real (tampoco en las ilustraciones). Las calles inventadas o genéricas no coinciden con un negocio real.
- [ ] El mensaje de WhatsApp que se genera se lee bien: saludo, una línea por dato y nada de `undefined`.
- [ ] «Añadir a contactos» descarga una vCard válida.

## Clínica (además)
- [ ] El formulario pide **solo** nombre, teléfono, especialidad y franja horaria. Ni síntomas, ni diagnóstico, ni texto libre sobre salud.
- [ ] El «mapa del cuerpo» solo navega: la zona elegida no se añade al mensaje ni se guarda.
- [ ] El README explica qué revisar del RGPD si el cliente quiere pedir más datos.
