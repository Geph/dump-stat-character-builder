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
| `occultist` | KibblesTasty Occultist |
| `psion` | KibblesTasty Psion |
| `warden-kibbles` | KibblesTasty Warden (`Warden-Kibbles.png`) |

Output: `public/images/compendium/classes/*.png` at **771×1024** (**3:4** portrait; JPEG bytes under a `.png` extension).

Backgrounds use **21:9** (`1680×720`) — see `scripts/background-card-sources/README.md`.

Source files here are gitignored. GitHub only receives optimized **SRD / Kibbles / Mage Hand Press** class portraits (`inventor`, `occultist`, `psion`, `warden-kibbles`, and the twelve SRD classes). Eberron Artificer and other setting-book class art stay local — see the README “Local card art” section.
