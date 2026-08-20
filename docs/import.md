# Import formats

Dump Stat supports six compendium import paths:

| Method | Input | AI? | Best for |
|--------|--------|-----|----------|
| **SRD seed** | Button / `POST /api/seed` | No | Official SRD baseline |
| **Dump Stat JSON** | `.json` file or pasted JSON | No | Homebrew with full `linkedModifiers`, repeatable imports |
| **Foundry VTT JSON** | `dnd5e` item/NPC/pack export (file or pasted) | No | Migrating items, feats, spells, classes, and creatures from Foundry |
| **Text import** | Pasted plain text + optional content hint | Optional server AI or BYO LLM | UA PDFs, website copy-paste, copied stat blocks |
| **Images from URL** | Directory or page URL + Images from URL hint | Optional server AI or BYO LLM | Card art mapping without rewriting rules |
| **PDF import** | Uploaded PDF (+ optional page range) | Optional server AI | Same as text; also accepts JSON export files (no AI) |

AI is used **only** for compendium import (PDF upload and optional server-side text extraction). The builder, sheet, SRD seed, Foundry import, Dump Stat JSON bundles, and BYO LLM clipboard workflow do not call AI APIs.

## Extraction modes

Shown on the import report:

| Mode | When |
|------|------|
| `deterministic` | Well-structured class documents pass the confidence gate with **zero** API calls |
| `hybrid` | Partial deterministic parse (e.g. class shell + resources) plus AI for remaining sections |
| `ai` | Full server AI extraction when deterministic parsing is not confident enough |
| `byo-json` | You pasted LLM-generated JSON or a Dump Stat export bundle |

## Dump Stat JSON export

Export bundles use type `dump-stat-export` with an `items` array. Each item has `type` (e.g. `dnd-subclass`, `dnd-feat`, `dnd-spell`) and `data` (compendium fields without server ids).

**Single-item shape:**

```json
{
  "type": "dnd-subclass",
  "version": 1,
  "data": {
    "name": "Circle of the Titan",
    "class_name": "Druid",
    "description": "…",
    "source": "UA 2026",
    "features": [
      { "level": 3, "name": "Circle of the Titan Spells", "description": "…" }
    ]
  }
}
```

**Bulk bundle:**

```json
{
  "type": "dump-stat-export",
  "version": 1,
  "section": "my-homebrew",
  "items": [ … ]
}
```

Import via **Import → PDF upload** (choose the `.json` file) or **paste the entire JSON into Text Import**.

- Subclasses resolve parent classes by `class_name` (must exist in compendium — seed SRD first).
- Subclass rows run **post-import enrichment** (always-prepared spell links, limited uses, class-resource bindings) when presets exist.
- Feats should include `"category": "Origin"` or `"Epic Boon"` so they appear in the correct builder pickers.

**Example bundle:** [lib/import/examples/ua-villainous-options-export.json](../lib/import/examples/ua-villainous-options-export.json) — UA 2026 Villainous Options. Regenerate with:

```bash
pnpm dlx tsx scripts/build-ua-villainous-export.ts
```

## Text import (BYO LLM + optional server AI)

The **Clipboard** tab is the primary import path for pasted text:

1. Paste raw source text (from a PDF copy, website, or document).
2. Copy the **extraction prompt** and **JSON template** (matched to your content-type hint).
3. Run the prompt in ChatGPT, Claude, Gemini, or any LLM — using your own API key or subscription.
4. Paste the model's JSON output back into Dump Stat and click **Import JSON**.

The prompt includes **clean PDF / paste guidelines** (keep level tables intact, one content type per run, preserve feature headings, collapse doubled ALL-CAPS PDF glyphs, strip trailing superscript markers like KibblesTasty `K`, etc.). No server API keys are required for this flow.

**Optional server AI:** If the host has `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GOOGLE_GENERATIVE_AI_API_KEY` configured, an expandable **server AI extraction** section appears on Clipboard and PDF tabs. The BYO prompt/template workflow remains available either way.

**Dump Stat JSON export** — if the pasted text is a valid `dump-stat-export` bundle, it imports directly without LLM extraction (same as file upload; extraction mode `byo-json`).

