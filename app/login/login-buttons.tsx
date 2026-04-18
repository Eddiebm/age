"use client";

import { signIn } from "next-auth/react";

export function LoginButtons({
  hasGoogle,
  hasGitHub,
}: {
  hasGoogle: boolean;
  hasGitHub: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      {hasGoogle ? (
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Continue with Google
        </button>
      ) : null}
      {hasGitHub ? (
        <button
          type="button"
          onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Continue with GitHub
        </button>
      ) : null}
    </div>
  );
}
