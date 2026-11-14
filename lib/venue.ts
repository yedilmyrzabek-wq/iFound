// Venue claims (TZ §8.8): signed link from the email + confirmed claim. Places never pay.
import "server-only";
import { db } from "./db";
import { verifyLink } from "./sign";

export interface ClaimInfo {
  id: string;
  email: string;
  verifiedAt: string | null;
  venue: { id: string; name: string; citySlug: string };
}

export async function claimFromToken(token: string): Promise<ClaimInfo | null> {
  const link = verifyLink(token, "venue");
  if (!link) return null;
  const { data } = await db()
    .from("venue_claims")
    .select("id, email, verified_at, venue:venues(id, name, city_slug)")
    .eq("id", link.id)
    .maybeSingle();
  const r = data as unknown as { id: string; email: string; verified_at: string | null; venue: { id: string; name: string; city_slug: string } | null } | null;
  if (!r || !r.venue) return null;
  return { id: r.id, email: r.email, verifiedAt: r.verified_at, venue: { id: r.venue.id, name: r.venue.name, citySlug: r.venue.city_slug } };
}

/** All claim ids for the same venue + email, so one link manages every plan that person posted for the place. */
export async function siblingClaimIds(c: ClaimInfo): Promise<string[]> {
  const { data } = await db().from("venue_claims").select("id").eq("venue_id", c.venue.id).ilike("email", c.email);
  return (data ?? []).map((r) => r.id as string);
}
