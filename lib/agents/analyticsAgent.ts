import { fetchAyrsharePostAnalytics } from "@/lib/ayrshareAnalytics";

export type PostMetrics = {
  impressions: number;
  engagement: number;
};

/**
 * When `ayrsharePostId` is set, pulls real analytics from Ayrshare; otherwise stub.
 */
export async function analyticsAgent(
  _postId: string,
  ayrsharePostId?: string | null,
): Promise<PostMetrics> {
  if (ayrsharePostId) {
    const m = await fetchAyrsharePostAnalytics(ayrsharePostId);
    return {
      impressions: m.impressions,
      engagement: m.engagement,
    };
  }

  return {
    impressions: Math.round(Math.random() * 1000),
    engagement: Math.random(),
  };
}
