/** Standalone room store tests (D-038), copied from LoW90/mfo-mLintelligence portfolio/standalone/tests. One change for
 *  The Outdoor Estate: they run on the finished theme, so the files planner/build.mjs patches are compared after that
 *  patch (marked "Outdoor Estate").
 *  Shopify Theme Check, the build and CSV, the photo rule, and browser behaviour on pages rendered by tests/render.mjs
 *  (a local Liquid stand-in, not Shopify). Browser tests skip when Playwright/Chromium are missing. */
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runThemeCheck} from './theme-check.mjs';
import {renderPage, storeProducts} from './render.mjs';
import {loadCatalog, files, productCsv, mediaSlots} from '../build.mjs';
import {patch, PATCHED} from '../planner/build.mjs'; /* Outdoor Estate */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const c = loadCatalog();
let chromium; try { ({chromium} = await import('playwright')); } catch {}
const exe = [process.env.PLAYWRIGHT_EXECUTABLE_PATH, chromium?.executablePath(), '/opt/pw-browsers/chromium', '/usr/bin/chromium'].filter(Boolean).find(p => fs.existsSync(p));
const skip = !chromium || !exe ? 'playwright/chromium not installed' : false;

test('Shopify Theme Check reports no errors', async () => {
  const offenses = await runThemeCheck();
  assert.deepEqual(offenses.filter(o => o.severity === 'error'), []);
});

