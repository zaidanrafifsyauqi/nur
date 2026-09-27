import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/containers";
import { QiblaLive } from "@/components/qibla/QiblaLive";

export const metadata: Metadata = { title: "Qibla — NUR" };

/**
 * Stage 3A — static shell; live GPS bearing + compass live in the client
 * boundary below (geolocation and orientation require browser APIs).
 * No mock data, no external Qibla API — bearing is computed on-device.
 */
export default function QiblaPage() {
  return (
    <PageContainer className="max-w-2xl">
      <div className="flex flex-col gap-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Qibla</h1>
          <p className="mt-1 text-sm text-[var(--nur-text-secondary)]">
            True-north bearing to the Kaaba, calculated on your device.
          </p>
        </div>
        <QiblaLive />
      </div>
    </PageContainer>
  );
}
