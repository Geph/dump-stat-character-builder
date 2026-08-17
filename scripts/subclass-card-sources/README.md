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

Only convert art we are allowed to host:

- **SRD** subclass portraits already under `scripts/graphics/subclass card images/SRD`
- **PHB Barbarian** subclasses placed in `scripts/graphics/subclass card images/PHB` on purpose
- **KibblesTasty** Inventor / Psion / extras
- **Mage Hand Press** when a master exists

Do **not** drop PHB / Eberron / Ravenloft / FRUA product art here. Those must not be committed under `public/images/compendium/subclasses/`.

Output: `public/images/compendium/subclasses/{class-slug}/{subclass-slug}.png` at **771×1024** (**3:4** portrait, same as class/species card art).

Backgrounds use **21:9** — see `scripts/background-card-sources/README.md`.

Wire display names → class + slug in `lib/compendium/subclass-card-images-defaults.ts`.

Source files here are gitignored — only the optimized outputs in `public/images/` are committed.
