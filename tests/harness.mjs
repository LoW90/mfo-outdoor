// Runs the page's inline script in a bare context (init never runs). It checks logic and data; browser.test.mjs covers the real page.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

export const root = new URL('..', import.meta.url).pathname;
export const html = readFileSync(root + 'site/index.html', 'utf8');
export const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

export function load() {
  const context = { console, URL, Number, String, Object, JSON, Error, document: { readyState: 'loading', addEventListener() {} } };
  vm.createContext(context);
  vm.runInContext(script + '\n;globalThis.__api = { PRODUCTS, PROGRAMS, BUILD, BRANDS, FILMS, HERO_FILM, recommend, goLink, esc, money };', context);
  return context.__api;
}
