Drop **full-resolution** species card art here, then run:

```bash
pnpm images:optimize
```

Sources are matched by slug basename (first extension wins among `.png` / `.jpg` / `.jpeg` / `.webp`).

Examples: `elf`, `warforged`, `kalashtar`, `astral-elf`, `autognome`, `plasmoid`.

Prefer `aasimar-2024` / `changeling-2024` source basenames for the canonical `aasimar` / `changeling` outputs.

Output: `public/images/compendium/species/*.png` at **771×1024** (**3:4** portrait).

Backgrounds use **21:9** — see `scripts/background-card-sources/README.md`.

Wire display names → slugs in `lib/compendium/species-card-images-defaults.ts`.

Source files here are gitignored — only the optimized outputs in `public/images/` are committed.
