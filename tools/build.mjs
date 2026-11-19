// Copies site/ into dist/. The page is self-contained; the hero film slot stays empty until an approved film exists.
import { cpSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(join(root, 'dist'), { recursive: true });
cpSync(join(root, 'site'), join(root, 'dist'), { recursive: true });
console.log('dist/index.html', readFileSync(join(root, 'dist/index.html'), 'utf8').length, 'bytes');
