/* The Outdoor Estate planner engine: pure logic, shared by the Shopify page script (planner.js) and the tests.
   BUILD, byId, esc, money, goLink and recommend are copied word for word from the inline script of site/index.html
   (shopify/planner/tests checks they still match). The page passes the products in with setProducts(). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.MFE_ENGINE = api;
})(typeof self !== 'undefined' ? self : this, function () {
'use strict';
let PRODUCTS = [];
const setProducts = list => { PRODUCTS = list.slice(); };
const BUILD = {
  compact: { label: 'Terrace, up to 100 sq ft', cost: [3300, 13000] },
  medium: { label: 'Patio, 100 to 200 sq ft', cost: [6600, 26000] },
  large: { label: 'Entertaining, 200 to 400 sq ft', cost: [9900, 39000] },
  estate: { label: 'Estate, about 400 sq ft', cost: [13200, 52000] }
};
const byId = id => PRODUCTS.find(p => p.id === id);
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function money(n) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
}
function goLink(p) {
  const u = new URL(p.url);
  u.searchParams.set('utm_source', 'theoutdoorestate');
  u.searchParams.set('utm_medium', 'referral');
  u.searchParams.set('utm_campaign', p.id);
  return u.toString();
}
function recommend(plan) {
  const build = BUILD[plan.size];
  if (!build) throw new Error('unknown size ' + plan.size);
  const big = plan.size === 'large' || plan.size === 'estate';
  const picks = [];
  if (plan.style === 'fire') picks.push({ id: plan.size === 'estate' ? 'k750' : 'k1000', why: plan.size === 'estate' ? 'live fire plus cooktop burners for a large party' : 'cooks on gas, wood or charcoal' });
  else if (plan.style === 'smoke') picks.push({ id: 'timberline', why: 'long smokes you can watch from your phone' });
  else if (plan.size === 'estate') picks.push({ id: 'hestan42', why: 'chef-grade 42-inch grill for a large kitchen' });
  else picks.push({ id: big ? 'blaze44' : 'blaze34', why: big ? 'four burners for a bigger crowd' : 'three burners sized for a terrace' });
  if (plan.climate === 'cool') {
    picks.push({ id: plan.size === 'compact' ? 'bromic33' : 'bromic53', why: 'keeps evenings comfortable on a timer' });
    picks.push({ id: 'breeo', why: 'a smokeless fire to gather around' });
  }
  if (plan.seating) picks.push({ id: 'neighbor', why: 'teak and Sunbrella that can stay outside' });
  if (plan.pool) picks.push({ id: 'beatbot', why: 'cleans the pool and parks itself' });
  return { build: build.cost, label: build.label, items: picks.map(p => ({ ...byId(p.id), why: p.why })) };
}

return { BUILD, setProducts, byId, esc, money, goLink, recommend };
});
