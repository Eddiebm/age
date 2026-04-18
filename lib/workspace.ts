import { prisma } from "./db";
import { slugify } from "./slug";

export async function ensureDefaultWorkspace(userId: string) {
  const existing = await prisma.workspaceMember.findFirst({
    where: { userId },
    include: { workspace: true },
  });
  if (existing) return existing.workspace;

  const base = slugify(`ws-${userId.slice(0, 8)}`);
  let slug = base;
  let n = 0;
  while (await prisma.workspace.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }

  return prisma.workspace.create({
    data: {
      name: "My workspace",
      slug,
      plan: "FREE",
      members: {
        create: { userId, role: "OWNER" },
      },
    },
  });
}

export async function getMembership(userId: string, workspaceId: string) {
  return prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId },
    },
    include: { workspace: true },
  });
}