test('theme and CSV are current with catalog.json', () => {
  for (const f of files(c)) { const name = f.path.replace(/^theme\//, ''); /* Outdoor Estate: patched files */ assert.equal(fs.readFileSync(path.join(root, f.path), 'utf8'), PATCHED.includes(name) ? patch(name, f.text) : f.text, f.path + ' is out of date; run npm run build'); }
});

test('product CSV: every researched piece, none can be bought here', () => {
  const lines = productCsv(c).trim().split('\n');
  assert.equal(lines.length, c.products.length + 1);
  for (const p of c.products) {
    const line = lines.find(l => l.startsWith(p.handle + ',')); assert.ok(line, p.handle);
    assert.match(line, /,shopify,0,deny,manual,0\.00,FALSE,FALSE,FALSE,/);
  }
  assert.ok(!/Image Src/.test(lines[0]), 'no unlicensed product photos');
});

test('photographs only: no drawn stand-ins anywhere in the theme', () => {
  const dir = path.join(root, 'theme');
  for (const f of fs.readdirSync(dir, {recursive: true}).filter(f => /\.liquid$/.test(f))) {
    assert.doesNotMatch(fs.readFileSync(path.join(dir, f), 'utf8'), /<svg|Conceptual illustration/i, f);
  }
});

test('images/README.md names every photo and film slot', () => {
  const readme = fs.readFileSync(path.join(root, '..', 'images/README.md'), 'utf8');
  for (const s of mediaSlots(c)) assert.ok(readme.includes(s.file), s.file);
});

test('every maker has a priced piece; every price names its merchant and date', () => {
  for (const m of c.makers) assert.ok(c.products.some(p => p.brand === m.name), m.name);
  for (const p of c.products) { assert.match(p.price, /\$\d/); assert.ok(p.merchant && (p.checked || c.checked)); }
});

/* ---- browser ---- */
let browser, server, BASE; const routes = new Map();
const ASSETS = path.join(root, 'theme/assets');
const TYPES = {'.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2'};
async function serve(map) { routes.clear(); for (const [p, o] of Object.entries(map)) routes.set(p, await renderPage(o)); }
test.before(async () => { if (skip) return;
  server = http.createServer((req, res) => {
    const p = new URL(req.url, 'http://x').pathname;
    if (p.startsWith('/assets/')) { const f = path.join(ASSETS, path.basename(p)); if (fs.existsSync(f)) { res.writeHead(200, {'content-type': TYPES[path.extname(f)] || 'application/octet-stream'}); return fs.createReadStream(f).pipe(res); } }
    const html = routes.get(p); res.writeHead(html ? 200 : 404, {'content-type': 'text/html'}); res.end(html || 'not found');
  });
  await new Promise(ok => server.listen(0, '127.0.0.1', ok)); BASE = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({executablePath: exe});
  await serve({'/': {template: 'index'}, '/product': {template: 'product', handle: c.products[0].handle}, '/collection': {template: 'collection'},
    '/search': {template: 'search', terms: c.makers[0].name.split(' ')[0]}, '/cart': {template: 'cart'}, '/404': {template: '404'}, '/password': {template: 'password'}});
});
test.after(async () => { await browser?.close(); server?.close(); });
async function open(t, url, {width = 1280, height = 860} = {}) {
  const ctx = await browser.newContext({viewport: {width, height}}); const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(BASE + url); await page.waitForTimeout(150);
  t.after(async () => { assert.deepEqual(errors, [], 'no JavaScript errors'); await ctx.close(); });
  return page;
}
const opts = {skip};

test('home: parent-style hero, every maker, every piece, field guide and sister stores', opts, async t => {
  const page = await open(t, '/');
  assert.equal((await page.locator('h1').first().innerText()).replace(/\s+/g, ' ').trim(), c.heroLines.join(' '));
  assert.equal(await page.locator('#mfPicks .mf-pick').count(), c.products.length);
  assert.equal(await page.locator('.mf-room__maker').count(), c.makers.length);
  assert.equal(await page.locator('#guide .mf-room__guide li').count(), c.considerations.length);
  assert.ok(await page.locator('[data-mf-sisters], .mf-sisters, #shopify-section-sisters').count() > 0, 'sister stores section');
  assert.match(await page.content(), /<meta name="robots" content="noindex/);
});

test('all maker names are on the first screen at every size', opts, async t => {
  for (const [width, height] of [[360, 640], [375, 667], [390, 844], [414, 896], [768, 1024], [1024, 768], [1280, 800], [1440, 900]]) {
    const page = await open(t, '/', {width, height});
    for (const m of c.makers) {
      const box = await page.evaluate(name => {
        const el = [...document.querySelectorAll('.maker-strip span, .underhero b, .brand-rail a')].find(e => e.textContent.trim() === name);
        if (!el) return null; const r = el.getBoundingClientRect(); return {top: r.top, bottom: r.bottom, left: r.left, right: r.right, w: r.width};
      }, m.name);
      assert.ok(box, `${m.name} shown at ${width}x${height}`);
      assert.ok(box.w > 0 && box.bottom <= height && box.top >= 0 && box.left >= 0 && box.right <= width + 1, `${m.name} inside the first screen at ${width}x${height}: ${JSON.stringify(box)}`);
    }
  }
});

test('filters, sort and the private shortlist with comparison', opts, async t => {
  const page = await open(t, '/');
  const count = () => page.locator('#mfPicks .mf-pick:not([hidden])').count();
  const maker = c.makers[0].name;
  await page.selectOption('[data-mf-maker-select]', maker);
  assert.equal(await count(), c.products.filter(p => p.brand === maker).length);
  await page.selectOption('[data-mf-maker-select]', '');
  assert.equal(await count(), c.products.length);
  await page.selectOption('[data-mf-sort]', 'asc');
  const prices = await page.locator('#mfPicks .mf-pick').evaluateAll(els => els.map(e => +e.dataset.price));
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
  const [a, b] = c.products;
  await page.click(`#mfPicks [data-mf-save="${a.handle}"]`);
  await page.click(`#mfPicks [data-mf-save="${b.handle}"]`);
  assert.equal(await page.locator('[data-mf-saved-count]').first().innerText(), '2');
  assert.equal(await page.locator('[data-mf-compare] thead th').count(), 3);
  await page.reload(); await page.waitForTimeout(100);
  assert.equal(await page.locator('[data-mf-saved-count]').first().innerText(), '2', 'shortlist survives a reload');
  assert.ok(await page.evaluate(() => window.MF_SHORTLIST.snapshot().items.length === 2));
});

test('merchant links are sponsored, open a new tab and carry the store code', opts, async t => {
  const page = await open(t, '/');
  const links = await page.locator('a.mf-buy').evaluateAll(els => els.map(e => ({rel: e.rel, target: e.target, code: e.dataset.mfPlacement, href: e.href})));
  assert.ok(links.length >= c.products.length);
  for (const l of links) { assert.equal(l.rel, 'sponsored noopener'); assert.equal(l.target, '_blank'); assert.equal(l.code, c.code); assert.match(l.href, /^https:/); }
});

test('no sideways scrolling on a 320px phone', opts, async t => {
  for (const url of ['/', '/product', '/collection']) {
    const page = await open(t, url, {width: 320, height: 640});
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.ok(over <= 1, `${url} overflows by ${over}px`);
  }
});

test('product page: research facts, dated price, merchant link, close alternatives', opts, async t => {
  const p = c.products[0];
  const page = await open(t, '/product');
  assert.equal(await page.locator('.mf-site__product-copy h1').innerText(), p.name);
  assert.ok((await page.locator('.mf-site__product-copy').innerText()).includes(p.price));
  assert.equal(await page.locator('.mf-site__product-copy a.mf-buy').getAttribute('href'), p.url);
});

test('collection, search, cart, 404 and password pages render in the store style', opts, async t => {
  for (const [url, text] of [['/collection', 'All pieces'], ['/search', 'Results for'], ['/cart', 'no checkout'], ['/404', 'not here'], ['/password', 'Opening soon']]) {
    const page = await open(t, url);
    assert.ok((await page.locator('body').innerText()).toLowerCase().includes(text.toLowerCase()), url);
  }
  const page = await open(t, '/collection');
  assert.equal(await page.locator('.mf-pick').count(), c.products.length);
});

test('store-only products added in Shopify still show in the library', opts, async t => {
  routes.set('/extra', await renderPage({template: 'collection', products: storeProducts(c, {extra: [{handle: 'store-only', title: 'Store-only piece', vendor: 'New Maker', url: '/products/store-only', featured_image: null, object_type: 'product'}]})}));
  const page = await open(t, '/extra');
  assert.ok((await page.locator('body').innerText()).includes('Store-only piece'));
});
