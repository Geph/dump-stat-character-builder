# Site images

Static images for the Dump Stat marketing UI. Served at `/images/...` from Next.js `public/`.

## Layout

| Path | Used for |
|------|----------|
| `hero/rotating-01.webp` … `rotating-04.webp` | Home page hero — random background on each visit |
| `backgrounds/library-stats.jpeg` | Home page “library stats” section background |
| `features/hero.webp` | GitHub README hero graphic (source: `scripts/page-bg-sources/hero.png`) |
| `features/*.webp` | Home feature cards — run `pnpm images:optimize` from sources in `scripts/page-bg-sources/` |

## Adding or changing images

1. Drop files into the folder above (JPEG or PNG; keep filenames stable or update `lib/site-images.ts`).
2. Reference paths in `lib/site-images.ts` so the app and docs stay in sync.
3. Prefer reasonable file sizes (hero images are large backgrounds; compress if needed).

Game icons for the compendium live separately in `public/icons/` (SVGs).
