import type { Metadata } from "next";
import { Footer, Header } from "@/components/Header";
import { MyPlansView } from "@/components/MyPlansView";
import { userToken } from "@/lib/http";
import { getMyPlans } from "@/lib/me";
import { nowUtc } from "@/lib/tz";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My plans" };

export default async function MePage() {
  const data = await getMyPlans(await userToken());
  return (
    <>
      <Header />
      <MyPlansView data={data} serverNow={nowUtc()} />
      <Footer />
    </>
  );
}
