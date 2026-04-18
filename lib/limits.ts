import { prisma } from "./db";
import type { Plan } from "@prisma/client";

const FREE_RUNS_PER_MONTH = Number(
  process.env.AGE_FREE_RUNS_PER_MONTH ?? "10",
);

export async function assertCanRunEngine(
  workspaceId: string,
  plan: Plan,
): Promise<void> {
  if (plan !== "FREE") return;

  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const count = await prisma.engineRun.count({
    where: { workspaceId, createdAt: { gte: start } },
  });

  if (count >= FREE_RUNS_PER_MONTH) {
    throw new Error(
      `Free plan limit reached (${FREE_RUNS_PER_MONTH} engine runs per month). Upgrade to Pro.`,
    );
  }
}
