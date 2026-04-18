import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { syncWorkspaceMetrics } from "@/lib/metricsSync";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = (await req.json()) as { workspaceId?: string };
  if (!workspaceId) {
    return Response.json({ error: "workspaceId required" }, { status: 400 });
  }

  const member = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId: session.user.id,
      role: { in: ["OWNER", "ADMIN"] },
    },
  });

  if (!member) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await syncWorkspaceMetrics(workspaceId);
  return Response.json(result);
}
