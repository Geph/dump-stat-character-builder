# SRD seed data

The **Seed D&D 5.5e SRD Content** button loads structured data from `seed-data/*.json`, built from the official **SRD 5.2.1** (same content as the Wizards/D&D Beyond SRD PDF).

## Rebuild seed files

```bash
pnpm srd:build
```

This downloads markdown from [downfallx/dnd-5e-srd-markdown](https://github.com/downfallx/dnd-5e-srd-markdown) (CC-BY-4.0, derived from the official SRD), parses it, and writes JSON under `seed-data/`.

## Attribution

This work includes material from the System Reference Document 5.2 (“SRD 5.2”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License.

Markdown conversion: [downfallx/dnd-5e-srd-markdown](https://github.com/downfallx/dnd-5e-srd-markdown).
