import { defaultLang, ui, type Lang, type UiKey } from './ui';

export function getLang(url: URL): Lang {
  const [, first] = url.pathname.split('/');
  return first in ui ? (first as Lang) : defaultLang;
}

export function useT(lang: Lang) {
  return (key: UiKey) => ui[lang][key] ?? ui[defaultLang][key];
}

/** Ruta localizada: localePath('en', '/apps/x') -> '/en/apps/x' */
export function localePath(lang: Lang, path = '/') {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return lang === defaultLang ? clean : `/${lang}${clean === '/' ? '/' : clean}`;
}

/** Páginas con la ruta traducida: el primer tramo cambia con el idioma */
export const paginas = {
  apps: { es: '/apps/', en: '/apps/' },
  about: { es: '/sobre-mi/', en: '/about/' },
  contact: { es: '/contacto/', en: '/contact/' },
  juego: { es: '/explora/', en: '/explore/' },
} as const satisfies Record<string, Record<Lang, string>>;
export type Pagina = keyof typeof paginas;

/** Ruta localizada de una página: pagePath('en', 'about') -> '/en/about/' */
export const pagePath = (lang: Lang, pagina: Pagina) => localePath(lang, paginas[pagina][lang]);

/** Misma página en el otro idioma */
export function switchLangPath(url: URL, target: Lang) {
  const current = getLang(url);
  const rest = current === defaultLang ? url.pathname : url.pathname.slice(current.length + 1) || '/';
  const tramo = `/${rest.split('/')[1]}/`;
  const pagina = Object.values(paginas).find((p) => p[current] === tramo);
  return localePath(target, pagina ? rest.replace(tramo, pagina[target]) : rest);
}
