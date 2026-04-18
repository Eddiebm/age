import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: session.user.id },
    include: {
      workspace: {
        include: { subscription: true },
      },
    },
    orderBy: { workspace: { createdAt: "asc" } },
  });

  return Response.json({
    workspaces: memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      plan: m.workspace.plan,
      requireApproval: m.workspace.requireApproval,
      role: m.role,
      stripeCustomerId: m.workspace.stripeCustomerId,
      subscription: m.workspace.subscription
        ? {
            status: m.workspace.subscription.status,
            currentPeriodEnd: m.workspace.subscription.currentPeriodEnd,
          }
        : null,
    })),
  });
}
