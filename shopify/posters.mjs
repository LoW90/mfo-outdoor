#!/usr/bin/env node
/* Makes the still shown before each film plays, so only the .mp4 has to be supplied.
 * For every images/<name>.mp4 without images/<name>.webp, takes one frame (at 1 s) as the poster;
 * hero-film.mp4 also gives images/hero.webp when that is missing. Files already present are never touched.
 * Runs at the start of `npm run build`. Needs ffmpeg on the PATH (or the ffmpeg-static package, if installed);
 * without it the build still works and the films play, just without a cover still. */
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const images = path.resolve(here, '..', 'images');
const films = fs.existsSync(images) ? fs.readdirSync(images).filter(f => f.endsWith('.mp4')) : [];
const todo = [];
for (const f of films) {
  const base = f.slice(0, -4);
  todo.push([f, base + '.webp']);
  if (base === 'hero-film') todo.push([f, 'hero.webp']);
}
const missing = todo.filter(([, out]) => !fs.existsSync(path.join(images, out)));
if (!missing.length) process.exit(0);

let ffmpeg = 'ffmpeg';
try { ffmpeg = createRequire(import.meta.url)('ffmpeg-static') || ffmpeg; } catch {}
let made = 0;
for (const [film, out] of missing) {
  const args = ['-loglevel', 'error', '-y', '-ss', '1', '-i', path.join(images, film), '-frames:v', '1', '-q:v', '82', path.join(images, out)];
  let r = spawnSync(ffmpeg, args, {stdio: 'inherit'});
  if (r.status !== 0 || !fs.existsSync(path.join(images, out))) {
    /* Films shorter than 1 s: take the first frame instead. */
    args.splice(3, 2);
    r = spawnSync(ffmpeg, args, {stdio: 'inherit'});
  }
  if (r.error || r.status !== 0) {
    console.warn(`posters: could not make images/${out} from ${film} (${r.error ? r.error.message : 'ffmpeg failed'}); the film still plays, without a cover still.`);
    continue;
  }
  made++;
  console.log(`posters: made images/${out} from ${film}`);
}
if (made) console.log(`posters: ${made} cover still(s) made.`);
