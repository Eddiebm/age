import { RateLimiterRedis } from "rate-limiter-flexible";
import { createRedisConnection } from "./queue";

const points = Number(process.env.AGE_API_RUN_POINTS_PER_MINUTE ?? "20");
const duration = 60;

let limiter: RateLimiterRedis | null = null;

function getLimiter(): RateLimiterRedis {
  if (!limiter) {
    limiter = new RateLimiterRedis({
      storeClient: createRedisConnection(),
      keyPrefix: "age_rl_run",
      points,
      duration,
    });
  }
  return limiter;
}

/**
 * Per-user throttle for /api/run. Throws Error with message when rate limited.
 */
export async function assertRunRateLimit(userId: string): Promise<void> {
  try {
    await getLimiter().consume(userId, 1);
  } catch {
    throw new Error(
      `Too many engine runs. Try again in a minute (limit ${points}/min).`,
    );
  }
}
