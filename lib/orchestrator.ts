import { strategyAgent } from "./agents/strategyAgent";
import { contentAgent } from "./agents/contentAgent";
import { scoringAgent } from "./agents/scoringAgent";
import { enqueue } from "./queue";

export async function runSystem(topic: string): Promise<void> {
  const strategy = await strategyAgent(topic);

  const posts = await contentAgent(strategy);

  const scored = posts.map((post) => ({
    post,
    score: scoringAgent(post),
  }));

  const best = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((x) => x.post);

  await enqueue(best);
}
