import type { Metadata } from "next";
import { Footer, Header } from "@/components/Header";
import { VenueConfirmButton } from "@/components/VenueActions";
import { claimFromToken } from "@/lib/venue";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Confirm your venue", robots: { index: false } };

export default async function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const token = decodeURIComponent((await params).token);
  const claim = await claimFromToken(token);
  return (
    <>
      <Header />
      <main className="mx-auto max-w-md px-4 pt-12">
        {!claim ? (
          <>
            <h1 className="text-[26px] font-extrabold">This link has expired</h1>
            <p className="mt-2 text-[16px] text-ink-2">Post a plan as your venue again and we'll send a fresh link.</p>
          </>
        ) : (
          <>
            <h1 className="text-[28px] leading-tight font-extrabold">Confirm you represent {claim.venue.name}</h1>
            <p className="mt-2 text-[16px] text-ink-2">
              Your plans then show “Hosted by {claim.venue.name} ✓”. Posting on iFound is always free for places.
            </p>
            {claim.verifiedAt ? (
              <p className="mt-6 rounded-[10px] bg-go px-4 py-3 text-[16px] font-semibold text-white">Already confirmed ✓</p>
            ) : (
              <VenueConfirmButton token={token} />
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
