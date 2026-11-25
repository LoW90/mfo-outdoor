/** The Outdoor Estate layer: engine (ported from the static page's tests), data single-sourcing, links with utm tags
 *  only, pages, SEO, media slots, and browser behaviour on pages rendered by tests/render.mjs. */
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {files, patch, PATCHED, PAGES, loadData, loadCatalog} from '../build.mjs';
import {mediaSlots} from '../../build.mjs';
import {slots} from '../media.mjs';
import {mediaDoc, imagesReadme} from '../docs.mjs';
import {check as launchCheck, load as launchLoad} from '../../launch-check.mjs';
import {renderPage} from '../../tests/render.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const shop = path.resolve(here, '../..');
const repo = path.resolve(shop, '..');
const E = createRequire(import.meta.url)('../src/plan-engine.js');
const d = loadData(), c = loadCatalog();
E.setProducts(d.products);
const siteHtml = fs.readFileSync(path.join(repo, 'site/index.html'), 'utf8');
const theme = f => fs.readFileSync(path.join(shop, 'theme', f), 'utf8');
const plan = over => ({size: 'medium', style: 'gas', climate: 'warm', seating: false, pool: false, ...over});

/* ---- engine ---- */
test('engine matches the static page word for word', () => {
  const src = fs.readFileSync(path.join(here, '../src/plan-engine.js'), 'utf8');
  const block = (text, start) => { const at = text.indexOf(start); assert.ok(at >= 0, start); let depth = 0, i = text.indexOf('{', at); for (; i < text.length; i++) { if (text[i] === '{') depth++; if (text[i] === '}' && --depth === 0) break; } return text.slice(at, i + 1); };
  for (const start of ['const BUILD = {', 'function esc(s) {', 'function money(n) {', 'function goLink(p) {', 'function recommend(plan) {']) assert.equal(block(src, start), block(siteHtml, start), start);
  assert.ok(src.includes('const byId = id => PRODUCTS.find(p => p.id === id);'));
});
test('static page plans: default, sizes, live fire, smoke, estate, cool evenings and extras', () => {
  assert.deepEqual(E.recommend(plan()).items.map(i => i.id), ['blaze34']);
  assert.deepEqual(E.recommend(plan()).build, [6600, 26000]);
  assert.equal(E.recommend(plan({size: 'large'})).items[0].id, 'blaze44');
  assert.equal(E.recommend(plan({style: 'fire'})).items[0].id, 'k1000');
  assert.equal(E.recommend(plan({style: 'fire', size: 'estate'})).items[0].id, 'k750');
  assert.equal(E.recommend(plan({style: 'smoke'})).items[0].id, 'timberline');
  assert.equal(E.recommend(plan({size: 'estate'})).items[0].id, 'hestan42');
  assert.deepEqual(E.recommend(plan({climate: 'cool', size: 'compact'})).items.map(i => i.id), ['blaze34', 'bromic33', 'breeo']);
  assert.deepEqual(E.recommend(plan({climate: 'cool', seating: true, pool: true})).items.map(i => i.id), ['blaze34', 'bromic53', 'breeo', 'neighbor', 'beatbot']);
  assert.throws(() => E.recommend(plan({size: 'mansion'})), /unknown size/);
  assert.equal(E.money(4378.94), '$4,378.94');
});

/* ---- data and links ---- */
test('catalog.json and planner/data.json are current with site/index.html', () => {
  execFileSync(process.execPath, [path.join(repo, 'tools/shopify-catalog.mjs'), '--check'], {stdio: 'pipe'});
});
test('every product keeps its merchant page and adds only our utm tags; nothing claims a partner', () => {
  assert.equal(c.products.length, 13); assert.equal(c.makers.length, 9);
  for (const p of c.products) {
    const src = d.products.find(x => x.handle === p.handle), u = new URL(p.url);
    assert.equal(u.searchParams.get('utm_source'), 'theoutdoorestate'); assert.equal(u.searchParams.get('utm_campaign'), src.id);
    for (const k of u.searchParams.keys()) assert.match(k, /^utm_/, p.handle);
    u.search = ''; const orig = new URL(src.url); orig.search = ''; assert.equal(u.toString(), orig.toString());
    assert.equal(p.checked, '2026-11-02');
  }
  for (const m of c.makers) assert.match(m.url, /utm_source=theoutdoorestate/);
  for (const m of d.merchants) assert.equal(m.status, 'pending', m.name);
  for (const t of Object.values(d.programs)) assert.doesNotMatch(t, /\bapproved\b|\bpartner\b/i);
});
test('every figure in the Shopify-only copy appears on the static page', () => {
  for (const line of c.considerations) for (const fig of line.match(/\$[\d,]+|\d[\d,]* W|\d+ V/g) || []) { const n = fig.replace(/ (W|V)$/, ''); assert.ok(siteHtml.includes(n) || siteHtml.includes(n.replace(/[$,]/g, '')), fig); }
});
test('layer files and marked insertions are current', () => {
  for (const f of files()) assert.equal(fs.readFileSync(path.join(shop, f.path), 'utf8'), f.text, f.path);
  for (const name of PATCHED) { const cur = theme(name); assert.equal(patch(name, cur), cur, name + ' patch is idempotent'); }
  const home = theme('sections/mfe-home.liquid');
  assert.match(home, /render 'mfe-planner-band'/); assert.match(home, /render 'mfe-connected-band'/);
  assert.doesNotMatch(home, /rel="noopener">Visit/, 'maker links are marked sponsored'); assert.doesNotMatch(home, /one business day/);
});

