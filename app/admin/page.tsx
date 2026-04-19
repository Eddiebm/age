import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminClient } from "./admin-client";


const ADMIN_EMAIL = "eddie@bannermanmenson.com";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== ADMIN_EMAIL) redirect("/login");

  const [users, workspaces, runs, posts] = await Promise.all([
    prisma.user.findMany({
      orderBy: { id: "desc" },
      include: { accounts: { select: { provider: true } }, memberships: { select: { role: true, workspaceId: true } } },
    }),
    prisma.workspace.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        members: { include: { user: { select: { email: true, name: true } } } },
        _count: { select: { runs: true } },
      },
    }),
    prisma.engineRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        workspace: { select: { name: true, slug: true } },
        _count: { select: { posts: true } },
      },
    }),
    prisma.generatedPost.findMany({
      orderBy: { id: "desc" },
      take: 500,
      include: {
        run: { select: { workspaceId: true, topic: true } },
        metrics: { select: { impressions: true, engagement: true } },
      },
    }),
  ]);

  return <AdminClient users={JSON.parse(JSON.stringify(users))} workspaces={JSON.parse(JSON.stringify(workspaces))} runs={JSON.parse(JSON.stringify(runs))} posts={JSON.parse(JSON.stringify(posts))} />;
}
