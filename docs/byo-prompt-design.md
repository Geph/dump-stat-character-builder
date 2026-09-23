# BYO prompt design — agent guide

Last reviewed: 2026-09-22.

The BYO (bring-your-own LLM) import flow hands the user a prompt they paste into
their own chat model. The goal is that the prompt works on **entry-level models**:
the free or base tiers of ChatGPT, Gemini, Copilot, and Claude. Those models have
smaller context windows, shorter output caps, lower paste limits, and weaker
instruction following on long prompts than paid tiers.

Read this before you add a hint, a homebrew pattern, a worked example, or a new
`mechanics[].kind` to the prompt. Which modifier to wire is covered in
[custom-modifiers.md](./custom-modifiers.md); how to wire a new class is covered in
[new-class-playbook.md](./new-class-playbook.md).

## Two prompt modes

The Clipboard tab has a **Prompt size** selector (`components/import/byo-prompt-mode-select.tsx`,
saved in `localStorage`). Both modes produce the same JSON shape for Step 2.

| Mode | Built by | Size | For |
| --- | --- | --- | --- |
| **Full** (default) | `buildByoExtractionPrompt()` in `lib/import/byo-import-kit.ts` | ~190–214K chars | Paid / large-context models. Carries the whole Common Modifier index and every homebrew pattern |
| **Lite** | Same function with `promptMode: "lite"`; blocks in `lib/import/byo-lite-prompt.ts` | ~5–25K chars | Free / base-tier models. Verbatim wording + compact mechanics shapes + content-type-scoped hints |

Lite is enforced by `lib/import/__tests__/byo-lite-prompt.test.ts`: every content type
(with PDF, custom-systems, and subclass-match options) must stay under
`BYO_LITE_PROMPT_MAX_CHARS` (30K). Lite also tells the model to batch long output and end
with a `Continue with:` line; `strip-llm-json.ts` drops that trailing text on paste.

Lite relies more on the deterministic side (phrase matcher, name presets, enrichment
packs, sanitizers). A lite extract of an already-workshopped class still wires well
because its pack runs at import. A brand-new class gets less `mechanics[]` help, so the
review step and `unresolved` claims matter more.

## How the full prompt is assembled

`buildByoFullPrompt()` in `lib/import/byo-import-kit.ts` joins, in order:

| Part | Source | Scoped by content type? |
| --- | --- | --- |
| Base system prompt + every `*_HINT` | `buildImportSystemPrompt()` in `import-system-prompt.ts`; hints in `content-schema.ts` | **No** — all hints ship for every type |
| Common Modifier wiring index | `buildCommonModifiersImportHint()` in `modifier-wiring-registry.ts` (re-exported as `MECHANICS_IMPORT_HINT`) | **No** |
| Custom-systems / subclass-match hints | `custom-systems-import-hints.ts`, `subclass-match-import-hints.ts` | Yes (Step 0 inputs, abilities types) |
| PDF upload block | `formatPdfUploadBlock()` | Only when uploading a PDF |
| Clean-source guidelines | `CLEAN_SOURCE_TEXT_GUIDELINES` | No |
| Content-type focus | `CONTENT_TYPE_JSON_FOCUS[hint]` | Yes |
| Output rules + JSON template | `JSON_OUTPUT_RULES`, `IMPORT_JSON_TEMPLATES[hint]` | Yes (template) |
| Delimiter + user source text | `buildByoFullPrompt()` | — |

Server AI text import (`app/api/import/text/route.ts`) uses the same
`buildImportSystemPrompt()`, so a change to a shared hint affects both paths.

## Where the size goes (measured 2026-09-22)

Run `pnpm prompts:measure` for current numbers.

| Content type | Instructions only |
| --- | --- |
| Most types (classes, species, spells, languages, …) | ~192–195K chars (~48K tokens) |
| `abilities`, `invocations_metamagic` | ~209–214K chars (~52–53K tokens) |

Plus up to `PASTED_SOURCE_TEXT_MAX_CHARS` (100K) of source text.

The Common Modifier wiring index is ~112K of that:

| Section | Size | Notes |
| --- | --- | --- |
| Homebrew patterns (`HOMEBREW_WIRING_PATTERNS`, 24 blocks) | ~42K | One block per workshopped class. Grows with every class |
| Description phrases (`DESCRIPTION_PHRASE_WIRING`, 143 rules) | ~32K | The phrase matcher runs at import whether or not the LLM read these |
| Cheat sheet + examples | ~36K | Field names per `mechanics[].kind` |
| Feature names, SRD names, toggles, narrative-only | ~5K | |

**Full-mode status:** sized for Plus-tier models (`CLEAN_SOURCE_TEXT_GUIDELINES` says
so). A Languages extract carries the full Necromancer and Dancer guidance. Entry-level
models reject, truncate, or skim it, which is why Lite exists. Do not treat Full's size
as a baseline to grow from.

## Budget for entry-level models

Vendor limits change often; do not hard-code them in prompts or docs. Design to a
conservative budget instead:

| Piece | Target |
| --- | --- |
| Instructions (everything before the source delimiter) | ≤ ~30K chars (~8K tokens) for a focused content type |
| Source text per pass | ≤ ~40K chars for free tiers (one class chapter, or a short spell / ability batch) |
| Expected JSON output | Small enough to finish in one reply; otherwise the prompt must tell the model to batch |

Output length is the constraint agents forget. A full class with subclasses can be
10–20K tokens of JSON. Base-tier models stop mid-object. The abilities focus already
tells the model to batch by tier and say which tiers remain; any content type that can
produce a large array needs the same instruction.

