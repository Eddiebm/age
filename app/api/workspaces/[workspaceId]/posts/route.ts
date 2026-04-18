import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  req: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await context.params;
  const { searchParams } = new URL(req.url);
  const take = Math.min(
    50,
    Math.max(1, Number(searchParams.get("limit") ?? "20")),
  );

  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId: session.user.id },
  });

  if (!member) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const posts = await prisma.generatedPost.findMany({
    where: { run: { workspaceId } },
    orderBy: { id: "desc" },
    take,
    include: {
      run: { select: { id: true, topic: true, createdAt: true } },
      metrics: { orderBy: { capturedAt: "desc" }, take: 1 },
    },
  });

  return Response.json({
    posts: posts.map((p) => ({
      id: p.id,
      body: p.body.slice(0, 500),
      score: p.score,
      status: p.status,
      ayrsharePostId: p.ayrsharePostId,
      run: p.run,
      latestMetric: p.metrics[0]
        ? {
            impressions: p.metrics[0].impressions,
            engagement: p.metrics[0].engagement,
            capturedAt: p.metrics[0].capturedAt.toISOString(),
          }
        : null,
    })),
  });
}
