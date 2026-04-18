import axios from "axios";

export async function distributionAgent(post: string): Promise<void> {
  const key = process.env.AYRSHARE_API_KEY;

  console.log("[distribution] posting:", post.slice(0, 120));

  if (!key) {
    console.warn(
      "[distribution] AYRSHARE_API_KEY not set; skipping live publish (dev mode).",
    );
    return;
  }

  const res = await axios.post<unknown>(
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
}
