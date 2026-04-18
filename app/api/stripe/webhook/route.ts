import { headers } from "next/headers";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!whSecret) {
    return Response.json(
      { error: "STRIPE_WEBHOOK_SECRET not configured" },
      { status: 503 },
    );
  }

  const rawBody = await req.text();
  const sig = headers().get("stripe-signature");
  if (!sig) {
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, whSecret);
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.mode !== "subscription") break;
        const workspaceId = s.metadata?.workspaceId;
        const subId = s.subscription as string | null;
        const customerId = s.customer as string | null;
        if (!workspaceId || !subId || !customerId) break;

        const sub = await stripe.subscriptions.retrieve(subId);
        const priceId = sub.items.data[0]?.price.id;

        await prisma.workspace.update({
          where: { id: workspaceId },
          data: { stripeCustomerId: customerId, plan: "PRO" },
        });

        await prisma.subscription.upsert({
          where: { workspaceId },
          create: {
            workspaceId,
            stripeSubscriptionId: subId,
            stripePriceId: priceId,
            status: sub.status,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
          },
          update: {
            stripeSubscriptionId: subId,
            stripePriceId: priceId,
            status: sub.status,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
          },
        });
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        let workspaceId: string | undefined = sub.metadata?.workspaceId;
        if (!workspaceId) {
          const row = await prisma.subscription.findFirst({
            where: { stripeSubscriptionId: sub.id },
          });
          workspaceId = row?.workspaceId ?? undefined;
        }
        if (!workspaceId) break;
        await prisma.subscription.updateMany({
          where: { workspaceId },
          data: {
            status: sub.status,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
          },
        });
        if (sub.status === "canceled" || sub.status === "unpaid") {
          await prisma.workspace.update({
            where: { id: workspaceId },
            data: { plan: "FREE" },
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        let workspaceId: string | undefined = sub.metadata?.workspaceId;
        if (!workspaceId) {
          const row = await prisma.subscription.findFirst({
            where: { stripeSubscriptionId: sub.id },
          });
          workspaceId = row?.workspaceId ?? undefined;
        }
        if (!workspaceId) break;
        await prisma.workspace.update({
          where: { id: workspaceId },
          data: { plan: "FREE" },
        });
        await prisma.subscription.updateMany({
          where: { workspaceId },
          data: { status: "canceled" },
        });
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("[stripe webhook]", e);
    return Response.json({ error: "handler error" }, { status: 500 });
  }

  return Response.json({ received: true });
}
