# New class playbook — agent guide

Last reviewed: 2026-10-09.

`packs/alternate-fighter-subclasses.ts` demonstrates subclass-scoped declarative
presets: require the parent class and subclass name, replace incorrect detected
modifiers before adding gated effects, and attach `power_rider` source alerts
or `player_note` controls where a rule still requires manual resolution. A
linked reminder is not a substitute for implementing resource or timing upgrades;
keep those remaining limits explicit in the import-review documentation.

Alternate Fighter is an example of a class that upgrades a separately imported
library. `packs/alternate-fighter-progression.ts` attaches catalog metadata for
use tiers, healing, extra attacks, level-gated initiative recovery, and filtered
custom-ability upgrades. `modify_custom_ability.abilityFilter` avoids capturing
only the abilities present in the same JSON paste. The shared prerequisite
context carries effective ability scores, skill/tool proficiencies, and languages: preserve
`Strength or Constitution 13, Athletics` as an OR score gate plus an AND skill gate.
Never treat those words as names of required talents.
The level-up picker derives these from saved and pending choices, including ASIs,
using `buildInputsFromSavedCharacter` and `computeDerivedCharacter`.

Use this when a class (or subclass pack) that has never been imported arrives, usually
through the BYO LLM flow. Twenty-plus homebrew classes have already been workshopped;
most "new" mechanics are one of the patterns below with a different name.

Related: [custom-modifiers.md](./custom-modifiers.md) (catalog inventory, play-state
engines, add-type checklist), [modifier-vs-feature-effect.md](./modifier-vs-feature-effect.md)
(which layer), [byo-prompt-design.md](./byo-prompt-design.md) (prompt budget),
[homebrew-import-review.md](./homebrew-import-review.md) (Drive audit / merge CLI).

## The order of preference

For each mechanic in the new class, stop at the first step that works:

1. **Already wires from wording.** The phrase matcher, SRD feature names, or
   `basedOnSrdFeature` handle it. Nothing to do except keep the sentence verbatim.
2. **An existing `mechanics[].kind` covers it.** Emit that kind (or let the user's LLM
   emit it) with the fields in the cheat sheet (`formatMechanicsCheatsheet()` in
   `lib/import/modifier-wiring-registry.ts`).
3. **An existing kind covers it with a gate or a field.** `limitations`,
   `requiresSheetToggle`, `new_toggles`, `sheetDisplay`, `resource_ability_menu`
   options, `unlocksAtClassLevel`, `dieByLevel`.
4. **The phrasing recurs but the matcher misses it.** Add a detect rule in
   `detect-feature-modifier-rules.ts` + the matching `DESCRIPTION_PHRASE_WIRING`
   entry. Tests require both.
5. **Only this class needs it, and the source wording cannot drive it.** Add an
   enrichment pack in `lib/import/enrichment-presets/packs/` and register it in
   `registry.ts`. Packs are data: match + operations (`setUses`, `setChoices`,
   `char_instance`, `fx_instance`, …). No book text.
