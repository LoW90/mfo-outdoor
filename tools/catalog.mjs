// The catalog in site/index.html, for mfo-mLintelligence's sister-store check (scripts/sister-stores.mjs --verify-catalogs).
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

export function loadResearch() {
  const context = { console, URL, Number, String, Object, JSON, Error, document: { readyState: 'loading', addEventListener() {} } };
  vm.createContext(context);
  vm.runInContext(script + '\n;globalThis.__catalog = { products: PRODUCTS.map(p => ({ id: p.id, brand: p.brand })) };', context);
  return JSON.parse(JSON.stringify(context.__catalog));
}
