import { getImage } from 'astro:assets';
import type { CollectionEntry } from 'astro:content';
import type { Lang } from '../i18n/ui';
import { localePath } from '../i18n/utils';
import { getApps } from './apps';

/** El edificio de cada app visto a medio vuelo (fondo de su ficha) */
const fachadas = import.meta.glob<{ default: ImageMetadata }>('../assets/ciudad/fachadas/*.webp', { eager: true });
/** `sizes` de las imágenes de la ficha (AppDetail.astro) */
export const TAMANOS = { portada: '(min-width: 58rem) 55rem, 100vw', fachada: '100vw' } as const;

/** Ancho de la captura que la ciudad usa como textura de la ventana: al final del vuelo llena la pantalla */
const ANCHO_TEXTURA = 512;

/** Datos de una ventana de proyecto: solo valores serializables para pasarlos al motor como JSON */
export type VentanaApp = {
  slug: string;
  title: string;
  status: CollectionEntry<'apps'>['data']['status'];
  hue: string;
  /** Dominio que se ve en la barra de la ventana al salir de la fachada */
  domain: string;
  href: string;
  cover: { src: string; width: number; height: number };
  /**
   * Imágenes de la ficha (la captura de la portada y la fachada de fondo), con los mismos srcset
   * que usa la página: la ciudad las precarga y la ventana que sale aterriza con ellas ya puestas
   */
  ficha: { srcset: string; sizes: string }[];
  /** Planta fija de la ventana; sin ella, la colocación es automática */
  planta?: number;
};

export async function getCiudad(lang: Lang): Promise<VentanaApp[]> {
  const apps = await getApps(lang);
  return Promise.all(
    apps.map(async ({ slug, data }) => {
      const cover = await getImage({ src: data.cover, width: ANCHO_TEXTURA, format: 'webp' });
      // Mismas opciones que las <Image> de AppDetail.astro
      const portada = await getImage({ src: data.cover, widths: [800, 1280, 1600], sizes: TAMANOS.portada });
      const fachada = fachadas[`../assets/ciudad/fachadas/${slug}.webp`]?.default;
      const fondo = fachada ? await getImage({ src: fachada, widths: [800, 1280, 1920], sizes: TAMANOS.fachada }) : null;
      return {
        slug,
        title: data.title,
        status: data.status,
        hue: data.hue,
        domain: data.domain,
        href: localePath(lang, `/apps/${slug}`),
        cover: {
          src: cover.src,
          width: Number(cover.attributes.width),
          height: Number(cover.attributes.height),
        },
        planta: data.ciudad?.planta,
        ficha: [
          { srcset: portada.srcSet.attribute, sizes: TAMANOS.portada },
          ...(fondo ? [{ srcset: fondo.srcSet.attribute, sizes: TAMANOS.fachada }] : []),
        ],
      };
    }),
  );
}
