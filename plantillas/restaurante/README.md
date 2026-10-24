# Mesón La Trébede: plantilla de restaurante

Web para un mesón, asador o casa de comidas con carta, menú del día y reservas: todo parece papel de mantel y tinta, y la reserva es una comanda que se va «imprimiendo» mientras se rellena.

- **Demo:** `/plantillas/restaurante/` en el portfolio.
- **Tecnología:** Astro 7 (estático), CSS propio, JS sin librerías (≈ 6 KB comprimido en la portada). Fuentes: Young Serif + Public Sans (autoalojadas, solo subconjunto latino).
- **Archivo que se edita:** [`config.ts`](config.ts). Todo lo demás es diseño.

## Qué incluye

| Sección | Qué hace | Dónde se configura |
| --- | --- | --- |
| Cabecera | Logo, estado «Abierto · cierra a las…», teléfono y «Reservar mesa» | `negocio`, `horario`, `accionPrincipal` |
| Portada | Qué es y dónde está, con «Reservar» y «Ver la carta» | `textos.antetitulo`, `textos.titular`, `textos.entradilla`, `contacto.direccion` |
| Menú del día | Ticket clavado con chincheta: el de hoy o, si hoy no hay, cuándo vuelve y cuál será | `extra.menuDelDia` |
| La casa | Dos frases, ilustración de la trébede (o foto) y quién cocina | `textos.presentacion*`, `equipo`, `extra.fotoPresentacion` |
| La carta | Pestañas por categoría, precios con puntos guía y filtro «Soy alérgico a…» con los 14 alérgenos | `catalogo` |
| La comanda (`#reserva`) | Formulario de reserva con ticket en directo | `extra.umbralGrupo`, `extra.maxPersonas`, `extra.ultimaMesaMin`, `extra.celebraciones`, `formulario` |
| Grupos y celebraciones | Menús cerrados; «Elegir este menú» prepara la comanda de grupo | `extra.menusGrupo`, `extra.pdfGrupos` |
| Antes de venir | Preguntas frecuentes con `<details>` | `faq` |
| Horario y cómo llegar (`#horario`) | Tabla día a día con hoy marcado, cierres por vacaciones, dirección, Maps, llamar y vCard | `horario`, `contacto` |
| Barra fija (móvil) | Reservar mesa, llamar, cómo llegar | `accionPrincipal`, `contacto` |
| Aviso legal y privacidad | Generados desde `legal` | `legal`, `formulario.canal` |

**Funcionalidad propia:**
- **Filtro de alérgenos:** al marcar uno o varios de los 14 alérgenos de la UE se ocultan los platos que los llevan, se actualiza el número de platos de cada pestaña y se anuncia cuántos quedan (`aria-live`). Cada plato muestra sus alérgenos con icono y nombre.
- **La comanda:** personas con − y +, día a partir de hoy (avisa si ese día se cierra, por día de la semana o por vacaciones), hora entre las medias horas de las franjas de ese día hasta `ultimaMesaMin` antes del cierre (hoy, solo las que quedan), nombre y nota. A partir de `umbralGrupo` personas pasa a «Comanda de grupo» y pide la celebración y el menú. «Enviar comanda» abre WhatsApp (o el correo, según `formulario.canal`) con el resumen.

Ejemplo del mensaje que llega al negocio:

```
Hola, quería reservar mesa en el Mesón La Trébede:

• Personas: 10 (grupo)
• Día: viernes 30 de octubre
• Hora: 21:00
• Nombre: Lucía Martín
• Celebración: Cumpleaños
• Menú de grupo: Menú del Horno (45 € por persona)
• Nota: Con una trona, por favor

Gracias.
```

## Adaptar a un cliente real en menos de 1 hora

Necesitas del cliente: nombre y logo (o solo nombre), teléfono, WhatsApp, correo, dirección, horario, la carta con precios y alérgenos, el menú del día y los menús de grupo, NIF y razón social, y 3-4 fotos propias si las tiene.

