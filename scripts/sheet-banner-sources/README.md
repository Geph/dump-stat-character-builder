Drop **full-resolution** character sheet landscape banners here, then run:

```bash
pnpm images:optimize
```

Filenames become the public slug, e.g. `01-enchanted-wilderness.png` →
`public/images/sheet-banners/01-enchanted-wilderness.webp`.

Encoded as WebP with a **2172×724** cap (`fit: inside`, never upscaled). Wire new slugs in
`lib/site-images.ts` (`SHEET_BANNER_IMAGES`) so builder “Randomly generate” can pick them
in the graphical (visual) app mode.
