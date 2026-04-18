# Deploy AGE on Hetzner (with OpenClaw)

Your OpenClaw gateway runs as a **user systemd** service and listens on its own ports. AGE uses **port 3000** on `127.0.0.1` behind nginx (or another reverse proxy). They do not need to share processes; only avoid **port collisions**.

**Server (from agent setup):** `ssh -i ~/.ssh/id_ed25519 root@5.78.183.141` — Ubuntu 24.04.

## 1. Redis

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

## 2. Node.js 20+

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs build-essential
node -v
```

## 3. App directory

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

## 4. Environment

```bash
cp /opt/age/.env.example /opt/age/.env
nano /opt/age/.env
```

Set at minimum:

- `OPENAI_API_KEY`
- `REDIS_URL` (e.g. `redis://127.0.0.1:6379`)
- `AYRSHARE_API_KEY` (optional until you want live posts)

If you copied `.env.example`, replace the **empty** `REDIS_URL=` line (systemd will not override with a later duplicate):

```bash
sed -i 's|^REDIS_URL=.*|REDIS_URL=redis://127.0.0.1:6379|' /opt/age/.env
systemctl restart age-worker
```

Do **not** commit `.env`.

## 5. Build and prune

```bash
cd /opt/age
npm ci
npm run build
npm prune --omit=dev
```

`postbuild` copies `.next/static` into the standalone bundle so assets load correctly.

## 6. systemd (system, not user — separate from OpenClaw)

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

## 7. Nginx + TLS (recommended)

Copy `nginx-age.conf.example`, set `server_name`, point `ssl_certificate` paths (e.g. Let’s Encrypt), then:

```bash
nginx -t && systemctl reload nginx
```

## 8. Firewall

If you use UFW, allow SSH + 80/443; **do not** expose Redis `6379` publicly.

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

## 9. Updates

```bash
cd /opt/age
git pull   # or rsync again
npm ci
npm run build
npm prune --omit=dev
systemctl restart age-web age-worker
```

## OpenClaw

- OpenClaw gateway: `systemctl --user status openclaw-gateway` (runs as `root`’s user session — unrelated to `age-web`).
- Restarting AGE does **not** restart OpenClaw; no change to `/root/.openclaw/` unless you intentionally integrate (e.g. webhook or tool that calls `https://your-domain/api/run`).

## Troubleshooting

| Issue | Check |
|--------|--------|
| API returns 500 on run | `journalctl -u age-web -n 80`; verify `OPENAI_API_KEY` and `REDIS_URL`. |
| Jobs never publish | `age-worker` running? Redis up? `journalctl -u age-worker -n 80`. |
| Static assets 404 | Re-run `npm run build` (runs `postbuild`); ensure `WorkingDirectory` in `age-web.service` is `/opt/age/.next/standalone`. |
