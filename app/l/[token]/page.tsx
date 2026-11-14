// Leave via the signed email link. Opening the link changes nothing; only the button (POST) does.
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { verifyLink } from "@/lib/sign";
import { Footer, Header } from "@/components/Header";
import { LeaveButton } from "@/components/LeaveButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Leave plan", robots: { index: false } };

export default async function LeavePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = verifyLink(decodeURIComponent(token), "leave");
  let title: string | null = null;
  let code: string | null = null;
  let alreadyLeft = false;
  if (link) {
    const { data } = await db().from("participants").select("left_at, events(title, code)").eq("id", link.id).maybeSingle();
    const ev = (data as unknown as { left_at: string | null; events: { title: string; code: string } | null }) ?? null;
    title = ev?.events?.title ?? null;
    code = ev?.events?.code ?? null;
    alreadyLeft = !!ev?.left_at;
  }
  return (
    <>
      <Header />
      <main className="mx-auto max-w-md px-4 pt-12">
        {!link || !title ? (
          <>
            <h1 className="text-[26px] font-extrabold">This link has expired</h1>
            <p className="mt-2 text-[16px] text-ink-2">The plan may already be over. If you still need help, open the plan from your email.</p>
          </>
        ) : alreadyLeft ? (
          <>
            <h1 className="text-[26px] font-extrabold">You've already left “{title}”</h1>
            <p className="mt-2 text-[16px] text-ink-2">Nothing else to do.</p>
          </>
        ) : (
          <>
            <h1 className="text-[26px] leading-tight font-extrabold">Leave “{title}”?</h1>
            <p className="mt-2 text-[16px] text-ink-2">Your spot opens up for someone else. If the plan is already on, it stays on.</p>
            <LeaveButton token={decodeURIComponent(token)} code={code!} />
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
