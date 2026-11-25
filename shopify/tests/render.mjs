/** Standalone room store (D-038): copied unchanged from LoW90/mfo-mLintelligence portfolio/standalone/tests.
 *  Local stand-in for Shopify's renderer, for tests and previews only. It renders theme/ with liquidjs and a small set of
 *  Shopify filters, tags and objects (mock store data), close enough to exercise the markup and the browser script.
 *  It is not Shopify: real rendering is confirmed only by uploading the theme to a development store.
 *  node tests/render.mjs -> preview/ (index, product, collection, search, cart, 404, password + assets) */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Liquid, Tag} from 'liquidjs';
import {loadCatalog} from '../build.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const theme = path.join(root, 'theme');
const schemaOf = file => { const m = fs.readFileSync(file, 'utf8').match(/{%\s*schema\s*%}([\s\S]*?){%\s*endschema\s*%}/); return m ? JSON.parse(m[1]) : {settings: []}; };
const defaults = settings => Object.fromEntries((settings || []).filter(s => s.id).map(s => [s.id, s.default ?? (s.type === 'checkbox' ? false : null)]));

/** Mock Shopify products from the catalog, as the CSV import would create them. */
export function storeProducts(c = loadCatalog(), {only = null, withImage = null, extra = []} = {}) {
  return [...c.products.filter(p => !only || only.includes(p.handle)).map(p => ({handle: p.handle, title: p.name, vendor: p.brand, type: c.kinds[p.kind] || p.kind,
    tags: ['kind:' + p.kind, 'research-record'], url: '/products/' + p.handle, description: `<p>${p.note}</p>`,
    featured_image: p.handle === withImage ? {src: 'https://example.invalid/' + p.handle + '.jpg', alt: 'Product photo'} : null, object_type: 'product'})), ...extra];
}

