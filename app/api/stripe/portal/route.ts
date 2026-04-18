import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return Response.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const baseUrl = process.env.NEXTAUTH_URL;
  if (!baseUrl) {
    return Response.json({ error: "NEXTAUTH_URL is not set" }, { status: 500 });
  }

  const { workspaceId } = (await req.json()) as { workspaceId?: string };
  if (!workspaceId) {
    return Response.json({ error: "workspaceId required" }, { status: 400 });
  }

  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId: session.user.id },
    include: { workspace: true },
  });

  if (!member?.workspace.stripeCustomerId) {
    return Response.json(
      { error: "No Stripe customer for this workspace. Subscribe first." },
      { status: 400 },
    );
  }

  const stripe = getStripe();
  const portal = await stripe.billingPortal.sessions.create({
    customer: member.workspace.stripeCustomerId,
    return_url: `${baseUrl}/dashboard`,
  });

  return Response.json({ url: portal.url });
}
