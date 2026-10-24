# Diseños aprobados

Una dirección visual por plantilla. Los colores van en `tema.colores` del config; los nombres entre paréntesis son las claves. Los contrastes están medidos: el texto normal necesita ≥ 4,5:1.

Común a las cuatro:
- **Primera pantalla en móvil:** qué es el negocio, el estado «abierto ahora» y la acción principal.
- **Barra fija inferior:** acción principal, llamar y cómo llegar.
- **«Añadir a contactos»:** enlace a la vCard.
- **Fuentes autoalojadas** con `@fontsource`.
- **Prohibido:** el esquema «hero grande + 3 tarjetas + footer», las rejillas de iconos genéricos y el aspecto de tema de WordPress.

---

## 1. Restaurante: «Mesón La Trébede», dirección «Comanda»

**Concepto:** papel de mantel y tinta. La carta parece una carta impresa y cada interacción es un ticket de comanda: el menú del día está clavado como un ticket y la reserva se va «imprimiendo».

**Paleta:**

| Uso | Clave | Color | Contraste |
| --- | --- | --- | --- |
| Papel | `fondo` | `#FBF6EC` | — |
| Ticket | `superficie` | `#FFFDF8` | — |
| Tinta | `texto` | `#231F1A` | 15,2:1 |
| Tinta suave | `textoSuave` | `#5E554B` | ≥ 6:1 |
| Vino | `primario` | `#7A1F2B` | 9,5:1 |
| Sobre vino | `textoSobrePrimario` | `#FBF6EC` | — |
| Aceite | `acento` | `#55652A` | 5,9:1 |
| Borde | `borde` | `#DCCFB8` | — |

Se puede añadir `papelOscuro` para las líneas de perforado.

**Tipografía:** Young Serif (`@fontsource/young-serif`) en titulares y precios, Public Sans (`@fontsource-variable/public-sans`) en el texto. Los precios van con cifras tabulares, alineados a la derecha con puntos guía, como en una carta impresa.

**Secciones:**
1. **Cabecera compacta:** logo de texto, estado «Abierto · cierra a las…», «Reservar» y teléfono.
2. **Menú del día:** ticket clavado con una chincheta SVG. Muestra el de hoy (primeros, segundos, postre, precio, qué incluye). Si hoy no hay, dice cuándo vuelve.
3. **Presentación:** el mesón en dos frases, con una ilustración SVG de una trébede o un horno de leña a línea de tinta.
4. **La carta:**
   - Pestañas por categoría (entrantes, asados, cuchara, postres, bebidas).
   - Un filtro «Soy alérgico a…» con chips de los 14 alérgenos de la UE (icono y nombre), que oculta los platos que los contienen y anuncia cuántos quedan.
   - Cada plato muestra sus alérgenos con icono y texto accesible.
5. **Reserva** (`#reserva`): la comanda. Ver «Detalle original».
6. **Grupos y celebraciones:** menús cerrados (`extra.menusGrupo`) y enlace al PDF si existe.
7. **Horario** (`#horario`) y **cómo llegar:** tabla de horario, dirección, pista y botón de Maps.
8. **Pie:** legal y vCard.

**Detalle original — la comanda:**
- **Campos:** personas (paso a paso de 1 a 12 con − y +), día (`input date`, a partir de hoy, avisando si ese día cierra), hora (las medias horas que caen dentro de las franjas de ese día), nombre y nota opcional.
- **Ticket en directo:** a la derecha en escritorio y debajo en móvil, un ticket con borde perforado se rellena línea a línea (`aria-live="polite"`).
- **Grupos:** a partir de `extra.umbralGrupo` personas (8), el ticket pasa a «Comanda de grupo» y pide el tipo de celebración y el menú de grupo elegido.
- **Envío:** el botón «Enviar comanda» abre WhatsApp con el resumen.
- **Animación:** el ticket entra como si saliera de la impresora (translateY y clip-path), sin animación con movimiento reducido.

**Datos ficticios:**
- Calle del Horno Viejo, 7 · 19001 Guadalajara · geo 40.6337, -3.1652.
- Tel. +34 949 000 101 · WhatsApp 34649000101 · reservas@ejemplo.es.
- Abre de martes a domingo a mediodía (13:00–16:30) y viernes y sábado por la noche (20:30–00:00). Cierra los lunes.

**Schema:** `Restaurant`, con `servesCuisine` en `extra` si se quiere.

**Campos propios de los items:** `alergenos: Alergeno[]` (lista cerrada de los 14) y `racion?: 'tapa' | 'media' | 'entera'`. **Extra:** `menuDelDia { dias, precio, incluye, primeros, segundos, postres }`, `umbralGrupo` y `menusGrupo[] { nombre, precio, descripcion }`.

---

## 2. Peluquería / estética: «Atelier Malva», dirección «Espejo»

**Concepto:** suave y luminoso. Marcos en arco de espejo de tocador para las ilustraciones y bordes redondeados generosos, pero con una tipografía con carácter para que no parezca un tema de spa genérico.

