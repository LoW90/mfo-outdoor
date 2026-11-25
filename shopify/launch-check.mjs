/** Launch checklist: is this store ready to go public? (Same as mfo-sauna/shopify/launch-check.mjs, with this store's
 *  own last item: an approved affiliate program, in place of the sub-ID check that needs the intelligence package.)
 *  node launch-check.mjs [path/to/settings_data.json]
 *  Pass the settings_data.json from a downloaded copy of the live theme to check the real store;
 *  without it, the repository's defaults are checked. Exits 1 while anything is missing.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export function check({settings, data}) {
  const filled = v => typeof v === 'string' && v.trim().length > 0;
  return [
    {item: 'Business name filled in (Theme settings > Business details)', ok: filled(settings.business_name)},
    {item: 'Business email filled in', ok: filled(settings.business_email)},
    {item: 'Business address filled in', ok: filled(settings.business_address)},
    {item: 'Search hiding turned off (Theme settings > Hide from search engines)', ok: settings.preview_noindex === false},
    {item: 'At least one affiliate program approved and its tracking links in place (merchant status "tracked" in tools/shopify-catalog.mjs)', ok: (data?.merchants ?? []).some(m => m.status === 'tracked')},
  ];
}

export function load(settingsFile = path.join(here, 'theme/config/settings_data.json')) {
  const raw = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
  const current = typeof raw.current === 'string' ? raw.presets?.[raw.current] ?? {} : raw.current ?? {};
  return {settings: current, data: JSON.parse(fs.readFileSync(path.join(here, 'planner/data.json'), 'utf8'))};
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const results = check(load(process.argv[2]));
  for (const r of results) console.log((r.ok ? '[x] ' : '[ ] ') + r.item);
  const missing = results.filter(r => !r.ok).length;
  console.log(missing ? `\nNot ready: ${missing} item(s) left.` : '\nReady to launch.');
  process.exitCode = missing ? 1 : 0;
}
