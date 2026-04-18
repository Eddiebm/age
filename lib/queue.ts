import { Queue } from "bullmq";
import IORedis from "ioredis";

function requireRedisUrl(): string {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error(
      "REDIS_URL is not set. Point it at a Redis instance (Railway, Upstash, etc.).",
    );
  }
  return url;
}

export function createRedisConnection(): IORedis {
  return new IORedis(requireRedisUrl(), {
    maxRetriesPerRequest: null,
  });
}

const globalForQueue = globalThis as unknown as {
  __ageQueue?: Queue;
  __ageRedis?: IORedis;
};

export function getQueue(): Queue {
  if (globalForQueue.__ageQueue) return globalForQueue.__ageQueue;

  const connection = createRedisConnection();
  globalForQueue.__ageRedis = connection;
  globalForQueue.__ageQueue = new Queue("posts", { connection });
  return globalForQueue.__ageQueue;
}

export async function enqueue(posts: string[]): Promise<void> {
  const queue = getQueue();
  for (const post of posts) {
    await queue.add("publish", { post });
  }
}
