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

  const priceId = process.env.STRIPE_PRICE_PRO_MONTHLY;
  if (!priceId) {
    return Response.json(
      { error: "Billing not configured (STRIPE_PRICE_PRO_MONTHLY)" },
      { status: 503 },
    );
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
    where: {
      workspaceId,
      userId: session.user.id,
      role: { in: ["OWNER", "ADMIN"] },
    },
    include: { workspace: true },
  });

  if (!member) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const stripe = getStripe();

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: member.workspace.stripeCustomerId ?? undefined,
    customer_email: member.workspace.stripeCustomerId
      ? undefined
      : (session.user.email ?? undefined),
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/dashboard?upgraded=1`,
    cancel_url: `${baseUrl}/dashboard`,
    metadata: { workspaceId },
    subscription_data: {
      metadata: { workspaceId },
    },
  });

  if (!checkout.url) {
    return Response.json({ error: "No checkout URL" }, { status: 500 });
  }

  return Response.json({ url: checkout.url });
}
