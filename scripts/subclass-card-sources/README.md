Drop **full-resolution** subclass card art here, then run:

```bash
npm run images:optimize
```

Organize by **parent class** so same-named subclasses do not collide:

```
scripts/subclass-card-sources/
  artificer/reanimator.png
  necromancer/reanimator.png   # different art when available
  barbarian/path-of-the-berserker.png
  psion/knowing-mind.png
```

Sources are matched by relative slug (first extension wins among `.png` / `.jpg` / `.jpeg` / `.webp`). The optimizer discovers every nested slug — keep filenames as the output slug.

Covered materials:

- **2024 PHB** subclasses (plus a few FRUA / Ravenloft extras present in the source pack)
- **KibblesTasty Psion** minds (`awakened-mind`, `unleashed-mind`, …)
- **KibblesTasty Inventor** specializations (`gadgetsmith`, `warsmith`, `runesmith`, …)
- **Eberron: Forge of the Artificer** (`alchemist`, `armorer`, `artillerist`, `battle-smith`, `cartographer`, `reanimator`)

Output: `public/images/compendium/subclasses/{class-slug}/{subclass-slug}.png` at **771×1024** (**3:4** portrait, same as class/species card art).

Backgrounds use **21:9** — see `scripts/background-card-sources/README.md`.

Wire display names → class + slug in `lib/compendium/subclass-card-images-defaults.ts`.

Source files here are gitignored — only the optimized outputs in `public/images/` are committed.