/* ---- pages, SEO, legal ---- */
test('every page template exists; the footer links to the disclosure, privacy and terms', () => {
  for (const p of PAGES) assert.ok(fs.existsSync(path.join(shop, 'theme/templates', p.template + '.json')), p.template);
  const foot = theme('sections/mfe-footer.liquid');
  for (const h of ['pages/how-we-are-paid', 'pages/plan-your-outdoor-kitchen', 'privacy_policy', 'terms_of_service']) assert.ok(foot.includes(h), h);
  assert.match(theme('sections/mfe-disclosure.liquid'), /Draft, pending legal review/);
  assert.match(theme('sections/mfe-disclosure.liquid'), /none of these brands is a partner/);
});
test('SEO: noindex by default, unique titles, canonical, Open Graph and JSON-LD (product data on product pages)', () => {
  const layout = theme('layout/theme.liquid'), seo = theme('snippets/mf-seo.liquid');
  assert.match(layout, /settings\.preview_noindex -%}<meta name="robots" content="noindex/);
  assert.match(layout, /rel="canonical"/); assert.match(layout, /og:description/);
  assert.match(seo, /product \| structured_data/); assert.match(seo, /"@type":"Organization"/);
  assert.equal(JSON.parse(theme('config/settings_data.json')).current.preview_noindex, true);
  assert.equal(new Set(PAGES.map(p => p.title)).size, PAGES.length);
});
test('launch check lists what William still has to do', () => {
  assert.ok(launchCheck(launchLoad()).every(x => !x.ok));
  assert.ok(launchCheck({settings: {business_name: 'A', business_email: 'b@c.d', business_address: 'x', preview_noindex: false}, data: {merchants: [{status: 'tracked'}]}}).every(x => x.ok));
});

/* ---- media slots ---- */
test('media slots: at least 5 films, docs and images README current, every generator slot named', () => {
  const s = slots(c);
  assert.ok(s.filter(x => x.type === 'film' && !x.optional).length >= 5);
  for (const g of mediaSlots(c)) assert.ok(imagesReadme(c).includes(g.file), g.file);
  for (const g of mediaSlots(c).filter(g => /\.mp4$|\.webp$/.test(g.file))) assert.ok(s.some(x => x.file === g.file), g.file);
  assert.equal(fs.readFileSync(path.join(repo, 'docs/MEDIA_SLOTS.md'), 'utf8'), mediaDoc(c));
  assert.equal(fs.readFileSync(path.join(repo, 'images/README.md'), 'utf8'), imagesReadme(c));
});
test('a dropped-in film is bundled with its AI label; with images/ empty nothing empty shows', async () => {
  const {files: gen} = await import('../../build.mjs');
  const dir = path.join(repo, 'images'), made = [];
  for (const f of ['hero-film.mp4', 'outdoor-live-fire.mp4']) { const p = path.join(dir, f); if (!fs.existsSync(p)) { fs.writeFileSync(p, ''); made.push(p); } }
  try {
    const h = gen(c).find(f => f.path.endsWith('mfe-home.liquid')).text;
    assert.match(h, /<source data-src="\{\{ 'hero-film\.mp4' \| asset_url \}\}"/);
    assert.match(h, /elsif true -%}<span class="mfo-media-note">Original AI-generated film/);
    assert.match(h, /Live-fire dinner<\/h3><p class="mf-room__note-small">Kalamazoo hybrid grill, six guests\. Original AI-generated film/);
  } finally { for (const p of made) fs.unlinkSync(p); }
  assert.doesNotMatch(theme('sections/mfe-home.liquid'), /<video|Film coming|slot/i);
});

