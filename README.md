# Dump Stat

![Dump Stat — 5E compatible character creator](./public/images/features/hero.webp)

A modern 5E compatible character builder and compendium built with Next.js and MySQL.

**Maximally customizable by design.** Nearly every mechanical decision — species, classes, subclasses, feats, spells, equipment, backgrounds, custom abilities, and the modifier effects behind them — is editable in-app from a single shared catalog. The same wiring that powers the bundled SRD content can be used to process your own imported content.

## Features

### Character Builder
- **Step-by-step character creation** — Guided workflow through species, class, ability scores, background, gear, spells, and details
- **Multi-class support** — Build characters with multiple classes and track levels independently
- **Player-choice modifiers everywhere** — Skill/expertise picks, tool & instrument choices, languages, weapon-mastery selections, and feat grants surface as interactive choices at the step where they apply
- **Real-time preview** — Live character sheet with Summary, Combat, Features, Companion / Beast Form, and Custom tabs
- **Point buy & standard array** — Multiple methods for determining ability scores
- **Automatic calculations** — HP, AC, weapon attacks, saving throws, skills, and modifiers calculated automatically

### Compendium
- **SRD content** — Seed the full SRD 5.2.1 compendium (classes, species, spells, equipment, and more)
- **Custom content creation** — Create and manage species, classes, subclasses, backgrounds, feats, spells, equipment, and custom abilities
- **Common Modifier Effects** — A permanent, editable system catalog under Custom Abilities that merges class-feature activation templates with characteristic modifiers; class/subclass features, feats, species traits, custom abilities, and choice options all pick from this searchable list and configure it inline instead of defining effects from scratch
- **Configurable everywhere** — Linked modifiers attach to class/subclass features, feats, species traits, *and* custom abilities with the same editor, so a homebrew ability can carry skill choices, languages, resource pools, level-scaling dice, alternate-ability checks, companions, or feat grants exactly like SRD content
- **Player-choice modifiers** — Skill/expertise (with optional "any skill" or class-list scoping), tool/instrument selections, languages, sizes, weapon masteries, and feat grants are authored once on a modifier and rendered as builder choices automatically
- **Level-scaling effects** — Effects like unarmed/Martial Arts die, Sneak Attack, and player-chosen feature branches (Druid *Elemental Fury*, Cleric *Blessed Strikes*) scale by level from the player's original choice without needing duplicate higher-level entries
- **Companions & beast forms** — Companion / Beast Form stat-block templates (with SRD Druid Wild Shape defaults: Rat, Riding Horse, Spider, Wolf) populate the character sheet via a common modifier
- **Spell-slot progression editor** — Accordion editor with full / half / third / pact caster presets for class spellcasting
- **SRD modifier enrichment** — Bundled SRD classes, subclasses, feats, and species traits ship with linked common-modifier presets (class resources, cast spell, movement types, Metamagic/Eldritch Invocations catalogs, unarmed die scaling, standard-language grants, size options, Monk tool/weapon proficiencies, and more); run `pnpm dlx tsx scripts/audit-srd-class-features.ts` to list gaps
- **Card background graphics** — Every compendium entry can have a hero image for selection cards and full-screen detail overlays (upload or URL in the editor header area); classes, species, and subclasses use **3:4 portrait** art on browse cards and a side-by-side **Description & card art** editor row
- **Cinematic selection UI** — Builder class/species/background pickers and compendium detail views use full-bleed artwork with gold-framed cards inspired by D&D Beyond
- **Default SRD icons** — Bundled defaults for subclasses, mundane weapons (same icons as the mastery visual grid), and all 13 mundane armor types; compendium browse shows them when no custom icon is set
- **Class resources** — Dedicated compendium tab for per-class resource pools (Rage, Ki, etc.) linked from feature limited uses
- **Enable / disable content** — Toggle compendium entries off for the builder (grayed-out cards including artwork); prompts when disabling or re-enabling related entries (subclasses, class resources, attached abilities, etc.)
- **Unified editor header** — Icon picker (inline with name field), name, source, and source link on one row across all compendium editors
- **Background proficiencies editor** — Structured tools & vehicles (SRD dropdown + custom), weapon categories, armor checkboxes, and languages
- **Background granted spells** — Assign spells by overall character level (1st–20th), not spell level
- **Spell editor** — Casting time, range, and duration presets with “Other” custom values; ritual and concentration on the same row as level and school
- **Section export & clear** — Export or wipe an entire compendium tab from the gear menu
- **Filtering & search** — Find content quickly with search and category filters

