// Who sees what, and subscription status (TZ §7, §15).
import "server-only";
import { db } from "./db";

/** Subscriber = token linked to a subscription that is active/trialing and not past its period end. */
export async function isSubscriber(token: string): Promise<{ active: boolean; until: string | null }> {
  const { data, error } = await db()
    .from("subscription_tokens")
    .select("subscriptions(status, current_period_end)")
    .eq("user_token", token)
    .maybeSingle();
  if (error || !data) return { active: false, until: null };
  const sub = (data as unknown as { subscriptions: { status: string; current_period_end: string | null } | null })
    .subscriptions;
  if (!sub) return { active: false, until: null };
  const active =
    (sub.status === "active" || sub.status === "trialing") &&
    !!sub.current_period_end &&
    new Date(sub.current_period_end).getTime() > Date.now();
  return { active, until: sub.current_period_end };
}

export const AVATARS_BUCKET = process.env.SUPABASE_AVATARS_BUCKET || "avatars";

/** 1-hour signed URLs for photos, only ever called for viewers who may see them. */
export async function signedPhotoUrls(paths: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return out;
  const { data } = await db().storage.from(AVATARS_BUCKET).createSignedUrls(unique, 3600);
  for (const row of data ?? []) if (row.path && row.signedUrl) out.set(row.path, row.signedUrl);
  return out;
}
