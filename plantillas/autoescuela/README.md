# Autoescuela Rotonda: plantilla de autoescuela

Web para una autoescuela de barrio que habla el idioma de las señales de tráfico: el alumno elige su carnet, ve el precio completo con la tasa de la DGT y se matricula por WhatsApp.

- **Demo:** `/plantillas/autoescuela/` en el portfolio.
- **Tecnología:** Astro 7 (estático), CSS propio, JS sin librerías (unos 5 KB comprimidos). Fuentes: Overpass + Atkinson Hyperlegible Next (autoalojadas, solo latín).
- **Archivo que se edita:** [`config.ts`](config.ts). Todo lo demás es diseño.

## Qué incluye

| Sección | Qué hace | Dónde se configura |
| --- | --- | --- |
| Cabecera | Logo (señal de glorieta), menú en escritorio, teléfono y «Matricularme» | `negocio.logo`, `contacto.telefonoVisible`, `accionPrincipal` |
| Portada | Titular y un cartel de orientación con accesos a permisos, precio, cómo llegar y llamar; estado «abierto ahora» | `textos.titular`, `textos.antetitulo`, `textos.panel*`, `horario` |
| ¿Qué carnet quieres? | Una placa por permiso con edad mínima y precio aproximado. Al tocarla, configura la calculadora y baja hasta ella | `catalogo.items` |
| Calcula tu carnet (`#reserva`) | Permiso, clases sueltas (con botones − / +) o pack, desglose como un panel de peaje y total anunciado al lector de pantalla | `catalogo.items`, `extra.packs`, `extra.tasaDGT`, `extra.turnos` |
| De la matrícula al carnet | Carretera vertical con una señal por paso y un coche que avanza con el scroll (CSS puro; quieto con movimiento reducido) | `extra.pasos` |
| ¿Pasarías el teórico? | Mini-test de 4 preguntas con corrección inmediata, explicación y resumen final | `extra.test` |
| Quién va a tu lado | Profesores con iniciales o foto | `equipo` |
| Horario y dónde estamos | Horario de oficina (con estado) y de clases, plano esquemático y botones de contacto | `horario`, `extra.horarioClases`, `contacto` |
| Preguntas frecuentes | Acordeones nativos | `faq` |
| Barra fija (móvil) | Matricularme, llamar y cómo llegar | `accionPrincipal`, `contacto` |
| Aviso legal y privacidad | Generados desde `legal` | `legal`, `formulario.canal` |
| 404 | Señal de dirección prohibida y vuelta al inicio | — |

**Funcionalidad propia:** la calculadora suma matrícula + curso teórico + clases × precio + tasa de la DGT (o pack + tasa) y, al pulsar «Matricularme», abre WhatsApp con el presupuesto. El mini-test se corrige al momento (con texto, no solo color) y al final ofrece matricularse. No se guarda nada en ningún servidor.

Ejemplo del mensaje que llega al negocio:

```
Hola, quiero matricularme en la autoescuela:

• Permiso: B (coche)
• Prácticas: Pack Autovía, 30 clases
• Total orientativo: 1444,05 € con la tasa de la DGT
• Turno preferido: Tardes
• Nombre: Lucía

Gracias.
```

## Adaptar a un cliente real en menos de 1 hora

Necesitas del cliente: nombre y logo (o solo nombre), teléfono, WhatsApp, correo, dirección, horario de oficina y de clases, permisos que imparte con sus precios (matrícula, teórico, precio por clase y clases recomendadas), packs, NIF y razón social, y 3-4 fotos propias si las tiene.

