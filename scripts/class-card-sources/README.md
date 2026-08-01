Drop **full-resolution** class card art here, then run:

```bash
pnpm images:optimize
```

Sources are matched by slug basename (first extension wins among `.png` / `.jpg` / `.jpeg` / `.webp`).

| Output slug | Class |
|-------------|-------|
| `barbarian` … `wizard` | 2024 PHB / SRD classes |
| `artificer` | Eberron: Forge of the Artificer |
| `inventor` | KibblesTasty Inventor |
| `psion` | KibblesTasty Psion |

Output: `public/images/compendium/classes/*.png` at **771×1024** (**3:4** portrait; JPEG bytes under a `.png` extension).

Backgrounds use **21:9** (`1680×720`) — see `scripts/background-card-sources/README.md`.

Source files here are gitignored — only the optimized outputs in `public/images/` are committed.
