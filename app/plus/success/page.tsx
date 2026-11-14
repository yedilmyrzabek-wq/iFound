import Link from "next/link";
import type { Metadata } from "next";
import { Footer, Header } from "@/components/Header";
import { userToken } from "@/lib/http";
import { linkCheckoutSession } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Welcome to iFound+", robots: { index: false } };

// Verifies the session on the server and links this browser right away — no waiting for the webhook.
export default async function PlusSuccess({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  let ok = false;
  if (session_id && /^cs_[A-Za-z0-9_]+$/.test(session_id)) {
    ok = (await linkCheckoutSession(session_id, await userToken()).catch(() => ({ ok: false }))).ok;
  }
  return (
    <>
      <Header />
      <main className="mx-auto max-w-md px-4 pt-12">
        {ok ? (
          <>
            <h1 className="text-[30px] leading-tight font-extrabold">You're in iFound+.</h1>
            <p className="mt-2 text-[17px] text-ink-2">Start as many plans as you like, and see who's going before you join.</p>
            <Link href="/c/austin" className="mt-6 flex h-[52px] items-center justify-center rounded-full bg-bulb text-[17px] font-bold text-ink">
              See plans in Austin
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-[26px] leading-tight font-extrabold">We couldn't confirm that payment</h1>
            <p className="mt-2 text-[16px] text-ink-2">If you were charged, it will show up in a minute. Open this page again from the same browser.</p>
            <Link href="/plus" className="mt-6 inline-flex min-h-11 items-center text-[16px] font-semibold underline">
              Back to iFound+
            </Link>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
