Drop **full-resolution** background card art here, then run:

```bash
pnpm images:optimize
```

Sources are matched by slug basename (`.png` preferred over `.jpg` / `.webp`).

Examples: `acolyte`, `gate-warden`, `house-cannith-heir`, `planar-philosopher`.

Output: `public/images/compendium/backgrounds/*.png` at **1680×720** (**21:9** landscape).

Other card types (classes, subclasses, species, spells) stay **771×1024** (**3:4** portrait).

Source files here are gitignored — only the optimized outputs in `public/images/` are committed.
