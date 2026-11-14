// Stripe webhook. Raw body (req.text()) — req.json() would break the signature check. No Origin check here.
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { linkCheckoutSession, stripe, upsertSubscription } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "forbidden" }, { status: 400 });
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.mode === "subscription") await linkCheckoutSession(s.id);
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const { data } = await db().from("subscriptions").select("id").eq("stripe_subscription_id", sub.id).maybeSingle();
        if (data || event.type === "customer.subscription.updated") {
          await upsertSubscription(event.type === "customer.subscription.deleted" ? { ...sub, status: "canceled" } : sub, null);
        }
        break;
      }
    }
  } catch (e) {
    console.error("webhook handling failed", event.type, (e as Error).message);
    return NextResponse.json({ error: "server_error" }, { status: 500 }); // Stripe retries
  }
  return NextResponse.json({ received: true });
}
