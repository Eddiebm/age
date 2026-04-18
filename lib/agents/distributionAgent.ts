import axios from "axios";

export type DistributionResult = {
  /** Ayrshare top-level post id from /api/post response */
  ayrsharePostId?: string;
  skipped?: boolean;
};

export async function distributionAgent(
  post: string,
): Promise<DistributionResult> {
  const key = process.env.AYRSHARE_API_KEY;

  console.log("[distribution] posting:", post.slice(0, 120));

  if (!key) {
    console.warn(
      "[distribution] AYRSHARE_API_KEY not set; skipping live publish (dev mode).",
    );
    return { skipped: true };
  }

  const res = await axios.post<Record<string, unknown>>(
    "https://api.ayrshare.com/api/post",
    { post, platforms: ["linkedin", "twitter"] },
    {
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (res.status >= 400) {
    throw new Error(
      `Ayrshare error ${res.status}: ${JSON.stringify(res.data).slice(0, 500)}`,
    );
  }

  const id =
    typeof res.data?.id === "string"
      ? res.data.id
      : typeof (res.data as { postId?: string })?.postId === "string"
        ? (res.data as { postId: string }).postId
        : undefined;

  return { ayrsharePostId: id };
}
