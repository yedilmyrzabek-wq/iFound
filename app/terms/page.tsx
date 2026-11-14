import type { Metadata } from "next";
import { StaticPage } from "@/components/StaticPage";

export const metadata: Metadata = { title: "Terms" };

export default function Terms() {
  return (
    <StaticPage title="Terms">
      <p>iFound helps people propose plans at public places and see if enough people want to go. By using iFound you agree to these terms.</p>
      <h2>You must be 18 or older</h2>
      <p>iFound is for adults only. By joining or starting a plan you confirm you're 18 or older.</p>
      <h2>We don't verify identities</h2>
      <p>Anyone can join a plan with a first name and an email. We don't check who people are. You're responsible for your own safety and choices — please read our <a className="underline" href="/safety">safety tips</a>.</p>
      <h2>Keep it friendly</h2>
      <p>No spam, ads, hate, harassment, or anything illegal. We may hide plans or photos that are reported or break these rules.</p>
      <h2>iFound+</h2>
      <p>iFound+ costs $8/month and renews monthly until you cancel. Cancel anytime. Places never pay to be on iFound.</p>
      <h2>No guarantees</h2>
      <p>Plans are made by people and places, not by iFound. A plan that's “on” can still change. iFound is provided as is.</p>
    </StaticPage>
  );
}
