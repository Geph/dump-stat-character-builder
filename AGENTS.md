# Agent guidance (Dump Stat)

This file is for **Cursor and other coding agents**, not for end users. Human contributors should start with [CONTRIBUTING.md](CONTRIBUTING.md) and [README.md](README.md). Do not link this document from the README.

## Scope of this file

- Where to put new code and assets
- What to include or omit from commits and PRs when an agent is editing the tree
- Pointers to deeper maintainer maps

User-facing setup, PR etiquette, and copyright commit rules live in CONTRIBUTING.md. Keep those wording human and short; put mechanical “always / never” placement rules here.

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

## Card art and licensed content (agent summary)

- Public GitHub art is limited to what the project is allowed to distribute (SRD and explicitly allowed packs). Optimize locally with `pnpm images:optimize`; do not force-add gitignored PHB/setting files.
- Mechanical wiring for non-SRD names can live in enrichment / presets without bundling book prose.
- Import tools assume the **user** owns or may use the source; agents must not copy copyrighted extracts into the repo.

## Cursor-specific notes

- Project hooks may live under `.cursor/` (for example post-turn verify). Do not disable hooks with `--no-verify` unless the user asks.
- Prefer editing product code over adding new markdown docs the user did not request.
- `tsconfig.json` / `next-env.d.ts` may be rewritten by `next:dev`; do not commit accidental churn from a concurrent dev server unless it is an intentional fix.
