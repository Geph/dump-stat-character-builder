# Hosted VPS deploy (Node + MySQL)

**This app is designed for self-hosted Node + MySQL**, not Vercel serverless. If the repo was linked to Vercel from v0, disconnect that integration and deploy on a VPS instead.

These steps apply to any Linux VPS or dedicated box (DreamHost VPS, Linode, DigitalOcean, Hetzner, AWS EC2, a home server, etc.). Adjust paths and panel names for your host.

Static GitHub Pages (no MySQL) is documented in [github-pages.md](github-pages.md).

## Architecture

```
Internet → reverse proxy (nginx/Caddy/Apache) → Node (Next.js on :3000) → MySQL (localhost or private network)
```

MySQL and Node on the **same machine** should use `localhost` (or a private IP) in `DATABASE_URL`.

## 1. Server prerequisites

- Node.js 20+
- MySQL 8+
- Git
- A process manager (PM2, systemd) and reverse proxy (nginx recommended)

## 2. Database

On the server (or via your host’s DB panel):

1. Create a database (e.g. `dump_stat`).
2. Create a dedicated MySQL user with privileges **only** on that database.
3. Import schema once:

   ```bash
   mysql -h localhost -u APP_USER -p dump_stat < mysql/schema.sql
   ```

## 3. Deploy the application

```bash
git clone https://github.com/Geph/dump-stat-character-builder.git
cd dump-stat-character-builder
pnpm install
```

Set production environment variables (`.env.local`, PM2 ecosystem file, or systemd `Environment=`):

```env
DATABASE_URL=mysql://APP_USER:APP_PASSWORD@localhost:3306/dump_stat
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NODE_ENV=production
PORT=3000

# AI import — one provider key (optional; see docs/import.md)
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

Or with PM2 (config included in this folder):

```bash
pm2 start deploy/ecosystem.config.cjs
pm2 save
```

Optional standalone build (copies minimal `node_modules` into `.next/standalone`):

```bash
NEXT_OUTPUT=standalone pnpm build
```

## 4. Reverse proxy

See [nginx-dump-stat.conf.example](nginx-dump-stat.conf.example). Add TLS with Let’s Encrypt (`certbot`) or your host’s certificate tooling.

## 5. First-run seed

After the app is up and connected to the database:

```bash
curl -X POST https://yourdomain.com/api/seed
```

After pulling schema updates, run `pnpm db:migrate` on the server.

## Managed / shared hosting notes

| Host type | Typical approach |
|-----------|------------------|
| **VPS** (DreamHost, DO, Linode, …) | Node + MySQL on same box, nginx in front — steps above |
| **Managed MySQL** (RDS, Aiven, …) | Point `DATABASE_URL` at the provider hostname; run Node on a VPS or PaaS |
| **PaaS** (Railway, Render, Fly.io) | Deploy Next.js build; attach managed MySQL; set env vars in the dashboard |
| **Vercel** | **Not recommended** — no persistent MySQL on the same project |
| **Shared PHP/cPanel** | Often **no** long-running Node — use a VPS or PaaS unless your plan supports Node apps |

DreamHost-specific: MySQL is created under **Goodies → MySQL Databases**; remote access may require an SSH tunnel or IP allowlist.
