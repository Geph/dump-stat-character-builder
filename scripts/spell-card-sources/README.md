Drop **full-resolution** spell card art here, then run:

```bash
npm run images:optimize
```

Organize by **origin** (`kibbles/`, `srd cantrips/`, …). Origin folders are ignored when writing outputs. Basenames can be Title Case (`Acid Splash.jpg`) or kebab-case (`green-flame-blade.png`).

The optimizer slugifies names, strips a trailing `Front`, and collapses version suffixes (`Mutate 1` / `Mutate 2` → `mutate`). **When multiple versions exist, the highest number wins.** Prefer `.png` over `.webp` / `.jpg` when versions tie.

Known filename aliases:

- `sapre-the-dying` → `spare-the-dying`
- `beam-of-annhilation` → `beam-of-annihilation`
- `Terrific Transposition` → `trarys-terrific-transposition`

Output: `public/images/compendium/spells/*.png` at **771×1024** (**3:4** portrait).

Wire display names in `lib/compendium/spell-card-images-defaults.ts` (`BUNDLED_SPELL_CARD_IMAGE_NAMES`).

Source files here are gitignored. Only `srd cantrips/` optimized outputs are eligible for GitHub. Keep Kibbles and Mage Hand Press masters local.
