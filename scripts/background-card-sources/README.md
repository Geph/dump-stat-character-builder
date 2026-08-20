Drop **full-resolution** background card art here, then run:

```bash
npm run images:optimize
```

Organize by **origin** (`PHB/`, `SRD/`, `Eberron/`, `Kibbles/`, …). Origin folders are ignored when writing outputs. Basenames can be Title Case (`House Agent.png`) or kebab-case (`acolyte.png`).

Known filename aliases:

- `archeaeologist` → `archaeologist`
- `House Thurani Heir` → `house-thuranni-heir`
- `House Tharashk` → `house-tharashk-heir`
- `Gate Guardian` → `gate-warden`

Output: `public/images/compendium/backgrounds/*.png` at **1680×720** (**21:9** landscape).

Wire display names → slugs in `lib/compendium/background-card-images-defaults.ts`.

Source files here are gitignored. Commit optimized outputs only from `SRD/` and `Kibbles/` (and `magehandpress/` if you add MHP art). `PHB/`, `Eberron/`, `Ravenloft-Astarion/`, and `Planescape/` stay on your machine — import still uses them when those PNGs exist locally after `pnpm images:optimize`.
