import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  _req: Request,
  context: { params: Promise<{ token: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await context.params;

  const invite = await prisma.workspaceInvite.findUnique({
    where: { token },
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

  if (invite.email && session.user.email) {
    if (invite.email.toLowerCase() !== session.user.email.toLowerCase()) {
      return Response.json(
        { error: "Sign in with the invited email address." },
        { status: 403 },
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: invite.workspaceId,
          userId: session.user!.id,
        },
      },
      create: {
        workspaceId: invite.workspaceId,
        userId: session.user!.id,
        role: invite.role,
      },
      update: {},
    });

    await tx.workspaceInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
  });

  return Response.json({ ok: true, workspaceId: invite.workspaceId });
}
