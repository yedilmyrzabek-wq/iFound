import type { Metadata } from "next";
import { Footer, Header } from "@/components/Header";
import { RestoreConfirmButton } from "@/components/RestoreForms";

export const metadata: Metadata = { title: "Restore iFound+", robots: { index: false } };

// Opening the link changes nothing; only the button (POST) links this browser.
export default async function RestoreConfirmPage({ params }: { params: Promise<{ token: string }> }) {
  const token = decodeURIComponent((await params).token);
  return (
    <>
      <Header />
      <main className="mx-auto max-w-md px-4 pt-12">
        <h1 className="text-[28px] leading-tight font-extrabold">Turn on iFound+ here</h1>
        <p className="mt-2 text-[16px] text-ink-2">This links your subscription to this browser.</p>
        <RestoreConfirmButton token={token} />
      </main>
      <Footer />
    </>
  );
}
