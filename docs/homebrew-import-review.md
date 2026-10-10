# Homebrew class import review (Cursor handoff)

Last reviewed: 2026-10-09.

## Alternate Fighter validation

Subclass follow-up (2026-10-09): `packs/alternate-fighter-subclasses.ts` scopes
declarative presets by both archetype and parent class. It adds missing action
timing, editable target notes, and source-description alerts on the parent powers.
Battle Trance and its Mythic Reflexes AC upgrade require the active toggle and
exclude shields, heavy armor, and Incapacitated. Runic Might's Strength checks,
saves and optional damage require its toggle. Tactical Reposition no longer
adds permanent speed. `alternate-fighter-subclasses.test.ts` checks these gates,
unlock timing, and isolation from the original Fighter.

These links are not a claim of complete automation: parent-action alerts and
`player_note` controls still require the player to resolve the source rule.
Remaining work includes Master at Arms' extra exploit selections/die upgrades,
Quartermaster ration and Tinker schematic inventories, Hound Master/Shade full
companion stat blocks (the fixture currently contains name-only creature rows),
and automatic high-level timing/cost replacements. Battle Trance Dash, its free
exploit/d4 rule and at-will upgrade remain manual, as do conditional healing,
ally effects, movement, and several recharge interactions. Do not attach a
companion grant to a name-only row or substitute total character level for a
Fighter-level formula. The import review's WIRED label means linked metadata
exists, not that every sentence is automatically resolved.

Alternate-class art matching must not fuzzy-match a base class. The shared
subclass image resolver now keeps Alternate Fighter Champion separate from
Fighter Champion and clears a stale bundled default while retaining custom art.

Authority: the local `Alternate Fighter Class JAG v3.5.2 complete.pdf` and separate
shared exploit library. `alternate-fighter-progression.test.ts` runs JSON parsing,
proposal confirmation, enrichment, ability normalization, attachment, and sheet
action collection across levels 1–20 and all 19 archetypes. It checks base use
tiers, attack counts, variable spends, concurrent rest/resource costs, and
level-gated upgrades. Signature-exploit tables grant each row at its own class
level instead of granting the entire table with the initial subclass feature.
This is an automated data-to-sheet check, not a manual
browser playthrough or proof that every narrative effect is automated.

`exploit-wiring-regressions.test.ts` runs without private fixtures and protects
mechanic retention on proposals, score/skill/tool/language prerequisites, distance-text false
positives, independent costs, class-level healing, and temporary AC gating.
The Drive class and exploit imports carry the same wiring; revision backups
remain in the external `review-backups` directory.

The named Warrior Archetype feature owns the subclass-unlock modifier; reimport
removes only the exact generated generic Subclass shell. Eye for Talent carries
explicit Bonus Action activation and an editable `player_note` for observed
creatures/retry restrictions. Its Search roll, target CR, conditional class-level
bonus, and target-specific retry eligibility are resolved by the player from the
source description; neither an unconditional skill bonus nor a global rest cap
is appropriate. Regression checks assert linked metadata as well as visibility.

Manual boundaries: Martial Superiority's once-per-round permission is confirmed
by the player using the resource-waiver checkbox. Heroic Focus activates its
one-minute toggle, gates AC and Dexterity-save Advantage, and spends its die/use;
the player ends the toggle when concentration ends and tracks doubled movement
and the restricted extra action manually. Do not turn temporary effects into
unconditional bonuses to make a wiring report look complete. Narrative movement,
target selection, and externally resolved weapon-hit riders still use the source
description and existing combat overlays.

How to give Cursor (and the repo tooling) content for the Mage Hand Press / homebrew **class extract → wiring review → merge → enrich** loop.

This loop is not only for full class audits. If a sheet bug existed because Drive JSON, BYO instructions, detect rules, or enrichment missed a mechanic, update those sources in the same change — see [AGENTS.md](../AGENTS.md) session invariant 3. Which modifier layer to use (and when the sheet already owns the engine): [custom-modifiers.md](./custom-modifiers.md).

## TL;DR — what to paste into Cursor

Prefer **absolute paths** on disk. Do not paste full class JSON when a Drive file already exists.

```text
Class: <Name>
Import JSON: /Users/…/dump stat working files/import-json/magehandpress-<class>-class
Source text: /Users/…/dump stat working files/source-texts/Classes/magehandpress-<class>-class
Spell fill-in (optional): /Users/…/<class>_full.json
Ability fill-in (optional): /Users/…/import-json/kibbles-psion-custom

Please: audit wiring → merge fill-in if given → fix Drive JSON / enrichment / LLM hints → run npm run test:import-homebrew
```

Shared catalogs (Psionic Disciplines, Exploits, multi-class Knacks) are first-class: point `Ability fill-in` at a Drive file shaped like `{ "import_proposals": { "custom_abilities": […] } }` (example: `kibbles-psion-custom`). Do **not** put `magehandpress-spells` in Ability fill-in.
## What this pipeline is

