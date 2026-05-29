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
- **SRD Content** - Pre-loaded with D&D 5.5e Systems Reference Document content
- **Custom Content Creation** - Create and manage your own:
  - Species with custom traits and ability score bonuses
  - Classes with hit dice, saving throws, and proficiencies
  - Subclasses linked to parent classes
  - Backgrounds with skill proficiencies and equipment
  - Feats with prerequisites and benefits
  - Spells with full casting details
  - Equipment including weapons, armor, and adventuring gear
  - Custom abilities for homebrew features
- **Filtering & Search** - Find content quickly with search and category filters

### Character Management
- **Save & Load Characters** - Persist characters to the database
- **Export Options** - Download character data as JSON
- **Character Sheet View** - Full character sheet with all details

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: MySQL (Dreamhost VPS or any MySQL 8+ host)
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui
- **Icons**: Lucide React + Game Icons
- **Animations**: Framer Motion

## Requirements

- Node.js 18+ (20+ recommended)
- pnpm (via Corepack) or npm
- MySQL 8+ (Dreamhost VPS MySQL, or local MySQL for offline dev)
- SSH access to your VPS (for remote DB setup and optional tunneling)

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/Geph/v0-dump-stat-character-builder.git
cd v0-dump-stat-character-builder
corepack enable
pnpm install
```

If `pnpm` is not on your PATH, use `corepack pnpm install` and `corepack pnpm dev`.

### 2. Create the MySQL database (Dreamhost)

In the Dreamhost panel:

1. Go to **Goodies → MySQL Databases**.
2. Create a **new database** (note the full database name).
3. Create a **MySQL user** and assign it to that database with full privileges.
4. Note the **MySQL hostname** shown in the panel (often `mysql.yourdomain.com` or similar — not always `localhost` from your laptop).

The app never talks to MySQL from the browser. Only the Next.js server connects, using credentials in `.env.local` (local dev) or environment variables on the VPS (production).

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Dreamhost credentials. Use **either** a single URL **or** separate fields:

```env
# Option A — recommended
DATABASE_URL=mysql://DB_USER:DB_PASSWORD@mysql.yourdomain.com:3306/your_database_name

# Option B — alternative
# MYSQL_HOST=mysql.yourdomain.com
# MYSQL_USER=your_db_user
# MYSQL_PASSWORD=your_db_password
# MYSQL_DATABASE=your_database_name
# MYSQL_PORT=3306

NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

URL-encode special characters in passwords (e.g. `@` → `%40`).

Restart the dev server after changing `.env.local`.

### 4. Create tables (schema)

Run `mysql/schema.sql` **once** on the Dreamhost database.

**From your computer** (if remote MySQL is allowed for your IP):

```bash
mysql -h mysql.yourdomain.com -u YOUR_DB_USER -p YOUR_DATABASE_NAME < mysql/schema.sql
```

**On the VPS via SSH** (often easiest — MySQL is local to the server):

```bash
ssh user@your-vps.dreamhost.com
mysql -h localhost -u YOUR_DB_USER -p YOUR_DATABASE_NAME < /path/to/repo/mysql/schema.sql
```

**phpMyAdmin:** open the database → **Import** → choose `mysql/schema.sql` → run.

The seed step only inserts data; it does **not** create tables.

### 5. Connect from your machine (local development)

Dreamhost often blocks MySQL from the public internet. Pick one approach:

**A. SSH tunnel (recommended for local dev)**

In a separate terminal, keep this running while you develop:

```bash
ssh -N -L 3307:mysql.yourdomain.com:3306 user@your-vps.dreamhost.com
```

Then point `.env.local` at the tunnel:

```env
DATABASE_URL=mysql://DB_USER:DB_PASSWORD@127.0.0.1:3307/your_database_name
```

**B. Allow your IP in Dreamhost**

If your plan includes remote MySQL access, add your home IP in the panel and use the panel hostname directly in `DATABASE_URL`.

**C. Develop on the VPS**

Clone the repo on the server, set `DATABASE_URL` with `localhost` as the host, and run `pnpm dev` there (or deploy production build below).

### 6. Run the app and seed SRD content

```bash
corepack pnpm dev
# or: ./node_modules/.bin/next dev
```

