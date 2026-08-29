# Agent guidance (Dump Stat)

This file is for **Cursor and other coding agents**, not for end users. Human contributors should start with [CONTRIBUTING.md](CONTRIBUTING.md) and [README.md](README.md). Do not link this document from the README.

## Scope of this file

- Where to put new code and assets
- What to include or omit from commits and PRs when an agent is editing the tree
- Pointers to deeper maintainer maps

User-facing setup, PR etiquette, and copyright commit rules live in CONTRIBUTING.md. Keep those wording human and short; put mechanical “always / never” placement rules here.

## What a new session actually sees

A new Cursor agent has **no prior chat history**. It is not spun up with Drive JSON, BYO prompts, or earlier wiring decisions. Typical injected context is this file, plus any `.cursor/rules/` that match, plus the user’s global Cursor rules. Everything else is unread until the agent opens it.

If a session hangs and you start a new one, restate the character/sheet URL and the invariant that still applies. Do not assume the new agent read the last chat.

## Session invariants

These hold in every chat, including after a restart.

### 1. Never commit copyrighted book text or unapproved art

- Do not add Player’s Handbook, setting-book, or other non-SRD **prose** to `lib/srd/`, the Seed button data, or tracked GitHub JSON.
- Do not `git add` PHB / setting portraits, other unlicensed card art, or `public/images/compendium/local-available-card-art.json`. Public GitHub art is SRD + explicitly allowed packs (Kibbles Tasty, Mage Hand Press) only.
- Mechanical wiring (enrichment presets, name-keyed modifier attachments) is allowed **without** bundling book text.
- Import tools assume the **user** owns or may use the source. Agents must not copy copyrighted extracts into the repo.
- Human-facing detail: [CONTRIBUTING.md](CONTRIBUTING.md#what-not-to-commit), [docs/repository-overview.md](docs/repository-overview.md#copyright-and-licensing).

### 2. Prefer existing common modifiers

- Express mechanics with the shared catalog (`lib/compendium/characteristic-modifiers.ts`, `modifier-catalog.ts`, existing `mechanics[].kind` / FeatureEffect types) so a user can see and edit the wiring in the Compendium.
- Extend or adjust an existing modifier when it already covers the idea. Do not add a `if (className === "Martyr")` (or similar) branch in `lib/character/` or React when a catalog type can do it.
- Enrichment presets and detect rules **attach** catalog modifiers; they are not a substitute for a private runtime-only hook.
- Which system to author: [docs/modifier-vs-feature-effect.md](docs/modifier-vs-feature-effect.md).

### 3. Close the import loop when the lapse was extract/prompt/JSON

If a sheet or import bug existed because Drive JSON, BYO instructions, detect rules, or enrichment missed the mechanic — not only because runtime math was wrong — update the source of the lapse, not just the live character:

1. Runtime: generic modifier / sheet behavior (invariant 2).
2. Drive import JSON when a fixture exists (paths in [docs/homebrew-import-review.md](docs/homebrew-import-review.md); `HOMEBREW_IMPORT_JSON_DIR`).
3. BYO / server-AI hints: `lib/import/modifier-wiring-registry.ts`, and `byo-import-kit.ts` / `parse-ai-mechanics.ts` / `detect-feature-modifier-rules.ts` when the kind or phrase is new.
4. Enrichment preset in `lib/import/enrichment-presets/` when that is how the class is wired.
5. A test that would fail if the prompt or Drive row regressed (`byo-prompt-guidance` and/or the class Drive import test).

A one-off sheet patch for a single named feature, with no catalog / JSON / prompt update, is the failure mode this rule exists to prevent.

## Placement map

| Work | Prefer | Avoid |
|------|--------|--------|
| Routes / pages | `app/` | Fat page files — keep logic in `components/` + `lib/` |
| Interactive UI | `components/{builder,character-sheet,compendium,import,settings}/` | One-off markup in `lib/` |
| Draft / wizard rules | `lib/builder/` | Hard-coding class behavior in React |
| Live sheet math | `lib/character/` | Duplicating derived formulas in UI |
| Catalog / modifiers / enrichment | `lib/compendium/` | Per-class special cases when a modifier exists |
| Import normalize / enrich / persist | `lib/import/` | Editing seed JSON by hand for one-off imports |
| SRD seed only | `lib/srd/seed-data/` via `pnpm srd:build` | Non-SRD book text in `lib/srd/` |
| Optional publisher examples | `lib/seed-packs/` | Paid / disallowed pack content |
| Hosted DB | `lib/db/`, `mysql/` | Client-side MySQL |
| Static persistence | `lib/data/` | Assuming MySQL in static builds |
| Card / hero art masters | `scripts/*-card-sources/`, `scripts/page-bg-sources/` (gitignored) | Committing PHB / setting PNGs |
| Optimized public art | `public/images/…` only when licensed/allowed to ship | `local-available-card-art.json` |

Deeper folder “why”: [docs/repository-overview.md](docs/repository-overview.md).

## Commit and PR habits for agents

- Follow the user’s commit/PR instructions when they ask; otherwise do not commit or push unprompted.
- Do not commit secrets (`.env*`), scratch prompts, `tmp-*` scripts, audit dumps, or copyrighted local card art.
- Do not bump `VERSION` / package version / README “Current release” unless the user explicitly asks for a release.
- Prefer small, focused diffs. Match existing naming and patterns; avoid drive-by refactors.
- Prefer `pnpm` scripts already in `package.json` (`verify:ci`, `images:optimize`, `srd:build`, tests) over inventing new pipelines.
- When changing SRD or 5E rules behavior, cite the source in the PR description (see CONTRIBUTING.md).
- After local content import or art optimize, leave gitignored outputs untracked unless the user asks to ship allowed art.

## Cursor-specific notes

- Project hooks may live under `.cursor/` (for example post-turn verify). Do not disable hooks with `--no-verify` unless the user asks.
- Always-on and file-scoped agent rules live in `.cursor/rules/`. They repeat the session invariants; do not weaken them.
- Prefer editing product code over adding new markdown docs the user did not request.
- `tsconfig.json` / `next-env.d.ts` may be rewritten by `next:dev`; do not commit accidental churn from a concurrent dev server unless it is an intentional fix.
