import axios from "axios";
import { imageAgent, platformRequiresMedia } from "./imageAgent";

export type DistributionResult = {
  ayrsharePostId?: string;
  skipped?: boolean;
};

type ZernioTarget = { platform: string; accountId: string };

function extractZernioPostId(data: Record<string, unknown>): string | undefined {
  const post = data.post as Record<string, unknown> | undefined;
  const fromPost = post?._id ?? post?.id;
  if (typeof fromPost === "string") return fromPost;
  if (typeof data._id === "string") return data._id;
  if (typeof data.id === "string") return data.id;
  return undefined;
}

async function postToZernio(
  payload: Record<string, unknown>,
  key: string,
  base: string,
): Promise<DistributionResult> {
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

  return { ayrsharePostId: extractZernioPostId(res.data ?? {}) };
}

async function distributeZernio(post: string): Promise<DistributionResult> {
  const key = process.env.ZERNIO_API_KEY!.trim();
  const base = process.env.ZERNIO_API_BASE?.trim() || "https://zernio.com/api/v1";
  const profileId = process.env.ZERNIO_PROFILE_ID?.trim();
  const targetsJson = process.env.ZERNIO_TARGETS_JSON?.trim();

  if (targetsJson) {
    let targets: unknown;
    try {
      targets = JSON.parse(targetsJson);
    } catch {
      throw new Error("ZERNIO_TARGETS_JSON must be valid JSON");
    }
    if (!Array.isArray(targets) || targets.length === 0) {
      throw new Error("ZERNIO_TARGETS_JSON must be a non-empty array of { platform, accountId }");
    }

    const textTargets = (targets as ZernioTarget[]).filter(t => !platformRequiresMedia(t.platform));
    const mediaTargets = (targets as ZernioTarget[]).filter(t => platformRequiresMedia(t.platform));

    const jobs: Promise<DistributionResult>[] = [];

    if (textTargets.length > 0) {
      jobs.push(postToZernio({ content: post, platforms: textTargets, publishNow: true }, key, base));
    }

    if (mediaTargets.length > 0) {
      jobs.push(
        imageAgent(post)
          .then(imageUrl =>
            postToZernio({ content: post, platforms: mediaTargets, mediaUrls: [imageUrl], publishNow: true }, key, base)
          )
          .catch(err => {
            console.error("[distribution] image generation failed, skipping media platforms:", err.message);
            return { skipped: true } as DistributionResult;
          })
      );
    }

    const settled = await Promise.allSettled(jobs);
    const firstSuccess = settled.find(
      (r): r is PromiseFulfilledResult<DistributionResult> =>
        r.status === "fulfilled" && !r.value.skipped,
    );
    if (firstSuccess) return firstSuccess.value;
    const firstFail = settled.find(r => r.status === "rejected") as PromiseRejectedResult | undefined;
    if (firstFail) throw firstFail.reason;
    return { skipped: true };

  } else if (profileId) {
    return postToZernio({ content: post, queuedFromProfile: profileId, publishNow: true }, key, base);
  } else {
    console.warn("[distribution] ZERNIO_API_KEY set but need ZERNIO_PROFILE_ID or ZERNIO_TARGETS_JSON; skipping.");
    return { skipped: true };
  }
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

export async function distributionAgent(post: string): Promise<DistributionResult> {
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

  console.warn("[distribution] Neither ZERNIO_API_KEY nor AYRSHARE_API_KEY set; skipping live publish (dev mode).");
  return { skipped: true };
}
