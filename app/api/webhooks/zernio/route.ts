import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ZernioPlatformResult = {
  platform: string;
  status: string;
  platformPostUrl?: string;
  publishedAt?: string;
};

type ZernioWebhookPayload = {
  event?: string;
  post?: {
    _id?: string;
    status?: string;
    platforms?: ZernioPlatformResult[];
  };
};

export async function POST(req: Request) {
  let body: ZernioWebhookPayload;
  try {
    body = await req.json() as ZernioWebhookPayload;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const zernioPostId = body?.post?._id;
  const platforms = body?.post?.platforms;

  if (!zernioPostId || !Array.isArray(platforms)) {
    return Response.json({ received: true, skipped: "no post id or platforms" });
  }

  const platformUrls = platforms
    .filter(p => p.platformPostUrl)
    .map(p => ({
      platform: p.platform,
      url: p.platformPostUrl!,
      status: p.status,
      publishedAt: p.publishedAt ?? null,
    }));

  if (platformUrls.length === 0) {
    return Response.json({ received: true, skipped: "no platform urls" });
  }

  await prisma.generatedPost.updateMany({
    where: { ayrsharePostId: zernioPostId },
    data: { platformUrls },
  });

  console.log(`[zernio webhook] saved ${platformUrls.length} platform URLs for post ${zernioPostId}`);
  return Response.json({ received: true, saved: platformUrls.length });
}
