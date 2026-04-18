export type PostMetrics = {
  impressions: number;
  engagement: number;
};

export async function analyticsAgent(_postId: string): Promise<PostMetrics> {
  return {
    impressions: Math.random() * 1000,
    engagement: Math.random(),
  };
}
