# Repository overview

Dump Stat is a 5E-compatible character builder and compendium. This note maps the directories, the files that actually run the product, and how licensed content is kept separate from copyrighted books.

A shorter tree also lives in the [README project structure](../README.md#project-structure). Human contribution rules: [CONTRIBUTING.md](../CONTRIBUTING.md). Coding-agent placement notes: [AGENTS.md](../AGENTS.md) (not linked from the README).

## How the layers fit together

```text
app/            pages and API routes
components/     React UI (builder, sheet, compendium, import)
lib/            rules, import, persistence, seed
  character/    live sheet math (DerivedCharacter)
  builder/      draft wizard, picks, prerequisites
  compendium/   catalog, modifiers, enrichment, card defaults
  import/       extract → review → persist
  srd/          SRD 5.2.1 seed only
  seed-packs/   optional publisher example packs
  data/ + db/   IndexedDB (static) and MySQL (hosted)
```

Content is data. Mechanics are modifiers. The builder and sheet never hard-code a class the way a typical 5E app does — they evaluate whatever the compendium row links.

---

## Top-level directories

| Directory | What it is |
| --- | --- |
| `app/` | Next.js App Router: landing, builder, characters, sheet, compendium, import, dashboard, table, share, and `app/api/` |
| `components/` | Shared UI. Pages stay thin; almost all interactive UI lives here |
| `lib/` | Domain logic. If it calculates, persists, imports, or seeds, it belongs here |
| `docs/` | Maintainer notes (this file, import formats, import review, modifier vs feature-effect) |
| `public/` | Static assets: `icons/` (game-icons.net SVGs), `images/` (marketing + bundled card defaults) |
| `scripts/` | Build, seed, image optimize, git hooks, homebrew import ops |
| `mysql/` | Hosted MySQL DDL (`schema.sql`) |
| `data/` | Optional local SRD PDF; `srd-source/` markdown cache is gitignored |
| `hooks/` | Small React hooks (modifier catalog, duplicate item, picker page size) |
| `styles/` | Extra CSS beyond `app/globals.css` |
| `deploy/` | Hosted deploy notes (nginx, PM2, GitHub Pages) |
| `.github/` | CI and issue templates |
| `.cursor/` | Cursor hooks and agent config |

Root files that matter: `README.md` (product + license), `docs/import.md` (import formats), `LICENSE` (MIT + SRD/font attribution), `CONTRIBUTING.md`, `package.json`, `next.config.mjs`.

---

## `app/` — routes

| Path | Role |
| --- | --- |
| `app/page.tsx` | Landing |
| `app/builder/page.tsx` | Character creation wizard |
| `app/characters/` | Saved characters; `sheet/` is the play sheet |
| `app/compendium/` | Browse + `edit/` editors for every catalog type |
| `app/import/page.tsx` | PDF / text / URL / Foundry / seed import |
| `app/dashboard/`, `app/table/` | GM / play views |
| `app/share/[token]/` | Shared character snapshot |
| `app/api/seed/` | SRD seed and example seed packs |
| `app/api/import/` | Text, PDF, web, AI config |
| `app/api/data/` | Generic hosted table CRUD |
| `app/api/characters/` | Character persistence |

---

## `components/` — UI

| Folder | Role |
| --- | --- |
| `components/builder/` | Wizard steps, pickers, ASI, equipment shopping. Entry: `builder-page-client.tsx` |
| `components/character-sheet/` | Combat, features, companions, rolls, rest, resources |
| `components/characters/` | List, parties, sheet route shell |
| `components/compendium/` | Browse cards, detail overlays, linked-modifier editors, card-image field |
| `components/import/` | Collision panel, proposals, card-art review, AI settings |
| `components/settings/` | Theme, layout, presentation mode |
| `components/ui/` | shadcn primitives |
| `components/home/` | Landing splash |

---

## `lib/` — domain logic

### Character builder — `lib/builder/`

Draft-time rules: what the wizard offers and what it stores before a character is saved.

| File | Why it matters |
| --- | --- |
| `draft-storage.ts` | Persist the in-progress builder draft |
| `builder-picks.ts` | Normalized player choices (skills, knacks, feats, spells) |
| `asi-allocation.ts` | Point-buy / array / ASI pools |
| `feat-selection.ts`, `feat-choices.ts` | Feat slots and origin feats |
| `choice-prerequisite.ts` | Gate options on level, other picks, spells |
| `multiclass-proficiencies.ts` | Extra proficiencies when adding a class |
| `equipment-loadout.ts`, `equipment-utils.ts` | Starting gear and shopping |
| `class-ability-step.ts` | Class-feature choice step (knacks, discoveries, bombs) |

### Live character — `lib/character/`

Runtime sheet. This is the math the play view and PDF export read.

| File | Why it matters |
| --- | --- |
| `compute-derived.ts` | Builds `DerivedCharacter` (HP, AC, speeds, skills, spellcasting, …) |
| `types.ts` | Character / derived types used across sheet and builder |
| `apply-characteristic-runtime.ts` | Applies aggregated modifiers to scores and toggles |
| `sheet-play-state.ts`, `sheet-rest.ts` | HP, resources, rest, conditions |
| `sheet-actions.ts` (via walkers in this folder + sheet components) | Activatable actions from features |
| `resolve-vision.ts`, `resolve-all-speeds.ts` | Senses and movement |
| `character-export-format.ts` | Portable character JSON |

### Compendium — `lib/compendium/`

Shared catalog: how rows are displayed, enriched, and turned into modifiers.

| File | Why it matters |
| --- | --- |
| `modifier-catalog.ts` | Common Modifier Effects catalog (the searchable effect list) |
| `characteristic-modifiers.ts` | Passive character-wide modifier types + `aggregateCharacteristics()` |
| `linked-modifiers.ts` | Instances attached to features / feats / traits / abilities |
| `class-feature-metadata.ts` | Action-effect kinds shown in editors |
| `enrich-srd-class-features.ts`, `enrich-srd-subclasses.ts`, `enrich-srd-feats.ts`, `enrich-srd-species.ts`, `enrich-srd-spells.ts` | Wire bundled SRD rows to modifiers, resources, art |
| `enrich-custom-feats.ts`, `custom-feat-modifier-presets.ts` | Name-keyed wiring for *user-entered* non-SRD feats (no PHB text) |
| `enrich-custom-species.ts` | Same pattern for non-SRD species (`Species::Trait` keys) |
| `card-image.ts` | When to show / upgrade / keep card art |
| `*-card-images-defaults.ts` | Filename maps for bundled portraits |
| `normalize-class-data.ts`, `normalize-backgrounds.ts` | Shape rows before persist |
| `seed-srd-equipment.ts`, `seed-srd-creatures.ts` | Extra SRD seed shaping |

See [modifier-vs-feature-effect.md](./modifier-vs-feature-effect.md) for which effect system to use.

### Import — `lib/import/`

Extract → collide → enrich → persist. Users bring their own text/PDF/JSON; the repo does not ship those sources.

| File | Why it matters |
| --- | --- |
| `content-schema.ts` | Zod import shape + LLM extraction hints |
| `prepare-import.ts` | Review-time prepare + finalize (renames, collisions, persist) |
| `persist-import-content.ts` | Hosted MySQL write path |
| `persist-import-content-local.ts` (under `lib/data/`) | IndexedDB write path |
| `import-collisions.ts` | Name conflicts: update / replace / rename / link / skip |
| `merge-collision-update.ts` | Additive “update existing” merge |
| `enrich-import-modifiers.ts`, `detect-feature-modifier-rules.ts` | Attach common modifiers from feature text |
| `run-ai-import.ts` | Optional server AI extraction |
| `client-byo-import.ts` | Paste JSON from a user-run LLM (no server key) |
| `apply-card-art-import.ts`, `import-card-art.ts` | Images-from-URL / card-art-only import |
| `homebrew-import-ops/` | Audit / merge tooling for Drive extracts (see [homebrew-import-review.md](./homebrew-import-review.md)) |

### Enrichment presets — `lib/import/enrichment-presets/`

Declarative packs that *wire* a known class after import (resource keys, named presets, table parses). They do not reprint a third-party book.

| File | Why it matters |
| --- | --- |
| `index.ts`, `apply.ts`, `registry.ts` | Load and apply packs |
| `INVENTORY.md` | What each pack does |
| `packs/*.ts` | Per-class packs (Alchemist, Warmage, LaserLlama alts, Kibbles classes, …) |

A pack matches by class name and attaches Dump Stat mechanics. Full class prose stays in the user’s import JSON (local / Drive), not in these files.

### SRD seed — `lib/srd/`

**SRD-licensed material only.** Non-SRD books are not stored here.

| File | Why it matters |
| --- | --- |
| `README.md` | Rebuild + attribution rules |
| `attribution.ts` | Verbatim CC-BY-4.0 / Section 5 / compatibility lines for the UI |
| `source.ts` | Source label `D&D 5.5e SRD` and D&D Beyond SRD link |
| `parser.mjs` | Markdown → JSON (`pnpm srd:build`) |
| `load-seed.ts` | Load `seed-data/*.json` for the Seed button |
| `seed-data/` | Classes, subclasses, species, backgrounds, spells, feats, equipment, creatures, tools, languages |

### Example seed packs — `lib/seed-packs/`

Optional **Seed Example Content** packs, kept separate from SRD seed. See `lib/seed-packs/README.md`.

- `kibbles-tasty/` — Kibbles Tasty examples
- `mage-hand-press/` — Mage Hand Press **free** subclasses only (`mage-hand-press-free-subclasses.ts` allowlist; paid subclass rows are stripped)

### Persistence

| Path | Role |
| --- | --- |
| `lib/db/` | Hosted MySQL: Drizzle schema (`schema.ts`), `repository.ts` (`listRows`, `upsertByName`), character helpers |
| `lib/data/` | Static / browser: IndexedDB (`indexed-db-store.ts`), local seed, local persist |
| `lib/db/client.ts` | Browser client that talks to `/api/data` or IndexedDB depending on deploy |

### Other `lib/` folders

| Path | Role |
| --- | --- |
| `lib/types.ts` | Shared 5E types (`Feature`, `FeatureEffect`, uses, activation) |
| `lib/config/deploy-mode.ts` | Hosted vs static (`withBasePath`) |
| `lib/dice/` | Dice parsing / manual roll |
| `lib/icons/` | Icon manifest helpers |
| `lib/themes/`, `lib/site-settings/` | Themes, page backgrounds, GM dashboard prefs |
| `lib/play/` | Optional play-session / room sync |
| `lib/network/` | Fetch helpers |

---

## `scripts/` and `public/`

| Path | Role |
| --- | --- |
| `scripts/build-srd-seed.mjs` (via `pnpm srd:build`) | Download CC-BY SRD markdown → `lib/srd/seed-data/` |
| `scripts/homebrew-import-ops.ts` | Audit / merge Drive import JSON |
| `scripts/build-example-seed-packs.ts` | Rebuild publisher example packs from local Drive JSON |
| `scripts/*-card-sources/` | Full-resolution card art drop folders (**gitignored** except README). `pnpm images:optimize` writes `public/images/compendium/`; only SRD / Kibbles / Mage Hand Press outputs are committed |
| `scripts/page-bg-sources/` | Theme / marketing image sources (gitignored); outputs under `public/images/` |
| `public/icons/` | game-icons.net SVGs + `manifest.json` |
| `public/images/compendium/` | Optimized card defaults. GitHub has SRD + Kibbles + Mage Hand Press only; other origins stay local |

---

## Copyright and licensing

Dump Stat is built so the **public repository and the Seed button** only ship content we have a license or permission to distribute. Copyrighted rulebooks and extracts stay on the user’s machine (or a private Drive folder) and are imported by the user.

This is not legal advice. It is how the repo is structured.

### 1. Application code — MIT

Source code is [MIT](../LICENSE) (Copyright © Geph). That license covers **code**, not third-party game text or art.

### 2. Bundled rules text — SRD 5.2.1 only (CC BY 4.0)

The Seed SRD button loads `lib/srd/seed-data/`, rebuilt from [SRD 5.2.1](https://www.dndbeyond.com/srd) via CC-BY-4.0 markdown ([`lib/srd/README.md`](../lib/srd/README.md)).

Required attribution (also in `lib/srd/attribution.ts`, the app footer, and the README):

> This work includes material from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

Also shown: “Compatible with fifth edition.” and the CC-BY Section 5 disclaimer. Do not add extra Wizards attribution beyond that statement.

`lib/srd/` must not grow Player’s Handbook, Xanathar’s, or other product text. If it is not in the SRD, it does not go in `seed-data/`.

### 3. Non-SRD Wizards books are not in the repo

PHB / setting-book **stat blocks and prose are not committed**. What *is* in the repo for those names is mechanical wiring only:

- `lib/compendium/custom-feat-modifier-presets.ts` — “No stat text is bundled… create feat rows locally with names matching the keys”
- `lib/compendium/enrich-custom-species.ts` — same for `SpeciesName::TraitName`

If a user (or a private import) creates a row named “Aasimar” or “Alert”, the app can attach HP, resistance, or skill-choice modifiers. The book text never ships with the repo.

Import tests that need copyrighted extracts read from a local Drive folder (`lib/import/__tests__/homebrew-fixture-path.ts`) and are skipped in CI when those files are absent.

### 4. Homebrew import is a user tool

PDF / text / BYO-LLM / Foundry import exists so **the person who owns or is allowed to use a book** can load it into *their* browser or *their* database.

- Copyrighted source PDFs and extracts are not committed.
- Default working folders (`dump stat working files/import-json`, `source-texts`) live outside this repo.
- Collision **Update** vs **Replace** only changes the user’s local/hosted catalog, not the git tree.

### 5. Example seed packs — publisher permission + free allowlist

`lib/seed-packs/` is separate from SRD seed.

- **Kibbles Tasty** and **Mage Hand Press** example packs are included with publisher permission for Dump Stat support (`lib/seed-packs/README.md`).
- Mage Hand Press packs are filtered to the **free subclass allowlist**. Paid subclasses and paid-only ability rows are stripped (`mage-hand-press-free-subclasses.ts`, `scripts/strip-mhp-paid-abilities.mjs`).
- If permission is withdrawn, those folders are the yank point (documented in the seed-packs README).

Enrichment packs under `lib/import/enrichment-presets/packs/` are Dump Stat wiring (resource keys, modifier attachments, table parsers). They are not a reprint of a third-party class PDF.

### 6. Icons and fonts

| Asset | License | Where |
| --- | --- | --- |
| game-icons.net SVGs | [CC BY 3.0](http://creativecommons.org/licenses/by/3.0/) | `public/icons/`; attribution in footer, landing, icon picker |
| Solbera D&D fonts | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | `app/fonts/solbera/` (NOT MIT); NOTICE.md + footer |

### 7. Card art and marketing images

- **Custom art the user attaches** (upload or URL) stays on that user’s data. Image-only import updates `card_image_url` and does not rewrite rules.
- **Full-resolution drop folders** (`scripts/*-card-sources/`, `scripts/page-bg-sources/`) are gitignored.
- **Optimized card art on GitHub** is limited to **SRD**, **Kibbles Tasty**, and **Mage Hand Press**. PHB / Eberron / Ravenloft / Faerûn / other setting portraits still optimize locally (`pnpm images:optimize`) and stay gitignored. See the README “Local card art” section.
- **Leftover remote WotC dumpstat hosts** (`/dumpstat/wotc/…`) are treated as old defaults and replaced or cleared (`lib/compendium/card-image.ts`). User-hosted paths such as `/dumpstat/images/…` are kept.
- Bundled `/images/compendium/…` portraits that *are* committed are **local UI defaults**, not SRD rules text. Users can attach their own licensed art on import.

### 8. Trademarks and privacy

Product names are used for identification only (README). The app does not collect personal identification data; characters and imported catalogs stay in the user’s browser or the host’s own database.

---

## Related docs

- [Homebrew class import review](./homebrew-import-review.md) — Drive extract → audit → enrich loop
- [CharacteristicModifier vs FeatureEffect](./modifier-vs-feature-effect.md) — which effect system to author
- [SRD seed](../lib/srd/README.md) — rebuild and attribution
- [Example seed packs](../lib/seed-packs/README.md) — Kibbles / Mage Hand Press allowlist
