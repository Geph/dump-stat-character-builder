# Custom modifiers — agent map

Last reviewed: 2026-10-09.

### Exploit costs and upgrades

An action's `UsesConfig` can carry both an independent cap (`fixed`, `at_level`,
etc.) and `classResourceKey` / `classResourceAmount`. Using it consumes one
activation and its resource price; the counters remain separate, and rests reset
each according to its own recharge rules. Editing the resource counter manually
does not consume an activation. `restoreByResource` is a renewal price, not a
concurrent cost. Keep the two meanings distinct in imports.

`modify_custom_ability` supports `removeUseLimit` (retain the resource price) and
`resourceCostWaiver` (an explicit player-confirmed condition). Besides exact
`abilityNames`, `abilityFilter` selects by `role`, `eligibleClassNames`, and
prerequisite `minLevel` / `maxLevel`; all supplied filters must match. This allows
a class to upgrade a library imported later. These fields are editable in the
Compendium. Waivers do not create a round tracker: the player confirms the
once-per-round condition in the action overlay each time they open it.

For `heal_self` with `healMode: dice`, fixed `bonusByLevel` rows supply the flat
bonus at the owning class level (Second Wind). They do not change the number of
dice. `hit_dice` mode retains its existing dice-count scaling.

`removeRedundantTriggerDamage` repairs legacy import duplicates within one owning
feature: a generated unconditional extra-dice modifier identical to damage nested
inside its on-hit trigger is removed. `readLinkedModifiers` applies this to existing
sheet data; `syncModifierRefs` applies it during import. Never deduplicate damage
across independent sources or hide a duplicate badge while leaving its bonus active.

Custom ability choices retain their nested metadata throughout import confirmation
and normalization (`import-proposals.ts`, `normalize-ability-import.ts`).
`specialization_choices` and `parent_ability_name` are persisted custom-ability
columns in both hosted schema and additive migrations. Specializations remain
separate from repeatable discipline talents. Selected nested options become sheet
actions through `selected-custom-ability-options.ts`; their linked modifiers remain
the editable source of mechanical effects. Upgrade prerequisites see the current
selection, including prerequisite chains and explicit incompatible choices.

For companion-only upgrades, `choices.applyTo: "companion"` plus
`applyToCompanionFeature` directs the ability to its companion. The player modifier
collector and import phrase detector must not attach its flight, proficiencies or
ability scores to the character. Selected abilities with no sub-options become
companion traits; conditional changes remain visible rules for manual application.
Explicit action costs route those entries to companion action/bonus/reaction lists.
Already authored companion-scoped modifiers survive enrichment; only legacy
player-targeted detections are discarded when repairing the Golemsmith scope.

A new chat has **no prior transcript**. Read this before adding a modifier type, a
`if (name === "…")` sheet branch, or a play-state field. Decision rule for
CharacteristicModifier vs FeatureEffect stays in
[modifier-vs-feature-effect.md](./modifier-vs-feature-effect.md).

Wiring a class that has not been imported before? Start with the rules-text → kind
lookup in [new-class-playbook.md](./new-class-playbook.md). Changing prompt text? Read
[byo-prompt-design.md](./byo-prompt-design.md) first.

Do **not** copy the type lists into always-apply rules. The live lists are the
source of truth; this file is the map, the gaps, and the add-type checklist.

## Source of truth

