Drop **full-resolution** class card art here, then run:

```bash
pnpm images:optimize
```

Sources are matched by slug basename. When the same slug appears in more than one origin folder, **SRD wins over Mage Hand Press / kibbles / `extra/`** (so updated SRD portraits are not overwritten by older local extras).

| Output slug | Class |
|-------------|-------|
| `barbarian` … `wizard` | 2024 PHB / SRD classes |
| `artificer` | Eberron: Forge of the Artificer |
| `inventor` | KibblesTasty Inventor |
| `occultist` | KibblesTasty Occultist |
| `psion` | KibblesTasty Psion |
| `warden-kibbles` | KibblesTasty Warden (`Warden-Kibbles.png`) |

Output: `public/images/compendium/classes/*.png` at **771×1024** (**3:4** portrait; JPEG bytes under a `.png` extension).

Backgrounds use **21:9** (`1680×720`) — see `scripts/background-card-sources/README.md`.

Source files here are gitignored. What GitHub ships vs local-only is documented in the repository README **[Local card art](../../README.md#local-card-art-optional)** section.
