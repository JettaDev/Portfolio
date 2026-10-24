# Clínica Eje: plantilla de fisioterapia

Web para una clínica de fisioterapia o un centro de rehabilitación en la que el paciente busca por lo que le duele, no por el nombre técnico: toca una zona del cuerpo y ve qué especialidades la tratan.

- **Demo:** `/plantillas/fisioterapia/` en el portfolio.
- **Tecnología:** Astro 7 (estático), CSS propio, JS sin librerías (unos 4 KB comprimidos en la portada). Fuentes: Source Serif 4 + Manrope (autoalojadas, subset latino, solo el eje de peso).
- **Archivo que se edita:** [`config.ts`](config.ts). Todo lo demás es diseño.

## Qué incluye

| Sección | Qué hace | Dónde se configura |
| --- | --- | --- |
| Cabecera | Logo, estado «abierto ahora», secciones, teléfono y «Pedir cita» | `negocio`, `horario`, `accionPrincipal` |
| Presentación | Titular, entradilla, pedir cita, llamar, dirección y estado | `textos.antetitulo`, `textos.titular`, `textos.entradilla` |
| ¿Dónde te duele? | Figura a línea con 8 zonas tocables y la misma lista en texto | `extra.zonas`, `items[].zonas`, `textos.mapa*` |
| Especialidades | Qué es, para qué sirve, zonas, duración de la sesión y precio orientativo, por grupos | `catalogo` |
| Tu primera visita | 4 pasos sobre una línea | `extra.primeraVisita`, `textos.visitaTitulo` |
| El equipo | Avatar de iniciales (o foto), especialidad y frase | `equipo` |
| Preguntas frecuentes | Acordeón nativo | `faq` |
| Pedir cita y ubicación | Formulario sin datos de salud, Maps, llamar, WhatsApp, vCard y horario | `formulario`, `extra.avisoSalud`, `contacto`, `horario` |
| Barra fija (móvil) | Pedir cita, llamar, cómo llegar | `accionPrincipal`, `contacto` |
| Aviso legal y privacidad | Generados desde `legal` | `legal`, `formulario.canal` |

**Funcionalidad propia:**

- **Mapa del cuerpo.** Cada zona es un `<button>` con `aria-pressed`, sobre la figura y en la lista de al lado. Al elegir una, se rellena su área en la figura, aparecen las especialidades que la tratan con «Ver especialidad» (anunciado con `aria-live`) y se filtra la sección de especialidades («Ver todas» quita el filtro). La zona **solo sirve para navegar**: no se guarda (ni en la URL ni en el navegador) y no se añade al mensaje.
- **Pedir cita.** Solo nombre, teléfono, especialidad, días preferidos (los días con consulta según el horario) y franja (mañana o tarde, con las horas sacadas del horario). Sin texto libre y con el aviso `extra.avisoSalud` a la vista. Valida nombre, teléfono (9 cifras), al menos un día y la franja; los errores se leen al enfocar el campo. «Pedir cita» en una especialidad la deja elegida en el formulario.

Ejemplo del mensaje que llega al negocio:

```
Hola, quería pedir cita en Clínica Eje:

• Nombre: Lucía Pérez
• Teléfono: 600 123 456
• Especialidad: Fisioterapia deportiva
• Días preferidos: lunes y miércoles
• Franja: tarde (16:00–21:00)

Gracias.
```

## Adaptar a un cliente real en menos de 1 hora

Necesitas del cliente: nombre y logo (o solo nombre), teléfono, WhatsApp, correo, dirección, horario, especialidades con duración y precio, equipo (nombre, especialidad y una frase), NIF y razón social, y fotos del equipo si las tiene.

1. **Exporta la plantilla** (5 min): `node plantillas/exportar.mjs fisioterapia ../clientes/<cliente>`, luego `cd` a esa carpeta, `git init` y `npm install`.
2. **Identidad** (5 min): en `config.ts`, `negocio` (nombre, nombre corto, eslogan, `logo.texto` o `logo.svg`) y `meta.titulo` / `meta.descripcion` con el barrio o la ciudad. Revisa `textos.antetitulo` y `textos.entradilla` (habla del número de fisioterapeutas).
3. **Contacto** (5 min): `contacto.telefono` en formato `+34…`, `telefonoVisible`, `whatsapp` (solo dígitos con 34 delante), `email`, `direccion`, `geo` (clic derecho en Google Maps → copiar coordenadas), `mapsUrl` (Compartir → copiar enlace de la ficha de Google) y `comoLlegar` (accesibilidad y aparcamiento).
4. **Horario** (5 min): `horario.franjas`. Los días y las franjas del formulario salen de aquí: las que abren antes de las 14:30 son «mañana» y el resto «tarde». `cierres` para vacaciones y `nota`.
5. **Especialidades** (15 min): `catalogo.categorias` e `items`, con `precio` en número (`40`, no `"40 €"`), `desde: true` si es «desde», `sesionMin` en minutos, `queEs` (una frase sin tecnicismos), `descripcion` («para qué») y `zonas` (ids de `extra.zonas`). Comprueba que cada zona tenga al menos una especialidad. `extra.primeraVisita`: 4 pasos.
6. **Colores** (5 min): `tema.colores` con los del cliente; `primarioSuave` es el relleno de la zona elegida y de la banda de la cita. Si `npm run comprobar` se queja del contraste, oscurece `primario` o `textoSuave`. El `acento` solo se usa en decoración y en números grandes.
7. **Textos** (5 min): `textos` (titulares, entradillas, botones), `equipo` y `faq`. Nada de «cura» ni «garantizado»; no nombres aseguradoras sin su permiso.
8. **Imágenes** (5 min): fotos del equipo en `public/equipo/…` y la ruta en `equipo[].foto` (si no, se dibujan las iniciales). Regenera `public/og.png` con `node scripts/og.mjs` (usa el config; necesita `playwright-core` y Chrome) y cambia los colores de `public/favicon.svg`.
9. **Legal y modo real** (5 min): `legal` con la razón social, el NIF y el domicilio reales; `demo: false`; `meta.url` con el dominio final. Lee la sección del RGPD de abajo con el cliente.
10. **Comprueba y publica** (5 min): `npm run comprobar` (sin errores ni restos de la demo) → `npm run build` → sube `dist/` a Cloudflare Pages (o conecta el repo: comando `npm run build`, salida `dist`). Prueba en el móvil: llamar, WhatsApp, cómo llegar, el mapa del cuerpo y el formulario.

