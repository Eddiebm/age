"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type PostRow = {
  id: string;
  body: string;
  score: number;
  status: string;
  ayrsharePostId: string | null;
  run: { id: string; topic: string; createdAt: string };
  latestMetric: {
    impressions: number;
    engagement: number;
    capturedAt: string;
  } | null;
};

export function PerformanceClient() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspace") ?? "";
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setError("Pick a workspace from the dashboard link.");
      return;
    }
    setLoading(true);
    setError(null);
    void fetch(`/api/workspaces/${workspaceId}/posts?limit=30`)
      .then(async (res) => {
        const data = (await res.json()) as {
          posts?: PostRow[];
          error?: string;
        };
        if (!res.ok) {
          setError(data.error ?? "Failed to load");
          return;
        }
        setPosts(data.posts ?? []);
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (!workspaceId) {
    return (
      <p className="text-sm text-zinc-500">
        Open this page from the dashboard (Performance link) so a workspace is
        selected.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {loading ? (
        <p className="text-sm text-zinc-500">Loading posts…</p>
      ) : null}
      {error ? (
        <p className="text-sm text-amber-200">{error}</p>
      ) : null}
      <ul className="space-y-3">
        {posts.map((p) => (
          <li
            key={p.id}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-200"
          >
            <p className="text-xs text-zinc-500">
              Run: {p.run.topic}{" "}
              <span className="text-zinc-600">
                · {new Date(p.run.createdAt).toLocaleString()}
              </span>
            </p>
            <p className="mt-2 whitespace-pre-wrap text-zinc-100">{p.body}</p>
            <p className="mt-2 text-xs text-zinc-500">
              status: {p.status}
              {p.ayrsharePostId ? (
                <>
                  {" "}
                  · ayrshare{" "}
                  <span className="font-mono text-zinc-400">
                    {p.ayrsharePostId}
                  </span>
                </>
              ) : null}
            </p>
            {p.latestMetric ? (
              <p className="mt-1 text-xs text-emerald-400/90">
                Latest metric: {p.latestMetric.impressions} impressions ·
                engagement {p.latestMetric.engagement.toFixed(3)} ·{" "}
                {new Date(p.latestMetric.capturedAt).toLocaleString()}
              </p>
            ) : (
              <p className="mt-1 text-xs text-zinc-600">No metrics yet.</p>
            )}
          </li>
        ))}
      </ul>
      {!loading && !posts.length && !error ? (
        <p className="text-sm text-zinc-500">No posts in this workspace yet.</p>
      ) : null}
    </div>
  );
}
