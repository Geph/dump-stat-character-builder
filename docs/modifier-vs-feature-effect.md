# CharacteristicModifier vs FeatureEffect — which system to use

Dump Stat has two parallel ways to author a mechanical effect on a feature/trait/feat. Both are
legitimate; picking the wrong one is what shows up as "dead aggregate" or "duplicate calculation"
in architecture audits. This doc is the answer to "which one do I use?"

Inventory, play-state engines, name-keyed leftovers, and the add-type checklist live in
[custom-modifiers.md](./custom-modifiers.md). A third layer (Rampage Die, Weapon Morph, banked
pools, illusion tokens) is **not** a catalog type — do not invent `class_resources` or
`new_toggles` for those.

## The two systems

| | `CharacteristicModifier` | `FeatureEffect` |
| --- | --- | --- |
| Where authored | `feature.linkedModifiers[].characteristics[]` | `feature.linkedModifiers[].activation.effects[]` |
| Defined in | `lib/compendium/characteristic-modifiers.ts` | `lib/types.ts` (`FeatureEffect` union) |
| Evaluated by | `aggregateCharacteristics()` → flattened, character-wide `AggregatedCharacteristics` | Per-feature walkers (`sheet-actions.ts`, `collect-limited-feature-effects.ts`, `feature-effect-list.tsx`, …) that read the raw effect off each `LinkedModifierInstance` |
| Shape of the result | One merged value/list per concept, deduplicated across every source (e.g. a single `criticalHitMinimum`, a single `movementEffects.movementHide` boolean) | Per-instance, keeps the owning feature's context (action economy, uses, source label, per-target scoping) |
| Good for | Passive character-wide state that feeds `DerivedCharacter` math or a simple always-on display list: AC/HP/speed math, resistances, senses, saving-throw proficiencies, spellcasting stats, passive traits with no action-economy cost | Anything actionable — a new action/bonus action/reaction, something with limited uses, something that needs to stay tied to *which* weapon/target/menu option it came from |

## Decision rule

1. **Does the effect grant something the player *uses* (an action, a limited-use resource, a
   menu of options)?** → `FeatureEffect` on `activation.effects`. Feed `sheet-actions.ts`'s
   `pushActivatableItemActions` / `collectMovementOptionExpansions`, not the aggregate.
2. **Does the effect need to stay scoped to a specific weapon/target rather than being merged
   character-wide?** → Walk the raw `CharacteristicModifier[]` for that scope (see
   `weapon-sheet-context.ts`'s `collectAppliedModifiers`), not the flattened aggregate. The
   aggregate's `criticalHitMinimum` / `bonusDamageRiders` fields are the *global* merge and will
   silently over-apply a weapon-type-scoped effect to every weapon if you swap them in.
3. **Otherwise** (passive, always-on, character-wide) → `CharacteristicModifier`, consumed via
   `aggregateCharacteristics()` in `compute-derived.ts`, exposed on `DerivedCharacter`, and read
   from there everywhere else (sheet, builder, PDF). Do not re-run `aggregateCharacteristics()`
   or re-derive the same value locally in a component — that's the "duplicate calculation" smell.

## Known intentional overlaps (not bugs)

Some feats/species author **both** systems for the same trait on purpose:
- `"Boon of Speed"` (`feat-modifier-presets.ts`) has a `movement_effects` CharacteristicModifier
  (`movementDisengage: true`, purely descriptive — "also ends Grappled on you") *and* a
  `movement_option` FeatureEffect (grants the actual Bonus Action Disengage). The FeatureEffect is
  what drives the sheet action card; the CharacteristicModifier is a supplementary rules note.
- Halfling's "Halfling Nimbleness" / "Naturally Stealthy" only use the CharacteristicModifier
  (`movement_effects`) because they're pure passive rules with no action-economy cost — there is
  no equivalent FeatureEffect and none is needed.

## Known gaps (authored, aggregated, deliberately not wired further)

A few `CharacteristicModifier` types are authored by content and correctly flow into
`AggregatedCharacteristics`, but still have no consumer beyond that — not because they were missed,
but because wiring them further needs a product decision this doc shouldn't make silently:

- **`creature_size`** (`CreatureSizeCharacteristic`, e.g. Goliath's Large Form) — no derived stat
  (reach, carrying capacity, AC formulas keyed off size) reacts to size today, and "activatable"
  mode has no on/off toggle state to even know if it's currently active. Needs: a size-toggle
  mechanism plus deciding which derived stats should key off it.
- **`spell_healing_modifier`** (`SpellHealingModifierCharacteristic`, e.g. Life Domain's Disciple
  of Life) — the app has no "resolve a healing spell and apply HP" calculator anywhere for this
  bonus to hook into. Needs: deciding whether/how spellcasting ever resolves numeric effects, or
  whether this should just become an informational note (like `extra_turn` below) instead.

`extra_turn` (Thief's Reflexes) was in the same "authored but unconsumed" state; it's now
surfaced as a plain informational note on the sheet since the app has no turn/round simulation to
hook into either — that's the intended ceiling for effects like this.

## Enforcement / anti-patterns to avoid

- Don't add a new `if (character.class === "X")` / `if (species.name === "Y")` branch in a
  sheet/builder component to special-case a stat. Emit a `CharacteristicModifier` from the
  relevant `enrich-*.ts` preset instead, so it flows through `aggregateCharacteristics()`.
- Don't call `aggregateCharacteristics()` and then discard or ignore parts of the result — either
  consume what you need from it, or (if the aggregate's flattened shape genuinely can't represent
  what you need, e.g. per-weapon scoping) skip the call entirely and document why, as
  `weapon-sheet-context.ts` does.
- Don't add a field to `AggregatedCharacteristics` without also wiring a consumer on
  `DerivedCharacter` (or documenting, in the same PR, why it's authored-but-not-yet-consumed).
- After adding or retiring a type, engine, or name-keyed sheet branch, update
  [custom-modifiers.md](./custom-modifiers.md) in the same change.
