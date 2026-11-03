import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { root } from './harness.mjs';

const url = 'file://' + root + 'dist/index.html';
const opts = process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {};

test('real browser: planner, filters, links, phone layout', async () => {
  const browser = await chromium.launch(opts);
  try {
    for (const width of [375, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.route(/^https?:/, r => r.abort());
      await page.goto(url);
      assert.match(await page.textContent('#planResult'), /\$6,600 to \$26,000/);
      await page.selectOption('#style', 'fire');
      await page.selectOption('#climate', 'cool');
      const plan = await page.textContent('#planResult');
      assert.match(plan, /K1000HT/); assert.match(plan, /\$37,495/); assert.match(plan, /Smokeless Fire Pit/);
      assert.equal(await page.locator('#catalog .card').count(), 13);
      assert.equal(await page.locator('#brandGrid .brand-card').count(), 9);
      assert.equal(await page.locator('#filmRow .film').count(), 3);
      await page.click('[data-filter="connected"]');
      assert.equal(await page.locator('#catalog .card').count(), 5);
      assert.equal(await page.getAttribute('[data-filter="connected"]', 'aria-pressed'), 'true');
      const links = await page.$$eval('#catalog a.btn', as => as.map(a => [a.href, a.rel]));
      for (const [href, rel] of links) { assert.match(href, /^https:\/\/.*utm_source=theoutdoorestate/); assert.match(rel, /sponsored/); }
      assert.equal(await page.locator('#costRows tr', { hasText: '$' }).count(), 4);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 0, `horizontal overflow ${overflow}px at ${width}`);
      if (width === 375) {
        assert.equal(await page.isVisible('#navLinks'), false);
        await page.click('#menuBtn');
        assert.equal(await page.isVisible('#navLinks'), true);
        const small = await page.evaluate(() => [...document.querySelectorAll('p, li, label, td, a, button')].filter(e => e.offsetParent && parseFloat(getComputedStyle(e).fontSize) < 14).length);
        assert.equal(small, 0, 'text under 14px on phones');
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally { await browser.close(); }
});
