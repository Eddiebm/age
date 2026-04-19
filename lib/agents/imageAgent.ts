import OpenAI from "openai";

const MEDIA_REQUIRED = new Set(["instagram", "tiktok"]);

export function platformRequiresMedia(platform: string): boolean {
  return MEDIA_REQUIRED.has(platform);
}

async function generateViaOpenAI(prompt: string): Promise<string> {
  console.log("[image] using DALL-E 3 (OpenAI)");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY!.trim() });
  const res = await client.images.generate({
    model: "dall-e-3",
    prompt,
    n: 1,
    size: "1024x1024",
    response_format: "url",
  });
  const url = res.data?.[0]?.url;
  if (!url) throw new Error("DALL-E 3 returned no URL");
  return url;
}

async function generateViaReplicate(prompt: string): Promise<string> {
  const model = process.env.IMAGE_MODEL?.trim() || "black-forest-labs/flux-pro";
  console.log(`[image] using Flux Pro (Replicate / ${model})`);
  const apiKey = process.env.REPLICATE_API_KEY!.trim();

  const startRes = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: { prompt, width: 1024, height: 1024 },
    }),
  });

  if (!startRes.ok) {
    const err = await startRes.text();
    throw new Error(`Replicate start failed ${startRes.status}: ${err.slice(0, 200)}`);
  }

  const prediction = await startRes.json() as { id: string; urls: { get: string } };
  const pollUrl = prediction.urls.get;

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const pollRes = await fetch(pollUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const result = await pollRes.json() as { status: string; output?: string | string[]; error?: string };

    if (result.status === "succeeded") {
      const output = Array.isArray(result.output) ? result.output[0] : result.output;
      if (!output) throw new Error("Replicate returned no output URL");
      return output;
    }
    if (result.status === "failed") {
      throw new Error(`Replicate prediction failed: ${result.error ?? "unknown"}`);
    }
  }

  throw new Error("Replicate prediction timed out after 60s");
}

export async function imageAgent(postText: string): Promise<string> {
  const prompt = `A professional, visually striking social media image for: "${postText.slice(0, 200)}". Modern style, vibrant colours, no text overlays.`;

  const forceModel = process.env.IMAGE_MODEL?.trim().toLowerCase();
  const hasOpenAI = !!process.env.OPENAI_API_KEY?.trim();
  const hasReplicate = !!process.env.REPLICATE_API_KEY?.trim();

  if (forceModel === "dall-e-3" || forceModel === "openai") {
    if (!hasOpenAI) throw new Error("IMAGE_MODEL=dall-e-3 but OPENAI_API_KEY is not set");
    return generateViaOpenAI(prompt);
  }
  if (forceModel === "replicate" || forceModel?.startsWith("black-forest-labs")) {
    if (!hasReplicate) throw new Error("IMAGE_MODEL=replicate but REPLICATE_API_KEY is not set");
    return generateViaReplicate(prompt);
  }

  // Auto: prefer Replicate (cheaper), fall back to OpenAI
  if (hasReplicate) return generateViaReplicate(prompt);
  if (hasOpenAI) return generateViaOpenAI(prompt);

  throw new Error("Set REPLICATE_API_KEY (Flux Pro) or OPENAI_API_KEY (DALL-E 3) for image generation");
}
