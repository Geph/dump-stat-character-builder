# Site images

Static images for the Dump Stat marketing UI. Served at `/images/...` from Next.js `public/`.

## Layout

| Path | Used for |
|------|----------|
| `hero/rotating-01.webp` … | Home page hero — random background on each visit |
| `sheet-banners/*.webp` | Builder / sheet landscape banners (Randomly generate) |
| `backgrounds/library-stats.jpeg` | Home page “library stats” section background (`library-stats-section` in page-bg-sources) |
| `builder/starting-equipment-*.png` | Builder Gear step package edge art (`gear` / `gold-coins` in page-bg-sources) |
| `features/hero.webp` | GitHub README hero graphic (source: `scripts/page-bg-sources/hero.png`) |
| `features/*.webp` | Home feature cards — run `pnpm images:optimize` from sources in `scripts/page-bg-sources/` |

## Adding or changing images

1. Drop files into the folder above (JPEG or PNG; keep filenames stable or update `lib/site-images.ts`).
2. Reference paths in `lib/site-images.ts` so the app and docs stay in sync.
3. Prefer reasonable file sizes (hero images are large backgrounds; compress if needed).

Game icons for the compendium live separately in `public/icons/` (SVGs).

Compendium portraits under `compendium/` follow the same rule as the optimizer: **SRD**, **Mage Hand Press class** portraits, and **Mage Hand Press free-subclass** portraits may be committed. Kibbles, paid MHP subclasses, and other setting-book art can live here on your machine after `pnpm images:optimize` and are gitignored.
