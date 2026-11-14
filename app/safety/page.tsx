import type { Metadata } from "next";
import { StaticPage } from "@/components/StaticPage";

export const metadata: Metadata = { title: "Safety" };

export default function Safety() {
  return (
    <StaticPage title="Safety">
      <p className="text-[20px] font-semibold text-ink">Meet in public places. We don't verify identities. Tell a friend where you're going. Report anything that feels off.</p>
      <h2>Before you go</h2>
      <p>Plans happen at public places — cafes, parks, cinemas, libraries. If a plan asks you to meet somewhere private, don't go, and report it.</p>
      <h2>Report</h2>
      <p>Every plan has a Report link at the bottom. Three reports hide a plan right away while we review it.</p>
    </StaticPage>
  );
}
