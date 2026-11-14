// Idempotent email sending (TZ §14): claim a row in email_log first, send only if we got it.
import "server-only";
import { Resend } from "resend";
import { db } from "../db";

let resend: Resend | null = null;
function client(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  resend ??= new Resend(process.env.RESEND_API_KEY);
  return resend;
}

export interface Mail {
  dedupeKey: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: { filename: string; content: string; contentType?: string }[];
}

/** Returns true if this call actually sent the email (false = already sent before, or failed). */
export async function sendOnce(mail: Mail): Promise<boolean> {
  // Demo guests added by the jury demo have @demo.invalid addresses: never send to them.
  if (mail.to.toLowerCase().endsWith("@demo.invalid")) return false;
  const { data: claimed, error } = await db()
    .from("email_log")
    .upsert({ dedupe_key: mail.dedupeKey, to_email: mail.to, status: "pending" }, { onConflict: "dedupe_key", ignoreDuplicates: true })
    .select("id");
  if (error) {
    console.error("email_log insert failed", mail.dedupeKey, error.message);
    return false;
  }
  if (!claimed || claimed.length === 0) return false; // someone already sent it

  const id = claimed[0].id as string;
  const c = client();
  if (!c) {
    console.warn(`[email] RESEND_API_KEY not set — would send "${mail.subject}" (${mail.dedupeKey})`);
    await db().from("email_log").update({ status: "failed" }).eq("id", id);
    return false;
  }
  try {
    const { data, error: sendErr } = await c.emails.send({
      from: process.env.EMAIL_FROM || "iFound <onboarding@resend.dev>",
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      attachments: mail.attachments?.map((a) => ({
        filename: a.filename,
        content: Buffer.from(a.content).toString("base64"),
        contentType: a.contentType,
      })),
    });
    if (sendErr) throw new Error(sendErr.message);
    await db().from("email_log").update({ status: "sent", provider_id: data?.id ?? null }).eq("id", id);
    return true;
  } catch (e) {
    console.error("[email] send failed", mail.dedupeKey, (e as Error).message);
    await db().from("email_log").update({ status: "failed" }).eq("id", id);
    return false;
  }
}
