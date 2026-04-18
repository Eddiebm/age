import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await context.params;
  const body = (await req.json()) as {
    requireApproval?: boolean;
    name?: string;
  };

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

  const data: { requireApproval?: boolean; name?: string } = {};
  if (typeof body.requireApproval === "boolean") {
    data.requireApproval = body.requireApproval;
  }
  if (typeof body.name === "string" && body.name.trim()) {
    data.name = body.name.trim();
  }

  if (Object.keys(data).length === 0) {
    return Response.json({ error: "No valid fields" }, { status: 400 });
  }

  const ws = await prisma.workspace.update({
    where: { id: workspaceId },
    data,
  });

  return Response.json({
    id: ws.id,
    name: ws.name,
    requireApproval: ws.requireApproval,
  });
}
