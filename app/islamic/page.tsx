import type { Metadata } from "next";
import { PageContainer, SectionHeader } from "@/components/layout/containers";
import { MockNotice } from "@/components/home/cards";
import { DhikrCard, IslamicHubGrid } from "@/components/islamic/widgets";
import { mockDhikr } from "@/lib/mock/islamic";

export const metadata: Metadata = { title: "Islamic Hub — NUR" };

export default function IslamicPage() {
  return (
    <PageContainer>
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Islamic hub</h1>
          <p className="mt-1 text-sm text-[var(--nur-text-secondary)]">
            Duas, hadith, Hijri calendar and dhikr — mock excerpts in Stage 1.
          </p>
        </div>
        <MockNotice text="Stage 1 · Local mock excerpts only. Sourced collections arrive with the Islamic service in Stage 2." />
        <IslamicHubGrid />
        <SectionHeader
          title="Daily dhikr"
          subtitle="Counter UI placeholder"
          action={<span id="dhikr" className="sr-only">dhikr anchor</span>}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {mockDhikr.map((d) => (
            <DhikrCard key={d.id} dhikr={d} />
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
