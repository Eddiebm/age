import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await context.params;

  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId: session.user.id },
  });

  if (!member) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const runs = await prisma.engineRun.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    take: 15,
    include: {
      posts: {
        where: { status: "pending_approval" },
        select: { id: true },
      },
    },
  });

  return Response.json({
    runs: runs.map((r) => ({
      id: r.id,
      topic: r.topic,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      pendingCount: r.posts.length,
    })),
  });
}
