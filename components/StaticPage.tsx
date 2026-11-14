import { Footer, Header } from "./Header";

export function StaticPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-[68ch] px-4 pt-10">
        <h1 className="text-[32px] leading-tight font-extrabold tracking-[-0.02em]">{title}</h1>
        <div className="mt-6 space-y-4 text-[17px] leading-relaxed text-ink-2 [&_h2]:mt-8 [&_h2]:text-[20px] [&_h2]:font-bold [&_h2]:text-ink [&_strong]:text-ink">
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}