When the budget cannot be met, the fallback for users is attaching the prompt as a
`.txt` file instead of pasting it, which most chat apps accept on free tiers. Do not
rely on that fallback to justify a larger prompt.

## Design rules for prompt text

Entry-level models follow short, concrete, ordered instructions. They ignore or
misapply long conditional prose.

1. **Let the deterministic importer do the work.** The phrase matcher
   (`detect-feature-modifier-rules.ts`), name presets, and enrichment packs wire most
   mechanics from verbatim description text. The single most valuable instruction is
   "keep rule sentences verbatim." `mechanics[]` is optional; a weak model that emits
   no `mechanics[]` but keeps the wording is better than one that invents fields.
2. **Scope by content type.** A hint that only applies to classes belongs in
   `CONTENT_TYPE_JSON_FOCUS.classes` or behind a content-type check, not in the shared
   base prompt.
3. **Write mechanic patterns, not class names.** "A pool that refills when you roll
   Initiative → `rechargeOnInitiative`" helps the next class. "Gunslinger: Risk Dice…"
   only helps Gunslinger, and Gunslinger is already wired by its enrichment preset.
   Class-specific corrections belong in the enrichment pack or a sanitizer (code),
   where they cost zero prompt tokens.
4. **One rule, one place.** Before adding a line, search the hints for the same idea.
   The cheat sheet, homebrew patterns, and content-type focus already repeat several
   rules (base `uses` wiring with `alternateRefresh`, `replace_feature` vs
   `power_rider`, toggles). Extend the existing line instead of restating it.
5. **Imperative, short, positive.** "Put pools in `class_resources[]`." beats a
   paragraph explaining what not to do. Keep "do not" lines for mistakes that actually
   recur in extracts.
6. **Few, small worked examples.** One compact JSON example teaches a field shape
   better than prose. Three examples of the same shape waste budget.
7. **Order for recency.** Output rules and the JSON template stay last before the
   source delimiter. Weak models weight the end of the prompt most.
8. **Always leave an escape hatch.** `kind: "unresolved"` with a verbatim
   `sourcePhrase` flows into feature claims for manual review
   (`lib/import/feature-claims.ts`). Prefer that over asking the model to guess.
9. **Tolerate sloppy output in code, not in prose.** `strip-llm-json.ts` already
   strips markdown fences. When models keep making the same formatting mistake, fix
   the parser or a sanitizer rather than adding another warning paragraph.
10. **No copyrighted text.** Examples use SRD or original wording (session invariant 1).

## Where new guidance goes

| You learned… | Put it in | Prompt cost |
| --- | --- | --- |
| A reusable phrase the matcher should catch | Detect rule + `DESCRIPTION_PHRASE_WIRING` entry (tests require both) | One short example line |
| A field shape the LLM must emit for a kind | The kind's cheat-sheet line in `formatMechanicsCheatsheet()` | Extend the existing line |
| One class keeps getting one feature wrong | Enrichment preset or import sanitizer; regression test | None |
| A mechanic pattern several classes share | A pattern-named entry in `HOMEBREW_WIRING_PATTERNS` (e.g. "Pools that refill on Initiative"), not a class-named one | Small |
| Content-type-specific extraction shape | `CONTENT_TYPE_JSON_FOCUS[type]` | Only that type |
| Source-cleanup advice for PDFs | `CLEAN_SOURCE_TEXT_GUIDELINES` (prompt) and `CLEAN_SOURCE_TEXT_UI_GUIDELINES` (UI) | Small |
| A rule even weak models must follow | `byo-lite-prompt.ts` (and Full). Keep it one line; the lite budget test fails past 30K | Counts against Lite |

**Deciding whether a line belongs in Lite.** Lite gets a line only if (a) it applies to
most sources of that content type and (b) the importer cannot fix the mistake afterward.
Field shapes for common kinds, `class_resources[]` layout, and custom-ability row
structure qualify. Class-named corrections never do; they go in packs or sanitizers.
Lite blocks are scoped per content type in `LITE_HINTS_BY_TYPE`; add a block only to the
types that need it.

Session invariant 3 still applies: when an extract lapse caused a sheet bug, update the
prompt or sanitizer **and** add a regression test (`byo-prompt-guidance.test.ts` or the
class Drive import test).

## Before you merge a prompt change

1. Run `pnpm prompts:measure` before and after (it prints Full and Lite per content
   type and flags Lite over budget). Note the delta in the PR description.
2. Do not grow Full's shared base prompt or the modifier index without removing or
   scoping something of similar size.
3. Run `vitest run lib/import/__tests__/byo-lite-prompt.test.ts
   lib/import/__tests__/byo-prompt-guidance.test.ts
   lib/import/__tests__/homebrew-prompt-footguns.test.ts`.
4. When you change wording that a test asserts with `toContain`, update the test to
   assert the behavior you want rather than deleting the assertion.

## Shrinking Full later (optional)

Lite covers free tiers. If Full also needs to shrink (it is large even for paid models),
these are the cuts, each with matching updates in `byo-prompt-guidance.test.ts`:

1. **Scope `buildCommonModifiersImportHint()` by content type.** Languages, spells,
   equipment, and backgrounds need little or none of the class-feature index.
2. **Move class-named homebrew blocks out of the prompt.** Keep the corrections in
   enrichment packs and sanitizers; rewrite what remains as mechanic-pattern entries.
3. **Trim the phrase index to one example per catalog id.** The matcher runs
   regardless; the LLM only needs to know to keep the sentence.
