"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-md border border-zinc-700 px-3 py-1 text-zinc-300 hover:bg-zinc-900"
    >
      Sign out
    </button>
  );
}
