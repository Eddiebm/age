# Deploy AGE on Hetzner (with OpenClaw)

Your OpenClaw gateway runs as a **user systemd** service and listens on its own ports. AGE uses **port 3000** on `127.0.0.1` behind nginx (or another reverse proxy). They do not need to share processes; only avoid **port collisions**.

**Server (from agent setup):** `ssh -i ~/.ssh/id_ed25519 root@5.78.183.141` — Ubuntu 24.04.

**Example — `theworldagency.uk` (Cloudflare):** create an **`A`** record **`age`** → **`5.78.183.141`** (grey cloud / DNS-only for first TLS via certbot on the box). When `dig +short age.theworldagency.uk A` returns the IP, run `setup-nginx-tls.sh age.theworldagency.uk your@email.com`. Use apex `@` instead of `age` if you want `https://theworldagency.uk` only.

**Automate the A record (optional):** create an API token (*Edit zone DNS* for `theworldagency.uk`), then on your Mac from the repo:  
`export CLOUDFLARE_API_TOKEN='…' && bash ops/hetzner/cloudflare-add-age-a-record.sh`

## 1. PostgreSQL

AGE needs **`DATABASE_URL`** for users, workspaces, runs, posts, metrics, and Stripe state.

**Option A — managed (Neon, Supabase, RDS, etc.)**  
Create a database, then set `DATABASE_URL` in `/opt/age/.env`.

**Option B — apt on the same VPS**

```bash
apt-get install -y postgresql
sudo -u postgres psql -c "CREATE USER age WITH PASSWORD 'choose-a-strong-password';"
sudo -u postgres psql -c "CREATE DATABASE age OWNER age;"
```

`DATABASE_URL=postgresql://age:choose-a-strong-password@127.0.0.1:5432/age`

**Option C — Docker on the same VPS (matches dev `postgres:16-alpine`; data in a volume)**

Install Docker if needed (`apt install docker.io docker-compose-plugin` or Docker’s official repo), then:

```bash
cd /opt/age
# Add POSTGRES_PASSWORD and DATABASE_URL to .env — see ops/hetzner/docker-compose.postgres.yml header
openssl rand -base64 24   # use output as POSTGRES_PASSWORD
nano .env   # POSTGRES_PASSWORD=...  and  DATABASE_URL=postgresql://age:THAT_PASSWORD@127.0.0.1:5432/age
docker compose -f ops/hetzner/docker-compose.postgres.yml up -d
docker compose -f ops/hetzner/docker-compose.postgres.yml ps
```

If the password contains `@ # :` etc., URL-encode it inside `DATABASE_URL` or use a password without those characters.

Apply schema:

```bash
cd /opt/age
./node_modules/.bin/prisma db push
# or: npx prisma@6.3.1 db push   # pin major if npx would install Prisma 7+
# or: npx prisma migrate deploy   # if you use migrations in CI
```

## 2. Redis

Pick one:

**A — apt (simple)**  

```bash
apt-get update && apt-get install -y redis-server
systemctl enable --now redis-server
```

`REDIS_URL=redis://127.0.0.1:6379`

**B — Docker** (see `docker-compose.redis.yml` in this folder)

```bash
docker compose -f /opt/age/ops/hetzner/docker-compose.redis.yml up -d
```

Use the same `REDIS_URL`.

## 3. Node.js 20+

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs build-essential
node -v
```

## 4. App directory

```bash
mkdir -p /opt/age
cd /opt/age
```

**Option A — git clone** (if the repo is on GitHub/GitLab):

```bash
git clone <your-repo-url> .
```

**Option B — rsync from your Mac** (build on the server is still required unless you copy `node_modules`):

```bash
rsync -avz --exclude node_modules --exclude .git ./age/ root@5.78.183.141:/opt/age/
```

## 5. Environment

```bash
cp /opt/age/.env.example /opt/age/.env
nano /opt/age/.env
```

Set at minimum:

- `DATABASE_URL` (PostgreSQL)
- `NEXTAUTH_SECRET` (e.g. `openssl rand -base64 32`)
- `NEXTAUTH_URL` (public URL of this app, e.g. `https://age.yourdomain.com`)
- At least one OAuth provider: `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` and/or `GITHUB_ID` / `GITHUB_SECRET`
- `OPENROUTER_API_KEY` (recommended) or `OPENAI_API_KEY` — see `lib/llm.ts`
- `REDIS_URL` (e.g. `redis://127.0.0.1:6379`)
- `AYRSHARE_API_KEY` (optional until you want live posts)

**Stripe (optional):** `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_WEBHOOK_SECRET`, and configure a Stripe webhook endpoint → `https://your-domain/api/stripe/webhook`.

If you copied `.env.example`, replace the **empty** `REDIS_URL=` line (systemd will not override with a later duplicate):

```bash
sed -i 's|^REDIS_URL=.*|REDIS_URL=redis://127.0.0.1:6379|' /opt/age/.env
systemctl restart age-worker
```

Do **not** commit `.env`.

## 6. Build and prune

```bash
cd /opt/age
npm ci
npm run build
npm prune --omit=dev
```

`postbuild` copies `.next/static` into the standalone bundle so assets load correctly.

## 7. systemd (system, not user — separate from OpenClaw)

```bash
cp /opt/age/ops/hetzner/age-web.service /etc/systemd/system/age-web.service
cp /opt/age/ops/hetzner/age-worker.service /etc/systemd/system/age-worker.service
systemctl daemon-reload
systemctl enable --now age-web age-worker
systemctl status age-web age-worker --no-pager
```

Logs:

```bash
journalctl -u age-web -u age-worker -f --no-pager
```

## 8. Nginx + TLS (recommended)

**Automated (after you own a domain and DNS points here):**

```bash
# Replace with your hostname and email (Let's Encrypt notices).
sudo bash /opt/age/ops/hetzner/setup-nginx-tls.sh age.example.com you@gmail.com
```

This installs **nginx** + **certbot**, proxies to `127.0.0.1:3000`, obtains **HTTPS**, sets **`NEXTAUTH_URL=https://<domain>`** in `/opt/age/.env`, and restarts **age-web** / **age-worker**.

**Manual:** copy `nginx-age.conf.example` to `/etc/nginx/sites-available/age`, set `server_name`, TLS paths, `nginx -t`, reload.

## 9. Firewall

If you use UFW, allow SSH + 80/443; **do not** expose Redis `6379` publicly.

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

## 10. Updates

```bash
cd /opt/age
git pull   # or rsync again
npm ci
npm run build
npm prune --omit=dev
systemctl restart age-web age-worker
```

Or use the bundled script (same steps, plus `prisma db push`):

```bash
chmod +x /opt/age/ops/hetzner/deploy.sh
sudo bash /opt/age/ops/hetzner/deploy.sh
```

## OpenClaw

- OpenClaw gateway: `systemctl --user status openclaw-gateway` (runs as `root`’s user session — unrelated to `age-web`).
- Restarting AGE does **not** restart OpenClaw; no change to `/root/.openclaw/` unless you intentionally integrate (e.g. webhook or tool that calls `https://your-domain/api/run`).

## Troubleshooting

| Issue | Check |
|--------|--------|
| API returns 500 on run | `journalctl -u age-web -n 80`; verify `OPENROUTER_API_KEY` or `OPENAI_API_KEY` and `REDIS_URL`. |
| Jobs never publish | `age-worker` running? Redis up? `journalctl -u age-worker -n 80`. |
| Static assets 404 | Re-run `npm run build` (runs `postbuild`); ensure `WorkingDirectory` in `age-web.service` is `/opt/age/.next/standalone`. |