6. **The idea is reusable and the catalog truly cannot express it.** Add a catalog
   type using the checklist in [custom-modifiers.md](./custom-modifiers.md#how-to-add-a-catalog-type).
7. **State changes mid-combat in a way no modifier can hold** (a die that grows, a
   banked decaying pool, tokens on the battlefield). That is a play-state engine in
   `lib/character/`. Ask the user before building one.

Never skip to a `if (className === "…")` branch in `lib/character/` or React.

## Mechanic pattern lookup

Match the rules text, not the class name. Field names are the `mechanics[]` shape.

### Actions unlocked during progression

Nested selected custom-ability options use `selectedCustomAbilityOptions` in
`lib/character/selected-custom-ability-options.ts` to expose their own Combat
actions. Keep option prerequisites, unlock levels and linked modifiers through
proposal confirmation and normalization; do not turn every unselected option
into an action. Psionic powers with augment tables use explicit base costs only:
an optional augment's cost is not the power's default cost.

Companion upgrades use `choices.applyTo: "companion"` and
`applyToCompanionFeature` even when they have no additional sub-options.
`applyCompanionScopedChoiceModifiers` places these selected abilities on the
companion as traits. Player aggregation and phrase detection exclude them.
Explicit "As an action/bonus action/reaction" entries appear in the companion's
matching action section instead; attack text uses the existing companion parser.
Conditional, repeatable and replacement stat changes still need manual tracking
unless an existing companion modifier expresses the actual condition.

An ability being present in `features[]` does not prove that it has a usable sheet
card. Run the import through `prepareImportedContent`, attach the character's class
and subclass with `attachClassDetails`, then inspect `collectSheetActions` at every
level. Pass the actual `featureChoicePicks` and unlocked custom abilities too.
Weapon masteries belong on equipped weapon cards; spell and ability grants need
their granted entries checked instead of a duplicate parent button.

`sheet-actions.ts` recognizes both "as a Magic/Utilize action" and "you can take a
Magic/Utilize action". Prefer explicit `activation` when authoring JSON. Put an
option's activation and effects on its linked modifiers, not on an unconditional
parent choice. A feature can prepare something during a rest and activate it in
combat: retain both surfaces using `sheetDisplay`. Explicit `featuresTab: false`
hides the feature; omitting it keeps the feature visible.

Separate creation limits from subsequent uses. A once-created item with a reusable
Bonus Action summon must not consume its creation charge on every summon. Likewise,
"once per creature kind" is not a single shared rest pool. Use the common
`player_note` characteristic for per-target bookkeeping when a dedicated tracker
does not exist. A `power_rider` reminder is informational, not proof of automated
damage, targeting, or resource payment.

Subclass-granted spell slots use `Subclass.spellcasting`, including for a base class
that only knows rituals or cantrips. `resolveEffectiveClassSpellcasting` chooses the
subclass slot model in that case. Nonstandard Pact Magic uses `caster_progression:
"pact"`, `starts_at`, and `explicit_slot_progression`; put the count at the single
slot level in each row. `getSpellSlotTable` preserves the pact slot level for rest
recovery and grants nothing before the first row. Use existing spellcasting fields
rather than inventing a class-resource slot pool or a class-name runtime branch.

### Resources and uses

| Rules text looks like | Wire as |
| --- | --- |
| Level-table column of points / dice (Ki, Psi Points, Exploit Dice) | `class_resources[]` with `uses.type: at_level` + `atLevelTable`; snake_case `resource_key` |
| Die size grows by level (d8 → d10 → d12) | Same pool, `uses.dieSidesByLevel` |
| Column that is a cap, not a pool (Max Spell Level, Ritual Level, Psi Limit) | `class_resources[]` special cap — never a spendable pool or pick catalog |
| "Expend N [points] to …" | Keep the spend sentence; phrase detection links `limitedUses` to the pool |
| Spend up to PB / ability mod per use | `classResourceCostMode: up_to_proficiency_bonus` / `up_to_ability_modifier` |
| "Once you use this, you can't again until you finish a Long Rest" | `uses` with `usesFixed` + `usesRecharge` — always wire this base even when an early refresh follows |
| "…unless you spend X to use it again" | Same `uses` plus `alternateRefresh` (additive) |
| Refills when you roll Initiative / on a crit | Feature-gated `class_resource` refresh (`resourceRefreshOnInitiative`, `resourceRefreshOnCriticalHit`) or pool `rechargeOnInitiative` when the table says so |
| Once per activation of Rage-like state | `usesRecharge: on_resource_reactivation` + `gatingResourceKey` |
| Pool introduced only in a subclass | `class_resources[]` with `subclass_name` set |
| Spend Hit Dice | Reserved `classResourceKey: hit_dice` — never a `class_resources.hit_dice` row |
| Restore spell / Pact slots on use | Reserved `spell_slots` / `pact_magic_slots` keys on `class_resource` |
| Points that appear at turn start and vanish at turn end | `turn_start_bonus_grant` (`expiresEndOfTurn`) |
| Refill a spent pool at turn start | `turn_start_resource_restore` |
| "As a Bonus Action, regain all your expended [pool]" | `class_resource` `reset` (or `increase` + amount) on the pool key with the action kind — no refresh flag. Use on the sheet refills it (`restoreClassResourceOnUse`). Phrase-detected (`resource.regain_all_on_use`) |
| "When you have no [pool]…" / other conditional spends with no action | `activation.requirements` `{ kind: "custom", text }` — the text becomes the card's trigger label so it files under Triggered |
| "Expend a Hit Die … regain HP equal to the roll plus CON" | `heal_self` `healMode: hit_dice` + `healAbility: CON`; the heal count is the HD spend. Phrase-detected (`heal.hit_dice_roll_plus_con`) |

### Picks and options

| Rules text looks like | Wire as |
| --- | --- |
| "Learn N [maneuvers / exploits / knacks] from the list" with a Known column | Library in `import_proposals.custom_abilities[]` (`ability_role: knack`); granting feature `isChoice` + `optionsSource: class_knacks` |
| Everyone gets the same named options (no Known column) | `grant_custom_ability` with `abilityNames` — not a picker |
| "Choose one of the following" each time you use it | `resource_ability_menu` with `menuOptions` (per-option `actionKind` / `resourceCost`) |
| Pick one permanent option at a level (Fighting Style–like, but class-specific) | `isChoice` + `choices` with exact option names |
| Feat milestone (ASI, Fighting Style feat, Epic Boon) | Feature name / `grant_feat` — never `isChoice` |
| Mutually exclusive spell lists (land types, theses) | `isChoice`, one option per subject with its own HTML spell table |
| Options that apply to a companion, not the player | `choices.applyTo: "companion"` (+ `applyToCompanionFeature`) |
| Swap a pick on a rest | `swappableOnRest: true`; level-up-only swaps use `false` |
| Discipline package → talents → specializations | `custom_abilities` hierarchy; `specialization_choices` (see `CUSTOM_ABILITY_LIBRARY_STRUCTURE_HINT`) |

### Combat

| Rules text looks like | Wire as |
| --- | --- |
| Automatic extra damage once per turn on hit | `on_hit_trigger` (`oncePerTurn`, `bonusDice`, `requiresSheetToggle` when gated) |
| Optional "you can deal extra damage" / Bloodied / first-round rider | `power_rider` with `parentPowerNames: ["Attack", "Unarmed Strike"]`, `weaponDamageMenu`, `selectable` |
| Maneuver: "expend N Battle Dice … add the Battle Dice to the attack's damage roll" | Same `power_rider` + `classResourceKey`, `classResourceDieCount` (single dice at the pool's die size), `spendClassResourceAmount`, `riderActionKind: "bonus"`, `weaponScope: "melee"` when Melee/Unarmed only. Phrase-detected (`weapon.damage_menu.expend_resource_dice`); rolling from the DMG menu spends the dice |
| "Expend a die and add it to a failed check / missed attack / ally's save" | `failed_roll_trigger` + `spendResourceKey` + nested `check_roll_modifier` die bonus (phrase-detected). Never a bare activation `check_roll_modifier` on a class feature — that rolls into **every** matching d20. The sheet offers it as a post-roll chip on the d20 button; "skill in which you have proficiency" → `requiresProficiency`, "reroll … and add" → `rerollRoll` |
| Rider on another named power or menu option | `power_rider` with `parentPowerNames` / `parentMenuOptionNames` |
| Breath weapon, bomb, blast, touch attack that is its own action | `special_attack` (`attackProfile`, save / area fields; `damageFromResourceSpend` for spend-scaled damage) |
| "Improved X" changes X's cost or action economy | `replace_feature` on the improved feature |
| "Improved X" only scales a number | `dieByLevel` / `amountByLevel` on the original — no new row |
| Extra attacks | `extra_attack` (`extraAttackCount` = attacks beyond the first) |
| Add to / reroll a failed roll | `failed_roll_trigger` |
| Add or subtract a die on someone's d20 test | `d20_test_reaction` |
| Aura / charm that subtracts from enemy rolls with no action | `modify_creature` `rollTarget: "enemy"`, `sheetDisplay.combatActions` → Combat Passive |
| Damage reduction while an effect is used (Rage, Evasion-like) | `damage_reduction` FeatureEffect; always-on DR is the characteristic |
| Forced saves / conditions imposed on other creatures | Narrative — do not invent a kind |

### States, casting, companions

| Rules text looks like | Wire as |
| --- | --- |
| "While in this form / while [state]" | Declare once in `new_toggles` on the class/subclass; gate benefits with `requiresSheetToggle` |
| Standard states (raging, Wild Shape, dancing, Bloodied) | Reference the built-in toggle key; do not declare |
| Renamed SRD feature (Leading Evasion ≈ Evasion) | `basedOnSrdFeature: "Evasion"`; deltas in description / `mechanics[]` |
| Cast named spells "without a spell slot" | Keep the sentence verbatim; phrase matcher wires the known spell + free cast |
| Subclass spell table unlocking by tier | One `spells_known` per tier with `unlocksAtClassLevel` |
| Casting paid in HP or a non-slot resource | Point-pool / HP spellcasting fields (`spellcasting.hit_point_cost_by_level`); never invent slot progression |
| Companion stat block | `creatures[]` + `grant_creature`; companions scale with `scaling` |
| Pick a companion form on a rest | `grant_creature` with `choiceOptions` + `pickOnRest` |
| 10-minute activity / "when you finish a Short Rest, you can…" | `sheetDisplay.abilitiesActions` / `restDialogues` — not Combat |
| Anything that does not fit | `unresolved` with a verbatim `sourcePhrase`, or `player_note` |

If a mechanic needs a table row that is not here, add a row to this file in the same PR
as the wiring.

## Workflow for a new class

1. **Get the extract.** The user runs the BYO prompt (Import → Clipboard) or gives a
   Drive path. Do not paste or commit the source text.
2. **Audit.** `pnpm import:audit -- <json> --source <txt>` lists structural problems and
   missing `LEVEL N` features. `pnpm prompts:measure` if you plan to touch prompts.
3. **Classify every feature** with the lookup above. Most rows need no change.
4. **Fix systemic lapses at the source** (session invariant 3): detect rule, registry
   entry, sanitizer, or pack — not only the one JSON row. If a second class would make
   the same mistake, it belongs in the prompt or sanitizer as a mechanic pattern.
5. **Enrichment pack only for what is left.** Add the pack to `registry.ts` and a row
   to `lib/import/enrichment-presets/INVENTORY.md`.
6. **Test.** A class Drive import test (pattern: `lib/import/__tests__/*-import.test.ts`,
   skipped in CI when the Drive fixture is absent) and/or a `byo-prompt-guidance`
   assertion. Add the new test file to `test:import-homebrew` in `package.json`.
7. **Check the sheet.** Import into a local compendium, build a character through the
   level that unlocks each resource, and confirm cards land on the right tab.
8. **Update docs.** New pattern → row here. New type / engine / name branch →
   [custom-modifiers.md](./custom-modifiers.md).

## Anti-patterns seen in past classes

- Modeling control caps (Thralls, Ritual Level, Max Spell Level, Finisher) as pick
  catalogs or spendable pools.
- Inventing normal spell slots for HP-cost or point-pool casters.
- Wiring an auto-granted option list as a `class_knacks` picker (no Known column).
- Adding a class-named block to the shared BYO prompt for a mistake an enrichment pack
  already corrects.
- Declaring sheet-owned derived toggles (`rampage_die_d8_plus`, `weapon_morph_*`,
  `below_half_hp`) in `new_toggles`.
- Emitting `damage_roll_modifiers` for optional weapon riders (belongs on `power_rider`).
- Dropping the base once-per-rest `uses` because an early-refresh sentence follows.