## Personalización avanzada

- Estilos en `src/estilos/global.css` (variables `--c-*` del config, tipografías en `--serif` y `--sans`). Las fuentes se cargan en `src/layouts/Base.astro`.
- Secciones en `src/componentes/` (`MapaCuerpo`, `Especialidades`, `PrimeraVisita`, `Equipo`, `Preguntas`, `Reserva`); comportamiento en `src/scripts/mapa.ts` y `src/scripts/cita.ts`.
- La figura está en `src/figura.ts`: la silueta, las áreas que se rellenan (`AREAS`) y la posición de cada botón (`MARCAS`). Si añades una zona nueva en `extra.zonas`, dale posición en `MARCAS` y área en `AREAS`; si no, solo aparece en la lista de texto. Deja al menos 44 px entre botones a 190 px de ancho de figura.
- Para quitar una sección, deja su lista vacía en el config (`equipo: []`, `faq: []`, `extra.primeraVisita: []`) y desaparece.

## Qué NO hace (y cómo añadirlo)

- No guarda citas: llegan como mensaje. Para agenda real, enlaza el software de gestión de la clínica en `accionPrincipal` (y revisa el RGPD de abajo).
- No pide síntomas ni motivo de consulta, a propósito (ver abajo).
- No tiene blog, tienda de bonos ni pago online.

## RGPD si el cliente quiere más datos

> Orientación general para hablarlo con el cliente, no asesoramiento jurídico. Cualquier cambio en este sentido debe revisarlo un profesional (asesor en protección de datos o el delegado de protección de datos, DPD, de la clínica).

La plantilla pide solo nombre, teléfono, especialidad y cuándo le viene bien al paciente. Con eso la clínica trata **datos identificativos y de contacto**, y basta con la política de privacidad que se genera desde `legal`. Lo hemos dejado así a propósito: en cuanto el formulario pregunte **qué le pasa** al paciente, la clínica empieza a tratar datos de salud por un canal que no está pensado para ello.

**Por qué es distinto.** Los datos de salud son una **categoría especial de datos** (artículo 9 del RGPD). Su tratamiento está prohibido salvo que se dé alguna de las excepciones que prevé ese artículo, y se exigen más garantías. Si el cliente quiere añadir síntomas, motivo de consulta, zona del dolor, informes o cualquier campo libre, habría que revisar como mínimo:

- **Base jurídica y excepción del art. 9.** Además de la base del art. 6, hay que identificar qué excepción del art. 9 se aplica (por ejemplo, el consentimiento explícito del paciente o la asistencia sanitaria por profesionales sujetos a secreto). El consentimiento explícito debe ser una acción clara y separada (una casilla no marcada de antemano), informada y que se pueda retirar.
- **Cláusula informativa** junto al formulario y en la política de privacidad: responsable, finalidad, base jurídica, destinatarios, plazos de conservación, derechos y cómo reclamar ante la AEPD.
- **Registro de actividades de tratamiento**, con la nueva actividad (gestión de citas con datos de salud) y sus medidas de seguridad.
- **Evaluación de impacto.** El tratamiento de datos de salud puede requerirla; a valorar con el asesor según el volumen y el tipo de tratamiento (la AEPD publica una lista orientativa de tratamientos que la exigen).
- **Deber de secreto** de todo el personal que acceda a los datos (fisioterapeutas, recepción, gestoría, informáticos), por escrito.
- **Canal seguro.** No usar WhatsApp, SMS ni el correo normal para enviar o recibir datos clínicos: no están pensados para ello y quedan en dispositivos y servidores fuera del control de la clínica. Hace falta un sistema con cifrado en tránsito y en reposo, control de accesos y registro de quién consulta qué.
- **Encargados del tratamiento.** Cualquier proveedor que aloje o procese esos datos (software de gestión, hosting, copias de seguridad, formularios) necesita un **contrato de encargo de tratamiento** (art. 28 del RGPD), y conviene comprobar dónde están sus servidores.
- **Conservación.** Lo que el paciente cuente en consulta pasa a formar parte de su **historia clínica**, que tiene plazos mínimos de conservación según la Ley 41/2002, de autonomía del paciente, y la normativa sanitaria de Castilla-La Mancha. Los plazos concretos y su aplicación a una clínica privada deben confirmarse con el asesor.
- **Derechos de los pacientes** (acceso, rectificación, supresión, etc.), con las particularidades de la historia clínica.

**Recomendación.** No ampliar este formulario. Si la clínica quiere que el paciente explique su caso o rellene una anamnesis antes de la primera visita, lo razonable es usar un **software de gestión clínica** que ya cumpla estos requisitos (cifrado, contrato de encargo, registro de accesos, conservación de la historia clínica) y **enlazarlo** desde `accionPrincipal` o desde un botón de la sección de cita. Esta web seguiría sin tocar datos de salud. Antes de publicarlo, revisarlo con el asesor o DPD de la clínica y actualizar la política de privacidad con lo que indique.
