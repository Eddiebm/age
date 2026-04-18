# Autonomous Growth Engine (AGE)

**Repository:** [github.com/Eddiebm/age](https://github.com/Eddiebm/age)

Multi-tenant growth OS: **OAuth → workspaces → engine runs → Postgres → BullMQ → publish → metrics**, with **Stripe** for SaaS and the same app for **your brands** and **paying customers**.

## Stack

- **App:** Next.js 14 (App Router), NextAuth (Google / GitHub), middleware
- **Data:** PostgreSQL + Prisma (`EngineRun`, `GeneratedPost`, `PostMetric`, billing)
- **Queue:** BullMQ + Redis (scoped jobs: `postId` + `workspaceId` + `body`)
- **AI:** OpenRouter (default) or OpenAI — `lib/llm.ts` + `contentAgent` (`openai/gpt-4o-mini` on OpenRouter)
- **Distribution:** [Ayrshare](https://www.ayrshare.com/) (`POST https://api.ayrshare.com/api/post`)
- **Billing:** Stripe Checkout, Customer Portal, webhooks → `Workspace.plan` (`FREE` | `PRO`)

## Local setup

1. **Postgres + Redis** (repo includes `docker-compose.yml`):

   ```bash
   docker compose up -d
   cp .env.example .env
   # Set DATABASE_URL, REDIS_URL, NEXTAUTH_SECRET, NEXTAUTH_URL=http://localhost:3000
   # Add at least one OAuth provider (Google and/or GitHub)
   # OPENROUTER_API_KEY — required to run the engine (or OPENAI_API_KEY for OpenAI direct)
   ```

2. **Schema:**

   ```bash
   npm install
   npx prisma db push
   ```

3. **Run:**

   ```bash
   npm run dev
   npm run worker   # second terminal; needs DATABASE_URL + REDIS_URL
   ```

4. Open [http://localhost:3000](http://localhost:3000) → **Sign in** → **Dashboard** → run the engine.

**Optional — Stripe:** set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_WEBHOOK_SECRET`, and point a Stripe webhook to `/api/stripe/webhook` (local: Stripe CLI).

**Free tier:** `AGE_FREE_RUNS_PER_MONTH` (default `10`) applies per workspace on `FREE`; `PRO` skips that limit.

## Deploy

- **Vercel / Railway-style:** set all env vars from `.env.example`; run **worker** as a separate long-lived process with the same env.
- **Hetzner + OpenClaw:** [ops/hetzner/HETZNER.md](ops/hetzner/HETZNER.md) — Redis, **PostgreSQL**, systemd, nginx. Give **both** `age-web` and `age-worker` the same `.env` (including `DATABASE_URL`).
- **Full production / domain / OAuth notes:** [docs/HANDBOOK.md](docs/HANDBOOK.md)

## Product features (high level)

- **Workspaces** with roles (OWNER / ADMIN / MEMBER), optional **approval** before anything hits BullMQ (`requireApproval` or `AGE_REQUIRE_APPROVAL=true`).
- **Invites** (`/api/workspaces/:id/invites`, accept at `/invite/:token`) with expiring tokens.
- **Stripe** Checkout + Portal + webhooks (Pro removes monthly run cap).
- **Metrics:** worker records `ayrsharePostId`; **Sync Ayrshare metrics** on the dashboard calls `/api/metrics/sync` (stores new `PostMetric` rows from Ayrshare post analytics).
- **Performance** page (`/dashboard/performance?workspace=…`) lists recent posts + latest metric.
- **Rate limit** on `/api/run` (Redis; tune `AGE_API_RUN_POINTS_PER_MINUTE`).
- **Deploy:** `ops/hetzner/deploy.sh` on the server after `DATABASE_URL` and OAuth are set.

## Caveats

- Ayrshare + linked social accounts required for live posts; without `AYRSHARE_API_KEY` posts are marked **skipped** and metrics stay stub/random until an id exists.
- Redis should use **no eviction** (or careful limits) for BullMQ and rate limiting.
- Analytics aggregation assumes Ayrshare’s `/api/analytics/post` shape; adjust `lib/ayrshareAnalytics.ts` if your networks return different fields.
