/** Every photo and film slot of The Outdoor Estate, with the brief for each (single source for images/README.md and
 *  docs/MEDIA_SLOTS.md, written by planner/docs.mjs). File names are the shared generator's (shopify/build.mjs
 *  mediaSlots), so a file dropped into images/ is bundled by `npm run build` and shown with its AI label.
 *  A missing file never shows an empty box: the hero keeps its dark band, maker tiles a monogram, product cards a
 *  toned frame with the maker's name, and the film bands are left out. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const imagesDir = path.resolve(here, '../../images');
const slug = name => String(name).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const PEOPLE = 'Photoreal, real-looking older affluent people (60s-70s), luxury estate terrace, warm golden-hour light; no logos, brand badges or text.';
const FILM = 'mp4 H.264, 1920x1080 16:9, 8-15 s, muted seamless loop, under 4 MB; optional .webm copy and .webp poster with the same name';
const CLICK = 'mp4 H.264, 1920x1080 16:9, 8-15 s, plays with controls when clicked (no sound needed), under 4 MB; optional .webm copy and .webp poster with the same name';
const BRIEFS = {
  'outdoor-live-fire': 'A live-fire dinner on an estate terrace at golden hour: an older couple host six friends around a stainless hybrid grill, flames and wood smoke, long table set behind.',
  'outdoor-sunday-smoke': 'A long Sunday smoke: a pellet grill holding temperature on a stone terrace while the host checks the cook on his phone from a lounge chair.',
  'outdoor-winter-terrace': 'A winter terrace at dusk: infrared heaters glowing under a pergola, a smokeless fire pit, an older couple and friends in coats with wine.',
};

export function slots(catalog) {
  const c = catalog;
  const films = [
    {id: 'hero-film', type: 'film', file: 'hero-film.mp4', size: FILM, where: 'Home page hero (behind the headline)', brief: `An outdoor kitchen and terrace at golden hour: an older couple hosting friends, the grill lit, a long table, the garden and pool beyond. ${PEOPLE}`},
    {id: 'room-film', type: 'film', file: 'room-film.mp4', size: FILM.replace('1920x1080 16:9', '1600x1000 16:10'), where: `Home page film band "${c.film.title}"`, brief: `Golden hour on the terrace: the host lights the grill as friends arrive through the garden. ${PEOPLE}`},
    ...c.inspiration.films.map(f => ({id: f.file, type: 'film', file: f.file + '.mp4', size: CLICK, where: `Home page films band "${c.inspiration.title}"`, brief: `${BRIEFS[f.file] || f.note} ${PEOPLE}`})),
    ...c.makers.map(m => ({id: `maker-${slug(m.name)}`, type: 'film', optional: true, file: `maker-${slug(m.name)}.mp4`, size: 'mp4 H.264, 1200x1500 4:5 portrait, 6-10 s, muted loop', where: `${m.name} maker tile (home page)`, brief: `Optional. An original terrace scene suiting ${m.name} (${m.note.replace(/\.$/, '').toLowerCase()}); no logos or product badges. ${PEOPLE}`})),
  ];
  const photos = [
    {id: 'hero', type: 'photo', file: 'hero.webp', size: 'webp 2400x1350 16:9, quality about 80', where: 'Home page hero photograph; also the hero film poster', brief: `An outdoor kitchen and terrace at golden hour, an older couple hosting friends at a long table. ${PEOPLE}`},
    {id: 'room-film-poster', type: 'photo', file: 'room-film.webp', size: 'webp 1600x1000 16:10', where: 'Poster frame of the middle film', brief: 'A still from room-film.mp4.'},
    ...c.inspiration.films.map(f => ({id: f.file + '-poster', type: 'photo', file: f.file + '.webp', size: 'webp 1920x1080 16:9', where: `Poster of "${f.title}"`, brief: `A still from ${f.file}.mp4.`})),
    ...c.makers.map(m => ({id: `maker-${slug(m.name)}-photo`, type: 'photo', file: `maker-${slug(m.name)}.webp`, size: 'webp 1200x1500 4:5 portrait', where: `${m.name} maker tile (home page)`, brief: `An original photoreal terrace scene suiting ${m.name}: ${m.note} No logos or brand badges; use the maker's own imagery only with written permission. ${PEOPLE}`})),
    ...c.products.map(p => ({id: `product-${p.handle}`, type: 'photo', file: `product-${p.handle}.webp`, size: 'webp 1600x1200 4:3', where: `${p.brand} ${p.name} card and research page`, brief: `The real product only with the maker's or merchant's permission; otherwise an original terrace scene with a generic ${(c.kinds[p.kind] || p.kind).toLowerCase()} piece, no logos.`})),
  ];
  return [...films, ...photos].map(s => ({...s, folder: 'images/', status: fs.existsSync(path.join(imagesDir, s.file)) ? 'filled' : 'missing'}));
}
