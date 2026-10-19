import { getImage } from 'astro:assets';
import type { CollectionEntry } from 'astro:content';
import type { Lang } from '../i18n/ui';
import { localePath } from '../i18n/utils';
import { getApps } from './apps';

/** Ancho de la captura que la ciudad usa como textura de la ventana */
const ANCHO_TEXTURA = 256;

/** Datos de una ventana de proyecto: solo valores serializables para pasarlos al motor como JSON */
export type VentanaApp = {
  slug: string;
  title: string;
  status: CollectionEntry<'apps'>['data']['status'];
  hue: string;
  href: string;
  cover: { src: string; width: number; height: number };
  /** Planta fija de la ventana; sin ella, la colocación es automática */
  planta?: number;
};

export async function getCiudad(lang: Lang): Promise<VentanaApp[]> {
  const apps = await getApps(lang);
  return Promise.all(
    apps.map(async ({ slug, data }) => {
      const cover = await getImage({ src: data.cover, width: ANCHO_TEXTURA, format: 'webp' });
      return {
        slug,
        title: data.title,
        status: data.status,
        hue: data.hue,
        href: localePath(lang, `/apps/${slug}`),
        cover: {
          src: cover.src,
          width: Number(cover.attributes.width),
          height: Number(cover.attributes.height),
        },
        planta: data.ciudad?.planta,
      };
    }),
  );
}
