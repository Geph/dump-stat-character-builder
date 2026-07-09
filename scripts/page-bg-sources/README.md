Drop **full-resolution** theme art here, then run:

```bash
pnpm images:optimize
```

## Page backgrounds (2:3 portrait)

| File | Theme |
|------|--------|
| `parchment.png` (or `.jpg` / `.webp`) | Parchment |
| `arcane.*` | Arcane |
| `stone.*` | Stone |
| `moss.*` | Moss |
| `sands.*` or `clay.*` | Sands |

**1792×2688** exports are ideal. Output: `public/images/page-backgrounds/*.webp` at 1200×1800.

## Home hero rotating banners (2:1 wide)

| File | Output |
|------|--------|
| `rotating (1).png` … `rotating (4).png` | `public/images/hero/rotating-01.webp` … `rotating-04.webp` |

Also accepts `rotating-01.jpg`, etc. Output at **2560×1280** WebP.

## Home feature cards (16:9)

| Source file | Output |
|-------------|--------|
| `Character-Builder.png` | `character-creation.webp` |
| `Compendium.png` | `compendium.webp` |
| `Import.jpg` | `import-content.webp` |
| `Character-Sheet.png` | `character-sheet.webp` |
| `Apperance.png` / `Appearance.png` | `appearance.webp` |
| `Export.jpg` | `export-database.webp` |

Output at **1200×675** WebP.

## Welcome splash cards (4:3)

| Source file | Output |
|-------------|--------|
| `dual-mode.jpg` | `welcome-splash/visual-compact.webp` |
| `compact-interface.*` | `welcome-splash/compact-interface.webp` |
| `no-ai.*` | `welcome-splash/no-ai.webp` |

Output at **1200×900** WebP. Missing sources keep any existing output.

## Why not attach in chat?

Cursor compresses and downsizes images pasted into chat. Copy originals into this folder instead.

Source files here are gitignored — only the WebP outputs in `public/images/` are committed.
