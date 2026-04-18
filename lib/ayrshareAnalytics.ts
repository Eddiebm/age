import axios from "axios";

export type AyrshareMetrics = {
  impressions: number;
  engagement: number;
  raw?: unknown;
};

/**
 * Fetches per-post analytics from Ayrshare using the top-level post id from /api/post.
 * @see https://docs.ayrshare.com/apis/analytics/post
 */
export async function fetchAyrsharePostAnalytics(
  ayrsharePostId: string,
): Promise<AyrshareMetrics> {
  const key = process.env.AYRSHARE_API_KEY;
  if (!key) {
    return { impressions: 0, engagement: 0 };
  }

  const res = await axios.post<Record<string, unknown>>(
    "https://api.ayrshare.com/api/analytics/post",
    {
      id: ayrsharePostId,
      platforms: ["linkedin", "twitter"],
    },
    {
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      validateStatus: () => true,
    },
  );

  if (res.status >= 400) {
    console.warn(
      "[ayrshare analytics]",
      res.status,
      JSON.stringify(res.data).slice(0, 300),
    );
    return { impressions: 0, engagement: 0, raw: res.data };
  }

  return summarizeAnalyticsPayload(res.data);
}

function summarizeAnalyticsPayload(data: Record<string, unknown>): AyrshareMetrics {
  let impressions = 0;
  let engagement = 0;

  const platforms = [
    data.linkedin,
    data.twitter,
    data.x,
    data.facebook,
    data.instagram,
  ].filter(Boolean) as Record<string, unknown>[];

  for (const p of platforms) {
    const analytics = (p.analytics as Record<string, unknown>) ?? p;
    const imp =
      num(analytics.impressionCount) ??
      num(analytics.impressions) ??
      num(analytics.impressionsUnique) ??
      num(analytics.viewsCount) ??
      num(analytics.impressionCount);
    const eng =
      num(analytics.engagement) ??
      num(analytics.engagementCount) ??
      (num(analytics.likeCount) ?? 0) +
        (num(analytics.commentCount) ?? 0) +
        (num(analytics.shareCount) ?? 0);

    impressions += imp ?? 0;
    engagement += eng ?? 0;
  }

  if (impressions === 0 && engagement === 0 && typeof data === "object") {
    for (const v of Object.values(data)) {
      if (v && typeof v === "object") {
        const o = v as Record<string, unknown>;
        const nested = (o.analytics as Record<string, unknown>) ?? o;
        impressions += num(nested.impressionCount) ?? num(nested.viewsCount) ?? 0;
        engagement +=
          num(nested.engagement) ?? num(nested.engagementCount) ?? 0;
      }
    }
  }

  return {
    impressions: Math.round(impressions),
    engagement: engagement > 0 ? Math.min(1, engagement / (impressions || 1)) : 0,
    raw: data,
  };
}

function num(v: unknown): number | undefined {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  return undefined;
}
