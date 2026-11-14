import type { Metadata } from "next";
import { StaticPage } from "@/components/StaticPage";

export const metadata: Metadata = { title: "Privacy" };

export default function Privacy() {
  return (
    <StaticPage title="Privacy">
      <h2>What we store</h2>
      <p>Your first name, your email, and a photo if you add one. A random ID in a cookie so this browser remembers your plans. No passwords.</p>
      <h2>Who sees what</h2>
      <p><strong>Your email is never shown to anyone</strong> — not other people in the plan, not the host, not places. Your first name and photo are shown only to people in the same plan and to iFound+ members.</p>
      <h2>Emails we send</h2>
      <p>Only about plans you joined or started: you're in, it's on, it was called off. No newsletters.</p>
      <h2>Payments</h2>
      <p>iFound+ payments are handled by Stripe. We never see your card number.</p>
      <h2>Deleting your data</h2>
      <p>Reply to any iFound email and ask us to delete your data. We'll do it within a few days.</p>
      <p>Maps and place data © OpenStreetMap contributors.</p>
    </StaticPage>
  );
}
