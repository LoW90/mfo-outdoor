# The Outdoor Estate (working name)

Affiliate planning guide for luxury outdoor kitchens, fire and warmth, outdoor living and connected outdoor products,
powered by Many Faces Online. Audience: older, wealthy homeowners, strongest in the Sunbelt.

**`shopify/` is now the live target** (a Shopify Online Store 2.0 theme). The old static page in `site/` stays in the repo
for now as the single source of products, prices, programs and copy; it is not deployed. Nothing here is deployed
automatically or spends money, and nothing goes live without the owner's approval.

- Income model: affiliate commission only. Lead partner Kalamazoo Outdoor Gourmet (10%, 90-day cookie, Awin), then
  BBQGuys (about 4%, Impact), Beatbot (10%). No program has approved us, so every link carries only
  `utm_source=theoutdoorestate` (plus `utm_medium=referral` and the piece's id).
- Prices were checked on the linked merchant pages on 2 November 2026; recheck before launch.
- The Breeo fire pit links to The Home Depot (where the price was checked); Breeo's own 4% program would need a link to
  breeo.com once approved.

| Path | What it is |
|---|---|
| `site/index.html` | The original one-page site. Its products, prices, programs and copy feed the Shopify store. |
| `tools/shopify-catalog.mjs` | Reads `site/index.html` and writes `shopify/catalog.json` and `shopify/planner/data.json`. The LoW90/mfo-mLintelligence registry entry (`portfolio/standalone.json`) for this store is **pending**; until it exists, this script is the source of `catalog.json`. |
| `shopify/build.mjs` | Shared standalone-store generator, copied unchanged from mfo-home-gym (owned by mfo-mLintelligence `scripts/standalone.mjs`). Builds the theme, the product CSV and the zips. |
| `shopify/planner/` | Hand-owned layer: the outdoor kitchen planner page, connected-outdoors page, disclosure page, home bands, palette and tests. Edit it here. |
| `shopify/theme/` | The Shopify theme (generated; do not edit) |
| `shopify/products/` | Product import CSV (generated; 13 research records, price 0.00, inventory 0, not for sale) |
| `shopify/dist/` | Upload zips (generated) |
| `images/` | Original photographs and films, by slot name (`images/README.md`, briefs in `docs/MEDIA_SLOTS.md`) |
| `docs/policies/` | Draft privacy, terms and refund policies (pending legal review) to paste into Shopify |

## Build and test

```sh
cd shopify
npm install
npm test            # data from site/, generator, layer, docs; then Theme Check, render and browser tests
npm run preview     # browsable preview in shopify/preview/ (git-ignored)
npm run launch-check
```

`npm run build` runs `tools/shopify-catalog.mjs`, `build.mjs`, `planner/build.mjs` and `planner/docs.mjs` in that order.
Because the layer makes small marked insertions into generated files (home, header, footer, layout), `node build.mjs
--check` lists those files; that is expected. `node planner/build.mjs --check` checks the finished theme.

The old static site still has its own tests in the repo root: `npm test` (logic) and `npm run test:browser`.

## Setting up the store (free)

1. In the Many Faces Online Shopify Partner account: Stores > Add store > Development store, named "The Outdoor Estate".
2. Products > Import > `shopify/products/many-faces-outdoor-products.csv`. Every product has price 0.00 and inventory 0
   with "don't sell", so nothing can be bought; each card links to its merchant.
3. Online Store > Themes > Add theme > Upload zip file > `shopify/dist/many-faces-outdoor-theme.zip`, then Publish.
4. Online Store > Pages: create these pages, each with its template:

   | Title | Handle | Template |
   |---|---|---|
   | Plan your outdoor kitchen | `plan-your-outdoor-kitchen` | `page.plan-your-outdoor-kitchen` |
   | Connected outdoors | `connected-outdoors` | `page.connected-outdoors` |
   | How we are paid | `how-we-are-paid` | `page.how-we-are-paid` |
   | About | `about` | `page.about` |
   | Contact | `contact` | `page.contact` |

   Give each page a short SEO description (Edit website SEO) so every page has its own.
5. Keep Theme settings > Search engines > **Hide from search engines** on until a public launch is approved.
6. Theme settings > Business details: legal business name, address, customer email. Until then nothing shows.
7. Settings > Store details: the store contact email. Contact-page messages are emailed there by Shopify's own form.
8. Settings > Policies: paste the drafts from `docs/policies/` once a lawyer has reviewed them.
9. After an affiliate program approves us: set that merchant's status to `tracked` in `tools/shopify-catalog.mjs`, swap
   its links for tracking links in `site/index.html`, run `npm run build`, and run `npm run launch-check`.

## Photographs and films

Drop files into `images/` with the names in `images/README.md` and run `npm run build` in `shopify/`. Five film slots
(hero, middle film, three terrace films) plus optional maker films and product photos; every slot stays hidden until its
file exists, and bundled films get an "Original AI-generated" label. See `docs/MEDIA_SLOTS.md`.

Research: https://claude.ai/artifact/F7Mfp5Ft9p1zBmApmgXBoP
