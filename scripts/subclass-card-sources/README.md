Drop **full-resolution** subclass card art here, then run:

```bash
pnpm images:optimize
```

Sources are matched by slug basename (first extension wins among `.png` / `.jpg` / `.jpeg` / `.webp`). The optimizer discovers every slug in this folder — keep filenames as the output slug (e.g. `awakened-mind.png`, `alchemist.png`).

Covered materials:

- **2024 PHB** subclasses (plus a few FRUA / Ravenloft extras present in the source pack)
- **KibblesTasty Psion** minds (`awakened-mind`, `unleashed-mind`, …)
- **KibblesTasty Inventor** specializations (`gadgetsmith`, `warsmith`, `runesmith`, …)
- **Eberron: Forge of the Artificer** (`alchemist`, `armorer`, `artillerist`, `battle-smith`, `cartographer`, `reanimator`)

Output: `public/images/compendium/subclasses/*.png` at **771×1024** (same as class/species card art).

Wire display names → slugs in `lib/compendium/subclass-card-images-defaults.ts`.

Source files here are gitignored — only the optimized outputs in `public/images/` are committed.
