import Link from "next/link";
import { Footer, Header } from "@/components/Header";
import { LetterLine } from "@/components/Letterboard";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-md px-4 pt-12">
        <div className="felt rounded-[14px] px-6 py-6 [container-type:inline-size]">
          <LetterLine text="Not here" style={{ fontSize: "min(4.5rem, 20cqw)" }} />
          <LetterLine text="no such plan" className="mt-1 text-[clamp(1rem,7cqw,1.6rem)] [&_.letter]:text-bulb" />
        </div>
        <p className="mt-5 text-[16px] text-ink-2">This plan doesn't exist or was removed.</p>
        <Link href="/c/austin" className="mt-5 inline-flex h-[52px] items-center rounded-full bg-bulb px-6 text-[17px] font-bold text-ink">
          See plans in Austin
        </Link>
      </main>
      <Footer />
    </>
  );
}
