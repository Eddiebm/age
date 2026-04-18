import "dotenv/config";
import { Worker } from "bullmq";
import { createRedisConnection } from "./queue";
import type { PublishJob } from "./queue";
import { distributionAgent } from "./agents/distributionAgent";
import { prisma } from "./db";
import { analyticsAgent } from "./agents/analyticsAgent";

const connection = createRedisConnection();

const worker = new Worker(
  "posts",
  async (job) => {
    const { postId, body } = job.data as PublishJob;
    try {
      const dist = await distributionAgent(body);

      if (dist.skipped) {
        await prisma.generatedPost.update({
          where: { id: postId },
          data: { status: "skipped" },
        });
        return;
      }

      await prisma.generatedPost.update({
        where: { id: postId },
        data: {
          status: "published",
          ayrsharePostId: dist.ayrsharePostId ?? null,
        },
      });

      const m = await analyticsAgent(postId, dist.ayrsharePostId);
      await prisma.postMetric.create({
        data: {
          postId,
          impressions: Math.round(m.impressions),
          engagement: m.engagement,
        },
      });
    } catch (e) {
      await prisma.generatedPost.update({
        where: { id: postId },
        data: { status: "failed" },
      });
      throw e;
    }
  },
  { connection },
);

worker.on("failed", (job, err) => {
  console.error("[worker] job failed", job?.id, err);
});

worker.on("completed", (job) => {
  console.log("[worker] completed", job.id);
});

function shutdown(): void {
  void worker.close().then(() => connection.quit());
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log("[worker] listening on queue: posts");
