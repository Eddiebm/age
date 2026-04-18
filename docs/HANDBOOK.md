# AGE — Operations handbook

Single reference for **Autonomous Growth Engine (AGE)**: what it is, where it runs, how it was set up, and how to operate it. **Do not commit secrets**; this file uses placeholders only.

---

## 1. What AGE is

- **Product:** Multi-tenant “growth OS”: OAuth → workspaces → engine runs → Postgres → BullMQ worker → optional Ayrshare publish → metrics.
- **Stack:** Next.js 14 (App Router), NextAuth, Prisma + PostgreSQL, Redis + BullMQ, OpenAI, optional Ayrshare & Stripe.
- **Repo:** [github.com/Eddiebm/age](https://github.com/Eddiebm/age)

---

## 2. Production URLs & domain

| Item | Value |
|------|--------|
| **Public app (HTTPS)** | `https://age.theworldagency.uk` |
| **Hetzner server IPv4** | `5.78.183.141` |
| **DNS** | Zone **theworldagency.uk** (Cloudflare). Subdomain **`age`** → **A** record → `5.78.183.141` (DNS-only / grey cloud recommended for certbot on-box). |
| **NextAuth canonical URL** | `NEXTAUTH_URL=https://age.theworldagency.uk` (in `/opt/age/.env` on server). |

**OAuth callback URLs (must match exactly):**

- GitHub: `https://age.theworldagency.uk/api/auth/callback/github`
- Google (when enabled): `https://age.theworldagency.uk/api/auth/callback/google`

---

## 3. Server access

```bash
ssh -i ~/.ssh/id_ed25519 root@5.78.183.141
```

- **App directory:** `/opt/age`
- **Env file:** `/opt/age/.env` (never commit; contains `DATABASE_URL`, `NEXTAUTH_SECRET`, OAuth, Redis, OpenAI, etc.)

---

## 4. Processes & systemd

| Unit | Role |
|------|------|
| `age-web` | Next.js **standalone** server on `127.0.0.1:3000` |
| `age-worker` | BullMQ worker (`tsx lib/worker.ts`) |
| `nginx` | Reverse proxy **443/80** → `127.0.0.1:3000` |
| `postgresql` | Database (apt install on VPS) |
| `redis-server` | Queue + rate limits (apt) |

```bash
systemctl status age-web age-worker nginx --no-pager
journalctl -u age-web -u age-worker -n 50 --no-pager
```

---

## 5. TLS & nginx

- **Certificates:** Let’s Encrypt via **certbot** (`nginx` plugin). Paths under `/etc/letsencrypt/live/age.theworldagency.uk/`.
- **Automation:** `ops/hetzner/setup-nginx-tls.sh` — installs nginx config, runs certbot, sets `NEXTAUTH_URL`, restarts `age-web` / `age-worker`.
- **Manual example config:** `ops/hetzner/nginx-age.conf.example`

**Firewall:** Prefer **UFW** allowing **22, 80, 443** only; do **not** expose Redis/Postgres publicly.

---

## 6. Deployment & updates

From server:

```bash
cd /opt/age
sudo bash ops/hetzner/deploy.sh
```

Deploy script: `git pull` → `npm ci` → `./node_modules/.bin/prisma db push` → `npm run build` → `npm prune --omit=dev` → restart `age-web` `age-worker`.

**Note:** Use **project-local** Prisma (`./node_modules/.bin/prisma`), not bare `npx prisma`, to avoid pulling incompatible Prisma 7+ CLI.

---

## 7. Environment variables (checklist)

See **`.env.example`** in repo. Production highlights:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres (on VPS: `127.0.0.1:5432`) |
| `NEXTAUTH_SECRET` | Required in production; random string |
| `NEXTAUTH_URL` | Must be `https://age.theworldagency.uk` |
| `REDIS_URL` | e.g. `redis://127.0.0.1:6379` |
| `GITHUB_ID` / `GITHUB_SECRET` | GitHub OAuth |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional; Google OAuth |
| `OPENROUTER_API_KEY` | Engine (preferred) — OpenRouter |
| `OPENAI_API_KEY` | Engine fallback — OpenAI direct if OpenRouter unset |
| `AYRSHARE_API_KEY` | Optional; live social posts |
| Stripe vars | Optional; Pro billing |

**Patch OAuth keys only (server):**

```bash
export GITHUB_ID='...'
export GITHUB_SECRET='...'
export GOOGLE_CLIENT_ID='...'   # optional
export GOOGLE_CLIENT_SECRET='...'
export OPENROUTER_API_KEY='...'  # https://openrouter.ai/keys
# optional: export OPENAI_API_KEY='sk-...'  # https://platform.openai.com/api-keys
bash /opt/age/ops/hetzner/patch-oauth-env.sh
systemctl restart age-web age-worker
```

---

## 8. Cloudflare & DNS automation

- **API script (optional):** `ops/hetzner/cloudflare-add-age-a-record.sh` — requires `CLOUDFLARE_API_TOKEN` with **Edit DNS** on zone `theworldagency.uk`. **Rotate/revoke** token after use.
- **Device flow (GitHub):** Optional checkbox on GitHub OAuth app; **not** required for normal website login.

---

## 9. Common issues (historical)

| Symptom | Cause | Fix |
|---------|--------|-----|
| `Application error` / digest `2114345402` | Missing `NEXTAUTH_SECRET` | Set secret in `.env`, restart `age-web` |
| `[next-auth][warn][NEXTAUTH_URL` | Wrong/missing `NEXTAUTH_URL` | Set to `https://age.theworldagency.uk` |
| OAuth redirect mismatch | Callback URL in Google/GitHub ≠ app | Match tables in §2 exactly |
| `npx prisma` pulls wrong version | Global Prisma 7 vs project | Use `./node_modules/.bin/prisma db push` |

---

## 10. Related products & context (out of repo)

- **idea2lunch.com** — Separate product (free brief → paid build tiers). Not deployed from this repo.
- **OpenClaw** — Same Hetzner host; different systemd user services. AGE does not require OpenClaw to run.

---

## 11. Security hygiene

- **Never** paste API tokens or OAuth **secrets** into chat or commit them.
- **Rotate** any secret that was exposed (e.g. regenerate GitHub **client secret** in OAuth app, update `.env`, restart).
- **Cloudflare:** Prefer **DNS-only** (grey cloud) for simple Let’s Encrypt on nginx; understand implications before enabling **orange cloud** proxy.

---

## 12. Quick smoke tests

```bash
# From server
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/

# From your Mac (after DNS)
curl -sS -o /dev/null -w "%{http_code}\n" https://age.theworldagency.uk/
```

Then: **Login** → **Dashboard** → **Run engine** with a topic.

---

## 13. File map (repo, ops)

| Path | Purpose |
|------|---------|
| `ops/hetzner/HETZNER.md` | Detailed Hetzner deploy guide |
| `ops/hetzner/deploy.sh` | Production deploy script |
| `ops/hetzner/setup-nginx-tls.sh` | Nginx + certbot + `NEXTAUTH_URL` |
| `ops/hetzner/patch-oauth-env.sh` | Merge OAuth vars into `.env` |
| `ops/hetzner/cloudflare-add-age-a-record.sh` | Cloudflare A record API helper |
| `ops/hetzner/docker-compose.postgres.yml` | Optional Docker Postgres on VPS |
| `ops/hetzner/age-web.service` / `age-worker.service` | systemd unit examples |

---

*Last updated from internal ops notes. Revise this file when IPs, domains, or architecture change.*
