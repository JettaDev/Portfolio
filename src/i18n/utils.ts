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

/** Misma página en el otro idioma */
export function switchLangPath(url: URL, target: Lang) {
  const current = getLang(url);
  const rest = current === defaultLang ? url.pathname : url.pathname.slice(current.length + 1) || '/';
  return localePath(target, rest);
}
