import { prisma } from "./db";
import { enqueuePublishJobs } from "./queue";

export async function approveRunAndEnqueue(params: {
  runId: string;
  userId: string;
}): Promise<{ enqueued: number }> {
  const { runId, userId } = params;

  const run = await prisma.engineRun.findUnique({
    where: { id: runId },
    include: {
      posts: true,
      workspace: {
        include: {
          members: { where: { userId } },
        },
      },
    },
  });

  if (!run) {
    throw new Error("Run not found");
  }

  const member = run.workspace.members[0];
  if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
    throw new Error("Forbidden");
  }

  const pending = run.posts.filter((p) => p.status === "pending_approval");
  if (pending.length === 0) {
    return { enqueued: 0 };
  }

  await prisma.$transaction(async (tx) => {
    for (const p of pending) {
      await tx.generatedPost.update({
        where: { id: p.id },
        data: { status: "queued" },
      });
    }
  });

  await enqueuePublishJobs(
    pending.map((c) => ({
      postId: c.id,
      workspaceId: run.workspaceId,
      body: c.body,
    })),
  );

  return { enqueued: pending.length };
}
