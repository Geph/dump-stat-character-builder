# GitHub Pages (static deployment)

Live site (after enabling Pages): **https://geph.github.io/dump-stat-character-builder/**

Static mode runs entirely in the browser with **IndexedDB** storage. No MySQL, Node server, or API routes are required at runtime.

## One-time GitHub setup

1. Push this repo to `main` (the deploy workflow is in `.github/workflows/deploy-pages.yml`).
2. Open **[Settings → Pages](https://github.com/Geph/dump-stat-character-builder/settings/pages)**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions** (not “Deploy from a branch”).
4. Re-run the deploy workflow: **[Actions → Deploy GitHub Pages → Run workflow](https://github.com/Geph/dump-stat-character-builder/actions/workflows/deploy-pages.yml)** (or push any commit to `main`).
5. When the workflow finishes, the site URL appears on the **Pages** settings page and in the workflow summary.

If the **deploy** job fails with a Pages permission or “not enabled” error, step 3 was skipped — enable **GitHub Actions** as the Pages source first, then re-run.

The workflow sets `NEXT_PUBLIC_BASE_PATH=/${{ github.event.repository.name }}` (i.e. `/dump-stat-character-builder` for this repo).

## Build locally

```bash
pnpm install
pnpm icons:manifest   # optional — build:static runs this automatically
pnpm build:static
```

Output is written to `out/`. Preview with any static file server:

```bash
npx serve out
```

## Environment variables

Set at **build time** (not runtime):

| Variable | Example | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_DEPLOY_MODE` | `static` | Selects IndexedDB client (set by `build:static`) |
| `NEXT_PUBLIC_BASE_PATH` | `/v0-dump-stat-character-builder` | GitHub project site path |
| `NEXT_OUTPUT` | `export` | Enables static export (set by `build:static`) |

For a user/org site at `username.github.io` (no repo subpath), leave `NEXT_PUBLIC_BASE_PATH` empty.

## GitHub Actions

The workflow `.github/workflows/deploy-pages.yml` builds on push to `main` and deploys `out/` to GitHub Pages.

In repository settings → Pages, set source to **GitHub Actions**.

## Data and limitations

- **First visit** auto-loads bundled SRD content into IndexedDB.
- **Clearing site data** resets the compendium and characters.
- **Export/import JSON packs** (Import page or Settings menu) to move content between devices.
- **Not available**: PDF/text AI import, web URL import, server seed API.

## Hosted vs static

| | Hosted (`build:hosted`) | Static (`build:static`) |
|--|-------------------------|-------------------------|
| Storage | MySQL | IndexedDB |
| Deploy | VPS + nginx + PM2 | GitHub Pages |
| Import | Full (PDF, web, AI) | JSON packs + bundled SRD |

See [README.md](../README.md) for VPS/nginx setup.
