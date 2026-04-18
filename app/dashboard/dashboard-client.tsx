"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export type WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  requireApproval: boolean;
  role: string;
  stripeCustomerId: string | null;
  subscription: { status: string; currentPeriodEnd: string | null } | null;
};

type RunRow = {
  id: string;
  topic: string;
  status: string;
  createdAt: string;
  pendingCount: number;
};

export function DashboardClient({
  workspaces,
}: {
  workspaces: WorkspaceRow[];
}) {
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id ?? "");
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [approvalSaving, setApprovalSaving] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);

  const active = useMemo(
    () => workspaces.find((w) => w.id === workspaceId),
    [workspaces, workspaceId],
  );

  const canManage = useMemo(() => {
    const r = active?.role;
    return r === "OWNER" || r === "ADMIN";
  }, [active?.role]);

  const loadRuns = useCallback(async () => {
    if (!workspaceId) return;
    setRunsLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/runs`);
      const data = (await res.json()) as { runs?: RunRow[] };
      if (res.ok && data.runs) setRuns(data.runs);
    } catch {
      /* ignore */
    } finally {
      setRunsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

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
      const label =
        data.status === "awaiting_approval"
          ? `awaiting approval · run ${data.runId ?? ""}`
          : `queued · run ${data.runId ?? ""}`;
      setStatus(label);
      setTopic("");
      void loadRuns();
    } catch {
      setStatus("request failed");
    } finally {
      setLoading(false);
    }
  }

  async function onApproveRun(runId: string) {
    setStatus(null);
    try {
      const res = await fetch(`/api/runs/${runId}/approve`, {
        method: "POST",
      });
      const data = (await res.json()) as { enqueued?: number; error?: string };
      if (!res.ok) {
        setStatus(data.error ?? "approve failed");
        return;
      }
      setStatus(`Published ${data.enqueued ?? 0} post(s) to the queue.`);
      void loadRuns();
    } catch {
      setStatus("approve failed");
    }
  }

  async function onToggleApproval(checked: boolean) {
    if (!workspaceId || !canManage) return;
    setApprovalSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requireApproval: checked }),
      });
      if (!res.ok) {
        setStatus("Could not update approval setting");
        return;
      }
      setStatus(
        checked
          ? "New runs will require approval before publishing."
          : "New runs will publish immediately.",
      );
      router.refresh();
    } catch {
      setStatus("Could not update approval setting");
    } finally {
      setApprovalSaving(false);
    }
  }

  async function onCreateInvite() {
    if (!workspaceId || !canManage) return;
    setInviteLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "MEMBER" }),
      });
      const data = (await res.json()) as { inviteUrl?: string; error?: string };
      if (!res.ok || !data.inviteUrl) {
        setStatus(data.error ?? "invite failed");
        return;
      }
      setStatus(`Invite link: ${data.inviteUrl}`);
    } catch {
      setStatus("invite failed");
    } finally {
      setInviteLoading(false);
    }
  }

  async function onSyncMetrics() {
    if (!workspaceId || !canManage) return;
    setSyncLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/metrics/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const data = (await res.json()) as { updated?: number; error?: string };
      if (!res.ok) {
        setStatus(data.error ?? "sync failed");
        return;
      }
      setStatus(`Synced metrics for ${data.updated ?? 0} post(s).`);
    } catch {
      setStatus("sync failed");
    } finally {
      setSyncLoading(false);
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

  const pendingRuns = runs.filter((r) => r.pendingCount > 0);

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
          <Link
            href={`/dashboard/performance?workspace=${workspaceId}`}
            className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
          >
            Performance
          </Link>
        </div>
      </section>

      {canManage ? (
        <section className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <h2 className="text-sm font-medium text-white">Safety & team</h2>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={active?.requireApproval ?? false}
              disabled={approvalSaving}
              onChange={(e) => void onToggleApproval(e.target.checked)}
            />
            Require approval before posts go to the publish queue
          </label>
          <p className="text-xs text-zinc-500">
            You can also force this globally with{" "}
            <code className="text-zinc-400">AGE_REQUIRE_APPROVAL=true</code>.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={inviteLoading}
              onClick={onCreateInvite}
              className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
            >
              Create invite link
            </button>
            <button
              type="button"
              disabled={syncLoading}
              onClick={onSyncMetrics}
              className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
            >
              {syncLoading ? "Syncing…" : "Sync Ayrshare metrics"}
            </button>
          </div>
        </section>
      ) : null}

      {canManage && pendingRuns.length > 0 ? (
        <section className="space-y-2 rounded-xl border border-amber-900/40 bg-amber-950/20 p-4">
          <h2 className="text-sm font-medium text-amber-100">
            Awaiting approval ({pendingRuns.length})
          </h2>
          {runsLoading ? (
            <p className="text-xs text-zinc-500">Loading…</p>
          ) : (
            <ul className="space-y-2">
              {pendingRuns.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-300"
                >
                  <span className="max-w-[60%] truncate">
                    {r.topic}{" "}
                    <span className="text-zinc-500">
                      · {r.pendingCount} post(s)
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => void onApproveRun(r.id)}
                    className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-500"
                  >
                    Approve & publish
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section>
        <h2 className="text-lg font-medium text-white">Run engine</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Free tier: limited runs per month per workspace (see env). Pro
          removes the cap. API rate limit applies per user.
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
