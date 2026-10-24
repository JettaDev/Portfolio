# Atelier Malva: plantilla de peluquería y estética

Web para una peluquería o centro de estética de barrio: carta de servicios con duración y precio, y una cita que se arma marcando servicios mientras un anillo de tiempo suma minutos y euros.

- **Demo:** `/plantillas/peluqueria/` en el portfolio.
- **Tecnología:** Astro 7 (estático), CSS propio, JS sin librerías (unos 5 KB comprimidos en la portada). Fuentes: Gloock (titulares) + Figtree (texto), autoalojadas y solo con el subconjunto latino.
- **Archivo que se edita:** [`config.ts`](config.ts). Todo lo demás es diseño.

## Qué incluye

| Sección | Qué hace | Dónde se configura |
| --- | --- | --- |
| Cabecera | Logo, estado «abierto ahora», teléfono y «Pedir cita» (fija en escritorio) | `negocio.logo`, `contacto`, `horario`, `textos.nav*` |
| Apertura | Titular, entradilla, «Pedir cita» / «Ver precios», dirección con enlace a Maps y el espejo en arco | `textos.antetitulo`, `textos.titular`, `textos.entradilla` |
| Servicios y precios | Carta por familias (nombre, duración, precio, «desde», favoritos) con índice | `catalogo` |
| Pide tu cita (`#reserva`) | El anillo de tiempo: servicios, día, franja, profesional y nombre | `catalogo`, `horario`, `equipo`, `extra`, `textos.paso*`, `textos.msg*` |
| El equipo | Retratos en arco con iniciales (o foto), especialidad y una frase | `equipo` |
| Horario y cómo llegar (`#horario`) | Rótulo en arco con el horario y el estado, dirección, Maps, llamar, WhatsApp, correo y vCard | `horario`, `contacto` |
| Preguntas | `<details>` nativos | `faq` |
| Barra fija (móvil) | Acción principal, llamar, cómo llegar | `accionPrincipal`, `contacto` |
| Aviso legal y privacidad | Generados desde `legal` | `legal`, `formulario.canal` |

**Funcionalidad propia — el anillo de tiempo:** al marcar servicios (casillas nativas, agrupadas en pestañas por familia) cada uno ocupa un tramo de un anillo SVG proporcional a su duración (`extra.anilloMaxMin` minutos llenan la vuelta). En el centro se muestran el total en euros (con «desde» si algún servicio lo lleva) y la duración, anunciados con `aria-live`. Los días son los próximos `extra.diasAntelacion` días abiertos según `horario` y `cierres` (hoy solo si queda al menos una hora de franja), y las franjas (mañana o tarde, partidas en `extra.corteMananaTarde`) solo las que abren ese día. En móvil el anillo queda fijo arriba mientras se eligen servicios; en escritorio es un resumen lateral fijo. Al enviar se abre WhatsApp (o el correo, según `formulario.canal`) con el mensaje.

Ejemplo del mensaje que llega al negocio:

```
Hola, quería pedir cita en Atelier Malva:

• Servicios: Lavado, corte y peinado
• Duración aproximada: 45 min
• Precio orientativo: 28 €
• Día: martes 27 de octubre
• Franja: tarde (14:00–19:30)
• Profesional: Lucía Sanz
• Nombre: Laura

Gracias.
```

## Adaptar a un cliente real en menos de 1 hora

Necesitas del cliente: nombre y logo (o solo nombre), teléfono, WhatsApp, correo, dirección, horario, lista de servicios con precio y duración aproximada, nombres y especialidad del equipo, NIF y razón social, y fotos del equipo si las tiene.

1. **Exporta la plantilla** (5 min): `node plantillas/exportar.mjs peluqueria ../clientes/<cliente>`, luego `cd` a esa carpeta, `git init` y `npm install`.
2. **Identidad** (5 min): en `config.ts`, `negocio` (nombre, nombre corto, eslogan, `logo.texto` o `logo.svg`) y `meta.titulo` / `meta.descripcion` con el barrio o la ciudad. Revisa `textos.antetitulo`, `textos.titular` y `formulario.saludo`, que llevan el nombre.
3. **Contacto** (5 min): `contacto.telefono` en formato `+34…`, `telefonoVisible`, `whatsapp` (solo dígitos con 34 delante), `email`, `direccion`, `geo` (clic derecho en Google Maps → copiar coordenadas) y `mapsUrl` (Compartir → copiar enlace de la ficha de Google del negocio).
4. **Horario** (5 min): `horario.franjas` (una por tramo; si cierra a mediodía, dos franjas para esos días), `cierres` para vacaciones y `nota`. Los días y franjas de la cita salen de aquí solos.
5. **Servicios** (15 min): `catalogo.categorias` (familias) e `items`, con precio en número (`28`, no `"28 €"`), `desde: true` si depende del largo, `precio: 0` para lo gratuito y `duracionMin` (minutos aproximados, es lo que llena el anillo). `destacado: true` añade el sello «Favorito de la casa». En `extra`: `diasAntelacion`, `anilloMaxMin` (minutos que llenan el anillo), `corteMananaTarde` y `textoAnillo`.
6. **Colores** (5 min): `tema.colores` con los del cliente. Si `npm run comprobar` se queja del contraste, oscurece `primario` o `textoSuave` hasta que pase. `acento` es solo para fondos y decoración.
7. **Textos** (5 min): `textos` (titulares, entradillas, pasos de la cita, errores y etiquetas del mensaje), `equipo` y `faq`.
8. **Imágenes** (5 min): fotos del equipo en `public/equipo/` y su ruta en `equipo[].foto` (si no hay, salen las iniciales en el arco). Regenera `public/og.png` con `node scripts/og.mjs` (toma nombre, eslogan, dirección y colores del config) y cambia los colores de `public/favicon.svg`.
9. **Legal y modo real** (5 min): `legal` con la razón social, el NIF y el domicilio reales; `demo: false`; `meta.url` con el dominio final.
10. **Comprueba y publica** (5 min): `npm run comprobar` (sin errores ni restos de la demo) → `npm run build` → sube `dist/` a Cloudflare Pages (o conecta el repo: comando `npm run build`, salida `dist`). Prueba en el móvil: llamar, WhatsApp, cómo llegar y pedir una cita de prueba.

## Personalización avanzada
- Estilos en `src/styles/global.css` (variables y secciones en orden de la página); cada sección es un componente en `src/components/`. La lógica de la cita está en `src/scripts/cita.ts`; la ilustración del espejo, en `src/components/Espejo.astro` (usa los colores del tema).
- Para quitar una sección, deja su lista vacía en el config (`equipo: []`, `faq: []`) y desaparece, también del menú y del paso «Profesional».
- Si el formulario va por correo (`formulario.canal: 'email'`), cambia también `textos.notaEnvio`, que menciona WhatsApp.

## Qué NO hace (y cómo añadirlo)
- No guarda citas ni comprueba huecos libres: la petición llega como mensaje y el negocio confirma la hora. Para agenda real, enlaza un servicio de reservas externo en `accionPrincipal`, avisando de su política de privacidad.
- No calcula precios por largo de pelo: los «desde» se suman como mínimo y el total sale como «desde».
- No tiene tienda ni tarjetas regalo en línea.
