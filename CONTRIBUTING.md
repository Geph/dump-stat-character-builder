# Contributing to Dump Stat

Thank you for your interest in contributing. This guide covers local setup, pull request expectations, and where different kinds of changes belong in the codebase.

## Getting started

Follow the [Local development](README.md#local-development) section in the README:

```bash
git clone https://github.com/Geph/v0-dump-stat-character-builder.git
cd v0-dump-stat-character-builder
corepack enable
pnpm install
cp .env.example .env.local
# Configure DATABASE_URL (or MYSQL_* fields), then:
pnpm db:setup   # or apply mysql/schema.sql manually
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). If you use npm instead of pnpm: `npm install` and `npm run dev`.

## Checks before opening a pull request

Run the same checks CI runs on every PR:

```bash
pnpm lint
pnpm check:mysql
```

Optional but recommended — catches TypeScript errors (no dedicated script in `package.json` yet):

```bash
pnpm exec tsc --noEmit
```

CI also runs `pnpm build:static` on pull requests; run it locally if you changed build, routing, or static export behavior:

```bash
pnpm build:static
```

## Branch naming

Use a short prefix that matches the kind of change:

| Prefix | Use for |
|--------|---------|
| `feature/*` | New functionality or enhancements |
| `fix/*` | Bug fixes |
| `chore/*` | Tooling, dependencies, refactors, docs-only |

Examples: `feature/compendium-card-images`, `fix/builder-feat-slots`, `chore/ci-node-22`.

## Pull request expectations

- **Keep PRs small and focused** — one logical change per PR when possible.
- **Link an issue** if one exists (`Fixes #123` or `Relates to #456`).
- **Describe manual testing** — there is no automated test suite yet. List what you exercised (e.g. builder step X, compendium editor save, static build).
- **Update the README** if user-facing behavior or setup steps changed.
- **Do not bump the release version** — see [Updating the release version](README.md#updating-the-release-version) in the README. Contributors must not run `pnpm version:bump` or hand-edit `VERSION`, `package.json` `version`, or a “Current release” line in the README; that is maintainer-only after merge to `main`.

### SRD and rules accuracy

Changes that affect D&D 5.5e / SRD rules accuracy (class features, species traits, spell data, builder calculations, etc.) should cite the source in the PR description — for example the [SRD on D&D Beyond](https://www.dndbeyond.com/srd) section or page reference you used. Seed data is rebuilt from official SRD markdown via `pnpm srd:build`; see [lib/srd/README.md](lib/srd/README.md).

## Where changes belong

Use the [Project Structure](README.md#project-structure) section in the README as the map. In short:

| Area | Path | Examples |
|------|------|----------|
| **Pages & routes** | `app/` | Builder, compendium browser, character sheets, API routes under `app/api/` |
| **UI components** | `components/` | Builder steps, compendium editors, selection cards, overlays, icon picker |
| **Builder logic** | `lib/builder/` | Draft storage, ASI allocation, feat selection, equipment helpers, sheet calculations |
| **Compendium logic** | `lib/compendium/` | Proficiencies, display helpers, effect metadata, theme colors, card images |
| **SRD & seed data** | `lib/srd/`, `seed-data/` | Parsers, bundled SRD JSON consumed by import/seed |
| **Database** | `lib/db/`, `mysql/` | Drizzle schema, migrations, MySQL DDL |
| **Static / client data** | `lib/data/` | IndexedDB layer for `build:static` deployments |
| **Import pipeline** | `lib/import/` | Normalization, export format, AI import helpers |

Put **UI** in `app/` and `components/`, **business rules and calculations** in `lib/builder/` and `lib/compendium/`, and **rulebook-style content** in compendium seed data (`seed-data/`, rebuilt with `pnpm srd:build`) or custom entries edited through the compendium UI.

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). By participating, you agree to uphold it. To report concerns, [open a GitHub issue](https://github.com/Geph/v0-dump-stat-character-builder/issues/new).
