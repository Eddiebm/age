import axios from "axios";

export type DistributionResult = {
  /**
   * External publish id: Ayrshare post id, or Zernio post `_id` (same DB column).
   */
  ayrsharePostId?: string;
  skipped?: boolean;
};

function extractZernioPostId(data: Record<string, unknown>): string | undefined {
  const post = data.post as Record<string, unknown> | undefined;
  const fromPost = post?._id ?? post?.id;
  if (typeof fromPost === "string") return fromPost;
  if (typeof data._id === "string") return data._id;
  if (typeof data.id === "string") return data.id;
  return undefined;
}

async function distributeZernio(post: string): Promise<DistributionResult> {
  const key = process.env.ZERNIO_API_KEY!.trim();
  const base =
    process.env.ZERNIO_API_BASE?.trim() || "https://zernio.com/api/v1";
  const profileId = process.env.ZERNIO_PROFILE_ID?.trim();
  const targetsJson = process.env.ZERNIO_TARGETS_JSON?.trim();

  let payload: Record<string, unknown>;

  if (targetsJson) {
    let platforms: unknown;
    try {
      platforms = JSON.parse(targetsJson) as unknown;
    } catch {
      throw new Error("ZERNIO_TARGETS_JSON must be valid JSON");
    }
    if (!Array.isArray(platforms) || platforms.length === 0) {
      throw new Error(
        "ZERNIO_TARGETS_JSON must be a non-empty array of { platform, accountId }",
      );
    }
    payload = {
      content: post,
      platforms,
      publishNow: true,
    };
  } else if (profileId) {
    payload = {
      content: post,
      queuedFromProfile: profileId,
      publishNow: true,
    };
  } else {
    console.warn(
      "[distribution] ZERNIO_API_KEY set but need ZERNIO_PROFILE_ID or ZERNIO_TARGETS_JSON; skipping.",
    );
    return { skipped: true };
  }

  const res = await axios.post<Record<string, unknown>>(
    `${base.replace(/\/$/, "")}/posts`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      validateStatus: () => true,
    },
  );

  if (res.status < 200 || res.status >= 300) {
    throw new Error(
      `Zernio error ${res.status}: ${JSON.stringify(res.data).slice(0, 800)}`,
    );
  }

  const id = extractZernioPostId(res.data ?? {});
  return { ayrsharePostId: id };
}

async function distributeAyrshare(post: string): Promise<DistributionResult> {
  const key = process.env.AYRSHARE_API_KEY!;

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

export async function distributionAgent(
  post: string,
): Promise<DistributionResult> {
  console.log("[distribution] posting:", post.slice(0, 120));

  const zernioKey = process.env.ZERNIO_API_KEY?.trim();
  if (zernioKey) {
    console.log("[distribution] using Zernio");
    return distributeZernio(post);
  }

  const ayrshareKey = process.env.AYRSHARE_API_KEY?.trim();
  if (ayrshareKey) {
    console.log("[distribution] using Ayrshare");
    return distributeAyrshare(post);
  }

  console.warn(
    "[distribution] Neither ZERNIO_API_KEY nor AYRSHARE_API_KEY set; skipping live publish (dev mode).",
  );
  return { skipped: true };
}
