"use client";

import { useMemo, useState } from "react";

export type WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  role: string;
  stripeCustomerId: string | null;
  subscription: { status: string; currentPeriodEnd: string | null } | null;
};

export function DashboardClient({
  workspaces,
}: {
  workspaces: WorkspaceRow[];
}) {
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id ?? "");
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);

  const active = useMemo(
    () => workspaces.find((w) => w.id === workspaceId),
    [workspaces, workspaceId],
  );

  async function onRun(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim() || !workspaceId) return;
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), workspaceId }),
      });
      const data = (await res.json()) as {
        status?: string;
        runId?: string;
        error?: string;
      };
      if (!res.ok) {
        setStatus(data.error ?? "error");
        return;
      }
      setStatus(`queued · run ${data.runId ?? ""}`);
      setTopic("");
    } catch {
      setStatus("request failed");
    } finally {
      setLoading(false);
    }
  }

  async function onCheckout() {
    if (!workspaceId) return;
    setBillingLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setStatus(data.error ?? "checkout unavailable");
        return;
      }
      window.location.href = data.url;
    } catch {
      setStatus("checkout failed");
    } finally {
      setBillingLoading(false);
    }
  }

  async function onPortal() {
    if (!workspaceId) return;
    setBillingLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setStatus(data.error ?? "portal unavailable");
        return;
      }
      window.location.href = data.url;
    } catch {
      setStatus("portal failed");
    } finally {
      setBillingLoading(false);
    }
  }

  if (!workspaces.length) {
    return (
      <p className="mt-6 text-sm text-zinc-500">No workspaces — refresh.</p>
    );
  }

  return (
    <div className="mt-8 space-y-10">
      <section className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Workspace
        </label>
        <select
          value={workspaceId}
          onChange={(e) => setWorkspaceId(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
        >
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} · {w.plan} · {w.role}
            </option>
          ))}
        </select>
        {active ? (
          <p className="text-xs text-zinc-500">
            Plan: <span className="text-zinc-300">{active.plan}</span>
            {active.subscription ? (
              <>
                {" "}
                · Subscription:{" "}
                <span className="text-zinc-300">
                  {active.subscription.status}
                </span>
              </>
            ) : null}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2 pt-2">
          {active?.plan === "FREE" ? (
            <button
              type="button"
              disabled={billingLoading}
              onClick={onCheckout}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              Upgrade to Pro
            </button>
          ) : null}
          {active?.stripeCustomerId ? (
            <button
              type="button"
              disabled={billingLoading}
              onClick={onPortal}
              className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
            >
              Billing portal
            </button>
          ) : null}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium text-white">Run engine</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Free tier: limited runs per month per workspace (see env). Pro
          removes the cap.
        </p>
        <form onSubmit={onRun} className="mt-4 flex flex-col gap-3">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Topic — e.g. contrarian takes for founders"
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600"
            disabled={loading}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-zinc-200 disabled:opacity-50"
          >
            {loading ? "Running…" : "Run engine"}
          </button>
        </form>
      </section>

      {status ? (
        <p className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-300">
          {status}
        </p>
      ) : null}
    </div>
  );
}
