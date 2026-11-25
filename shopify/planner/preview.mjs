/** Writes a browsable preview of the whole store, this layer's pages included, to shopify/preview/ (git-ignored). */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {writePreview, renderPage} from '../tests/render.mjs';
import {PAGES} from './build.mjs';
const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'preview');
await writePreview(dir);
for (const p of PAGES) fs.writeFileSync(path.join(dir, p.handle + '.html'), (await renderPage({template: p.template, assetBase: 'assets/', extra: {page: {title: p.title, content: '', handle: p.handle}}})).replace(/href="\/pages\/([a-z-]+)/g, 'href="$1.html'));
console.log('Preview written to', path.relative(process.cwd(), dir));
