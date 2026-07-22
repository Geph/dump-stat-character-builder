# Homebrew class import review (Cursor handoff)

How to give Cursor (and the repo tooling) content for the Mage Hand Press / homebrew **class extract → wiring review → merge → enrich** loop.

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

**After spell / ability fill-ins**

- Spells: take new `spells[]` (and usually `creatures[]`) from the new file
- Abilities: union `import_proposals.custom_abilities` by name + role + source (richer description wins)
- Re-run sanitizers so Claude doesn’t reintroduce picker / resource-key bugs

## Tests & hooks

| Gate | What |
| --- | --- |
| Vitest | `homebrew-import-ops`, `homebrew-prompt-footguns`, `homebrew-enrichment-smoke`, plus class-specific Drive tests |
| Stop hook | After `eslint` + `tsc`, if the turn touched import enrichment / hint files, runs `test:import-homebrew` |
| Pre-push | Existing affected-test vitest gate |

Opt out of import smoke in the stop hook for a session: `CURSOR_HOOK_SKIP_IMPORT_SMOKE=1`.

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
