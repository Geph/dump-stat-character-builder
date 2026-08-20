Drop **full-resolution** species card art here, then run:

```bash
pnpm images:optimize
```

Basenames can be Title Case (`Air Genasi.png`), kebab-case (`halfling.png`), or Drive duplicates (`Dragonborn (1).png`). Origin folders organize masters; when the same output slug appears in more than one folder, **SRD / kibbles win** over MotM / PHB / setting packs.

Prefer `Aasimar-2024` / `Changeling-2024` for the canonical `aasimar` / `changeling` outputs.
Use `Aasimar-2022` / `Changeling-2022` for MotM portraits (import names `Aasimar (2022)` / `Changeling (2022)`).

Known filename aliases:

- `Aasimar-2024` → `aasimar`
- `Changeling-2024` → `changeling`
- `Dhakanni Golin'dar` → `dhakaani-golindar`

Output: `public/images/compendium/species/*.png` at **771×1024** (**3:4** portrait).

Wire display names → slugs in `lib/compendium/species-card-images-defaults.ts`.

Source files here are gitignored. **All optimized species portraits ship on GitHub** (original graphics). Organize masters under origin folder names (`SRD/`, `kibbles/`, `eberron/`, …) for your own sorting — they all optimize to the same public folder.
