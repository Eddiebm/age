# Autonomous Growth Engine (AGE)

Self-improving, event-driven, multi-agent growth loop: **create → score → queue → distribute → learn**.

## Stack

- **Frontend:** Next.js 14 (App Router)
- **Queue:** BullMQ + Redis
- **AI:** OpenAI (`gpt-4o-mini` in `contentAgent`)
- **Distribution:** [Ayrshare](https://www.ayrshare.com/) (`POST https://api.ayrshare.com/api/post`)

## Setup

```bash
cp .env.example .env
# Set OPENAI_API_KEY and REDIS_URL (and optionally AYRSHARE_API_KEY)
npm install
```

## Run

Terminal 1 — web app:

```bash
npm run dev
```

Terminal 2 — worker (consumes `posts` queue; required for jobs to run):

```bash
npm run worker
```

Open [http://localhost:3000](http://localhost:3000), enter a topic, and submit. The API runs the orchestrator (strategy → content → scoring → enqueue). The worker picks up jobs and calls the distribution agent.

## Deploy

- **Next.js:** Vercel (set `REDIS_URL`, `OPENAI_API_KEY`, `AYRSHARE_API_KEY` in project env).
- **Worker:** Long-running process on Railway, Fly.io, or similar with the same env vars; run `npm run worker` (or `node` after build — use `tsx`/`ts-node` or compile worker to JS).

## Caveats

- Social APIs (X, LinkedIn, etc.) require linked accounts and approvals in Ayrshare.
- Use a Redis instance with **no eviction** (or careful memory limits) for BullMQ reliability.
- Learning/optimization compounds only with **real** engagement data wired into `analyticsAgent` / `optimizer` / `agentBrain`.
