import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/containers";
import { MuslimMap } from "@/components/travel/MuslimMap";

export const metadata: Metadata = {
  title: "Muslim Map — NUR",
  description: "Interactive map of nearby mosques from OpenStreetMap data.",
};

/**
 * Stage 3B — server shell; the interactive map lives in the client
 * boundary below (MapLibre requires browser APIs — never SSR'd).
 */
export default function TravelMapPage() {
  return (
    <PageContainer className="max-w-6xl">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Muslim map</h1>
          <p className="mt-1 text-sm text-[var(--nur-text-secondary)]">
            Nearby mosques from OpenStreetMap · allow location or pan the map
          </p>
        </div>
        <MuslimMap />
      </div>
    </PageContainer>
  );
}
