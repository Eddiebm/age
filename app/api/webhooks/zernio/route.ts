import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ZernioPlatformResult = {
  platform: string;
  status: string;
  publishedUrl?: string;
  platformPostId?: string;
};

type ZernioWebhookPayload = {
  event?: string;
  post?: {
    id?: string;
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

  const zernioPostId = body?.post?.id;
  const platforms = body?.post?.platforms;

  if (!zernioPostId || !Array.isArray(platforms)) {
    return Response.json({ received: true, skipped: "no post id or platforms" });
  }

  const platformUrls = platforms
    .filter(p => p.publishedUrl)
    .map(p => ({
      platform: p.platform,
      url: p.publishedUrl!,
      status: p.status,
      platformPostId: p.platformPostId ?? null,
    }));

  if (platformUrls.length === 0) {
    return Response.json({ received: true, skipped: "no platform urls" });
  }

  await prisma.generatedPost.updateMany({
    where: { ayrsharePostId: zernioPostId },
    data: { platformUrls },
  });

  return Response.json({ received: true, saved: platformUrls.length });
}
