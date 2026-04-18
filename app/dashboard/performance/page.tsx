import Link from "next/link";
import { Suspense } from "react";
import { PerformanceClient } from "./performance-client";

export default function PerformancePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Performance</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Recent posts and latest Ayrshare metrics snapshot per post.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-zinc-400 hover:text-white"
        >
          ← Dashboard
        </Link>
      </div>
      <Suspense
        fallback={<p className="text-sm text-zinc-500">Loading…</p>}
      >
        <PerformanceClient />
      </Suspense>
    </div>
  );
}
