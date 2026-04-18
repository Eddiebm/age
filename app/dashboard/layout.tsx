import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { SignOutButton } from "./sign-out-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-semibold text-white">
            AGE
          </Link>
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-zinc-300"
          >
            Home
          </Link>
        </div>
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <span className="hidden sm:inline">{session.user.email}</span>
          <SignOutButton />
        </div>
      </header>
      {children}
    </div>
  );
}
