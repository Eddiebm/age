import OpenAI from "openai";

const MEDIA_REQUIRED = new Set(["instagram", "tiktok"]);

export function platformRequiresMedia(platform: string): boolean {
  return MEDIA_REQUIRED.has(platform);
}

export async function imageAgent(postText: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY required for image generation");

  const client = new OpenAI({ apiKey });
  const prompt = `A professional, visually striking social media image for: "${postText.slice(0, 200)}". Modern style, vibrant colours, no text overlays.`;

  const res = await client.images.generate({
    model: process.env.OPENAI_IMAGE_MODEL?.trim() || "dall-e-3",
    prompt,
    n: 1,
    size: "1024x1024",
    response_format: "url",
  });

  const url = res.data[0]?.url;
  if (!url) throw new Error("Image generation returned no URL");
  return url;
}