Open [http://localhost:3000](http://localhost:3000), go to **Import**, and click **Seed D&D 5.5e SRD Content**, or:

```bash
curl -X POST http://localhost:3000/api/seed
```

You should get a JSON success response. If you see a configuration or connection error, check `.env.local` and that the schema was imported.

Tables populated by seed:

| Table | Contents |
|-------|----------|
| `species` | Playable species |
| `classes` | Character classes |
| `subclasses` | Class subclasses |
| `backgrounds` | Backgrounds |
| `feats` | Feats |
| `spells` | Spell compendium |
| `equipment` | Weapons, armor, gear |
| `custom_abilities` | Homebrew abilities |
| `characters` | Saved characters (empty until you build some) |

## Deploying on a Dreamhost VPS

Typical flow for running the production app on the same VPS as MySQL:

1. **SSH** into the VPS and install Node.js 20+ if needed.
2. **Clone** the repo (or deploy via git pull).
3. Set environment variables on the server (`.env.local` or systemd/PM2 env):

   ```env
   DATABASE_URL=mysql://DB_USER:DB_PASSWORD@localhost:3306/your_database_name
   NEXT_PUBLIC_SITE_URL=https://yourdomain.com
   NODE_ENV=production
   PORT=3000
   ```

   Use `localhost` for the DB host when Node and MySQL run on the same machine.

4. **Install and build** (allow a few GB free RAM for `next build`):

   ```bash
   pnpm install
   NODE_OPTIONS='--max-old-space-size=4096' pnpm build
   ```

5. **Run** with a process manager, e.g. PM2:

   ```bash
   pnpm start
   ```

6. Put **nginx** or Apache on the VPS in front of the app (proxy pass to `http://127.0.0.1:3000`). Dreamhost VPS docs cover reverse-proxy setup for custom Node apps.

7. Run `mysql/schema.sql` and seed once against the production database (same as local setup).

## Troubleshooting

| Symptom | What to check |
|---------|----------------|
| `Database is not configured` | `.env.local` missing or still has placeholder values; restart dev server |
| `fetch failed` / `ECONNREFUSED` | Wrong host, tunnel not running, or remote MySQL blocked — try SSH tunnel or `localhost` on VPS |
| `Access denied` | Wrong user/password; user not assigned to database in Dreamhost panel |
| `Unknown table` / `doesn't exist` | Run `mysql/schema.sql` before seeding |
| Seed returns 500 after schema exists | Check server terminal logs; verify `DATABASE_URL` reaches the same DB where you ran the schema |

## Project Structure

```
app/
├── page.tsx              # Landing page
├── builder/              # Character builder
├── characters/           # Character list and sheets
├── compendium/           # Content browser and editors
│   ├── species/
│   ├── classes/
│   ├── subclasses/
│   ├── backgrounds/
│   ├── feats/
│   ├── spells/
│   ├── equipment/
│   └── abilities/
├── import/               # JSON import functionality
└── api/
    └── seed/             # Database seeding endpoint

components/
├── main-nav.tsx          # Navigation header
├── game-icon-picker.tsx  # Icon selection for custom content
└── ui/                   # shadcn/ui components

lib/
├── db/                   # MySQL connection, schema, API client
├── site-images.ts        # Paths for hero/background/readme images
├── types.ts              # TypeScript interfaces
└── utils.ts              # Utility functions

public/
├── images/               # Hero, section backgrounds, README screenshot
└── icons/                # Compendium SVG game icons
```

## Customization

### Adding Custom Content

Use the Compendium section to create custom:
- Species with unique traits
- Classes and subclasses
- Backgrounds
- Feats
- Spells
- Equipment
- Custom abilities

All custom content is marked with "Custom" source and can be toggled to appear in the character builder.

### Theming

The app uses CSS custom properties for theming. Edit `app/globals.css` to customize colors:

```css
:root {
  --primary: /* your primary color */;
  --secondary: /* your secondary color */;
  --accent: /* your accent color */;
  /* ... */
}
```

## License

This project uses content from the D&D 5.5e Systems Reference Document (SRD) under the Creative Commons license.

## Links

- [Continue developing on v0](https://v0.app/chat/projects/prj_Z07M3vx9HphfTfMDkIp9oqtpaHYN)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com)
