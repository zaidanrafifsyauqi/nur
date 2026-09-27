import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/containers";
import { PrayerLive } from "@/components/prayer/PrayerLive";

export const metadata: Metadata = { title: "Prayer Times — NUR" };

/**
 * Stage 2B — static shell; live location + prayer data lives in the
 * client boundary below (geolocation requires `navigator`).
 */
export default function PrayerPage() {
  return (
    <PageContainer>
      <PrayerLive />
    </PageContainer>
  );
}
