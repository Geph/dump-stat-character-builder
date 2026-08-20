Drop **full-resolution** subclass card art here, then run:

```bash
pnpm images:optimize
```

Organize by **origin book/pack**, not by output path. Filenames are `{Class} {Remainder}.png`. Remainder can be a short label (`Life`, `Knowing`) or the full subclass name (`College of the Moon`). Origin folders are ignored when writing outputs.

```
scripts/subclass-card-sources/
  SRD/Cleric Life.png
  PHB/Bard Dance.png
  faerun/Bard College of the Moon.png
  eberron/Artificer Alchemist.png
  kibbles/Psion Knowing.png
  acrana unleashed/Monk Mystric Arts.png
```

The optimizer expands short remainders (`Cleric Light` → `cleric/light-domain`) and writes:

`public/images/compendium/subclasses/{class-slug}/{subclass-slug}.png` at **771×1024** (**3:4** portrait).

Wire display names → class + slug in `lib/compendium/subclass-card-images-defaults.ts`.

**GitHub ships generated SRD art plus Kibbles Tasty and Mage Hand Press subclass portraits.** Put those masters in `SRD/`, `kibbles/`, or `magehandpress/` (aliases: `mage-hand-press`, `mhp`). Other origin folders (`PHB/`, `eberron/`, `ravenloft/`, `faerun/`, …) still optimize into `public/images/` on your machine; those outputs are gitignored and must not be committed. See the README **[Local card art](../../README.md#local-card-art-optional)** section.
