import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ADMIN_EMAIL = "eddie@bannermanmenson.com";


export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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

  return NextResponse.json({ users, workspaces, runs, posts });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { workspaceId, plan } = await req.json() as { workspaceId: string; plan: string };
  const updated = await prisma.workspace.update({ where: { id: workspaceId }, data: { plan: plan as "FREE" | "PRO" | "ENTERPRISE" } });
  return NextResponse.json({ ok: true, plan: updated.plan });
}
