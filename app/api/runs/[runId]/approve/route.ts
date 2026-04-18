import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { approveRunAndEnqueue } from "@/lib/approveRun";

export async function POST(
  _req: Request,
  context: { params: Promise<{ runId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { runId } = await context.params;

  try {
    const result = await approveRunAndEnqueue({
      runId,
      userId: session.user.id,
    });
    return Response.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "error";
    const status =
      message === "Forbidden"
        ? 403
        : message === "Run not found"
          ? 404
          : 400;
    return Response.json({ error: message }, { status });
  }
}
