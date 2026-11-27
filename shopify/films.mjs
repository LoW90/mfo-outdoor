#!/usr/bin/env node
/* Last build step: every film autoplays on scroll (muted, no press-play) and gets a small Pause/Play button.
 * Writes theme/assets/mf-films.js + .css (sources in shopify/films/), links them once from theme/layout/theme.liquid,
 * and refreshes dist/*-theme.zip so the upload file matches theme/ (needs the zip tool, like the generator).
 * Tests that compare theme.liquid with the generator's text pass it through withFilms() first. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const TAG = `{{ 'mf-films.css' | asset_url | stylesheet_tag }}\n<script src="{{ 'mf-films.js' | asset_url }}" defer></script>`;
/** theme.liquid text with the films script linked once, before </body>. */
export function withFilms(html) {
  if (html.includes("'mf-films.js'")) return html;
  if (!html.includes('</body>')) throw new Error('films.mjs: no </body> in theme/layout/theme.liquid');
  return html.replace('</body>', `${TAG}\n</body>`);
}
export const isFilmsLayout = p => p.replace(/\\/g, '/').endsWith('layout/theme.liquid');

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const theme = path.join(here, 'theme');
  for (const f of ['mf-films.js', 'mf-films.css']) fs.copyFileSync(path.join(here, 'films', f), path.join(theme, 'assets', f));
  const layout = path.join(theme, 'layout', 'theme.liquid');
  const html = fs.readFileSync(layout, 'utf8'), next = withFilms(html);
  if (next !== html) fs.writeFileSync(layout, next);
  const dist = path.join(here, 'dist');
  for (const z of fs.existsSync(dist) ? fs.readdirSync(dist).filter(f => f.endsWith('-theme.zip')) : []) {
    try {
      fs.rmSync(path.join(dist, z), {force: true});
      execFileSync('zip', ['-qrX', path.join(dist, z), '.', '-x', '.*'], {cwd: theme});
    } catch (e) { console.warn(`films.mjs: could not refresh dist/${z} (${e.message}); upload theme/ instead.`); }
  }
}
