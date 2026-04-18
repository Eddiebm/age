import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runSystem } from "@/lib/orchestrator";
import { ensureDefaultWorkspace, getMembership } from "@/lib/workspace";
import { assertCanRunEngine } from "@/lib/limits";
import { assertRunRateLimit } from "@/lib/ratelimit";

export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await assertRunRateLimit(session.user.id);
  } catch (e) {
    const message = e instanceof Error ? e.message : "rate limited";
    return Response.json({ error: message }, { status: 429 });
  }

  let topic: string | undefined;
  let workspaceId: string | undefined;

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await req.json()) as {
      topic?: string;
      workspaceId?: string;
    };
    topic = body.topic;
    workspaceId = body.workspaceId;
  } else {
    const form = await req.formData();
    topic = form.get("topic") as string | undefined;
    workspaceId = form.get("workspaceId") as string | undefined;
  }

  if (!topic?.trim()) {
    return Response.json({ error: "topic required" }, { status: 400 });
  }

  if (!workspaceId) {
    const ws = await ensureDefaultWorkspace(session.user.id);
    workspaceId = ws.id;
  }

  const m = await getMembership(session.user.id, workspaceId);
  if (!m) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await assertCanRunEngine(workspaceId, m.workspace.plan);
  } catch (err) {
    const message = err instanceof Error ? err.message : "limit";
    return Response.json({ error: message }, { status: 402 });
  }

  try {
    const result = await runSystem({
      workspaceId,
      topic: topic.trim(),
    });
    const awaiting =
      process.env.AGE_REQUIRE_APPROVAL === "true" || m.workspace.requireApproval;
    return Response.json({
      status: awaiting ? "awaiting_approval" : "running",
      runId: result.runId,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "run failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
