"use client";

import { useState } from "react";

type User = { id: string; name: string | null; email: string | null; image: string | null; accounts: { provider: string }[]; memberships: { role: string; workspaceId: string }[] };
type Workspace = { id: string; name: string; slug: string; plan: string; createdAt: string; members: { role: string; user: { email: string | null; name: string | null } }[]; _count: { runs: number } };
type Run = { id: string; topic: string; status: string; createdAt: string; workspace: { name: string; slug: string }; _count: { posts: number } };
type PlatformUrl = { platform: string; url: string; status: string; publishedAt: string | null };
type Post = { id: string; body: string; status: string; score: number | null; ayrsharePostId: string | null; platformUrls: PlatformUrl[] | null; run: { workspaceId: string; topic: string }; metrics: { impressions: number; engagement: number }[] };

type Tab = "users" | "workspaces" | "runs" | "posts";

export function AdminClient({ users, workspaces, runs, posts }: { users: User[]; workspaces: Workspace[]; runs: Run[]; posts: Post[] }) {
  const [tab, setTab] = useState<Tab>("users");
  const [planUpdates, setPlanUpdates] = useState<Record<string, string>>({});

  async function upgradePlan(workspaceId: string, plan: string) {
    await fetch("/api/admin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId, plan }) });
    setPlanUpdates(p => ({ ...p, [workspaceId]: plan }));
  }

  const tabs: Tab[] = ["users", "workspaces", "runs", "posts"];
  const counts: Record<Tab, number> = { users: users.length, workspaces: workspaces.length, runs: runs.length, posts: posts.length };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold tracking-widest text-amber-400 uppercase">Admin</span>
          <span className="text-zinc-600">·</span>
          <span className="text-sm font-semibold text-white">Command Deck</span>
        </div>
        <a href="/dashboard" className="text-xs text-zinc-500 hover:text-zinc-300">← Dashboard</a>
      </header>

      {/* Stats bar */}
      <div className="grid grid-cols-4 border-b border-zinc-800">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`py-4 text-center border-r border-zinc-800 last:border-r-0 transition-colors ${tab === t ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50"}`}>
            <div className="text-2xl font-bold">{counts[t]}</div>
            <div className="text-xs uppercase tracking-widest mt-1">{t}</div>
          </button>
        ))}
      </div>

      <div className="p-6">
        {tab === "users" && (
          <table className="w-full text-sm">
            <thead><tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-zinc-800">
              <th className="pb-3 text-left">Email</th>
              <th className="pb-3 text-left">Name</th>
              <th className="pb-3 text-left">Providers</th>
              <th className="pb-3 text-left">Workspaces</th>
              <th className="pb-3 text-left">Role</th>
            </tr></thead>
            <tbody>{users.map(u => (
              <tr key={u.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                <td className="py-3 text-zinc-200">{u.email}</td>
                <td className="py-3 text-zinc-400">{u.name ?? "—"}</td>
                <td className="py-3">{u.accounts.map(a => <span key={a.provider} className="mr-1 px-1.5 py-0.5 bg-zinc-800 rounded text-xs text-zinc-400">{a.provider}</span>)}</td>
                <td className="py-3 text-zinc-400">{u.memberships.length}</td>
                <td className="py-3">{u.memberships.map(m => <span key={m.workspaceId} className="mr-1 px-1.5 py-0.5 bg-zinc-800 rounded text-xs text-zinc-400">{m.role}</span>)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}

        {tab === "workspaces" && (
          <table className="w-full text-sm">
            <thead><tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-zinc-800">
              <th className="pb-3 text-left">Name</th>
              <th className="pb-3 text-left">Members</th>
              <th className="pb-3 text-left">Runs</th>
              <th className="pb-3 text-left">Plan</th>
              <th className="pb-3 text-left">Change Plan</th>
            </tr></thead>
            <tbody>{workspaces.map(w => {
              const currentPlan = planUpdates[w.id] ?? w.plan;
              return (
                <tr key={w.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                  <td className="py-3">
                    <div className="text-zinc-200">{w.name}</div>
                    <div className="text-xs text-zinc-600">{w.slug}</div>
                  </td>
                  <td className="py-3">
                    <div className="space-y-0.5">{w.members.map((m, i) => <div key={i} className="text-xs text-zinc-400">{m.user.email} <span className="text-zinc-600">({m.role})</span></div>)}</div>
                  </td>
                  <td className="py-3 text-zinc-400">{w._count.runs}</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${currentPlan === "PRO" ? "bg-amber-500/20 text-amber-400" : currentPlan === "ENTERPRISE" ? "bg-purple-500/20 text-purple-400" : "bg-zinc-800 text-zinc-400"}`}>{currentPlan}</span>
                  </td>
                  <td className="py-3">
                    <select onChange={e => upgradePlan(w.id, e.target.value)} value={currentPlan}
                      className="bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-700">
                      <option value="FREE">FREE</option>
                      <option value="PRO">PRO</option>
                      <option value="ENTERPRISE">ENTERPRISE</option>
                    </select>
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        )}

        {tab === "runs" && (
          <table className="w-full text-sm">
            <thead><tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-zinc-800">
              <th className="pb-3 text-left">Workspace</th>
              <th className="pb-3 text-left">Topic</th>
              <th className="pb-3 text-left">Status</th>
              <th className="pb-3 text-left">Posts</th>
              <th className="pb-3 text-left">Date</th>
            </tr></thead>
            <tbody>{runs.map(r => (
              <tr key={r.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                <td className="py-3 text-zinc-400">{r.workspace.name}</td>
                <td className="py-3 text-zinc-200 max-w-xs truncate">{r.topic}</td>
                <td className="py-3"><span className={`px-2 py-0.5 rounded text-xs ${r.status === "completed" ? "bg-green-500/20 text-green-400" : r.status === "failed" ? "bg-red-500/20 text-red-400" : "bg-zinc-800 text-zinc-400"}`}>{r.status}</span></td>
                <td className="py-3 text-zinc-400">{r._count.posts}</td>
                <td className="py-3 text-zinc-600 text-xs">{new Date(r.createdAt).toLocaleString()}</td>
              </tr>
            ))}</tbody>
          </table>
        )}

        {tab === "posts" && (
          <table className="w-full text-sm">
            <thead><tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-zinc-800">
              <th className="pb-3 text-left">Body</th>
              <th className="pb-3 text-left">Status</th>
              <th className="pb-3 text-left">Score</th>
              <th className="pb-3 text-left">Live Links</th>
              <th className="pb-3 text-left">Impressions</th>
              <th className="pb-3 text-left">Engagement</th>
            </tr></thead>
            <tbody>{posts.map(p => (
              <tr key={p.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                <td className="py-3 text-zinc-300 max-w-sm">
                  <div className="truncate">{p.body}</div>
                  <div className="text-xs text-zinc-600 mt-0.5">{p.run.topic}</div>
                </td>
                <td className="py-3"><span className={`px-2 py-0.5 rounded text-xs ${p.status === "published" ? "bg-green-500/20 text-green-400" : p.status === "failed" ? "bg-red-500/20 text-red-400" : p.status === "queued" ? "bg-blue-500/20 text-blue-400" : "bg-zinc-800 text-zinc-400"}`}>{p.status}</span></td>
                <td className="py-3 text-zinc-400">{p.score ?? "—"}</td>
                <td className="py-3">
                  {p.platformUrls && p.platformUrls.length > 0 ? (
                    <div className="flex gap-1 flex-wrap">
                      {p.platformUrls.map((pu, i) => (
                        <a key={i} href={pu.url} target="_blank" rel="noopener noreferrer"
                          className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors">
                          {pu.platform}
                        </a>
                      ))}
                    </div>
                  ) : <span className="text-zinc-600 text-xs">—</span>}
                </td>
                <td className="py-3 text-zinc-400">{p.metrics[0]?.impressions ?? "—"}</td>
                <td className="py-3 text-zinc-400">{p.metrics[0] ? `${(p.metrics[0].engagement * 100).toFixed(1)}%` : "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