**Paleta:**

| Uso | Clave | Color | Contraste |
| --- | --- | --- | --- |
| Crema | `fondo` | `#F7F1EB` | — |
| Superficie | `superficie` | `#FFFBF7` | — |
| Tinta | `texto` | `#2B2128` | 13,9:1 |
| Tinta suave | `textoSuave` | `#625560` | ≥ 6:1 |
| Malva | `primario` | `#6B4466` | 7,1:1 |
| Sobre malva | `textoSobrePrimario` | `#FFFBF7` | — |
| Rosa empolvado | `acento` | `#E9CBC4` | solo fondos y decoración |
| Borde | `borde` | `#E2D3CB` | — |

**Tipografía:** Gloock (`@fontsource/gloock`) en titulares, Figtree (`@fontsource-variable/figtree`) en el texto.

**Secciones:**
1. **Cabecera:** logo, estado y «Pedir cita».
2. **Apertura:** frase y una ilustración SVG de un espejo en arco con reflejo, con «Pedir cita» y «Ver precios».
3. **Servicios y precios** por familia (pelo, color, uñas, estética), como lista elegante con nombre, duración y precio. No son tarjetas: es una carta de servicios.
4. **Pide tu cita** (`#reserva`): el anillo de tiempo. Ver «Detalle original».
5. **El equipo:** avatares en arco con iniciales y especialidad.
6. **Horario y ubicación.**
7. **FAQ** breve, con `<details>`.

**Detalle original — el anillo de tiempo:**
- **Selección:** al marcar servicios (casillas nativas con estilo propio), un anillo SVG se llena en proporción a la duración. En el centro, el total en € y la duración («1 h 45 min»), anunciados con `aria-live`.
- **Día y franja:** se elige día entre los próximos 14 abiertos (chips con «Hoy», «Mañana», «Jue 29») y franja (mañana o tarde, solo las que abren ese día).
- **Profesional y envío:** profesional opcional («Me da igual» por defecto), nombre y botón «Pedir cita por WhatsApp».
- **Móvil:** el anillo queda fijo en la parte alta del bloque mientras se eligen servicios.

**Datos ficticios:**
- Avenida de las Malvas, 14 · 19003 Guadalajara · geo 40.6301, -3.1702.
- Tel. +34 949 000 102 · WhatsApp 34649000102 · cita@ejemplo.es.
- Abre de martes a viernes de 9:30 a 19:30 de corrido y el sábado de 9:00 a 14:00.

**Schema:** `HairSalon` (o `["HairSalon", "BeautySalon"]`).

**Campos propios de los items:** `duracionMin: number`. **Extra:** `diasAntelacion: 14` y `textoAnillo`.

---

## 3. Autoescuela: «Autoescuela Rotonda», dirección «Señalética»

**Concepto:** el lenguaje de las señales de tráfico: azul de indicación, blanco y amarillo de obras, pictogramas propios en SVG. Se reconoce como autoescuela en medio segundo.

**Paleta:**

| Uso | Clave | Color | Contraste |
| --- | --- | --- | --- |
| Fondo | `fondo` | `#FFFFFF` | — |
| Superficie | `superficie` | `#F2F5F9` | — |
| Texto | `texto` | `#111111` | — |
| Texto suave | `textoSuave` | `#4A5260` | ≥ 7:1 |
| Azul de indicación | `primario` | `#0B4F9C` | blanco encima, 8,0:1 |
| Sobre azul | `textoSobrePrimario` | `#FFFFFF` | — |
| Amarillo de obras | `acento` | `#F5C400` | texto `#111111` encima, 11,5:1; nunca texto amarillo sobre blanco |
| Borde | `borde` | `#D5DCE6` | — |

Se puede añadir `rojo` (`#C8102E`) solo para los pictogramas.

**Tipografía:** Overpass (`@fontsource-variable/overpass`, inspirada en la letra de las señales de carretera) en titulares y rótulos, Atkinson Hyperlegible Next (`@fontsource-variable/atkinson-hyperlegible-next`) o Atkinson Hyperlegible (`@fontsource/atkinson-hyperlegible`) en el texto. Los rótulos son placas azules con esquinas redondeadas y borde blanco interior, como una señal de orientación.

**Secciones:**
1. **«¿Qué carnet quieres?»:** placas grandes AM, A2, A, B y C. Al tocar una, se configura la calculadora y se baja hasta ella.
2. **Calculadora** (`#reserva`): ver «Detalle original».
3. **De la matrícula al carnet:** la carretera. Ver «Detalle original».
4. **Mini-test:** 4 preguntas tipo DGT con pictogramas SVG propios. Cada respuesta se corrige al momento con su explicación y al final se ofrece «Matricúlate».
5. **Horario de oficina y de clases**, y ubicación.
6. **Preguntas frecuentes** (`<details>`).