1. **Exporta la plantilla** (5 min): `node plantillas/exportar.mjs restaurante ../clientes/<cliente>`, luego `cd` a esa carpeta, `git init` y `npm install`.
2. **Identidad** (5 min): en `config.ts`, `negocio` (nombre, nombre corto, eslogan, `logo.texto` o `logo.svg`) y `meta.titulo` / `meta.descripcion` con el barrio o la ciudad. Si el nombre termina en el texto del logo («Mesón» + «La Trébede»), lo que va delante sale como antetítulo pequeño.
3. **Contacto** (5 min): `contacto.telefono` en formato `+34…`, `telefonoVisible`, `whatsapp` (solo dígitos con 34 delante), `email`, `direccion`, `geo` (clic derecho en Google Maps → copiar coordenadas) y `mapsUrl` (Compartir → copiar enlace de la ficha de Google del negocio).
4. **Horario** (5 min): `horario.franjas` (una por tramo; si cierra a medianoche o después, `cierra` menor o igual que `abre`, p. ej. `20:30`–`00:00`), `cierres` para vacaciones (también bloquean la comanda y el menú del día) y `nota`. `extra.ultimaMesaMin` marca hasta cuándo se puede reservar en cada franja.
5. **Carta** (15 min): `catalogo.categorias` e `items`, con precios en número (`12.5`, no `"12,50 €"`). En cada plato, `alergenos` con los identificadores de [`src/datos/alergenos.ts`](src/datos/alergenos.ts) (`gluten`, `lacteos`, `frutosCascara`…; vacío si no lleva ninguno), `racion` opcional (`tapa`, `media`, `entera`) y `destacado: true` para el sello «De la casa». `extra.menuDelDia`: días, precio, qué incluye y platos (los de `porDia` sustituyen a los generales ese día). `extra.menusGrupo`, `umbralGrupo`, `maxPersonas` y `celebraciones`.
6. **Colores** (5 min): `tema.colores` con los del cliente (`papelOscuro` es el de los perforados y fondos de apoyo). Si `npm run comprobar` se queja del contraste, oscurece `primario` o `textoSuave` hasta que pase.
7. **Textos** (5 min): `textos` (titular, entradillas, antetítulos de sección, avisos de la comanda), `equipo` y `faq`.
8. **Imágenes** (5 min): para una foto en «La casa», ponla en `public/` y rellena `extra.fotoPresentacion` (`src` y `alt`). Si hay PDF de menús de grupo, en `public/` y `extra.pdfGrupos`. Regenera `public/og.png` con `node scripts/og.mjs` (necesita `npm i -D playwright-core` y Chrome) y cambia `public/favicon.svg`.
9. **Legal y modo real** (5 min): `legal` con la razón social, el NIF y el domicilio reales; `demo: false`; `meta.url` con el dominio final.
10. **Comprueba y publica** (5 min): `npm run comprobar` (sin errores ni restos de la demo) → `npm run build` → sube `dist/` a Cloudflare Pages (o conecta el repo: comando `npm run build`, salida `dist`). Prueba en el móvil: llamar, WhatsApp, cómo llegar, el filtro de alérgenos y una comanda de grupo.

## Personalización avanzada
- Estilos generales (tipografías, botones, tickets, perforados, barra y diálogo de demo) en `src/estilos/global.css`; cada sección tiene los suyos en su componente de `src/componentes/` (`Carta.astro`, `Comanda.astro`, `MenuDelDia.astro`…).
- Ilustraciones en línea: `Trebede.astro` (la casa), `Plano.astro` (plano dibujado, no es un mapa real) e `Iconos.astro` (alérgenos e interfaz). Toman los colores del tema.
- Para quitar una sección, deja su lista vacía en el config (`equipo: []`, `faq: []`, `menusGrupo: []`) y desaparece; la numeración de las secciones se recalcula.

## Qué NO hace (y cómo añadirlo)
- No guarda reservas: llegan como mensaje y se confirman a mano. Para agenda real, enlaza un servicio externo en `accionPrincipal`, avisando de su política de privacidad.
- No comprueba aforo ni mesas libres: las horas son las del horario, no las disponibles.
- No tiene carta en otros idiomas ni pedidos para llevar.
- Los alérgenos los declara el restaurante: la plantilla solo los muestra y filtra. Revísalos con cocina antes de publicar.