For mixed rest/combat features, activation and placement are separate inputs:
`sheet-actions.ts` resolves action economy, while `feature-sheet-display.ts`
resolves surfaces. An in-turn Bonus Action or Reaction must survive rest-choice
inference. Partial `sheetDisplay` values retain the Features card unless explicitly
disabled. The level-by-level audit procedure is in
[new-class-playbook.md](./new-class-playbook.md#actions-unlocked-during-progression).

Use existing kinds for source revisions: `check_roll_modifier` with an
ability-modifier bonus and `resultFloor` for an additional minimum +1 skill bonus;
`ac` with a Shield limitation for a shield-only increment; `player_note` for delayed
detonation bookkeeping; `replace_failure` for elective successful saves. Replace
stale linked `uses` modifiers when recharge amounts change—the linked value can
take precedence over the feature's legacy `limitedUses` field.

| What | Where |
| --- | --- |
| Passive types (~71) | `CHARACTERISTIC_MODIFIER_TYPE_OPTIONS` in `lib/compendium/characteristic-modifiers.ts` |
| Active kinds | `ACTION_EFFECT_OPTIONS` in `lib/compendium/class-feature-metadata.ts` |
| Catalog UI rows | Generated in `lib/compendium/modifier-catalog.ts` (`cat_char_*` / `cat_fx_*`) |
| BYO `mechanics[].kind` | `AI_MECHANIC_KINDS` in `lib/import/modifier-wiring-registry.ts` |
| Phrase / name detect | `lib/import/detect-feature-modifier-rules.ts` (must stay 1:1 with the registry) |
| Limitations / gates | `lib/compendium/modifier-limitations.ts` |
| Sheet toggles | `lib/compendium/sheet-toggle-registry.ts` |
| Coverage audit | `node scripts/run-vite-node.mjs scripts/audit-modifier-catalog.ts` and `lib/compendium/__tests__/audit-modifier-catalog.test.ts` |
| Enrichment packs | `lib/import/enrichment-presets/registry.ts` (not the stale table in `index.ts`) |

The Common Modifier Effects catalog is **generated** from those option lists. Do
not hand-edit catalog JSON to invent a type.

## Three layers (not two)

| Layer | Authored on | Evaluated by | Use when |
| --- | --- | --- | --- |
| **CharacteristicModifier** | `linkedModifiers[].characteristics[]` | `aggregateCharacteristics()` → `AggregatedCharacteristics` → `compute-derived.ts` / `DerivedCharacter` | Passive, character-wide, mergeable state |
| **FeatureEffect** | `linkedModifiers[].activation.effects[]` | Per-feature walkers (`sheet-actions.ts`, limited-use collectors, overlays) | Player **uses** it: action economy, uses, menus, per-target scope |
| **Play-state engine** | Feature **name + wording** (sometimes a gate modifier) | Dedicated modules under `lib/character/` + `sheet-play-state.ts` | Mutable mid-combat state the catalog cannot own |

A fourth **gate** layer sits across the first two: `limitations[]` /
`requiresSheetToggle` on modifiers and effects. Toggle ids that are only
referenced after a prune must appear in `collectReferencedSheetToggleIds`
(`lib/character/collect-referenced-sheet-toggles.ts`) or the sheet will activate
them and immediately strip them.

**Weapon / item scope** is a fifth constraint, not a fourth system. Walk
`collectAppliedModifiers` in `weapon-sheet-context.ts`. Do not feed a
weapon-scoped rider through the flattened aggregate (`criticalHitMinimum`,
`bonusDamageRiders`, …) or it applies to every weapon.

## Decision rule (short)

1. Player **uses** it (action, resource spend, option menu) → FeatureEffect.
2. Must stay scoped to one weapon / target / menu option → walk raw modifiers
   for that scope; do not flatten.
3. Passive, always-on, character-wide → CharacteristicModifier via
   `aggregateCharacteristics()`.
4. Size of a die, token count, banked pool, or exclusive morph **changes during
   play** → play-state engine. Preserve source wording. Do **not** invent
   `class_resources`, `dieSidesByLevel`, or `new_toggles` for those engines.

If a catalog type already covers the idea, **extend or attach it**. Do not add
`if (className === "Martyr")` in `lib/character/` or React.

## Data flow

```
Compendium row / import JSON
  → linkedModifiers (characteristics + activation.effects + limitedUses)
  → limitations / sheet toggles
       ↙                              ↘
aggregateCharacteristics()          sheet-actions + collectors
       ↓                              ↓
DerivedCharacter                    Combat / Passive / Abilities cards
```

`characterBuildInputs` includes `activeSheetToggles`. Flipping a toggle
recomputes derived stats **and** `sheetToggleDefinitions`. A prune effect that
only looks at authored `requiresSheetToggle` will drop inferred ids (Dance →
`while_dancing` from `resource_ability_menu` + `sheetToggleIdActivatedByAction`).
`isKnownSheetToggleId` builtins are also kept so activation is not undone.

**Companion-scoped feature choices.** `FeatureChoice.applyTo: "companion"` (optional
`applyToCompanionFeature`) keeps feature and option `linkedModifiers` out of
`aggregateCharacteristics` and applies them when resolving companions. When
`isChoice` is false, every option auto-applies (Improved Thralls). Nested
modifier player picks (damage type, skill, save) still appear at level-up. Do
not add a class-name branch in the sheet for this.

## Import loop (session invariant 3)

If the sheet bug existed because Drive JSON, BYO, detect, or enrichment missed
the mechanic — not only because runtime math was wrong — close the loop:

1. Runtime: generic modifier / sheet behavior.
2. Drive import JSON when a fixture exists (`docs/homebrew-import-review.md`).
3. `modifier-wiring-registry.ts` (`AI_MECHANIC_KINDS` + phrase/name INDEX).
4. Detect rule in `detect-feature-modifier-rules.ts` when the phrase is reusable.
5. Enrichment preset when that is how the class is wired.
6. A test that fails if the prompt or Drive row regresses
   (`byo-prompt-guidance` and/or the class Drive import test).

Registry tests require **one INDEX entry per detect rule id**, and every
documented `cat_char_*` / `cat_fx_*` suffix to declare a `mechanicsKind` unless
it is in `AI_MECHANICS_NARRATIVE_CATALOG_SUFFIXES`.

Kinds the LLM must **not** hand-author (phrase detection or sheet-owned):
`ability_scores`, `movement_option`, `feature_option_picker`,
`on_cast_spell_trigger`, `cast_spell`, `class_resource`.

## Same-name overlap (intentional, easy to misuse)

These are **not** duplicates to collapse blindly. They answer different
questions (merged character state vs per-use card).

| Pair | CharacteristicModifier | FeatureEffect / other |
| --- | --- | --- |
| Movement | `movement_effects` (passive notes: Nimbleness, spider climb) | `movement_option` (Dash / Disengage / Hide **action**) |
| Damage riders | `bonus_damage_riders` (global merge — dangerous on weapons) | `bonus_damage_riders` / `rider_damage` / `extra_damage_on_hit` on the action |
| Mitigation | `damage_reduction` (always-on DR) | `damage_reduction` (Rage, Uncanny Dodge, Evasion **while used**) |
| Attacks | `special_attack` (Breath / bomb profile) | `weapon_attack`, `extra_attack`, `bonus_action_attack` |
| Checks | `attack_roll_modifiers`, `initiative`, skill proficiencies | `check_roll_modifier` (bonus / adv / incoming-attack Disadvantage) |
| Resources | `uses`, `resource_ability_menu` | `class_resource` spend/restore; feature `limitedUses` |
| Custom abilities | `grant_custom_ability`, `modify_custom_ability` | `activate_custom_ability` |
| Healing | `healing_received_modifier`, `spell_healing_modifier` | `heal_self`, `heal_from_pool`, `grant_temp_hp`, `grant_inspiration` (Heroic Inspiration toggle) |

Legacy FeatureEffect aliases still **load**: `check_advantage`, `check_bonus`,
`check_disadvantage`, `buff_ally_roll`, `debuff_enemy_roll`. They are excluded
from the catalog UI (`EXCLUDED_ACTION_CATALOG_KINDS`) and map onto
`check_roll_modifier` / `modify_creature`. Do not emit them in new content.

`custom_skill` is omitted from the generated catalog and inserted as a
singleton (`EXCLUDED_PASSIVE_CATALOG_TYPES`).

Incoming-attack Disadvantage can appear as an AC note **and** as a Passive
reminder. That overlap is intentional once `first_turn_of_combat` (or similar)
is a referenced toggle.

Non-action enemy combat impact (Charm/aura debuffs that subtract from attack
rolls, damage, or saves; `modify_creature` with `rollTarget: "enemy"`) files as
a **Combat Passive** reminder — stamp `sheetDisplay.combatActions` on import and
do not invent an action economy just to get a sheet card.

## What the catalog still cannot own

Prefer an informational note (`player_note`, `extra_turn` ceiling) over a fake
numeric hook.

| Gap | Status | Why it is not a new `mechanics[]` kind |
| --- | --- | --- |
| **`creature_size`** | Authored + aggregated; no derived consumer; untested | No size-toggle play state; reach / carry / space do not key off size |
| **`spell_healing_modifier`** | Calculator + overlay notes | `Spell` still has no structured healing field |
| **`extra_turn`** | Informational note only | No turn / round simulation |
| Mutable combat die (Rampage) | Play-state engine | Size changes in play, not by level |
| Mutation Die / illusion tokens | Play-state engine | Ephemeral grants and battlefield objects |
| Weapon Morph exclusive set | Play-state + derived toggles | Sheet owns `weapon_morph_*`; never `new_toggles` |
| Banked decaying pools | Influence / Balance of Power | `accumulatedResources` + expiry, not a class resource row |
| Per-cast spell mutations | Cast-card `effectHint` annotations | Distant / Extended / Twinned / Subtle rewrite display strings only |
| Conditional proficiency (“X, or Y if you already have X”) | Skills only, via `expertiseIfProficient` | No generic `conditionalUpgrade` for saves / tools / armor |
| Full Wild Shape stat swap | Specialized `transform` | Not a generic size/stat modifier |
| Opponent auto-resolution | Not modeled | Forced saves stay player-facing |

### Cheap consumers shipped (2026-09-01)

**Numeric spell healing.** `applySpellHealingModifiers` adds Disciple of Life
(2 + slot level, 1st+) and Blessed Healer self-heal. `applySelfHeal` now runs
`healing_received_modifier` (Magical Anathema). The spell overlay lists those
notes and can apply a first-pass NdM parse from healing prose. `Spell` still
has no structured healing field — this is not a full spell HP engine.

**Per-cast spell mutations.** `effectHint` now includes `distant` / `extended` /
`twinned` / `subtle`. `applySpellDisplayMutations` rewrites the cast-card
range, duration, components, and a targets note. Do **not** invent a
`mechanics[]` cost schema; `byo-import-kit.ts` still forbids it.

**Conditional proficiency.** `expertiseIfProficient` is now copied onto the
builder slot so Keen Mind / Observant pickers keep already-proficient skills
visible. Keeper of History grants History and Performance through that flag
instead of a Rogue-style expertise picker. Still no generic
`conditionalUpgrade` for saves / tools / armor.

**Extra wield slots (2026-09-04).** `extra_wield_slots` is the reusable extra-hands
type (Thri-kreen Secondary Arms). `extraSlots` (default 1) plus optional
`allowedProperties` (e.g. `["light"]`). Runtime: a weapon with **two-handed** and
**not versatile** occupies both hands — no shield or off-hand — unless
`extraWieldSlots > 0`. Enforcement is `lib/character/wield-constraints.ts` (Gear
panel + persist), not a species-name branch. Do not reuse `held_items_cap`
(Alchemist held crafts).

**Spend-based special attacks (2026-09-04).** `special_attack` can set
`damageFromResourceSpend`, `spendResourceOnHit`, and `criticalDamageMultiplier`.
The action's variable `limitedUses` chooses and caps the spend; the roll step
then confirms Miss / Hit / Critical, deducts only on a hit when configured, and
uses the selected spend as flat damage. Charnel Touch uses this with a 5 × PB
cap. **Heal-from-spend (2026-09-05):** `healFromResourceSpend` + `healTarget`
(`controlled_companion` | `choose_ally`) + optional `unlocksAtClassLevel` adds a
second profile that spends the same pool to restore companion HP with no attack
roll (Healing your Thralls at Necromancer 2). Keep this generic—do not branch on
the feature name in sheet runtime.

Audit (2026-09-01): **no dead types**. “Unreachable” (applied but neither
Compendium-authorable nor importable): `catalog_option`, `craftable_items`,
`held_items_cap`. Those are enrichment / system-inserted. Untested:
`catalog_option`, `creature_size`, `extra_turn`, `saving_throw_trigger`,
`spells`.

`DERIVED=no` on the audit table does **not** mean unused. Many types are
side-channel (`turn_start_trigger`, `d20_test_reaction`, `weapon_sheet_badge`,
…) or consumed by weapon/sheet collectors rather than `compute-derived.ts`.

The audit “DUPLICATES” group is almost all **passthrough `result.foo.push(mod)`
bodies**. That is a structural family, not a merge candidate.

## Play-state engines (do not catalog)

BYO / Drive prompts already say this. Keep feature names and trigger sentences
verbatim.

| Engine | Module | How to author |
| --- | --- | --- |
| Inventory containers | `inventory-containers.ts` | CharacteristicModifier `inventory_container` (side-channel). Contents in `sheet_state.containerInventories`. Dead Space uses `linkHostItem` + create_mundane linked item (level-up slot and overlay share the pick); Bag of Holding / Portable Hole use `attachToEquipmentNames` or magic_effects on the item. Gear and the feature action overlay show Contents. |
| Companion rest pick | `resolve-companions.ts` + rest overlay | CharacteristicModifier `grant_creature` with `choiceOptions` plus `pickOnRest` (`short_rest` / `long_rest` / `short_or_long_rest`) and optional `combinedCrByLevel` (`count` is the CR total, so `0.25` = 1/4). The rest overlay and Companions tab share `knownForms`. Do not name-branch Thralls in sheet runtime. |
| Companion copies / HP pools | `companion-instance-groups.ts` + `components/character-sheet/companion-hp-pools.tsx` | Repeated picks of one form (4 × Skeleton) render as **one** stat block with a hit point pool per copy (`groupCompanionInstances`). Each copy keeps its own `companionKey` (with `formInstance`), so HP, temp HP, rename, and conditions persist per copy in `CharacterCompanionState`. No authoring — it follows from `grant_creature` picks. |
| Companion / creature attacks | `companion-stat-block.ts` (`CompanionAttack`) + `infer-companion-attack.ts` | Creature actions carry a structured `attack` (kind `melee` / `ranged` / `melee_or_ranged` / `save`, to-hit or `saveDc`, `damage[]` rolls as `CompanionScaledValue` parts that can scale off the owner's ability mod / PB / spell attack). The Compendium creature editor (`creature-action-editor.tsx`) edits it; `withInferredCompanionAttacks` / `withInferredStatBlockAttacks` fill it from action prose when missing ("+5 to hit … 1d6 + 3 Slashing", "your spell attack modifier", saving-throw damage). Sheet roll buttons read the structured attack, never the prose. |
| Rampage Die | `rampage-die.ts` | Wording only. Dependants gate with `requiresSheetToggle: "rampage_die_d8_plus"` (derived — not `new_toggles`). Tantrum / Unstoppable Rampage: names + text |
| Flesh Warp Mutation Die | `mutation-die.ts` | Wording; ally-benefit counts in play state |
| Mesmerism tokens | `illusion-tokens.ts` | Projected Self / Imaginary Ally names + text |
| Weapon Morph | `weapon-morph.ts` | Menu options; sheet sets exclusive `weapon_morph_*` |
| Balance of Power | `balance-of-power.ts` | Banked pool in `accumulatedResources` |
| Perfected Enhancement | `perfected-enhancement.ts` | Temp-HP bonus from live play state |
| Influence Points | `influence-points.ts` | Banked value + optional real-time decay |

Derived keys the sheet owns: `rampage_die_d8_plus`, `weapon_morph_*`,
`below_half_hp`. **Reference** them from modifiers; never declare them under
`new_toggles`.

`attacking_chosen_foe` (optional) gates riders that only apply against creatures
a feature singled out ("against the chosen creatures", sworn foes). The
`damage.rider.dice` detector attaches it; `quarry_marked` stays Hunter's Mark.

Name → toggle activation (not a catalog type):
`ACTION_NAME_ACTIVATES_TOGGLE` / `RESOURCE_KEY_ACTIVATES_TOGGLE` in
`sheet-toggle-registry.ts` (Rage, Dance / `dances` → `while_dancing`, …).

## Name-keyed leftovers in sheet runtime

These still special-case a feature **name** in `lib/character/sheet-actions.ts`
(and helpers). Prefer a catalog field the next time one of these is touched;
do not add a new name branch beside them.

| Name / pattern | What it does |
| --- | --- |
| Potion Mixologist | Force Combat + bonus-action filing |
| Earthshatter | 5 ft → 10 ft slam at Warden 14 |
| Reckless Attack (and similar) | `spendsEconomy: false` for free declarations |
| Healer feat | Display label “Battle Medic” |
| Grasping Vines | Talent-alert / related-action wiring |
| Empowered Strike | Rider attach by ability name |

Several of those already have enrichment presets (Occultist, Necromancer, MHP
Warden, Psion). The leftover is the **runtime flag**, not the import attach.

### Spend-on-roll weapon riders (2026-10-03)

`power_rider` with `weaponDamageMenu` can now cost something. `classResourceDieCount`
rolls that many **single** dice at the pool's current size (`classResourceDieSides`) —
not the pool-count column Finisher uses. `spendClassResourceAmount` and
`riderActionKind` make the DMG ··· option one-shot: it starts unchecked, rolling spends
the dice and marks the Bonus Action (`spendWeaponDamageRiders` in the sheet client),
then it unticks. It is disabled when the pool is short. `weaponScope` limits to melee
(incl. Unarmed Strike) or ranged; `complementaryAbilities` + `abilityBonusMinimum`
cover "your STR or DEX modifier, whichever you don't already add". The menu dedupes by
label so a subclass `[Maneuver]` feature and the ability it grants show one option.
The maneuver's own card still exists — players use one path or the other.

**Hazard:** a bare activation-level `check_roll_modifier` on a **class / subclass
feature** is collected by `collectFeatureRollBonuses` for every matching d20 roll (only
limitations gate it). A spend-a-die bonus must nest under `failed_roll_trigger` /
`d20_test_reaction` so it rolls only when the card is used. Vagabond Tenacity was
wired the bare way and rolled a Battle Die into every save until re-imported.

### Post-roll resource dice on d20 buttons (2026-10-04)

A self `failed_roll_trigger` with `spendResourceKey` and a nested die bonus
(`bonusConfig.mode: "die"`) is offered on every matching `D20RollButton` **after** the
roll: a `+d8 Knack` chip rolls the die, adds it to that result, spends the pool
(`spendPostRollBoost` in the sheet client), and marks the Reaction when `useReaction`.
`collectPostRollDieBoosts` (`lib/character/post-roll-die-boosts.ts`) does the matching:
`rollKind: "ability"` also matches skill checks; `ability` / `skills` filter;
`requiresProficiency` limits to proficient skills (Knack); `rerollRoll` rerolls the d20
first (Tenacity). Ally-scope triggers are not offered. The sheet can't see the DC, so
the chip shows on every matching roll and the player decides.

Placement: an item with a self skill / ability-check trigger files on **both** Combat
and Abilities & Skills (`itemBoostsOwnChecks` in `pushCustomAbilityActions` and
`inferFeatureSheetDisplay`). An explicit feature `sheetDisplay` still wins.

Not tracked yet: "once per turn" on Knack-style dice.

### Spell slots ride on `class_resource` (2026-09-01)

The four slot-restore name branches (Magical Cunning, Arcane Recovery, Dark
Arcana, Traditional Expertise) are gone from `collectSheetActions`. Two
`classResourceKey` values are **reserved** and route to the spell-slot trackers
instead of a `class_resources` row:

| Key | `classResourceChange` | Extra field | Sheet hook |
| --- | --- | --- | --- |
| `pact_magic_slots` | `reset` | `resourceRefreshFormula` (`half_level` / `full`) | `restorePactSlotsOnUse` |
| `spell_slots` | `reset` | `spellSlotMaxLevel` | `restoreSpellSlotsOnUse` |
| `spell_slots` | `reduce` | `spellSlotMinLevel` | `spendSpellSlotOnUse` |
| any pool | `increase` | `restoreFromSpellSlot` + `classResourceAmountConfig.ability` | `restoreResourceFromSpellSlotOnUse` |

Reader: `lib/character/spell-slot-use-effects.ts`. `regainAllOnLinkedFeatureUse`
+ `linkedFeatureName` now actually fires — that is how Eldritch Master upgrades
Magical Cunning to a full restore, instead of a `/^eldritch master$/i` test.

Two caveats before you extend this:

- The new sub-fields are **not** in the Compendium editor yet
  (`class_resource` still exposes `classResourceKey` / `classResourceChange` /
  `resourceRefresh`). A user can retarget the key but cannot edit the slot-level
  bounds. Add the editor cases if you touch this again.
- `LEGACY_SLOT_HOOKS_BY_FEATURE_NAME` in `sheet-actions.ts` backfills the four
  names for rows seeded or imported **before** the effect existed, because
  `enrichSrdClassList` runs at seed time and `applyImportEnrichmentPresets` at
  import time — neither runs on load. Delete the table once the Seed button and
  `scripts/refresh-class-import-modifiers.ts` have been re-run everywhere. Do
  not add entries to it.

The Compendium `class_resource` dropdown always lists reserved keys (Hit Dice,
spell slots, Pact Magic slots) even when the class has no matching
`class_resources` row.

### Hit Dice ride on `class_resource` (2026-09-10)

Same reserved-key pattern. `hit_dice` (aliases `hit_point_dice`, `hit_point_die`)
routes to the sheet HD tracker — do not add a `class_resources.hit_dice` row.

| Key | `classResourceChange` | Sheet hook |
| --- | --- | --- |
| `hit_dice` | `reduce` (or omitted) | `spendHitDice` / HD pool on Use |
| `hit_dice` | `increase` | `restoreHitDiceOnUse` (fixed amount) |
| `hit_dice` | `reset` | `restoreHitDiceOnUse` (all remaining) |
| `limitedUses.type: class_resource` + `classResourceKey: hit_dice` | — | Shared HD pool (`up_to_proficiency_bonus` etc. work) |

`activation.spendHitDice` and menu `hitDiceCost` still work. When a feature also
has `healMode: "hit_dice"`, the heal dice count is the spend (Martyr Miraculous
Healing 1/2/3/4). Rest restore stays `hit_dice_restore` (Divine Respite).

Reader: `lib/character/hit-dice-use-effects.ts`.

### Named-pool refill on Use (2026-10-04)

A `class_resource` `reset` / `increase` on a **non-reserved** key with no refresh
flag (`resourceRefreshOn*`, `regainAllOnLinkedFeatureUse`) is an activated refill
(Vagabond Martial Recovery, Overexertion). `resolveClassResourceRestoreOnUse`
sets `SheetActionEntry.restoreClassResourceOnUse`; the panel's Use handler
gives back expended uses via `resolveResourcePool`. Refresh-flagged effects stay
with `collect-resource-refresh-effects.ts`.

Reader: `lib/character/class-resource-restore-on-use.ts`.

A conditional spend with no action economy ("When you have no Battle Dice")
gets its card from `activation.requirements` `{ kind: "custom", text }`:
`authoredTriggerLabel` uses the text as the trigger, so the card files under
Triggered instead of vanishing.

## Efficiency and dependency hazards

- **Two walkers.** A value that lives on both a characteristic and an effect
  can double-display or double-apply if you consume the wrong one. Follow the
  decision rule; do not “also add it to the aggregate just in case.”
- **Toggle prune.** Any new gate (`limitations`, `resource_ability_menu`,
  FeatureEffect limitations, action-name activation) must be visible to
  `collectReferencedSheetToggleIds` or the banner toggle dies on the next
  derived recompute.
- **Long add-type chain.** A type that is only in `CHARACTERISTIC_MODIFIER_TYPE_OPTIONS`
  is half-wired. Agents then invent a name branch to “finish” it. Use the
  checklist below.
- **Weapon aggregate bleed.** Flattened `bonusDamageRiders` / crit floors are
  global. Scoped riders stay on the raw modifier.
- **`uses` vs `class_resource` vs `limitedUses`.** Three places can describe
  the same pool. Prefer feature `limitedUses` + `classResourceKey` for spend,
  CharacteristicModifier `uses` for granted pools, FeatureEffect
  `class_resource` for spend/restore **on Use**.
- **Editor vs import vs aggregate.** `weapon_reach_modifier` is importable but
  the audit marks it not authorable (no editor case). `saving_throw_trigger`
  is authorable but not in `AI_MECHANIC_KINDS`. Fix the missing surface
  instead of adding a parallel type.

## How to add a catalog type

Only when the idea is reusable and a user must edit it on the Compendium row.

**CharacteristicModifier**

1. Add the option + TypeScript shape in `characteristic-modifiers.ts`.
2. Handle it in `aggregateCharacteristics()` **or** document it as a
   side-channel and add it to `SIDE_CHANNEL_TYPES` in
   `audit-modifier-catalog.ts`.
3. Consume it from `DerivedCharacter` / a collector. If it is authored-but-not
   consumed, say so in [modifier-vs-feature-effect.md](./modifier-vs-feature-effect.md)
   and here — do not leave a silent aggregate field.
4. Editor case in `components/characteristic-modifiers-editor.tsx`.
5. Catalog generation picks it up unless you add it to
   `EXCLUDED_PASSIVE_CATALOG_TYPES`.
6. If BYO should emit it: `AI_MECHANIC_KINDS` + INDEX entry + detect rule (or
   an explicit narrative-suffix exemption).
7. Enrichment preset only if a class cannot be phrase-detected.
8. Test: unit on aggregate/sheet, plus `byo-prompt-guidance` / Drive import
   when the lapse was extract/prompt.
9. Update **this file** (gap closed, new engine, or new leftover).

**FeatureEffect**

Same loop against `ACTION_EFFECT_OPTIONS`, `feature-effect-list.tsx`,
`sheet-actions.ts` (or a dedicated collector), and `cat_fx_*`. Unified check
kinds already exist — do not revive `check_advantage`.

**Prefer not adding a type** when you can:

- Gate an existing type with `limitations` / `requiresSheetToggle`
- Add a `resource_ability_menu` option (die-on-Use, Passive filing)
- Set `sheetDisplay` (combat / features / abilities / rest)
- Use `power_rider` / `modify_custom_ability` / `feature_choice_*`
- Use `player_note` or `weapon_sheet_badge` for reminders

## Enrichment packs

Registered in `lib/import/enrichment-presets/registry.ts`: Alchemist,
Investigator, Psion, Monk, Alternate Ranger / Sorcerer, Warmage, Occultist,
Beastheart, Kibbles Warden, Inventor, Dancer, Craftsman, Captain, Vagabond,
Witch, Gunslinger, Martyr, Necromancer, MHP Warden.

`packs/alternate-fighter.ts` (and monk / rogue / barbarian) are **table-fill
helpers**, not registry presets. `INVENTORY.md` and the comment block in
`enrichment-presets/index.ts` have lagged the registry — treat the registry as
canonical.

Named preset builders are still class-specific **data**. That is fine.
Irreducible **runtime** logic is the play-state engines above, not a missing
enricher module.

## When you finish a modifier change

- If you added, split, or retired a type / engine / name branch, update this
  file in the same PR.
- Do not bump `VERSION` unless the user asked for a release.
- Do not commit PHB/setting prose or unapproved card art.