**Detalle original:**
- **Calculadora:**
  - Se elige el permiso y el número de clases prácticas (paso a paso; por defecto, las recomendadas) o un pack (`extra.packs`).
  - El desglose suma matrícula, teórico, clases × precio y tasa DGT (`extra.tasaDGT`, con nota «tasa vigente a comprobar»). El total se anuncia con `aria-live`.
  - El botón «Matricularme» abre WhatsApp con el resumen.
- **La carretera:**
  - Una carretera vertical con línea discontinua y un coche SVG que avanza con el scroll. Va con `animation-timeline: view()` donde exista; donde no, queda estática.
  - Cada hito es una señal: matrícula, teórico, examen teórico, prácticas, examen práctico y carnet.
  - Con movimiento reducido, el coche no se mueve.

**Datos ficticios:**
- Calle de la Glorieta, 3 · 19005 Guadalajara · geo 40.6355, -3.1738.
- Tel. +34 949 000 103 · WhatsApp 34649000103 · matricula@ejemplo.es.
- Oficina de lunes a viernes, de 10:00 a 13:30 y de 16:30 a 20:30.

**Schema:** `["LocalBusiness", "DrivingSchool"]` (DrivingSchool no hereda de LocalBusiness en schema.org).

**Campos propios de los items:** `codigo` ('B', 'A2'…), `edadMinima`, `matricula`, `precioClase`, `clasesRecomendadas` y `pictograma` ('coche' | 'moto' | 'ciclomotor' | 'camion'). **Extra:** `tasaDGT`, `packs[] { permiso, nombre, clases, precio }`, `pasos[] { titulo, texto, senal }` y `test[] { pregunta, opciones, correcta, explicacion, pictograma }`.

---

## 4. Fisioterapia: «Clínica Eje», dirección «Mapa del cuerpo»

**Concepto:** calma y aire. Una figura humana dibujada a línea en SVG. El visitante busca por lo que le duele, no por el nombre técnico de la especialidad.

**Paleta:**

| Uso | Clave | Color | Contraste |
| --- | --- | --- | --- |
| Hueso | `fondo` | `#F6F7F4` | — |
| Superficie | `superficie` | `#FFFFFF` | — |
| Pizarra | `texto` | `#1F3344` | 12,1:1 |
| Texto suave | `textoSuave` | `#4C5D69` | ≥ 6:1 |
| Salvia | `primario` | `#2F5E4E` | 6,9:1 |
| Sobre salvia | `textoSobrePrimario` | `#FFFFFF` | — |
| Coral | `acento` | `#C2553A` | 4,2:1: **solo** decoración y textos ≥ 24 px |
| Borde | `borde` | `#DCE2DC` | — |

**Tipografía:** Source Serif 4 (`@fontsource-variable/source-serif-4`) en titulares, Manrope (`@fontsource-variable/manrope`) en el texto.

**Secciones:**
1. **Cabecera:** logo, estado y «Pedir cita».
2. **«¿Dónde te duele?»:** el mapa del cuerpo. Ver «Detalle original».
3. **Especialidades** en lenguaje llano: qué es, para qué sirve, cuánto dura la sesión y precio orientativo.
4. **Tu primera visita, paso a paso:** 4 pasos.
5. **El equipo:** avatares de iniciales en SVG, especialidad y frase.
6. **Preguntas frecuentes:** ¿necesito volante?, ¿trabajáis con aseguradoras? (sin nombrar ninguna real), ¿qué ropa traigo?
7. **Pedir cita** (`#reserva`) y ubicación.

**Detalle original — el mapa del cuerpo:**
- **La figura:** silueta frontal SVG a línea, con 8 zonas: cuello, hombro, espalda alta, lumbar, codo y muñeca, cadera, rodilla, tobillo y pie.
- **Accesibilidad:** cada zona es un `<button>` con nombre accesible. Al lado, la misma lista en texto, para teclado y lectores de pantalla.
- **Al tocar una zona:** se resalta (salvia con relleno suave), se muestran las especialidades que la tratan y aparece «Ver especialidad».
- **Privacidad:** es solo navegación. La zona no se guarda ni se añade al mensaje.

**Formulario de cita, sin datos de salud:**
- **Campos:** nombre, teléfono, especialidad (lista), días preferidos (casillas L-V) y franja (mañana o tarde). Nada más: sin texto libre.
- **Aviso visible:** «No incluyas información sobre tu salud; lo hablaremos en consulta».

**Datos ficticios:**
- Paseo del Eje, 21 · 19004 Guadalajara · geo 40.6290, -3.1615.
- Tel. +34 949 000 104 · WhatsApp 34649000104 · citas@ejemplo.es.
- De lunes a viernes, de 9:00 a 14:00 y de 16:00 a 21:00.

**Schema:** `Physiotherapy`.

**Campos propios de los items:** `zonas: Zona[]`, `sesionMin` y `queEs` (una frase llana). **Extra:** `zonas[] { id, nombre }`, `primeraVisita[] { titulo, texto }` y `avisoSalud`.

**README:** sección «RGPD si el cliente quiere más datos».