1. **Exporta la plantilla** (5 min): `node plantillas/exportar.mjs autoescuela ../clientes/<cliente>`, luego `cd` a esa carpeta, `git init` y `npm install`.
2. **Identidad** (5 min): en `config.ts`, `negocio` (nombre, nombre corto, eslogan, `logo.texto` y, si quieres, otro `logo.svg` con `currentColor`) y `meta.titulo` / `meta.descripcion` con el barrio o la ciudad. `textos.tipo` es la palabrita sobre el logo («Autoescuela»).
3. **Contacto** (5 min): `contacto.telefono` en formato `+34…`, `telefonoVisible`, `whatsapp` (solo dígitos con 34 delante), `email`, `direccion`, `geo` (clic derecho en Google Maps → copiar coordenadas), `mapsUrl` (Compartir → copiar enlace de la ficha de Google del negocio) y `comoLlegar`.
4. **Horario** (5 min): `horario.franjas` es el de la **oficina** (el que dice «abierto ahora»); `extra.horarioClases`, el de las prácticas. `cierres` para vacaciones y `nota`.
5. **Permisos y precios** (15 min): `catalogo.items`, uno por permiso, con `codigo`, `edadMinima`, `requisito` (opcional), `matricula`, `teorico` (0 si no hace falta), `precioClase`, `clasesRecomendadas` y `pictograma` (`coche`, `moto`, `ciclomotor`, `camion`). Marca uno como `destacado` (sale grande y es el de la calculadora al cargar). En `extra`: `tasaDGT` (**comprueba la tasa vigente** en la sede de la DGT; un permiso con otra tasa lleva su propio `tasaDGT`), `minutosClase`, `packs` (el `permiso` es el `id` del permiso), `turnos`, `pasos` y `test`. Si cambias las preguntas del test, que las revise el profesor de teórico con el Reglamento General de Circulación en la mano.
6. **Colores** (5 min): `tema.colores` con los del cliente. El `acento` se usa solo como fondo con texto oscuro encima (nunca texto amarillo sobre blanco); `rojo` solo en las señales; `asfalto` es la carretera. Si `npm run comprobar` se queja del contraste, oscurece `primario` o `textoSuave` hasta que pase.
7. **Textos** (5 min): `textos` (titular, entradillas, rótulos de sección, notas de precios y del formulario, frases del test; `{aciertos}` y `{total}` se sustituyen solos), `equipo` y `faq`.
8. **Imágenes** (5 min): para fotos de los profesores, ponlas en `public/` y añade `foto: '/equipo/marta.jpg'` a cada persona. Regenera `public/og.png` con `node scripts/og.mjs` (usa el config y Chrome; necesita `playwright-core`, que está en las herramientas de `plantillas/`) y cambia `public/favicon.svg` si el cliente tiene su propio símbolo.
9. **Legal y modo real** (5 min): `legal` con la razón social, el NIF y el domicilio reales; `demo: false`; `meta.url` con el dominio final.
10. **Comprueba y publica** (5 min): `npm run comprobar` (sin errores ni restos de la demo) → `npm run build` → sube `dist/` a Cloudflare Pages (o conecta el repo: comando `npm run build`, salida `dist`). Prueba en el móvil: llamar, WhatsApp, cómo llegar, la calculadora con un par de permisos y el test.

## Personalización avanzada

- Estilos en `src/estilos/global.css`, ordenados por secciones (botones, cabecera, portada, placas, calculadora, carretera, test, horario, pie). Solo usan las variables `--c-*` del tema.
- Componentes en `src/componentes/`: `Portada` (cartel), `Permisos` (placas), `Calculadora`, `Carretera`, `Test`, `Equipo`, `Horario`, `Faq`, `Rotulo` (título de sección como placa) y los dibujos `Senal` + `Pictograma` (para añadir un pictograma, una entrada nueva en `Pictograma.astro` con trazos sobre una rejilla de 48 × 48).
- La lógica del presupuesto está en `src/lib/precio.ts` (la usan la página y el navegador) y los scripts en `src/scripts/`.
- Para quitar una sección, deja su lista vacía en el config (`equipo: []`, `faq: []`) y desaparece. Sin packs para un permiso, la calculadora oculta la elección de packs.

## Qué NO hace (y cómo añadirlo)

- No guarda matrículas ni reservas de clases: llegan como mensaje. Para agenda real de prácticas, enlaza un servicio externo en `accionPrincipal`, avisando de su política de privacidad.
- No cobra señales ni matrículas en línea. Si el cliente lo quiere, añade un enlace de pago de su banco en el texto de `notaFormulario` o en las FAQ.
- La tasa de la DGT y las edades mínimas no se actualizan solas: revísalas una vez al año (sede.dgt.gob.es).
- El plano de «Dónde estamos» es un dibujo esquemático, no un mapa real: el enlace «Cómo llegar» abre Google Maps.
