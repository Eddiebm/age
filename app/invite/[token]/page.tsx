import Link from "next/link";
import { Suspense } from "react";
import { InviteClient } from "./invite-client";

export default function InvitePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <InviteClient />
      </Suspense>
      <Link href="/" className="mt-8 text-sm text-zinc-500 hover:text-zinc-300">
        ← Home
      </Link>
    </main>
  );
}
