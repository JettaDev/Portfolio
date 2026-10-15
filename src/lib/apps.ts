import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from '../i18n/ui';

export type App = CollectionEntry<'apps'> & { slug: string };

export async function getApps(lang: Lang): Promise<App[]> {
  const entries = await getCollection('apps', (e) => e.id.startsWith(`${lang}/`) && !e.data.draft);
  return entries
    .map((e) => ({ ...e, slug: e.id.slice(lang.length + 1) }))
    .sort((a, b) => a.data.order - b.data.order || b.data.year - a.data.year);
}
