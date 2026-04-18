import { prisma } from "./db";
import { strategyAgent } from "./agents/strategyAgent";
import { contentAgent } from "./agents/contentAgent";
import { scoringAgent } from "./agents/scoringAgent";
import { enqueuePublishJobs } from "./queue";

function mustApproveWorkspace(requireApproval: boolean): boolean {
  if (process.env.AGE_REQUIRE_APPROVAL === "true") return true;
  return requireApproval;
}

export async function runSystem(params: {
  workspaceId: string;
  topic: string;
}): Promise<{ runId: string }> {
  const { workspaceId, topic } = params;

  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
  });

  const approve = mustApproveWorkspace(workspace.requireApproval);

  const run = await prisma.engineRun.create({
    data: {
      workspaceId,
      topic,
      status: "running",
    },
  });

  try {
    const strategy = await strategyAgent(topic);
    const posts = await contentAgent(strategy);

    const scored = posts.map((post) => ({
      post,
      score: scoringAgent(post),
    }));

    const best = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const initialStatus = approve ? "pending_approval" : "queued";

    const created = await prisma.$transaction(async (tx) => {
      const rows = [];
      for (const x of best) {
        const row = await tx.generatedPost.create({
          data: {
            runId: run.id,
            body: x.post,
            score: x.score,
            status: initialStatus,
          },
        });
        rows.push(row);
      }
      return rows;
    });

    if (!approve) {
      await enqueuePublishJobs(
        created.map((c) => ({
          postId: c.id,
          workspaceId,
          body: c.body,
        })),
      );
    }

    await prisma.engineRun.update({
      where: { id: run.id },
      data: { status: "completed" },
    });

    return { runId: run.id };
  } catch (e) {
    await prisma.engineRun.update({
      where: { id: run.id },
      data: { status: "failed" },
    });
    throw e;
  }
}
