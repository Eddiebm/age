import { prisma } from "./db";
import { strategyAgent } from "./agents/strategyAgent";
import { contentAgent } from "./agents/contentAgent";
import { scoringAgent } from "./agents/scoringAgent";
import { enqueuePublishJobs } from "./queue";

export async function runSystem(params: {
  workspaceId: string;
  topic: string;
}): Promise<{ runId: string }> {
  const { workspaceId, topic } = params;

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

    const created = await prisma.$transaction(async (tx) => {
      const rows = [];
      for (const x of best) {
        const row = await tx.generatedPost.create({
          data: {
            runId: run.id,
            body: x.post,
            score: x.score,
            status: "queued",
          },
        });
        rows.push(row);
      }
      return rows;
    });

    await enqueuePublishJobs(
      created.map((c) => ({
        postId: c.id,
        workspaceId,
        body: c.body,
      })),
    );

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
