# Dump Stat

![Dump Stat — D&D 5.5e character creator](./public/images/readme/hero.png)

A modern D&D 5.5e character builder and compendium built with Next.js and MySQL.

## Features

### Character Builder
- **Step-by-step character creation** - Guided workflow through species, class, ability scores, background, and equipment selection
- **Multi-class support** - Build characters with multiple classes and track levels independently
- **Real-time preview** - See your character sheet update live as you make choices
- **Point buy & standard array** - Multiple methods for determining ability scores
- **Automatic calculations** - HP, AC, saving throws, skills, and modifiers calculated automatically

### Compendium
- **SRD Content** - Seed the full SRD 5.2.1 compendium (classes, species, spells, equipment, and more)
- **Custom Content Creation** - Create and manage your own species, classes, subclasses, backgrounds, feats, spells, equipment, and custom abilities
- **Filtering & Search** - Find content quickly with search and category filters

### Character Management
- **Save & Load Characters** - Persist characters to the database
- **Export Options** - Download character data as JSON
- **Character Sheet View** - Full character sheet with all details

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

The seed step only inserts data; it does **not** create tables.

### 5. Remote MySQL from your laptop

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

Open [http://localhost:3000](http://localhost:3000), go to **Import**, and click **Seed D&D 5.5e SRD Content**, or:

```bash
curl -X POST http://localhost:3000/api/seed
```

Seed data is built from the official SRD 5.2.1 markdown source. To regenerate JSON after parser changes:

```bash
pnpm srd:build
```

### 7. OpenAI (optional — PDF and text import)

SRD seed and web import do **not** use AI. PDF upload and pasted-text import call OpenAI directly from the server.

Add to `.env.local`:

```env
OPENAI_API_KEY=sk-your-key-here
# optional; defaults to gpt-4o
# IMPORT_AI_MODEL=gpt-4o-mini
```

Restart the dev server after adding the key. Without it, import still works for seed, web URLs, and manual compendium edits — only AI-powered PDF/text import returns a configuration error.

---

## Production deployment (VPS or similar)

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
OPENAI_API_KEY=sk-your-key-here
# IMPORT_AI_MODEL=gpt-4o
```

Build and start:

```bash
NODE_OPTIONS='--max-old-space-size=4096' pnpm build
pnpm start
```

Or with PM2:

```bash
pm2 start pnpm --name dump-stat -- start
pm2 save
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
| **Shared PHP/cPanel** | Often **no** long-running Node — use a VPS or PaaS instead unless your plan supports Node apps |

DreamHost-specific: MySQL is created under **Goodies → MySQL Databases**; remote access may require an SSH tunnel or IP allowlist as described in local dev step 5.

---

## Troubleshooting

| Symptom | What to check |
|---------|----------------|
| `Database is not configured` | `.env.local` missing or placeholder values; restart dev server |
| `fetch failed` / `ECONNREFUSED` | Wrong host/port, tunnel not running, or firewall blocking MySQL |
| `Access denied` | Wrong user/password; user not granted access to the database |
| `Unknown table` / `doesn't exist` | Run `mysql/schema.sql` or `pnpm db:setup` before seeding |
| Seed returns 500 | Server logs; confirm `DATABASE_URL` points at the DB where schema was applied |
| `next build` OOM | Set `NODE_OPTIONS='--max-old-space-size=4096'` |

---

## Project Structure

```
app/
├── page.tsx              # Landing page
├── builder/              # Character builder
├── characters/           # Character list and sheets
├── compendium/           # Content browser and editors
├── import/               # PDF, text, and web import
└── api/                  # REST routes (seed, import, data, characters)

lib/
├── db/                   # MySQL connection, schema, repository
├── srd/                  # SRD seed data and parsers
├── import/               # Import normalization helpers
└── site-images.ts        # Marketing image paths

mysql/
└── schema.sql            # Database DDL

public/
├── images/               # Hero, feature cards, backgrounds
└── icons/                # Compendium SVG game icons
```

## Customization

Use the Compendium section to create custom species, classes, backgrounds, feats, spells, equipment, and abilities. Custom entries are marked with source **Custom**.

Theming lives in `app/globals.css` via CSS custom properties.

## License

This project uses content from the D&D 5.5e Systems Reference Document (SRD) under the Creative Commons license.

## Links

- [Continue developing on v0](https://v0.app/chat/projects/prj_Z07M3vx9HphfTfMDkIp9oqtpaHYN)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com)
