import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { LoginButtons } from "./login-buttons";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  const hasGoogle =
    !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
  const hasGitHub = !!process.env.GITHUB_ID && !!process.env.GITHUB_SECRET;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold text-white">Sign in</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Use your workspace for internal runs and customer accounts.
        </p>
      </div>

      {!hasGoogle && !hasGitHub ? (
        <p className="rounded-lg border border-amber-900/60 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">
          Configure{" "}
          <code className="text-xs">GOOGLE_CLIENT_ID</code> /{" "}
          <code className="text-xs">GITHUB_ID</code> in{" "}
          <code className="text-xs">.env</code>, then restart the app.
        </p>
      ) : (
        <LoginButtons hasGoogle={hasGoogle} hasGitHub={hasGitHub} />
      )}

      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
        ← Back home
      </Link>
    </main>
  );
}
