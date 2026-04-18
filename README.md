# Autonomous Growth Engine (AGE)

**Repository:** [github.com/Eddiebm/age](https://github.com/Eddiebm/age)

Multi-tenant growth OS: **OAuth → workspaces → engine runs → Postgres → BullMQ → publish → metrics**, with **Stripe** for SaaS and the same app for **your brands** and **paying customers**.

## Stack

- **App:** Next.js 14 (App Router), NextAuth (Google / GitHub), middleware
- **Data:** PostgreSQL + Prisma (`EngineRun`, `GeneratedPost`, `PostMetric`, billing)
- **Queue:** BullMQ + Redis (scoped jobs: `postId` + `workspaceId` + `body`)
- **AI:** OpenAI (`gpt-4o-mini` in `contentAgent`)
- **Distribution:** [Ayrshare](https://www.ayrshare.com/) (`POST https://api.ayrshare.com/api/post`)
- **Billing:** Stripe Checkout, Customer Portal, webhooks → `Workspace.plan` (`FREE` | `PRO`)

## Local setup

1. **Postgres + Redis** (repo includes `docker-compose.yml`):

   ```bash
   docker compose up -d
   cp .env.example .env
   # Set DATABASE_URL, REDIS_URL, NEXTAUTH_SECRET, NEXTAUTH_URL=http://localhost:3000
   # Add at least one OAuth provider (Google and/or GitHub)
   # OPENAI_API_KEY — required to run the engine
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

## Caveats

- Ayrshare + linked social accounts required for live posts; without `AYRSHARE_API_KEY` the worker logs/skips publish.
- Redis should use **no eviction** (or careful limits) for BullMQ.
- `optimizer` / `agentBrain` are ready to consume **real** metrics; today’s `analyticsAgent` is still a stub you can swap for provider APIs.
