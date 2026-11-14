// Saved guest profile (TZ §8.12): name/email/photo remembered for this browser token so the swipe deck
// can join in one tap. Not an account — no password, no login, cleared with "Not you? Clear".
import "server-only";
import { db } from "./db";

export interface GuestProfile {
  name: string;
  email: string;
  photoPath: string | null;
}

export async function getProfile(token: string): Promise<GuestProfile | null> {
  const { data } = await db().from("guest_profiles").select("display_name, email, photo_path").eq("user_token", token).maybeSingle();
  return data ? { name: data.display_name, email: data.email, photoPath: data.photo_path } : null;
}

export async function saveProfile(token: string, p: GuestProfile): Promise<void> {
  await db()
    .from("guest_profiles")
    .upsert(
      { user_token: token, display_name: p.name, email: p.email.toLowerCase(), photo_path: p.photoPath, updated_at: new Date().toISOString() },
      { onConflict: "user_token" },
    );
}

export async function clearProfile(token: string): Promise<void> {
  await db().from("guest_profiles").delete().eq("user_token", token);
}
