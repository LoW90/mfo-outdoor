import test from 'node:test';
import assert from 'node:assert/strict';
import { load, html } from './harness.mjs';

const api = load();
const plan = over => ({ size: 'medium', style: 'gas', climate: 'warm', seating: false, pool: false, ...over });

test('page is a private preview: noindex, preview footer, Many Faces credit', () => {
  assert.match(html, /<meta name="robots" content="noindex,nofollow,noarchive">/);
  assert.match(html, /Powered by Many Faces Online/);
  assert.match(html, /Preview, not live/);
});

test('no brand is presented as a partner and the disclosure says links earn nothing yet', () => {
  assert.match(html, /none of these brands is a partner/);
  for (const text of Object.values(api.PROGRAMS)) assert.doesNotMatch(text, /\bapproved\b|\bpartner\b/i);
});

test('every product has a price, an https merchant page and a known program', () => {
  assert.equal(api.PRODUCTS.length, 13);
  const ids = new Set();
  for (const p of api.PRODUCTS) {
    assert.ok(p.price > 0, p.id);
    assert.match(p.url, /^https:\/\//, p.id);
    assert.ok(api.PROGRAMS[p.program], p.id);
    assert.ok(!ids.has(p.id), 'duplicate ' + p.id); ids.add(p.id);
  }
});

test('build cost ranges match the HomeAdvisor table and every size is cited on the page', () => {
  assert.deepEqual([...api.BUILD.medium.cost], [6600, 26000]);
  assert.deepEqual([...api.BUILD.estate.cost], [13200, 52000]);
  assert.match(html, /homeadvisor\.com\/cost\/outdoor-living\/build-an-outdoor-kitchen/);
});

test('default plan: gas on a patio suggests the 34-inch Blaze and nothing else', () => {
  const r = api.recommend(plan());
  assert.deepEqual([...r.items.map(i => i.id)], ['blaze34']);
  assert.deepEqual([...r.build], [6600, 26000]);
});

test('large spaces get the 44-inch grill; live fire gets Kalamazoo, with the side-burner model on an estate', () => {
  assert.equal(api.recommend(plan({ size: 'large' })).items[0].id, 'blaze44');
  assert.equal(api.recommend(plan({ style: 'fire' })).items[0].id, 'k1000');
  assert.equal(api.recommend(plan({ style: 'fire', size: 'estate' })).items[0].id, 'k750');
  assert.equal(api.recommend(plan({ style: 'smoke' })).items[0].id, 'timberline');
});

test('cool evenings add heat sized to the space plus a fire pit; extras add seating and a pool robot', () => {
  assert.deepEqual([...api.recommend(plan({ climate: 'cool', size: 'compact' })).items.map(i => i.id)], ['blaze34', 'bromic33', 'breeo']);
  assert.deepEqual([...api.recommend(plan({ climate: 'cool', seating: true, pool: true })).items.map(i => i.id)], ['blaze34', 'bromic53', 'breeo', 'neighbor', 'beatbot']);
});

test('an unknown size is refused rather than priced at $0', () => {
  assert.throws(() => api.recommend(plan({ size: 'mansion' })), /unknown size/);
});

test('outbound links keep the merchant page and add only our source tags', () => {
  const p = api.PRODUCTS.find(x => x.id === 'k1000');
  const u = new URL(api.goLink(p));
  assert.equal(u.origin + u.pathname, 'https://kalamazoogourmet.com/products/K1000-Freestanding-Hybrid-Fire-Grill/');
  assert.equal(u.searchParams.get('utm_source'), 'theoutdoorestate');
  assert.equal(u.searchParams.get('utm_campaign'), 'k1000');
});

test('ten brands, each with a buy link, a price or price-on-request, and no partner claim', () => {
  assert.equal(api.BRANDS.length, 10);
  for (const b of api.BRANDS) {
    assert.match(b.url, /^https:\/\//, b.name);
    assert.ok(b.from === null || b.from > 0, b.name);
    assert.doesNotMatch(b.program, /\bpartner\b|\bapproved\b/i, b.name);
  }
});

test('media slots start empty, and every film is flagged for an AI label', () => {
  assert.equal(api.HERO_FILM.src, null);
  assert.equal(api.FILMS.length, 3);
  for (const f of api.FILMS) { assert.equal(f.src, null); assert.equal(f.aiGenerated, true); }
});

test('an estate with gas gets the Hestan 42-inch', () => {
  assert.equal(api.recommend(plan({ size: 'estate' })).items[0].id, 'hestan42');
});

test('money formatting and escaping', () => {
  assert.equal(api.money(37495), '$37,495');
  assert.equal(api.money(4378.94), '$4,378.94');
  assert.equal(api.esc('<b>"x"</b>'), '&lt;b&gt;&quot;x&quot;&lt;/b&gt;');
});