## PDF import (optional server AI)

Same schema and persistence as text import. Optional **page range** limits extraction to specific pages. Upload a **`.json` export bundle** through the PDF file picker for non-AI JSON import.

PDF text extraction tries **deterministic** parsing first, then **hybrid** or full **AI** when needed. Requires at least one AI provider key for PDF text extraction (not for JSON bundles, SRD seed, or Foundry JSON).

## Multi-file homebrew import order

Many third-party classes ship as **several JSON files** (spell libraries, discipline powers, class chapter). **Happy path: two LLM extracts → one Step 2 paste.** Import **supporting libraries** and the **class chapter** (core + every archetype in `classes[]` + `subclasses[]`) as a JSON array — Dump Stat **auto-orders** libraries before the class chapter even if you paste them reversed. Do not leave archetypes for a later file unless you are intentionally adding to a class already in the compendium.

On the app: **Import → Import tips → Import order** lists workflows for spellcasters, KibblesTasty Psion, Laserllama-style Martial Exploits, and Inventor.

**General rules**

1. **SRD spells** — If your compendium is SRD-seeded, standard spells (e.g. *Fireball*, *Burning Hands*) do not need a separate import; only import homebrew spell JSON for third-party names.
2. **One batch or sequential** — Either paste a **JSON array** of import objects (order flexible — libraries are auto-sorted ahead of the class chapter), or run separate imports in the same order (earlier files persist to the compendium before later ones wire references).
3. **Class + subclasses together** — Use content type **Class + subclasses**. An empty `subclasses[]` means no archetypes in the builder. Use **Subclasses only** only for add-ons when the parent class is already imported.
4. **Set a source label** — Use the compendium source label field (e.g. `Kibbles Witch`) so you can filter and re-import safely.

**Spellcasting classes** (Witch, full casters, etc.)

| Step | Content |
|------|---------|
| 1 | Homebrew spell libraries when needed |
| 2 | Class chapter JSON: core class **and** subclasses, **including** the class spell list when present |
| 3 | Choice options if separate (grand hexes, invocations, …) |

**KibblesTasty Psion** (and similar psionic classes with separated powers)

| Step | Content |
|------|---------|
| 1 | `psion-disciplines.json` (psionic powers as custom abilities / proposals — not ordinary `spells[]`) |
| 2 | Class chapter: core Psion **and** all archetypes in one JSON (`classes[]` + `subclasses[]`) |

Discipline powers with psi-point augments get `psionic_augments` at import; pick augments on the character sheet when casting those powers.

**Martial Exploits** (Laserllama Alternate Fighter, etc.)

| Step | Content |
|------|---------|
| 1 | Exploit / maneuver library (if separate) |
| 2 | Class chapter: level table (Exploit Dice, Exploits Known) **and** all subclasses in the same pass |

**JSON array example** (BYO LLM → Step 2):

```json
[
  { "spells": [ … ] },
  { "classes": [ … ], "subclasses": [ … ] }
]
```

Dump Stat merges the array into one import batch before wiring modifiers.

## Server AI keys (optional)

Set **one** API key. The first configured provider is used unless you set `IMPORT_AI_PROVIDER`.

| Provider | Environment variable | Default model |
|----------|---------------------|---------------|
| OpenAI | `OPENAI_API_KEY` | `gpt-4o-mini` |
| Anthropic | `ANTHROPIC_API_KEY` | `claude-sonnet-4-20250514` |
| Google Gemini | `GOOGLE_GENERATIVE_AI_API_KEY` or `GOOGLE_API_KEY` | `gemini-2.0-flash-001` |

Optional: `IMPORT_AI_MODEL` to override the default. Restart the server after changing keys.

Without any provider key, seed, Dump Stat JSON, Foundry JSON, BYO clipboard import, and manual compendium edits still work — only **server AI extraction** on PDF upload or Clipboard **Import with server AI** returns a configuration error.

Maintainer playbook for Drive extracts: [homebrew-import-review.md](homebrew-import-review.md).
