"use client";

import { useState } from "react";

export default function Home() {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const topic = new FormData(form).get("topic") as string;
    if (!topic?.trim()) return;
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() }),
      });
      const data = (await res.json()) as { status?: string; error?: string };
      setStatus(data.error ?? data.status ?? "unknown");
    } catch {
      setStatus("request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-8 p-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Autonomous Growth Engine
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Closed-loop: create → score → queue → distribute → learn.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="text-sm font-medium text-zinc-300">
          Topic
          <input
            name="topic"
            placeholder="Enter topic"
            className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none ring-zinc-600 placeholder:text-zinc-600 focus:ring-2"
            disabled={loading}
            required
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {loading ? "Running…" : "Run Engine"}
        </button>
      </form>

      {status ? (
        <p className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-300">
          Status: <span className="font-mono text-emerald-400">{status}</span>
        </p>
      ) : null}
    </main>
  );
}
