import type { Metadata } from "next";
import { Footer, Header } from "@/components/Header";
import { RestoreRequestForm } from "@/components/RestoreForms";

export const metadata: Metadata = { title: "Restore iFound+", robots: { index: false } };

export default function RestorePage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-md px-4 pt-12">
        <h1 className="text-[28px] leading-tight font-extrabold">Restore iFound+</h1>
        <p className="mt-2 text-[16px] text-ink-2">Already a member on another phone or browser? We'll email you a link that turns it on here too.</p>
        <RestoreRequestForm />
      </main>
      <Footer />
    </>
  );
}
