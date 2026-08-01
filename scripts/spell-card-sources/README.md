Drop **full-resolution** spell card art here, then run:

```bash
pnpm images:optimize
```

Sources are matched by slug basename (first extension wins among `.png` / `.jpg` / `.jpeg` / `.webp`).

Examples: `fire-bolt`, `eldritch-blast`, `green-flame-blade`, `spare-the-dying`.

Masters are typically **2:3**; the optimizer cover-crops to **771×1024 (3:4)** portrait output.

Backgrounds use **21:9** — see `scripts/background-card-sources/README.md`.

Wire display names → slugs in `lib/compendium/spell-card-images-defaults.ts` (`BUNDLED_SPELL_CARD_IMAGE_NAMES`).

Source files here are gitignored — only the optimized outputs in `public/images/` are committed.
