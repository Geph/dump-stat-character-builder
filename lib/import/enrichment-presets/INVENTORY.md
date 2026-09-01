# Import enrichment preset inventory

Canonical pack list: `lib/import/enrichment-presets/registry.ts`.
Modifier architecture, play-state engines, and when **not** to add a preset:
[docs/custom-modifiers.md](../../../docs/custom-modifiers.md).

Classification:

- **(a)** Expressible as FEATURE_NAME / FEATURE_MODIFIER_RULES or linked-modifier presets
- **(b)** Expressible as data given a small generic operation (attach named preset, remap resource key, seed equipment/resource, parse table, etc.)
- **(c)** Irreducible **runtime** logic — play-state engines in `lib/character/` (Rampage Die, Mutation Die, illusion tokens, Weapon Morph, Balance of Power, Influence). Those are **not** enricher modules. Do not invent `class_resources` / `new_toggles` for them.

Registered packs (2026-09-01):

| Pack | File | Notes |
| --- | --- | --- |
| Alchemist | `packs/alchemist.ts` | Bombs, craftable potions, held-items cap, discoveries |
| Investigator | `packs/investigator.ts` + `homebrew.ts` | Finishers, trinkets → custom abilities + equipment |
| Psion | `homebrew.ts` | Archetype uses, Rampage / Flesh Warp / Morph **notes + gates** (engines stay in sheet) |
| Monk | `homebrew.ts` | Unarmored Defense; `focus_points` → prefixed `ki_points` |
| Alternate Ranger | `homebrew.ts` | Quarry on-hit + resource seed |
| Alternate Sorcerer | `homebrew.ts` | Innate Arcanum / Sorcery; knack sanitize |
| Warmage | `packs/warmage.ts` | Tricks, Edge, subclass wiring |
| Occultist | `packs/occultist.ts` | Traditional Expertise and related |
| Beastheart | `packs/beastheart.ts` | Companion + primal exploits |
| Kibbles Warden | `packs/kibbles-warden.ts` | Distinct from MHP Warden |
| Inventor | `packs/inventor.ts` | |
| Dancer | `packs/dancer.ts` | Dance / `while_dancing`, Graceful Dodge menu, styles |
| Craftsman | `packs/craftsman.ts` | Masterwork, enchantments |
| Captain | `packs/captain.ts` | |
| Vagabond | `packs/vagabond.ts` | |
| Witch | `packs/witch.ts` | |
| Gunslinger | `packs/gunslinger.ts` | Risk / maneuvers |
| Martyr | `homebrew.ts` | Sacrificial strike / Divine Respite |
| Necromancer | `packs/necromancer.ts` + `homebrew.ts` | Dark Arcana, Charnel riders |
| MHP Warden | `homebrew.ts` | Distinct from Kibbles Warden |

Not registry presets (table-fill helpers used by LaserLlama import tests):
`packs/alternate-fighter.ts`, `alternate-monk.ts`, `alternate-rogue.ts`,
`alternate-barbarian.ts`.

## Call sites

- `enrichImportedClassRow` → `enrichClassFeaturesWithPresets`
- `enrichImportContentModifiers` → `applyImportEnrichmentPresets`
- `mergeTableParsedClassResources` → `mergeClassResourcesWithPresets`
- `remapImportedResourceKey` → `remapImportedResourceKeyWithPresets`