### Character Management
- **Save & load characters** — Persist characters to MySQL; resume editing from the builder
- **Character sheet** — Condensed sheet with skills grouped by ability, merged proficiencies, subclass features, chosen size, banner/portrait, in-sheet HP tracking, a Companion / Beast Form tab, roll-able special actions from features, off-hand weapon slots for dual wielding, and class-feature toggles (e.g. Rage, Innate Sorcery) with conditional combat bonuses
- **Export options** — Download character and compendium data as JSON

### Import
- **SRD seed** — One-click SRD import from bundled JSON (`pnpm srd:build` regenerates seed from SRD 5.2.1 markdown, including all 13 mundane armor types); **no AI**
- **PDF & text import** — Optional server AI (OpenAI, Anthropic, or Google Gemini), **deterministic** parsing for well-structured class PDFs, or **hybrid** (partial deterministic + AI); BYO LLM JSON paste always available without server keys
- **Dump Stat JSON export** — Upload compendium export bundles (`.json`) via PDF import or paste into text import for fully-linked homebrew content
- **Foundry VTT import** — Paste or upload Foundry `dnd5e` item exports ("Export Data" JSON, item arrays, `{ items: [...] }` actor/pack dumps, compendium object maps, or NeDB `.db` packs); auto-detected and parsed with **no AI** ([format reference](https://github.com/foundryvtt/dnd5e))
- **Multi-file import order** — On **Import**, expand **Multi-file import order** for spellcasters, KibblesTasty Psion disciplines, Martial Exploits, and similar split homebrew; paste a JSON array in dependency order or import files sequentially (libraries before classes/subclasses)

See [Import formats](#import-formats) and [Multi-file homebrew import order](#multi-file-homebrew-import-order) below.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: MySQL 8+
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui
- **Icons**: Lucide React + Game Icons
- **Animations**: Framer Motion

## Requirements

- Node.js 20+ (recommended for build and production)
- pnpm (via Corepack) or npm
- MySQL 8+ — local install, managed service (RDS, PlanetScale-compatible host, etc.), or MySQL on the same VPS as the app

The browser never connects to MySQL directly. Only the Next.js server uses database credentials from environment variables.

---

## Local development

### 1. Clone and install

```bash
git clone https://github.com/Geph/v0-dump-stat-character-builder.git
cd v0-dump-stat-character-builder
corepack enable
pnpm install
```

If `pnpm` is not on your PATH, use `corepack pnpm install` and `corepack pnpm dev`.

### 2. MySQL database

Create an empty database and a user with full privileges on it. Examples:

**Local MySQL (Windows / macOS / Linux)**

```sql
CREATE DATABASE dump_stat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- Grant your app user access (adjust user/host as needed)
```

**Or use the setup helper** (after setting `MYSQL_PASSWORD` in `.env.local`):

```bash
pnpm db:setup
```

This creates the `dump_stat` database and applies `mysql/schema.sql`.

### 3. Environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`. Use **either** a connection URL **or** separate fields:

```env
# Option A — single URL
DATABASE_URL=mysql://DB_USER:DB_PASSWORD@localhost:3306/dump_stat

# Option B — separate fields
# MYSQL_HOST=localhost
# MYSQL_USER=your_db_user
# MYSQL_PASSWORD=your_db_password
# MYSQL_DATABASE=dump_stat
# MYSQL_PORT=3306

NEXT_PUBLIC_SITE_URL=http://localhost:3000
NODE_ENV=development
PORT=3000
```

URL-encode special characters in passwords (e.g. `@` → `%40`).

Restart the dev server after changing `.env.local`.

### 4. Schema (if not using `pnpm db:setup`)

Run `mysql/schema.sql` once against your database:

```bash
mysql -h localhost -u YOUR_DB_USER -p dump_stat < mysql/schema.sql
```

Or import the file through phpMyAdmin, Adminer, or your host’s database UI.

The seed step only inserts data; it does **not** create tables. After pulling schema updates, run:

```bash
pnpm db:migrate
```

This applies incremental migrations (new columns such as background `proficiencies`, character weapon/armor proficiencies, feat `repeatable`, etc.).

### 5. Remote MySQL

If MySQL runs on a remote server and blocks public connections (common on shared/VPS hosts), use one of:

**A. SSH tunnel (recommended)**

```bash
ssh -N -L 3307:127.0.0.1:3306 user@your-server.example.com
```

```env
DATABASE_URL=mysql://DB_USER:DB_PASSWORD@127.0.0.1:3307/dump_stat
```

**B. Allow your IP** in the host’s MySQL/firewall panel, then use the remote hostname in `DATABASE_URL`.

**C. Develop on the server** — clone the repo there, use `localhost` as the DB host, run `pnpm dev`.

### 6. Run the app and seed SRD content

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), go to **Import**, and click **Seed SRD 5.2.1 Content**, or:

```bash
curl -X POST http://localhost:3000/api/seed
```

Seed data is built from SRD 5.2.1 markdown. To regenerate JSON after parser changes:

```bash
pnpm srd:build
```

### 7. AI import (optional — compendium import only)

**AI is used only for compendium import** (PDF upload and optional server-side text extraction). The character builder, character sheet, derived stats, SRD seed, Foundry VTT import, Dump Stat JSON bundles, and BYO LLM clipboard workflow do **not** call any AI APIs.

| Path | Uses server AI? |
|------|-----------------|
| SRD seed (`POST /api/seed`) | No — bundled JSON |
| Dump Stat JSON (file or paste) | No |
| Foundry VTT JSON | No |
| Clipboard BYO LLM | No — you run an external LLM and paste JSON |
| PDF / server text extraction | Optional — see extraction modes below |

**Extraction modes** (shown on the import report):

| Mode | When |
|------|------|
| `deterministic` | Well-structured class documents pass the confidence gate with **zero** API calls |
| `hybrid` | Partial deterministic parse (e.g. class shell + resources) plus AI for remaining sections |
| `ai` | Full server AI extraction when deterministic parsing is not confident enough |
| `byo-json` | You pasted LLM-generated JSON or a Dump Stat export bundle |

**Supported providers** (set **one** API key; the first configured provider is used unless you set `IMPORT_AI_PROVIDER`):

| Provider | Environment variable | Default model |
|----------|---------------------|---------------|
| OpenAI | `OPENAI_API_KEY` | `gpt-4o-mini` |
| Anthropic | `ANTHROPIC_API_KEY` | `claude-sonnet-4-20250514` |
| Google Gemini | `GOOGLE_GENERATIVE_AI_API_KEY` or `GOOGLE_API_KEY` | `gemini-2.0-flash-001` |

The Import page also offers additional model choices per provider (e.g. GPT-4o, Claude 3.5 Haiku, Gemini 2.5 Flash); override the default with Import settings or `IMPORT_AI_MODEL`.

Add to `.env.local` (examples):

```env
# Pick ONE provider key:
OPENAI_API_KEY=sk-your-key-here
# ANTHROPIC_API_KEY=sk-ant-your-key-here
# GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-key-here

# Optional: force a provider when multiple keys are set
# IMPORT_AI_PROVIDER=openai|anthropic|google

# Optional: override the default model for that provider
# IMPORT_AI_MODEL=gpt-4o-mini
```

Restart the dev server after changing keys. Without any provider key, seed, Dump Stat JSON, Foundry JSON, BYO clipboard import, and manual compendium edits still work — only **server AI extraction** on PDF upload or the Clipboard **Import with server AI** action returns a configuration error.

**Import page UI:** The Clipboard tab always shows the BYO LLM workflow (paste text → copy prompt → paste JSON). When server AI is configured, an expandable **server AI extraction** section also appears on Clipboard and PDF tabs (provider/model override stored in browser localStorage). API keys always stay on the server.

**Chunk cache:** Successful AI sections are cached in server memory by hash. If a large import fails mid-way (quota/rate limit), retry the **same** text with the same provider/model — finished sections are reused without extra API cost until the server restarts.

---

## Import formats

Dump Stat supports five compendium import paths:

| Method | Input | AI? | Best for |
|--------|--------|-----|----------|
| **SRD seed** | Button / `POST /api/seed` | No | Official SRD baseline |
| **Dump Stat JSON** | `.json` file or pasted JSON | No | Homebrew with full `linkedModifiers`, repeatable imports |
| **Foundry VTT JSON** | `dnd5e` item/pack export (file or pasted) | No | Migrating items, feats, spells, classes from Foundry |
| **Text import** | Pasted plain text + optional content hint | Optional server AI or BYO LLM | UA PDFs, website copy-paste, copied stat blocks |
| **PDF import** | Uploaded PDF (+ optional page range) | Optional server AI | Same as text; also accepts JSON export files (no AI) |

### Dump Stat JSON export

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

**Example bundle:** [lib/import/examples/ua-villainous-options-export.json](lib/import/examples/ua-villainous-options-export.json) — UA 2026 Villainous Options (three subclasses, Destructive Wave, Origin/Epic Boon feats). Regenerate with:

```bash
pnpm dlx tsx scripts/build-ua-villainous-export.ts
```

### Text import (BYO LLM + optional server AI)

The **Clipboard** tab is the primary import path for pasted text:

1. Paste raw source text (from a PDF copy, website, or document).
2. Copy the **extraction prompt** and **JSON template** (matched to your content-type hint).
3. Run the prompt in ChatGPT, Claude, Gemini, or any LLM — using your own API key or subscription.
4. Paste the model's JSON output back into Dump Stat and click **Import JSON**.

The prompt includes **clean PDF / paste guidelines** (keep level tables intact, one content type per run, preserve feature headings, etc.). No server API keys are required for this flow.

**Optional server AI:** If the host has `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GOOGLE_GENERATIVE_AI_API_KEY` configured, an expandable **server AI extraction** section appears on Clipboard and PDF tabs (hidden when no provider is configured). The BYO prompt/template workflow remains available either way.

**Dump Stat JSON export** — if the pasted text is a valid `dump-stat-export` bundle, it imports directly without LLM extraction (same as file upload; extraction mode `byo-json`).

### PDF import (optional server AI)

Same schema and persistence as text import. Optional **page range** limits extraction to specific pages. Upload a **`.json` export bundle** through the PDF file picker for non-AI JSON import.

PDF text extraction tries **deterministic** parsing first, then **hybrid** or full **AI** when needed. Requires at least one [AI provider key](#7-ai-import-optional--compendium-import-only) for PDF text extraction (not for JSON bundles, SRD seed, or Foundry JSON).

### Multi-file homebrew import order

Many third-party classes ship as **several JSON files** (spell libraries, discipline powers, class, subclasses). Import **supporting libraries before** the class and subclass files that reference them so modifier wiring and spell links resolve correctly.

On the app: **Import → Multi-file import order** (expandable panel at the top of the page) lists workflows for spellcasters, KibblesTasty Psion, Laserllama-style Martial Exploits, and Inventor.

**General rules**

1. **SRD spells** — If your compendium is SRD-seeded, standard spells (e.g. *Fireball*, *Burning Hands*) do not need a separate import; only import homebrew spell JSON for third-party names.
2. **One batch or sequential** — Either paste a **JSON array** of import objects in dependency order, or run separate imports in the same order (earlier files persist to the compendium before later ones wire references).
3. **Set a source label** — Use the compendium source label field (e.g. `Kibbles Witch`) so you can filter and re-import safely.

**Spellcasting classes** (Witch, Inventor, full casters)

| Step | Content |
|------|---------|
| 1 | Homebrew spell libraries (`kibbles-spells-parsed.json`, Valda's supplements, etc.) |
| 2 | Class spell list stub (optional) |
| 3 | Class JSON |
| 4 | Subclasses JSON (always-prepared spell tables) |
| 5 | Choice options if separate (grand hexes, invocations, …) |

**KibblesTasty Psion**

| Step | Content |
|------|---------|
| 1 | `psion-disciplines.json` (powers in `spells[]`, discipline packages in `import_proposals`) |
| 2 | `psion-class.json` |
| 3 | Archetypes / subclasses (e.g. `psion-knowing-mind.json`) |

Discipline powers with psi-point augments get `psionic_augments` at import; pick augments on the character sheet when casting those powers.

**Martial Exploits** (Laserllama Alternate Fighter, etc.)

| Step | Content |
|------|---------|
| 1 | Exploit / maneuver library (if separate) |
| 2 | Class with level table (Exploit Dice, Exploits Known) |
| 3 | Subclasses (if separate) |

**JSON array example** (Clipboard → Step 2):

```json
[
  { "spells": [ … ] },
  { "classes": [ … ] },
  { "subclasses": [ … ] }
]
```

Dump Stat merges the array into one import batch before wiring modifiers.

---

## Production deployment

**This app is designed for self-hosted Node + MySQL**, not Vercel serverless. If the repo was linked to Vercel from v0, disconnect that integration in the Vercel dashboard (or remove the Git deploy hook) and deploy on your VPS instead.

These steps apply to any Linux VPS or dedicated box where you run Node and MySQL yourself (DreamHost VPS, Linode, DigitalOcean, Hetzner, AWS EC2, a home server, etc.). Adjust paths and panel names for your host.

### Architecture

```
Internet → reverse proxy (nginx/Caddy/Apache) → Node (Next.js on :3000) → MySQL (localhost or private network)
```

MySQL and Node on the **same machine** should use `localhost` (or a private IP) in `DATABASE_URL`.

### 1. Server prerequisites

- Node.js 20+
- MySQL 8+
- Git
- A process manager (PM2, systemd) and reverse proxy (nginx recommended)

### 2. Database

On the server (or via your host’s DB panel):

1. Create a database (e.g. `dump_stat`).
2. Create a dedicated MySQL user with privileges **only** on that database.
3. Import schema once:

   ```bash
   mysql -h localhost -u APP_USER -p dump_stat < mysql/schema.sql
   ```

### 3. Deploy the application

```bash
git clone https://github.com/Geph/v0-dump-stat-character-builder.git
cd v0-dump-stat-character-builder
pnpm install
```

Set production environment variables (`.env.local`, PM2 ecosystem file, or systemd `Environment=`):

```env
DATABASE_URL=mysql://APP_USER:APP_PASSWORD@localhost:3306/dump_stat
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NODE_ENV=production
PORT=3000

# AI import — one provider key (see "AI import" section above)
OPENAI_API_KEY=sk-your-key-here
# ANTHROPIC_API_KEY=sk-ant-...
# GOOGLE_GENERATIVE_AI_API_KEY=...
# IMPORT_AI_PROVIDER=openai|anthropic|google
# IMPORT_AI_MODEL=gpt-4o-mini
```

Build and start:

```bash
NODE_OPTIONS='--max-old-space-size=4096' pnpm build
pnpm start
```

Or with PM2 (config included in `deploy/`):

```bash
pm2 start deploy/ecosystem.config.cjs
pm2 save
```

Optional standalone build (copies minimal `node_modules` into `.next/standalone`):

```bash
NEXT_OUTPUT=standalone pnpm build
```

### 4. Reverse proxy (nginx example)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Add TLS with Let’s Encrypt (`certbot`) or your host’s certificate tooling.

### 5. First-run seed

After the app is up and connected to the database:

```bash
curl -X POST https://yourdomain.com/api/seed
```

### Managed / shared hosting notes

| Host type | Typical approach |
|-----------|------------------|
| **VPS** (DreamHost, DO, Linode, …) | Node + MySQL on same box, nginx in front — steps above |
| **Managed MySQL** (RDS, Aiven, …) | Point `DATABASE_URL` at the provider hostname; run Node on a VPS or PaaS |
| **PaaS** (Railway, Render, Fly.io) | Deploy Next.js build; attach managed MySQL; set env vars in the dashboard |
| **Vercel** | **Not recommended** — no persistent MySQL on the same project; use DreamHost VPS + nginx instead |
| **Shared PHP/cPanel** | Often **no** long-running Node — use a VPS or PaaS instead unless your plan supports Node apps |

DreamHost-specific: MySQL is created under **Goodies → MySQL Databases**; remote access may require an SSH tunnel or IP allowlist as described in local dev step 5.

---

## Deployment profiles

Dump Stat supports two **build-time** profiles. Choose one when building for production; there is no runtime toggle in the deployed app.

| Profile | Command | Storage | Deploy target |
|---------|---------|---------|---------------|
| **Hosted** (default) | `pnpm build:hosted` | MySQL via `/api/*` | VPS / Node (`pnpm start`) |
| **Static** | `pnpm build:static` | IndexedDB in browser | GitHub Pages (`out/`) |

### Hosted (MySQL + Node)

This is the default local development and VPS workflow documented above:

1. Configure `DATABASE_URL` in `.env.local`
2. `pnpm build:hosted` (or `pnpm build`)
3. Run with `pnpm start` or PM2/nginx as in [deploy/](deploy/)

Set `NEXT_PUBLIC_DEPLOY_MODE=hosted` or leave it unset.

### Static (GitHub Pages)

No database server required. Data lives in the visitor's browser.

1. Set `NEXT_PUBLIC_BASE_PATH` to your repo name for project sites (e.g. `/dump-stat-character-builder`)
2. `pnpm build:static` — writes static files to `out/`
3. Deploy `out/` to GitHub Pages (see [deploy/github-pages.md](deploy/github-pages.md))

**Static mode includes:** builder, characters, compendium, bundled SRD on first visit, JSON pack import/export.

**Static mode excludes:** PDF/text server AI import, server seed API. JSON paste (Dump Stat exports, Foundry, BYO LLM) still works. Use JSON exports from a hosted instance to share custom content.

Environment variables for static builds are documented in [.env.example](.env.example).

**GitHub Pages:** See [deploy/github-pages.md](deploy/github-pages.md). After enabling Pages (Source: GitHub Actions), the app is served at `https://geph.github.io/dump-stat-character-builder/`.

---

## Troubleshooting

| Symptom | What to check |
|---------|----------------|
| Dev server hangs / pages never load | Stale `next dev` on port 3000 after sleep or reboot — kill the Node process, delete `.next`, run `pnpm dev` again (see below) |
| `Database is not configured` | `.env.local` missing or placeholder values; restart dev server |
| `fetch failed` / `ECONNREFUSED` | Wrong host/port, tunnel not running, or firewall blocking MySQL |
| `Access denied` | Wrong user/password; user not granted access to the database |
| `Unknown table` / `doesn't exist` | Run `mysql/schema.sql` or `pnpm db:setup` before seeding |
| Seed returns 500 | Server logs; confirm `DATABASE_URL` points at the DB where schema was applied |
| `next build` OOM | Set `NODE_OPTIONS='--max-old-space-size=4096'` |

### Dev server stuck after reboot

If `http://localhost:3000` spins forever, a zombie Next.js process is often still holding the port:

```powershell
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Remove-Item -Recurse -Force .next
pnpm dev
```

Run `pnpm db:migrate` after pulling if you see unknown column errors for `card_image_url`.

---

## Project Structure

```
app/
├── page.tsx              # Landing page
├── builder/              # Character builder
├── characters/           # Character list and sheets
├── compendium/           # Content browser and editors
├── import/               # PDF and text import
└── api/                  # REST routes (seed, import, data, characters)

lib/
├── db/                   # MySQL connection, Drizzle schema, migrations
├── builder/              # Draft storage, ASI allocation, feat selection, equipment utils
├── compendium/           # Background proficiencies, display helpers, editor field styles
├── srd/                  # SRD seed data and parsers
├── import/               # Import normalization and dump-stat export format
└── site-images.ts        # Marketing image paths

components/
├── compendium/           # Editor header row, card image field, selection cards, detail overlays
├── builder/              # Step nav, multi-select choices, ASI allocator
└── game-icon-picker.tsx  # SVG game-icons.net picker for compendium entries

mysql/
└── schema.sql            # Database DDL

public/
├── images/               # Hero, feature cards, backgrounds
└── icons/                # Compendium SVG game icons (+ manifest.json from pnpm icons:manifest)
```

## Customization

Dump Stat is built so that **everything the SRD content does, your homebrew can do too** — there are no hard-coded class or species mechanics that you can't reproduce in the editors.

- **Content** — Create or edit species, classes, subclasses, backgrounds, feats, spells, equipment, and custom abilities in the Compendium. Custom entries are marked with source **Custom**; SRD entries can be edited, disabled, exported, or replaced.
- **Mechanics via Common Modifier Effects** — Instead of inline, one-off rules, every feature, trait, feat, choice option, and custom ability draws from one searchable catalog of modifier effects (ability/skill/save bonuses, proficiencies, resource pools, level-scaling dice, spell grants, alternate-ability checks, companions/beast forms, feat grants, and more). Edit a modifier once and every entry that links it updates.
- **Player choices** — Author a choice (skills, tools/instruments, languages, sizes, weapon masteries, feat grants) on a modifier and it renders automatically as an interactive pick in the builder at the right step.
- **Layout & theme** — Toggle the builder between **compact** and **visual** layouts in settings. Theming lives in `app/globals.css` (Arcane default plus Parchment, Stone, Moss, and Clay); use the gear icon in the header to switch styles. Both preferences are stored in `localStorage`.
- **Portability** — Move content between instances (or between hosted and static deploys) with Dump Stat JSON export/import, and bring in third-party content via Foundry VTT, text, or PDF import.

### Data layer

- Browser code uses `createClient()` from `@/lib/db/client` → hosted: `/api/characters` and `/api/data/*`; static: IndexedDB via `lib/data/`
- Server routes use `lib/db/*` (Drizzle + `mysql2`) — hosted builds only
- There is **no** Supabase dependency. Run `pnpm check:mysql` to verify the repo has no stray Supabase references.

---

## Updating the release version

**Maintainers only** — do not bump version in contributor PRs.

After merging to `main`, run:

```bash
pnpm version:bump
```

This increments `VERSION` and syncs `package.json` `version` (e.g. `0.3` → `0.4`). Commit the result as part of the release push. Contributors must not run this script or hand-edit those files.

---

## Known issues / Roadmap

Track bugs and feature ideas in [GitHub Issues](https://github.com/Geph/v0-dump-stat-character-builder/issues). There is no published roadmap yet — open an issue to discuss priorities.

<!-- Roadmap items (uncomment when ready):
- ...
-->

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for setup, branch naming, and PR expectations, and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before participating.

---

## License & credits

### Application code

The Dump Stat application source code in this repository is licensed under the [MIT License](LICENSE) (Copyright © Geph).

The MIT license applies to **application code only**. It does **not** cover third-party game content or assets bundled with or displayed by the app.

### SRD 5.2.1 (game content)

This work includes material from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

Compatible with fifth edition.

Section 5 of CC-BY-4.0 includes a Disclaimer of Warranties and Limitation of Liability that limits our liability to you.

Seed data is rebuilt from SRD-derived markdown via `pnpm srd:build` — see [lib/srd/README.md](lib/srd/README.md).

### Icons (game-icons.net)

Compendium icons are from [game-icons.net](https://game-icons.net/) (thousands of SVGs under `public/icons/`, manifest from `pnpm icons:manifest`). The site’s icons are licensed under [CC BY 3.0](http://creativecommons.org/licenses/by/3.0/). Attribution appears in the app footer, the landing page, and the compendium icon picker (link to game-icons.net). The site logo uses [Spiked Dragon Head](https://game-icons.net/1x1/delapouite/spiked-dragon-head.html) by Delapouite (CC BY 3.0).

### Fonts

Solbera’s D&D Fonts by Solbera / Ryrok, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) — see [Solbera D&D Fonts](https://jonathonf.github.io/solbera-dnd-fonts/).

### Trademarks & privacy

All product names, logos, and brands are property of their respective owners. All company, product, and service names used in this project are for identification purposes only. Use of these names, logos, and brands does not imply endorsement.

Dump Stat does not collect personal identification data. Character and compendium data stay in your browser or your own database when you host the app yourself.

## Links

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com)
