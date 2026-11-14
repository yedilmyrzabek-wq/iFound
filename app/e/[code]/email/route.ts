// In-app email preview, for jury demo plans only: the exact template rendered with the plan's real data.
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { isDemoCode } from "@/lib/demo";
import { siteUrl } from "@/lib/http";
import { previewEmail } from "@/lib/email/notify";

export const dynamic = "force-dynamic";

const TYPES = ["confirmed", "joined", "reminder", "repeat"] as const;

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isDemoCode(code)) notFound();
  const { data: ev } = await db().from("events").select("id, is_demo").eq("code", code).maybeSingle();
  if (!ev?.is_demo) notFound();
  const t = new URL(req.url).searchParams.get("type") ?? "confirmed";
  const type = (TYPES as readonly string[]).includes(t) ? (t as (typeof TYPES)[number]) : "confirmed";
  const mail = await previewEmail(ev.id, type, siteUrl(req));
  if (!mail) notFound();
  const subject = mail.subject.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const banner =
    '<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#16171a;color:#fff;padding:12px 16px;font-size:14px">' +
    `<strong>Email preview (demo)</strong> &mdash; the exact email participants get. Subject: <em>${subject}</em></div>`;
  return new Response(mail.html.replace(/<body([^>]*)>/, `<body$1>${banner}`), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}
