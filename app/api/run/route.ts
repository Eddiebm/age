import { runSystem } from "@/lib/orchestrator";

export const maxDuration = 60;

export async function POST(req: Request) {
  let topic: string | undefined;

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await req.json()) as { topic?: string };
    topic = body.topic;
  } else {
    const form = await req.formData();
    topic = form.get("topic") as string | undefined;
  }

  if (!topic?.trim()) {
    return Response.json({ error: "topic required" }, { status: 400 });
  }

  try {
    await runSystem(topic.trim());
    return Response.json({ status: "running" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "run failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