/* Shopify objects are visible inside {% render %} snippets, so they go in as liquidjs globals. */
function engine(globals) {
  const liquid = new Liquid({root: [path.join(theme, 'snippets'), path.join(theme, 'sections')], extname: '.liquid', jsTruthy: false, ownPropertyOnly: false, globals});
  const f = (n, fn) => liquid.registerFilter(n, fn);
  f('asset_url', v => (globals.asset_base || '/assets/') + v);
  f('image_url', v => v && typeof v === 'object' ? v.src : v);
  f('image_tag', (src, ...args) => { const o = Object.fromEntries(args.filter(Array.isArray)); return `<img src="${src}" alt="${o.alt ?? ''}" loading="${o.loading ?? 'lazy'}">`; });
  f('video_tag', (v, ...args) => { const o = Object.fromEntries(args.filter(Array.isArray)); const flags = ['controls', 'muted', 'loop', 'playsinline', 'autoplay'].filter(k => o[k]).join(' '); return v && v.sources ? `<video ${flags} poster="${v.preview_image?.src ?? ''}">${v.sources.map(x => `<source src="${x.url}" type="${x.mime_type}">`).join('')}</video>` : ''; });
  f('stylesheet_tag', v => `<link rel="stylesheet" href="${v}">`);
  f('json', v => v === undefined || v === null ? 'null' : JSON.stringify(v));
  f('default_errors', v => v ? String(v) : '');
  f('default_pagination', () => '');
  f('truncatewords', (v, n = 15) => String(v ?? '').split(/\s+/).slice(0, n).join(' '));
  f('strip_html', v => String(v ?? '').replace(/<[^>]*>/g, ''));
  f('preload_tag', (v, ...args) => `<link rel="preload" href="${v}" as="font" type="font/woff2" crossorigin>`);
  f('money', v => '$' + (Number(v || 0) / 100).toFixed(2));
  f('format_code', v => v);
  liquid.registerTag('schema', class extends Tag { constructor(t, r, l) { super(t, r, l); r.shift(); while (r.length) { const x = r.shift(); if (x.name === 'endschema') return; } } *render() { return ''; } });
  liquid.registerTag('form', class extends Tag {
    constructor(t, remain, l) { super(t, remain, l); this.tpls = []; this.kind = t.args.split(',')[0].trim().replace(/['"]/g, ''); const s = this.liquid.parser.parseStream(remain).on('tag:endform', () => s.stop()).on('template', x => this.tpls.push(x)).on('end', () => { throw new Error('form not closed'); }); s.start(); }
    *render(ctx, emitter) { emitter.write(`<form method="post" action="/${this.kind === 'storefront_password' ? 'password' : ''}"><input type="hidden" name="form_type" value="${this.kind}">`); ctx.push({form: {errors: null}}); yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter); ctx.pop(); emitter.write('</form>'); }
  });
  liquid.registerTag('paginate', class extends Tag {
    constructor(t, remain, l) { super(t, remain, l); this.tpls = []; const s = this.liquid.parser.parseStream(remain).on('tag:endpaginate', () => s.stop()).on('template', x => this.tpls.push(x)).on('end', () => { throw new Error('paginate not closed'); }); s.start(); }
    *render(ctx, emitter) { ctx.push({paginate: {}}); yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter); ctx.pop(); }
  });
  liquid.registerTag('sections', class extends Tag {
    constructor(t, r, l) { super(t, r, l); this.group = t.args.trim().replace(/['"]/g, ''); }
    *render(ctx, emitter) { const g = JSON.parse(fs.readFileSync(path.join(theme, 'sections', this.group + '.json'), 'utf8')); emitter.write(yield renderSections(liquid, g, ctx.getAll())); }
  });
  return liquid;
}

async function renderSections(liquid, json, globals) {
  let out = '';
  for (const key of json.order) {
    const s = json.sections[key]; const file = path.join(theme, 'sections', s.type + '.liquid'); const schema = schemaOf(file);
    const html = await liquid.parseAndRender(fs.readFileSync(file, 'utf8'), {...globals, section: {id: key, settings: {...defaults(schema.settings), ...s.settings, ...globals.section_settings?.[key]}}});
    out += `<div id="shopify-section-${key}" class="shopify-section">${html}</div>`;
  }
  return out;
}

/** Render one page. template: index | product | collection | search | cart | 404 | password. */
export async function renderPage({template = 'index', products = storeProducts(), handle = null, settings = {}, extra = {}, terms = '', assetBase = '/assets/'} = {}) {
  const schema = JSON.parse(fs.readFileSync(path.join(theme, 'config/settings_schema.json'), 'utf8'));
  const product = handle ? products.find(p => p.handle === handle) : null;
  const results = terms ? products.filter(p => (p.title + ' ' + p.vendor).toLowerCase().includes(terms.toLowerCase())) : [];
  const c = loadCatalog();
  const globals = {asset_base: assetBase, all_products: Object.fromEntries(products.map(p => [p.handle, p])), settings: {...Object.fromEntries(schema.flatMap(g => Object.entries(defaults(g.settings)))), ...settings}, template: {name: template},
    routes: {root_url: '/', search_url: '/search', all_products_collection_url: '/collections/all'}, request: {locale: {iso_code: 'en'}}, shop: {name: c.name, password_message: 'Opening soon.'},
    page_title: product ? product.title : c.name, canonical_url: 'https://example.invalid/', content_for_header: '',
    product, collection: template === 'collection' ? {title: 'All pieces', products} : null, collections: {all: {products}},
    search: {performed: !!terms, terms, results}};
  Object.assign(globals, extra);
  const liquid = engine(globals);
  const json = JSON.parse(fs.readFileSync(path.join(theme, 'templates', template + '.json'), 'utf8'));
  const content = await renderSections(liquid, json, globals);
  const layout = fs.readFileSync(path.join(theme, 'layout', (json.layout || 'theme') + '.liquid'), 'utf8');
  return liquid.parseAndRender(layout, {...globals, content_for_layout: content});
}

/** Write a browsable preview with the theme assets beside the pages. */
export async function writePreview(dir = path.join(root, 'preview'), opts = {}) {
  fs.rmSync(dir, {recursive: true, force: true}); fs.mkdirSync(path.join(dir, 'assets'), {recursive: true});
  for (const f of fs.readdirSync(path.join(theme, 'assets'))) fs.copyFileSync(path.join(theme, 'assets', f), path.join(dir, 'assets', f));
  const pages = {'index.html': {template: 'index'}, 'product.html': {template: 'product', handle: loadCatalog().products[0].handle}, 'collection.html': {template: 'collection'},
    'search.html': {template: 'search', terms: loadCatalog().makers[0].name.split(' ')[0]}, 'cart.html': {template: 'cart'}, '404.html': {template: '404'}, 'password.html': {template: 'password'}};
  for (const [file, o] of Object.entries(pages)) fs.writeFileSync(path.join(dir, file), await renderPage({assetBase: 'assets/', ...opts, ...o}));
  return dir;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log('Preview written to', path.relative(process.cwd(), await writePreview()));
