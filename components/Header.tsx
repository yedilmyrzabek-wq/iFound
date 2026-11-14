import Link from "next/link";
import { CitySwitcher } from "./CitySwitcher";
import { previewMode } from "@/lib/preview";

const CITIES = [
  { slug: "austin", name: "Austin" },
  { slug: "new-york", name: "New York" },
  { slug: "chicago", name: "Chicago" },
  { slug: "denver", name: "Denver" },
  { slug: "seattle", name: "Seattle" },
];

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="felt inline-flex h-7 items-center rounded-[6px] px-1.5" aria-hidden="true">
        <span className="letter text-[15px] leading-none">iF</span>
      </span>
      <span className="text-[19px] font-extrabold tracking-[-0.02em] [font-stretch:92%]">iFound</span>
    </span>
  );
}

export function Header({ city }: { city?: string }) {
  return (
    <>
    {previewMode() && (
      <p className="bg-ink px-4 py-2 text-center text-[13px] font-medium text-white">
        Preview data — the database isn't connected. Plans below are local fixtures; joining is off.
      </p>
    )}
    <header className="sticky top-0 z-[1000] border-b border-line bg-ground/95 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="-ml-1 rounded-md px-1 py-1" aria-label="iFound home">
          <Wordmark />
        </Link>
        <CitySwitcher cities={CITIES} current={city} />
        <nav className="ml-auto flex items-center gap-1 text-[15px] font-medium">
          <Link href="/me" className="rounded-full px-3 py-2 text-ink-2 hover:bg-black/5 hover:text-ink">
            My plans
          </Link>
          <Link href="/plus" className="hidden rounded-full px-3 py-2 text-ink-2 hover:bg-black/5 hover:text-ink sm:inline-flex">
            iFound+
          </Link>
        </nav>
      </div>
    </header>
    </>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line pb-[calc(env(safe-area-inset-bottom)+24px)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 pt-6 text-[14px] text-ink-2">
        <Link href="/terms" className="hover:text-ink">Terms</Link>
        <Link href="/privacy" className="hover:text-ink">Privacy</Link>
        <Link href="/safety" className="hover:text-ink">Safety</Link>
        <Link href="/plus" className="hover:text-ink">iFound+</Link>
        <span className="ml-auto">
          ©{" "}
          <a href="https://www.openstreetmap.org/copyright" className="underline hover:text-ink" target="_blank" rel="noreferrer">
            OpenStreetMap contributors
          </a>
        </span>
      </div>
    </footer>
  );
}
