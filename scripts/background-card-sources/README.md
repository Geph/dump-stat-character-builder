Drop **full-resolution** background card art here, then run:

```bash
pnpm images:optimize
```

Sources are matched by slug basename (first extension wins among `.png` / `.jpg` / `.jpeg` / `.webp`).

Examples: `acolyte`, `gate-warden`, `house-cannith-heir`, `planar-philosopher`.

Output: `public/images/compendium/backgrounds/*.png` at **771×1024**.

Source files here are gitignored — only the optimized outputs in `public/images/` are committed. Hosted remote fallbacks remain in `lib/compendium/background-card-images-defaults.ts` for names without a bundled file.
