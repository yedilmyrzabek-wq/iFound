import { NextResponse } from "next/server";
import { apiError, badOrigin, originOk, previewBlocked, siteUrl, userToken } from "@/lib/http";
import { stripe } from "@/lib/stripe";
import { track } from "@/lib/analytics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!originOk(req)) return badOrigin();
  const blocked = previewBlocked();
  if (blocked) return blocked;
  const price = process.env.STRIPE_PRICE_ID;
  if (!price) return apiError("server_error", "Payments aren't set up yet.", 503);
  const token = await userToken();
  const site = siteUrl(req);
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    client_reference_id: token,
    metadata: { user_token: token },
    subscription_data: { metadata: { user_token: token } },
    success_url: `${site}/plus/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}/plus`,
    allow_promotion_codes: false,
    // US product: always charge and display in USD, even for viewers abroad (no automatic local-currency conversion).
    adaptive_pricing: { enabled: false },
    locale: "en",
  });
  await track("checkout_start", { token });
  return NextResponse.json({ url: session.url });
}
