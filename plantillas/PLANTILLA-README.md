# {Nombre del negocio ficticio}: plantilla de {tipo de negocio}

{Una frase: para qué negocio sirve y qué tiene de especial}.

- **Demo:** `/plantillas/{slug}/` en el portfolio.
- **Tecnología:** Astro 7 (estático), CSS propio, JS sin librerías. Fuentes: {familia titular} + {familia texto} (autoalojadas).
- **Archivo que se edita:** [`config.ts`](config.ts). Todo lo demás es diseño.

## Qué incluye

| Sección | Qué hace | Dónde se configura |
| --- | --- | --- |
| {Cabecera} | {…} | `negocio`, `textos.titular` |
| {…} | {…} | {…} |
| Barra fija (móvil) | Acción principal, llamar, cómo llegar | `accionPrincipal`, `contacto` |
| Horario | Estado «abierto ahora» y tabla | `horario` |
| Aviso legal y privacidad | Generados desde `legal` | `legal`, `formulario.canal` |

**Funcionalidad propia:** {descripción breve de lo interactivo y del mensaje que genera}.

Ejemplo del mensaje que llega al negocio:

```
{mensaje de ejemplo}
```

## Adaptar a un cliente real en menos de 1 hora

Necesitas del cliente: nombre y logo (o solo nombre), teléfono, WhatsApp, correo, dirección, horario, {catálogo: carta / servicios / precios…}, NIF y razón social, y 3-4 fotos propias si las tiene.

1. **Exporta la plantilla** (5 min): `node plantillas/exportar.mjs {slug} ../clientes/<cliente>`, luego `cd` a esa carpeta, `git init` y `npm install`.
2. **Identidad** (5 min): en `config.ts`, `negocio` (nombre, nombre corto, eslogan, `logo.texto` o `logo.svg`) y `meta.titulo` / `meta.descripcion` con el barrio o la ciudad.
3. **Contacto** (5 min): `contacto.telefono` en formato `+34…`, `telefonoVisible`, `whatsapp` (solo dígitos con 34 delante), `email`, `direccion`, `geo` (clic derecho en Google Maps → copiar coordenadas) y `mapsUrl` (Compartir → copiar enlace de la ficha de Google del negocio).
4. **Horario** (5 min): `horario.franjas` (una por tramo; si cierra después de medianoche, `cierra` menor que `abre`), `cierres` para vacaciones y `nota`.
5. **{Catálogo}** (15 min): `catalogo.categorias` e `items`, con precios en número (`12.5`, no `"12,50 €"`). {Campos propios: alérgenos / duración / tipo de permiso / zonas…}. `extra`: {menú del día / packs / …}.
6. **Colores** (5 min): `tema.colores` con los del cliente. Si `npm run comprobar` se queja del contraste, oscurece `primario` o `textoSuave` hasta que pase.
7. **Textos** (5 min): `textos` (titular, entradillas, llamadas a la acción), `equipo` y `faq`.
8. **Imágenes** (5 min): sustituye `public/{…}` por fotos del cliente con los mismos nombres o cambia las rutas en el config; regenera `public/og.png` (1200 × 630) y `public/favicon.svg`.
9. **Legal y modo real** (5 min): `legal` con la razón social, el NIF y el domicilio reales; `demo: false`; `meta.url` con el dominio final.
10. **Comprueba y publica** (5 min): `npm run comprobar` (sin errores ni restos de la demo) → `npm run build` → sube `dist/` a Cloudflare Pages (o conecta el repo: comando `npm run build`, salida `dist`). Prueba en el móvil: llamar, WhatsApp, cómo llegar y el formulario.

## Personalización avanzada
- {Qué tocar en `src/` para cambios de diseño mayores: estilos en …, componentes en …}.
- Para quitar una sección, deja su lista vacía en el config (`equipo: []`, `faq: []`) y desaparece.

## Qué NO hace (y cómo añadirlo)
- No guarda reservas ni citas: llegan como mensaje. Para agenda real, enlaza un servicio externo en `accionPrincipal`, avisando de su política de privacidad.
- {…}

{Solo clínica: sección «RGPD si el cliente quiere más datos».}
