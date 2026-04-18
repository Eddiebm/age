import { prisma } from "./db";
import { fetchAyrsharePostAnalytics } from "./ayrshareAnalytics";

/**
 * Pulls latest Ayrshare analytics for posts that have `ayrsharePostId` in a workspace.
 */
export async function syncWorkspaceMetrics(workspaceId: string): Promise<{
  updated: number;
}> {
  const posts = await prisma.generatedPost.findMany({
    where: {
      ayrsharePostId: { not: null },
      run: { workspaceId },
    },
    select: { id: true, ayrsharePostId: true },
  });

  let updated = 0;
  for (const p of posts) {
    if (!p.ayrsharePostId) continue;
    const m = await fetchAyrsharePostAnalytics(p.ayrsharePostId);
    await prisma.postMetric.create({
      data: {
        postId: p.id,
        impressions: Math.round(m.impressions),
        engagement: m.engagement,
      },
    });
    updated += 1;
  }

  return { updated };
}
