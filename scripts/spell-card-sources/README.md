Drop **full-resolution** spell card art here, then run:

```bash
pnpm images:optimize
```

Sources are Title Case or kebab-case basenames. The optimizer slugifies them (spaces → hyphens), strips a trailing `Front`, and collapses version suffixes (`Mutate 1` / `Mutate 2` → `mutate`). **When multiple versions exist, the highest number wins** (use the second Mutate, etc.). Prefer `.png` over `.webp` / `.jpg` when versions tie.

Examples: `Fire Bolt.png`, `Mutate 2.png`, `Awaken Rope 2.png`, `green-flame-blade.png`.

Masters are typically **2:3**; the optimizer cover-crops to **771×1024 (3:4)** portrait output.

Backgrounds use **21:9** — see `scripts/background-card-sources/README.md`.

Wire display names → slugs in `lib/compendium/spell-card-images-defaults.ts` (`BUNDLED_SPELL_CARD_IMAGE_NAMES`). Names must match Kibbles / SRD import rows exactly.

Source files here are gitignored — only the optimized outputs in `public/images/` are committed.
