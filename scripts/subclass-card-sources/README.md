Drop **full-resolution** SRD subclass card art here, then run:

```bash
pnpm images:optimize
```

Sources are matched by slug basename (first extension wins among `.png` / `.jpg` / `.jpeg` / `.webp`):

| Output slug | SRD subclass |
|-------------|--------------|
| `path-of-the-berserker` | Path of the Berserker |
| `college-of-lore` | College of Lore |
| `life-domain` | Life Domain |
| `circle-of-the-land` | Circle of the Land |
| `champion` | Champion |
| `warrior-of-the-open-hand` | Warrior of the Open Hand |
| `oath-of-devotion` | Oath of Devotion |
| `hunter` | Hunter |
| `thief` | Thief |
| `draconic-sorcery` | Draconic Sorcery |
| `fiend-patron` | Fiend Patron |
| `evoker` | Evoker |

Output: `public/images/compendium/subclasses/*.png` at **771×1024** (same as class/species card art).

Source files here are gitignored — only the optimized outputs in `public/images/` are committed.
