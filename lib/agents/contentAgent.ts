import { createChatClient } from "@/lib/llm";

function splitPosts(raw: string): string[] {
  const lines = raw
    .split(/\n+/)
    .map((line) => line.replace(/^\d+[\).\s]+/, "").trim())
    .filter(Boolean);
  if (lines.length >= 5) return lines;
  return raw
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export async function contentAgent(strategy: string): Promise<string[]> {
  const { client, model } = createChatClient();

  const res = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "user",
        content: `Generate exactly 10 distinct short social posts (one per line, no numbering). Use this strategy:\n${strategy}`,
      },
    ],
  });

  const text = res.choices[0]?.message?.content ?? "";
  return splitPosts(text);
}
