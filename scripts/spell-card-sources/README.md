Drop **full-resolution** spell card art here, then run:

```bash
pnpm images:optimize
```

Sources are matched by slug basename (first extension wins among `.png` / `.jpg` / `.jpeg` / `.webp`).

Examples: `fire-bolt`, `eldritch-blast`, `green-flame-blade`, `spare-the-dying`.

Output: `public/images/compendium/spells/*.png` at **771×1024**.

Wire display names → slugs in `lib/compendium/spell-card-images-defaults.ts` (`BUNDLED_SPELL_CARD_IMAGE_NAMES`).

Source files here are gitignored — only the optimized outputs in `public/images/` are committed.