Spell-list membership does not determine authorship. `merge-spell-persist.ts`
keeps the description, publisher, and matching creator link together; a complete
write-up can repair an empty stub's incorrect publisher. Spell normalization and
`SpellImportSchema` preserve `creator_url`. The merge regression suite checks
every bundled SRD spell for a nonempty description and retained SRD attribution.
Non-SRD spells referenced by class lists need a separate write-up in local imports;
do not add them to SRD seed data. Correct misspelled names in the originating JSON
list and stub together rather than creating additional empty catalog entries.

1. LLM extracts a class (+ subclasses, resources, spells, creatures) into JSON.
2. You (or Cursor) audit wiring against Dump Stat conventions.
3. Enrichment presets / LLM prompts are updated when a gap is systemic.
4. Later spell / **custom-ability** fill-ins are merged without undoing structural fixes.
5. Tests / smoke / stop-hook keep regressions from landing.

Canonical Drive folders (override with env if needed):

| Role | Default path | Env override |
| --- | --- | --- |
| Import JSON | `…/dump stat working files/import-json/` | `HOMEBREW_IMPORT_JSON_DIR` |
| Source texts | `…/dump stat working files/source-texts/Classes/` | `HOMEBREW_SOURCE_TEXTS_DIR` |

Repo tooling lives in `lib/import/homebrew-import-ops/` and `scripts/homebrew-import-ops.ts`.

## How to hand content to Cursor

### Preferred message shape

Paste **paths**, not megabyte JSON blobs, whenever files already exist on disk:

```text
Review wiring for this class extract (and update enrichment/LLM hints if needed):

Import JSON:
/Users/…/import-json/magehandpress-whatever-class

Source text (optional but better for completeness):
/Users/…/source-texts/Classes/magehandpress-whatever-class

If this is a spell fill-in pass, also give the newer Claude output:
/Users/…/outputs/whatever_full.json

If this is a shared ability catalog (disciplines, exploits, knacks):
/Users/…/import-json/kibbles-psion-custom

Goal: audit → fix Drive JSON / enrichment / prompts → run smoke tests.
```

### Ability catalogs (standalone)

Keep multi-class libraries **separate** from the class JSON when they are reused (Psion disciplines, LaserLlama exploits, etc.):

```text
Ability catalog: /Users/…/import-json/kibbles-psion-custom
Source text (optional): /Users/…/source-texts/…

Please: audit the ability catalog; merge into the class import JSON if I also give a class path.
```

Merge into a class (or refresh the catalog itself):

```bash
# Catalog ← richer extract
npm run import:merge -- \
  --mode abilities \
  --base "$HOMEBREW_IMPORT_JSON_DIR/kibbles-psion-custom" \
  --incoming "/path/to/psion_disciplines_full.json" \
  --write "$HOMEBREW_IMPORT_JSON_DIR/kibbles-psion-custom"

# Class ← catalog (union by name/role/source; richer description wins)
npm run import:merge -- \
  --mode abilities \
  --base "$HOMEBREW_IMPORT_JSON_DIR/kibbles-psion-class" \
  --incoming "$HOMEBREW_IMPORT_JSON_DIR/kibbles-psion-custom" \
  --write "$HOMEBREW_IMPORT_JSON_DIR/kibbles-psion-class"
```

`npm run import:audit -- <catalog-or-class.json>` also reviews `import_proposals.custom_abilities` (duplicates, missing names/roles, empty catalogs).

