# SRD seed data

The **Seed SRD 5.2.1 Content** button loads structured data from `seed-data/*.json`, built from **SRD 5.2.1** (the Wizards/D&D Beyond System Reference Document).

**This directory must contain only SRD-licensed seed material.** Non-SRD compendium content (e.g. Player's Handbook species) is entered in the app or kept locally; modifier wiring for those sources lives under `lib/compendium/`, not here.

## Rebuild seed files

```bash
pnpm srd:build
```

This downloads markdown from [downfallx/dnd-5e-srd-markdown](https://github.com/downfallx/dnd-5e-srd-markdown) (CC-BY-4.0, derived from SRD 5.2.1), parses it, and writes JSON under `seed-data/`.

## Attribution (SRD 5.2.1)

This work includes material from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

Compatible with fifth edition.

Section 5 of CC-BY-4.0 includes a Disclaimer of Warranties and Limitation of Liability that limits our liability to you.

Do not add any other attribution to Wizards or its parent or affiliates beyond the statement above. The canonical copy for the app UI lives in [`attribution.ts`](./attribution.ts).
