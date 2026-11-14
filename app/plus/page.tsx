import type { Metadata } from "next";
import { DateTime } from "luxon";
import { Footer, Header } from "@/components/Header";
import { LetterLine } from "@/components/Letterboard";
import { PlusButton } from "@/components/PlusButton";
import { isSubscriber } from "@/lib/entitlement";
import { userToken } from "@/lib/http";
import { previewMode } from "@/lib/preview";
import { isTestMode } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "iFound+" };

const ROWS: [string, string, string][] = [
  ["See plans and join", "Unlimited", "Unlimited"],
  ["Start your own plans", "1 a month", "Unlimited"],
  ["See who's going before you join", "—", "Yes"],
];

export default async function PlusPage() {
  const plus = previewMode() ? { active: false, until: null } : await isSubscriber(await userToken());
  return (
    <>
      <Header />
      {isTestMode() && (
        <p className="bg-bulb px-4 py-2.5 text-center text-[14px] font-semibold text-ink">
          Test mode — use card 4242 4242 4242 4242. No real charges.
        </p>
      )}
      <main className="mx-auto max-w-2xl px-4 pt-8 pb-16">
        <div className="felt rounded-[14px] px-6 py-6 [container-type:inline-size]">
          <LetterLine text="iFound+" style={{ fontSize: "min(5rem, 22cqw)" }} />
          <LetterLine text="$8 a month" className="mt-1 text-[clamp(1.2rem,8cqw,2.2rem)] [&_.letter]:text-bulb" />
        </div>
        <h1 className="mt-6 text-[28px] leading-tight font-extrabold tracking-[-0.02em]">Start as many plans as you like.</h1>
        <p className="mt-2 text-[17px] text-ink-2">And see who's going before you tap I'm in. Places are always free on iFound.</p>

        <table className="mt-6 w-full border-collapse text-left text-[15px]">
          <thead>
            <tr className="border-b border-line-strong">
              <th className="py-2.5 font-semibold" scope="col">
                <span className="sr-only">Feature</span>
              </th>
              <th className="w-24 py-2.5 font-semibold" scope="col">Free</th>
              <th className="w-28 py-2.5 font-semibold" scope="col">iFound+</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([f, free, plus]) => (
              <tr key={f} className="border-b border-line">
                <th scope="row" className="py-3 pr-3 font-medium">{f}</th>
                <td className="py-3 text-ink-2">{free}</td>
                <td className="py-3 font-semibold">{plus}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-7">
          {plus.active ? (
            <p className="rounded-[10px] bg-go px-4 py-3.5 text-[16px] font-semibold text-white">
              You're in iFound+{plus.until ? ` — active until ${DateTime.fromISO(plus.until).toFormat("LLL d")}` : ""}.
            </p>
          ) : (
            <PlusButton />
          )}
          <p className="mt-3 text-center text-[14px] text-ink-2">$8/month, renews monthly. Cancel anytime.</p>
          {!plus.active && (
            <p className="mt-1 text-center text-[14px]">
              <a href="/plus/restore" className="font-semibold underline">
                Already a member? Restore
              </a>
            </p>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
