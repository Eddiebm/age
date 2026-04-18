import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-10 px-6 py-16">
      <div className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-widest text-emerald-500/90">
          Autonomous Growth Engine
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Run your growth loop like infrastructure.
        </h1>
        <p className="max-w-2xl text-lg text-zinc-400">
          One system for your brands and for paying customers: strategy →
          generation → scoring → BullMQ → distribution → metrics in Postgres —
          with OAuth, workspaces, Stripe Pro, and free-tier guardrails.
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        {session ? (
          <Link
            href="/dashboard"
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500"
          >
            Open dashboard
          </Link>
        ) : (
          <Link
            href="/login"
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500"
          >
            Sign in
          </Link>
        )}
        <a
          href="https://github.com/Eddiebm/age"
          className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500"
          target="_blank"
          rel="noreferrer"
        >
          View source
        </a>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {[
          "Workspaces for internal brands + SaaS tenants",
          "NextAuth (Google / GitHub) + role-based access",
          "Stripe Checkout + Customer Portal + webhooks",
          "Engine runs + posts + metrics persisted in PostgreSQL",
        ].map((text) => (
          <li
            key={text}
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-sm text-zinc-300"
          >
            {text}
          </li>
        ))}
      </ul>
    </main>
  );
}
