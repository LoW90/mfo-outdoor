/* The Outdoor Estate: the outdoor kitchen planner on /pages/plan-your-outdoor-kitchen (hand-owned layer).
   Same questions, logic and wording as the static page; each pick links to its research page and to the merchant with
   our utm tags only (no affiliate program has approved us yet). ?size=, ?style= and ?climate= preselect answers.
   Nothing leaves the browser. */
(() => {
  'use strict';
  const E = window.MFE_ENGINE;
  const dataEl = document.getElementById('mfe-planner-data');
  if (!E || !dataEl) return;
  let D; try { D = JSON.parse(dataEl.textContent); } catch { return; }
  E.setProducts(D.products);
  const $ = id => document.getElementById(id);
  const root = (window.MF_SITE && window.MF_SITE.root) || '/';

  function readPlan() {
    const extras = [...document.querySelectorAll('input[name="extra"]:checked')].map(i => i.value);
    return { size: $('size').value, style: $('style').value, climate: $('climate').value, seating: extras.includes('seating'), pool: extras.includes('pool') };
  }
  function renderPlan() {
    const r = E.recommend(readPlan());
    const rows = r.items.map(p => `<li><span><a href="${E.esc(root)}products/${E.esc(p.handle)}">${E.esc(p.brand)} ${E.esc(p.name)}</a><span class="why">${E.esc(p.why)}</span><a class="mfe-plan__buy" href="${E.esc(E.goLink(p))}" target="_blank" rel="sponsored noopener" data-mf-cta="buy" data-mf-placement="odplan">View at ${E.esc(p.where)} <span aria-hidden="true">↗</span></a></span><span>${E.money(p.price)}</span></li>`).join('');
    $('planResult').innerHTML =
      `<p class="mf-room__eyebrow">Typical build cost</p><p class="range">${E.money(r.build[0])} to ${E.money(r.build[1])}</p>` +
      `<p class="mfe-note">For a ${E.esc(r.label.toLowerCase())} kitchen, before the products below. Source: HomeAdvisor.</p>` +
      `<h3>Where we would start</h3><ul class="mfe-plan__picks">${rows}</ul><p class="mfe-note">Prices checked ${E.esc(D.checkedLabel)} at the merchant named on each pick.</p>`;
    return r;
  }
  function init() {
    const form = $('planForm');
    if (!form) return;
    const q = new URLSearchParams(location.search);
    for (const k of ['size', 'style', 'climate']) { const v = q.get(k), sel = $(k); if (v && sel && [...sel.options].some(o => o.value === v)) sel.value = v; }
    form.addEventListener('submit', e => e.preventDefault());
    form.addEventListener('change', renderPlan);
    renderPlan();
    window.MFE_PLANNER = { readPlan, renderPlan };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
