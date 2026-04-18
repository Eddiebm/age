import { randomBytes } from "crypto";
import { prisma } from "./db";
import type { MemberRole } from "@prisma/client";

const INVITE_DAYS = Number(process.env.AGE_INVITE_EXPIRY_DAYS ?? "14");

export function newInviteToken(): string {
  return randomBytes(24).toString("hex");
}

export async function createWorkspaceInvite(params: {
  workspaceId: string;
  createdById: string;
  email?: string | null;
  role: MemberRole;
}) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_DAYS);

  return prisma.workspaceInvite.create({
    data: {
      workspaceId: params.workspaceId,
      createdById: params.createdById,
      email: params.email?.trim() || null,
      role: params.role,
      token: newInviteToken(),
      expiresAt,
    },
  });
}
