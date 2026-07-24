# Import enrichment preset inventory

Replaces class-specific enricher modules with declarative presets under
`lib/import/enrichment-presets/`. Classification:

- **(a)** Expressible as FEATURE_NAME / FEATURE_MODIFIER_RULES or linked-modifier presets
- **(b)** Expressible as data given a small generic operation (attach named preset, remap resource key, seed equipment/resource, parse table, etc.)
- **(c)** Irreducible custom logic (keyed hooks) — **none remaining**

| Pack | Transformation | Class | Notes |
| --- | --- | --- | --- |
| Alchemist | Bomb ability → dual `special_attack` + reagents uses | (b) | Named preset `alchemist_bomb` |
| Alchemist | Bomb formula → dual `special_attack` (damage from name) | (b) | `alchemist_bomb_formula_from_name` + regex table |
| Alchemist | Potions feature → `craftable_items` from HTML table | (b) | `parseCraftableItemsTable` op |
| Alchemist | Held potions/items → `held_items_cap` | (b) | |
| Alchemist | Discovery: Batch Brewing / Double Dose | (b) | |
| Alchemist | Discovery: Homunculus companion block | (b) | `parseCompanionStatBlock` op |
| Alchemist | Discovery: brewing-only reagent uses | (b) | |
| Alchemist | Reagents resource recharge (INT synthesis) | (b) | `ensureResourceRecharges` |
| Alchemist | Reagent Synthesis description note | (b) | |
| Investigator | Finisher / Improved Finisher on-hit triggers | (b) | Named presets |
| Investigator | Holy Trinkets note + clear limitedUses | (b) | |
| Investigator | Name-match wire Amulet / Ankh / Rune effects | (b) | Recognition only — no content seed |
| Investigator | Rushed Incantation limitedUses | (b) | |
| Investigator | Exploit Weakness stub + note | (b) | |
| Investigator | Enigma Arcane → innate arcanum preset | (b) | Reuses SRD factory |
| Investigator | Spellbinder description note | (b) | |
| Psion | Climactic Moment uses + turn_start_trigger | (b) | `skipSyncRefs` matches legacy |
| Psion | Shattered Husks / Planeswalker / Balance of Power uses | (b) | |
| Psion | Practiced Prescience / Rampage Die / Dark Lurker notes | (b) | |
| Psion | Curious Mind swappable skill choices | (b) | |
| Monk | Unarmored Defense AC (non-SRD monks) | (b) | |
| Monk | `focus_points` → prefixed `ki_points` on modifiers | (b) | `remapResourceKeysInModifiers` |
| Monk | Resource key + feat ki remap helpers | (b) | |
| Alternate Ranger | Quarry on-hit trigger | (b) | |
| Alternate Ranger | Quarry class resource seed | (b) | Content seed |
| Alternate Ranger | Rename + quarry_die/knacks/Bounty Hunter sanitize | (b) | LaserLlama |
| Alternate Sorcerer | Innate Arcanum / Innate Sorcery presets | (b) | Reuses SRD factories |
| Alternate Sorcerer | Sorcerous Regeneration description | (b) | Prefixed resource template |
| Alternate Sorcerer | Metamagic class_knacks + knack library sanitize | (b) | LaserLlama point-pool |
| Alternate Barbarian | Rage remap + freeUseAfterLevel 20 | (b) | LaserLlama |
| Alternate Barbarian | Savage Exploits class_knacks + exploits library sanitize | (b) | Shared exploits custom |
| Alternate Rogue | Exploit dice L17 + Devious Exploits class_knacks | (b) | LaserLlama |
| Alternate Rogue | Signature exploits grant_custom_ability + Saboteur de-pollute | (b) | Shared exploits custom |
| Alternate Fighter | Martial Exploits class_knacks + Relentless initiative | (b) | LaserLlama |
| Alternate Fighter | Signature exploits + Runecarver/Sylvan/Tinker inline catalogs | (b) | Shared exploits custom |

## Call sites

- `enrichImportedClassRow` → single `enrichClassFeaturesWithPresets` (monk / ranger / sorcerer packs)
- `enrichImportContentModifiers` → `applyImportEnrichmentPresets` (alchemist / investigator / psion)
- `mergeTableParsedClassResources` → `mergeAlternateRangerClassResources` (seed)
- `remapImportedResourceKey` → `remapKiResourceKey` (preset helper)
