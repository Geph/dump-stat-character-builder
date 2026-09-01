# Contributing to Dump Stat

Thanks for wanting to help. This guide is for people opening pull requests — setup, what we check before merge, and a few rules that keep the public repo clean.

## Getting started

Follow [Quick start](README.md#quick-start) in the README:

```bash
git clone https://github.com/Geph/dump-stat-character-builder.git
cd dump-stat-character-builder
corepack enable
pnpm install
cp .env.example .env.local
# Configure DATABASE_URL (or MYSQL_* fields), then:
pnpm db:setup   # or apply mysql/schema.sql manually
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). With npm instead of pnpm: `npm install` and `npm run dev`.

## Checks before you push

Install the local pre-push gate once per clone:

```bash
pnpm hooks:install
```

A normal `git push` then runs the same checks as CI and blocks on the first failure:

```bash
pnpm verify:ci
```

That covers the MySQL dependency audit, ESLint, TypeScript, the Vitest suite, modifier/SRD audits, and the static export. A successful run is cached for that commit so retrying the same push does not redo the whole suite.

Emergency bypass: `git push --no-verify`. Use it only when you are intentionally accepting that GitHub CI may fail.

## Branch naming

| Prefix | Use for |
|--------|---------|
| `feature/*` | New functionality or enhancements |
| `fix/*` | Bug fixes |
| `chore/*` | Tooling, dependencies, refactors, docs-only |

Examples: `feature/compendium-card-images`, `fix/builder-feat-slots`, `chore/ci-node-22`.

## Pull request expectations

- **Keep PRs small and focused** — one logical change when you can.
- **Link an issue** if one exists (`Fixes #123` or `Relates to #456`).
- **Say how you tested** — note what you ran (for example `pnpm verify:ci`, or the builder / sheet / import steps you clicked through).
- **Update the README** when setup steps or user-facing behavior change.
- **Do not bump the release version** in a contributor PR — see [Updating the release version](#updating-the-release-version) below.

### SRD and rules accuracy

Changes that affect SRD / 5E rules accuracy (class features, species traits, spell data, builder calculations, and so on) should cite the source in the PR description — for example the [SRD on D&D Beyond](https://www.dndbeyond.com/srd) section you used. Seed data is rebuilt from SRD 5.2.1 markdown via `pnpm srd:build`; see [lib/srd/README.md](lib/srd/README.md).

## What not to commit

Please keep copyrighted and personal working files out of the public tree:

- **Rulebook text** — Do not add Player’s Handbook, setting-book, or other non-SRD prose to `lib/srd/`, Seed data, or tracked GitHub JSON. Mechanical wiring without book text is fine.
- **Card art** — Only ship art you are allowed to distribute. GitHub-eligible optimized art comes from licensed/allowed source folders (for example `SRD/` under the card-source drop directories). **Kibbles Tasty**, Player’s Handbook, and other setting-book portraits stay on your machine after `pnpm images:optimize`; do not `git add` those PNGs or `public/images/compendium/local-available-card-art.json`. Import still picks up local Kibbles files when they exist.
- **Custom content folders** — If you add your own uniquely named art or import folders under `scripts/` or `public/images/compendium/`, leave them uncommitted; the app can still use them locally.
- **Secrets** — Never commit `.env`, `.env.local`, API keys, or database passwords.
- **Scratch files** — Skip local prompts, audit dumps, and temporary scripts unless the PR is deliberately adding a maintained tool.

More on how the repo separates licensed content from local-only books: [docs/repository-overview.md](docs/repository-overview.md#copyright-and-licensing). Optional local art workflow: [README — Local card art](README.md#local-card-art-optional).

## Where everyday changes go

A short map (see the [README project structure](README.md#project-structure) for the tree):

| Kind of change | Start here |
|----------------|------------|
| Pages and API routes | `app/` |
| UI (builder, sheet, compendium, import) | `components/` |
| Builder / sheet rules and calculations | `lib/builder/`, `lib/character/` |
| Catalog, modifiers, enrichment | `lib/compendium/` |
| Import pipeline | `lib/import/` |
| SRD seed | `lib/srd/` (rebuild with `pnpm srd:build`) |
| Hosted database | `lib/db/`, `mysql/` |
| Static / browser storage | `lib/data/` |

Put UI in `app/` and `components/`, calculations in `lib/`, and rulebook-style content in seed data or the compendium UI — not hard-coded into a single class component.

Prefer **common modifier** types the user can edit in the Compendium over a one-off class-name branch in sheet or runtime code. If a bug existed because an import JSON extract or the BYO LLM prompt missed the mechanic, update that Drive JSON and/or the BYO hints (`lib/import/modifier-wiring-registry.ts`) as well as the runtime — see [docs/homebrew-import-review.md](docs/homebrew-import-review.md).

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). By participating, you agree to uphold it. To report concerns, [open a GitHub issue](https://github.com/Geph/dump-stat-character-builder/issues/new).

## Updating the release version

**Maintainers only** — do not bump the version in contributor PRs.

After merging to `main`, run:

```bash
pnpm version:bump
```

That increments `VERSION` and syncs `package.json` `version` (for example `0.3` → `0.4`). Commit the result as part of the release push. Do not hand-edit `VERSION`, `package.json` `version`, or the “Current release” line in the README in a normal contribution.