/* ---- browser ---- */
let chromium; try { ({chromium} = await import('playwright')); } catch {}
const exe = [process.env.PLAYWRIGHT_EXECUTABLE_PATH, chromium?.executablePath(), '/opt/pw-browsers/chromium', '/usr/bin/chromium'].filter(Boolean).find(p => fs.existsSync(p));
const skip = !chromium || !exe ? 'playwright/chromium not installed' : false;
let browser, server, BASE; const routes = new Map();
const TYPES = {'.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2'};
test.before(async () => { if (skip) return;
  routes.set('/', await renderPage({template: 'index'}));
  for (const p of PAGES) routes.set('/pages/' + p.handle, await renderPage({template: p.template, extra: {page: {title: p.title, content: '', handle: p.handle}}}));
  server = http.createServer((req, res) => {
    const p = new URL(req.url, 'http://x').pathname;
    if (p.startsWith('/assets/')) { const f = path.join(shop, 'theme/assets', path.basename(p)); if (fs.existsSync(f)) { res.writeHead(200, {'content-type': TYPES[path.extname(f)] || 'application/octet-stream'}); return fs.createReadStream(f).pipe(res); } }
    const html = routes.get(p); res.writeHead(html ? 200 : 404, {'content-type': 'text/html'}); res.end(html || 'not found');
  });
  await new Promise(ok => server.listen(0, '127.0.0.1', ok)); BASE = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({executablePath: exe});
});
test.after(async () => { await browser?.close(); server?.close(); });
async function open(t, url, {width = 1280, height = 900} = {}) {
  const ctx = await browser.newContext({viewport: {width, height}}); const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await page.goto(BASE + url); await page.waitForTimeout(150);
  t.after(async () => { assert.deepEqual(errors, [], 'no JavaScript errors'); await ctx.close(); });
  return page;
}
const opts = {skip};

test('planner page: same results as the static page, picks link to research pages and merchants', opts, async t => {
  for (const width of [375, 1280]) {
    const page = await open(t, '/pages/plan-your-outdoor-kitchen', {width});
    assert.match(await page.textContent('#planResult'), /\$6,600 to \$26,000/);
    await page.selectOption('#style', 'fire'); await page.selectOption('#climate', 'cool');
    const text = await page.textContent('#planResult');
    assert.match(text, /K1000HT/); assert.match(text, /\$37,495/); assert.match(text, /Smokeless Fire Pit/);
    for (const [href, rel] of await page.$$eval('#planResult a.mfe-plan__buy', as => as.map(a => [a.href, a.rel]))) { assert.match(href, /^https:\/\/.*utm_source=theoutdoorestate/); assert.equal(rel, 'sponsored noopener'); }
    assert.equal(await page.locator('#costs tbody tr').count(), 4);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
  }
  const page = await open(t, '/pages/plan-your-outdoor-kitchen?size=estate&style=smoke');
  assert.match(await page.textContent('#planResult'), /\$13,200 to \$52,000/); assert.match(await page.textContent('#planResult'), /Timberline/);
});
test('home: planner band and connected band; every merchant link sponsored with utm tags', opts, async t => {
  const page = await open(t, '/');
  assert.equal(await page.locator('#plan .mfe-band-card').count(), 4);
  assert.equal(await page.locator('#connected .mfe-pillar').count(), 3);
  for (const [href, rel] of await page.$$eval('a[href^="http"]', as => as.map(a => [a.href, a.rel]))) {
    if (/homeadvisor|lawnlove/.test(href)) continue;
    assert.match(href, /utm_source=theoutdoorestate/, href); assert.match(rel, /sponsored/, href);
  }
});
test('connected and disclosure pages render with one h1 and no small text or sideways scroll on a phone', opts, async t => {
  for (const p of PAGES.filter(p => p.section)) {
    const page = await open(t, '/pages/' + p.handle, {width: 375, height: 800});
    assert.equal(await page.locator('h1').count(), 1, p.handle);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 1, p.handle);
    const small = await page.evaluate(() => [...document.querySelectorAll('main p, main li, main label, main td, main a')].filter(e => e.offsetParent && parseFloat(getComputedStyle(e).fontSize) < 14).map(e => e.textContent.slice(0, 30)));
    assert.deepEqual(small, [], p.handle);
  }
  const connected = await open(t, '/pages/connected-outdoors');
  assert.equal(await connected.locator('.mf-pick').count(), 5);
});