**Same-name knacks across classes.** Custom abilities persist by name. When a second class
imports a knack whose rules text matches an existing row owned by another class (Vagabond and
the Warden's Grey Watchman share Bear Hug, Bull Rush, Heel-Cutter, …), persist keeps one row and
unions both owners into `eligible_classes` (`lib/import/merge-shared-ability-rows.ts`). Different
rules text under the same name still overwrites — rename one in the JSON if two classes really
have different abilities with one name.

### When you have a brand-new Claude `*_full.json`

1. Save it somewhere stable (Claude outputs folder is fine).
2. Tell Cursor to **merge into Drive** with the CLI or agent:

```bash
npm run import:merge -- \
  --base "$HOMEBREW_IMPORT_JSON_DIR/magehandpress-investigator-class" \
  --incoming "/path/to/investigator_full.json" \
  --write "$HOMEBREW_IMPORT_JSON_DIR/magehandpress-investigator-class"
```

3. Then ask for enrichment/prompt review if the audit still warns.

### When the extract is only in chat

Ask Cursor to write it to Drive `import-json/<basename>` first, then audit. Avoid re-pasting the full class JSON across turns.

### What to ask for (copy-paste intents)

| Intent | Say something like |
| --- | --- |
| Full wiring review | “Audit this import JSON for wiring + LLM prompt gaps; fix enrichment if needed.” |
| Spell fill-in only | “Merge this `*_full.json` into Drive import-json; keep structural sanitizers.” |
| Ability catalog / fill-in | “Audit/merge this custom_abilities catalog (disciplines/exploits); `--mode abilities`.” |
| Completeness vs PDF text | “Compare source-texts headers to JSON features; list missing LEVEL N features.” |
| Prompt-only | “Update CLASS_RESOURCE / HOMEBREW_WIRING hints for class X; don’t invent sheet math.” |
| Ship it | “Commit push” (after smoke is green). |

## CLI cheat sheet

```bash
# Structural wiring audit (+ optional source completeness). --fix writes sanitizers in place.
npm run import:audit -- /path/to/import.json
npm run import:audit -- /path/to/import.json --source /path/to/source.txt --fix

# Merge richer spells into Drive JSON and re-apply sanitizers
npm run import:merge -- --base <drive-json> --incoming <full.json> --write <drive-json>

# Merge custom abilities (standalone catalog ↔ catalog, or catalog → class)
npm run import:merge -- --mode abilities --base <base.json> --incoming <abilities.json> --write <out.json>

# Auto: merge spells and/or abilities based on what incoming contains
npm run import:merge -- --mode auto --base <base.json> --incoming <full.json> --write <out.json>

# Source LEVEL N headers vs JSON only
npm run import:ops -- completeness <json> --source <txt>

# Audit Investigator / Martyr / Necromancer / Vagabond Drive fixtures
npm run import:smoke
```

Underlying runner: `node scripts/run-vite-node.mjs scripts/homebrew-import-ops.ts <cmd> …`
(uses vite-node so path aliases work; avoid raw `tsx` in this repo).

Package scripts:

- `npm run import:audit -- <json> […]`
- `npm run import:merge -- --base … --incoming … [--mode spells|abilities|auto]`
- `npm run import:ops -- <audit|merge|completeness|smoke> …`
- `npm run import:smoke`
- `npm run test:import-homebrew` — unit + footgun + Drive smoke vitests

## Checklist Cursor should always run

**Structural (auto-fixable)**

- Investigator: `finisher` not `finisher_dice`; class Trinkets is **not** `class_upgrades`; Holy Trinkets also in `equipment[]`
- Necromancer: `charnel_touch` uses `{ type: "at_level", atLevelMode: "multiply_level", atLevelTable: [{level:1,count:5}], … }` — never `uses.type: "multiply_level"`; Thralls not `class_upgrades`; `spellcasting` full INT; Deadnaught `companion`
- Martyr: `spell_uses` long rest + `max_spell_level` special; no fake slot progression for HP Spellcasting

**Enrichment / prompts (code)**

- If the same mistake appears twice across extracts → fix sanitizer + LLM hint, don’t only patch JSON
- Prefer narrative notes over inventing unsupported sheet primitives
- Write prompt fixes as mechanic patterns, not class-named blocks; check `pnpm prompts:measure` ([byo-prompt-design.md](./byo-prompt-design.md))
- Classify each feature with the pattern lookup in [new-class-playbook.md](./new-class-playbook.md) before adding a preset

**After spell / ability fill-ins**

- Spells: take new `spells[]` (and usually `creatures[]`) from the new file
- Abilities: union `import_proposals.custom_abilities` by name + role + source (richer description wins)
- Re-run sanitizers so Claude doesn’t reintroduce picker / resource-key bugs

## Tests & hooks

### Kibbles bundled progression audit

`lib/import/__tests__/kibbles-level-progression.test.ts` runs the actual prepare,
proposal-confirmation, enrichment and normalization path for Inventor, Occultist,
Psion and Warden, then checks base/subclass and selected custom-ability actions at
levels 1–20. It pins resource tables, Psion discipline/power counts, specialization
and talent gates, free base powers versus paid augments, and Inventor upgrade tiers.
Source authority: local `KibblesCompendiumOfCraftAndCraftion-v1.2-compressed.pdf`
and `KibblesCompendiumOfLegendsAndLegaciesV1.0.2-compressed.pdf`. Upgrade sections
were checked against the rendered columns, not just extraction order. Fifteen
Inventor tier corrections are metadata in the Inventor enrichment pack and are
also applied to bundled/Drive JSON. These tests run without private fixtures.

This verifies data-to-sheet progression, not every possible combination or a
manual browser playthrough. Narrative effects, temporary/conditional companion
stat changes and complex upgrade prerequisites involving companion statistics
still need source-rule adjudication. Do not replace those with unconditional
player bonuses. Companion upgrades retain full rules on the companion.

### Referenced spells and attribution

Blank spell-list references use `SPELL_REFERENCE_IMPORT_NOTICE`: import the owning
source and choose Overwrite. Non-SRD WotC prose is not bundled. Seed pack generation
uses `normalizeBundledSpellReference` to preserve the spell's publisher rather than
stamp its referencing class's publisher. The SRD read fallback fills missing SRD
descriptions and corrects their source/creator URL; non-SRD entries retain the
import notice. Merge treats that notice as empty, so a later real writeup replaces
it while a later reference-only import cannot erase an existing description.
`spell-references.test.ts` checks all 339 SRD writeups through this path. Spell-name
matching only strips actual apostrophe-s author prefixes; "Mass" must never match
the single-target spell or share its persisted ID.

### Mage Hand Press source revisions and level coverage

The local Valda class extracts use **Valda's Class Update 1.2, June 13, 2026**
(`Valdas-Class-Update-1.2-6-13-2026-k5j4ws.pdf`) as their authority. It covers
Alchemist, Captain, Craftsman, Gunslinger, Investigator, Martyr, Necromancer,
Warden, Warmage, and Witch. Dancer and Vagabond retain their separate source PDFs.
Keep publisher prose, PDFs, and revision backups in the external working-files
directory, never in this repository.

When reconciling a new edition, compare feature **owner, level, name, description,
choices, and linked mechanics**. A corrected sentence does not remove an obsolete
modifier. Inspect multi-column pages visually, including boxed spell/progression
tables. Source headers can be repeated in introductory lists, and a feature can
continue in the next column; neither is a subclass boundary. Preserve useful HTML
tables in import JSON. Recheck the structured values as well as the displayed table.

Run `pnpm exec vitest run lib/import/__tests__/mhp-level-progression.test.ts`.
With the local fixtures present it traverses the base and all subclass paths for
all 12 MHP classes at levels 1–20, checks action visibility and premature unlocks,
exercises selected action options and granted custom abilities, and pins important
version corrections and Combat-tab placements. Private fixtures are optional and
these checks skip in CI when absent; the synthetic sheet-action and prompt tests
remain runnable everywhere. This is an automated data-to-sheet check, not a browser
playthrough or a proof that every narrative effect is automated.

The Occultist subclass's 1.2 slot counts are normalized in the Investigator import
pack; the shared spell-slot resolver handles the resulting explicit pact table.
Bonus Actions and Reactions on both features and granted custom abilities appear
on Combat, including utility uses that also remain on Abilities.

Current explicit manual boundaries: Soulsteel uses a common modifier reminder for
the chosen weapon, once-per-turn damage, proficiency restriction and duration;
Arcane Dominance exposes a combat Bonus Action but combined spell-slot payment is
manual. Do not reintroduce unconditional damage bonuses or fake single-slot costs
to make a coverage report appear fully wired.

| Gate | What |
| --- | --- |
| Vitest | `homebrew-import-ops`, `homebrew-prompt-footguns`, `homebrew-enrichment-smoke`, plus class-specific Drive tests |
| Stop hook (`.cursor/hooks/post-turn-verify.mjs`) | `eslint .` + `tsc --noEmit`; when the turn touched `lib/import`, `lib/compendium`, or `lib/character`, also the resource-graph, granted-equipment, and claim-coverage audits (`scripts/post-turn-audits.ts`). Force with `CURSOR_HOOK_FORCE=1`; add `next build` with `CURSOR_HOOK_RUN_BUILD=1` |
| Manual | `pnpm test:import-homebrew` — the homebrew Drive / smoke bundle (not run by the hook) |
| Pre-push | Existing affected-test vitest gate |

Weapon-mastery catalog rows suppress both name and phrase detection: a mastery
named Finisher must not inherit the Investigator class feature's damage rider.
The Drive mastery test covers that collision; synthetic detector coverage also
runs in CI. Explicit maneuver proposals retain inferred resource labels when
their authored rows take priority over inferred feature proposals.

## File naming conventions

- Drive import JSON: `magehandpress-<class>-class` (often no `.json` suffix)
- Shared ability catalogs: `kibbles-psion-custom`, `…-exploits`, etc. — `{ import_proposals: { custom_abilities: […] } }`
- Source: same basename under `source-texts/Classes/` (or a sibling folder for non-class catalogs)
- Claude spell/ability pass: `*_full.json` — treat as **incoming**, not as the long-term Drive copy until merged

## What not to do

- Don’t paste entire class JSON into chat when a path exists.
- Don’t overwrite Drive JSON with a raw `*_full.json` without merge/sanitize.
- Don’t put the shared `magehandpress-spells` catalog in Ability fill-in (or dump it into a class).
- Don’t model control caps (Thralls, Ritual Level, Max Spell Levels, Finisher) as spendable pick catalogs.
- Don’t invent normal spell slots for Martyr Hit Point Spellcasting or Investigator Ritualist.
