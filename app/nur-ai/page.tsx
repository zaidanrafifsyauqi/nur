import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/containers";
import { NurAiChat } from "@/components/nur-ai/NurAiChat";

export const metadata: Metadata = {
  title: "NUR AI — Islamic & Muslim Travel Assistant",
  description: "Your Islamic & Muslim travel assistant — ask about Quran, Doa, Hadith, prayer, Qibla, and Muslim-friendly travel.",
};

export default function NurAiPage() {
  return (
    <PageContainer className="max-w-3xl">
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">NUR AI</h1>
        <p className="mt-1 text-sm text-[var(--nur-text-secondary)]">
          Your Islamic &amp; Muslim travel assistant.
        </p>
      </header>
      <main>
        <NurAiChat />
      </main>
    </PageContainer>
  );
}
