import "dotenv/config";
import { Worker } from "bullmq";
import { createRedisConnection } from "./queue";
import { distributionAgent } from "./agents/distributionAgent";

const connection = createRedisConnection();

const worker = new Worker(
  "posts",
  async (job) => {
    const post = job.data.post as string;
    await distributionAgent(post);
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
