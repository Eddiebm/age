import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  const invite = await prisma.workspaceInvite.findUnique({
    where: { token },
    include: { workspace: true },
  });

  if (!invite) {
    return Response.json({ error: "Invalid invite" }, { status: 404 });
  }

  if (invite.acceptedAt) {
    return Response.json({ error: "Invite already used" }, { status: 410 });
  }

  if (invite.expiresAt.getTime() < Date.now()) {
    return Response.json({ error: "Invite expired" }, { status: 410 });
  }

  return Response.json({
    workspaceName: invite.workspace.name,
    role: invite.role,
    email: invite.email,
  });
}
