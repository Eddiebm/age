export function scoringAgent(post: string): number {
  let score = 0;

  if (post.includes("?")) score += 10;
  if (post.toLowerCase().includes("you")) score += 20;
  if (post.length < 200) score += 10;

  return score;
}
