import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureDefaultWorkspace } from "@/lib/workspace";
import { prisma } from "@/lib/db";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  await ensureDefaultWorkspace(session.user.id);

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: session.user.id },
    include: {
      workspace: { include: { subscription: true } },
    },
    orderBy: { workspace: { createdAt: "asc" } },
  });

  const workspaces = memberships.map((m) => ({
    id: m.workspace.id,
    name: m.workspace.name,
    slug: m.workspace.slug,
    plan: m.workspace.plan,
    role: m.role,
    stripeCustomerId: m.workspace.stripeCustomerId,
    subscription: m.workspace.subscription
      ? {
          status: m.workspace.subscription.status,
          currentPeriodEnd:
            m.workspace.subscription.currentPeriodEnd?.toISOString() ?? null,
        }
      : null,
  }));

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Pick a workspace, run the engine, upgrade for unlimited runs.
      </p>
      <DashboardClient workspaces={workspaces} />
    </div>
  );
}
