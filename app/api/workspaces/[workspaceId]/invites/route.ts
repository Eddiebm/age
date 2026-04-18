import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createWorkspaceInvite } from "@/lib/invites";
import type { MemberRole } from "@prisma/client";

export async function POST(
  req: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await context.params;
  const body = (await req.json()) as {
    email?: string;
    role?: MemberRole;
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

  const role = body.role ?? "MEMBER";
  if (!["MEMBER", "ADMIN"].includes(role)) {
    return Response.json({ error: "Invalid role" }, { status: 400 });
  }

  const invite = await createWorkspaceInvite({
    workspaceId,
    createdById: session.user.id,
    email: body.email,
    role,
  });

  const base = process.env.NEXTAUTH_URL ?? "";
  const inviteUrl = `${base.replace(/\/$/, "")}/invite/${invite.token}`;

  return Response.json({
    id: invite.id,
    token: invite.token,
    inviteUrl,
    expiresAt: invite.expiresAt.toISOString(),
  });
}
