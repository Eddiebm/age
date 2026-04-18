import type { PostMetrics } from "./agents/analyticsAgent";

export function optimizer(
  posts: string[],
  metrics: PostMetrics[],
): string[] {
  return posts.filter((_, i) => {
    const m = metrics[i];
    return m && m.engagement > 0.5;
  });
}
