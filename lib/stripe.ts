// Stripe, test mode only (TZ §15). Live keys are never used in production.
import "server-only";
import Stripe from "stripe";
import { db } from "./db";

let client: Stripe | null = null;

export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(key);
  return client;
}

export const isTestMode = () => (process.env.STRIPE_SECRET_KEY ?? "sk_test_").startsWith("sk_test_");

function periodEnd(sub: Stripe.Subscription): string | null {
  // Newer API versions moved current_period_end onto subscription items.
  const raw =
    (sub as unknown as { current_period_end?: number }).current_period_end ?? sub.items?.data?.[0]?.current_period_end ?? null;
  return raw ? new Date(raw * 1000).toISOString() : null;
}

/** Upserts our subscriptions row from a Stripe subscription. Returns our row id. */
export async function upsertSubscription(sub: Stripe.Subscription, email: string | null): Promise<string> {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const fields = {
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    status: sub.status,
    current_period_end: periodEnd(sub),
    updated_at: new Date().toISOString(),
  };

  const bySub = await db().from("subscriptions").select("id").eq("stripe_subscription_id", sub.id).maybeSingle();
  if (bySub.data) {
    await db().from("subscriptions").update(fields).eq("id", bySub.data.id);
    return bySub.data.id;
  }
  if (email) {
    const byEmail = await db().from("subscriptions").select("id").ilike("email", email).maybeSingle();
    if (byEmail.data) {
      await db().from("subscriptions").update(fields).eq("id", byEmail.data.id);
      return byEmail.data.id;
    }
  }
  const { data, error } = await db()
    .from("subscriptions")
    .insert({ ...fields, email: (email ?? `${customerId}@stripe.invalid`).toLowerCase() })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function linkToken(subscriptionRowId: string, token: string) {
  await db()
    .from("subscription_tokens")
    .upsert({ user_token: token, subscription_id: subscriptionRowId, linked_at: new Date().toISOString() }, { onConflict: "user_token" });
}

/**
 * Verifies a completed Checkout Session and links its browser token. Idempotent: the success page
 * calls it right away, the webhook calls it again later.
 */
export async function linkCheckoutSession(sessionId: string, expectedToken?: string): Promise<{ ok: boolean; until: string | null }> {
  const session = await stripe().checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
  if (session.mode !== "subscription" || session.status !== "complete") return { ok: false, until: null };
  const token = session.client_reference_id ?? session.metadata?.user_token ?? null;
  if (!token || (expectedToken && token !== expectedToken)) return { ok: false, until: null };
  const sub = session.subscription as Stripe.Subscription | null;
  if (!sub) return { ok: false, until: null };
  const email = session.customer_details?.email ?? session.customer_email ?? null;
  const rowId = await upsertSubscription(sub, email);
  await linkToken(rowId, token);
  return { ok: true, until: periodEnd(sub) };
}
