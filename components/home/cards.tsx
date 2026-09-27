import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Compass,
  MapPin,
  MoonStar,
  Quote,
  UtensilsCrossed,
} from "lucide-react";
import type {
  Dua,
  HijriDate,
  NextPrayerInfo,
  Prayer,
  QuranVerse,
} from "@/lib/types";
import { Badge, Card, Progress } from "@/components/ui/controls";
import { PrayerTime } from "@/components/prayer/PrayerTime";

/** ——— Greeting ——— */
export function GreetingHeader({ name = "Zaidan" }: { name?: string }) {
  return (
    <section aria-labelledby="greeting" className="pt-2">
      <p id="greeting" className="text-sm text-[var(--nur-text-secondary)]">
        Good morning
      </p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">
        Assalamu&apos;alaikum, {name}
      </h1>
      <p className="mt-1 text-sm text-[var(--nur-text-secondary)]">
        Thursday, September 24 · <span className="font-medium">mock data</span>
      </p>
    </section>
  );
}

export function LocationCard({
  location,
  detail,
}: {
  location: string;
  detail?: string;
}) {
  return (
    <Card className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--nur-surface-2)]">
        <MapPin className="h-5 w-5 text-nur-deep dark:text-nur-gold" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--nur-text-secondary)]">
          Current location
        </p>
        <p className="truncate text-[15px] font-semibold">{location}</p>
        {detail ? (
          <p className="truncate text-xs text-[var(--nur-text-secondary)]">{detail}</p>
        ) : null}
      </div>
      <Link
        href="/travel"
        className="ml-auto inline-flex min-h-[44px] shrink-0 items-center rounded-lg px-2 py-2 text-sm font-medium text-nur-deep dark:text-nur-gold"
      >
        Change
      </Link>
    </Card>
  );
}

export function NextPrayerCard({
  next,
  liveCountdown,
}: {
  next: NextPrayerInfo;
  /** Live ticking countdown (Stage 2B). Falls back to placeholder text. */
  liveCountdown?: React.ReactNode;
}) {
  return (
    <Card className="nur-card-glow border-0 bg-nur-deep text-white dark:bg-[var(--nur-surface)] dark:text-[var(--nur-text)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider opacity-80">
            <MoonStar className="h-3.5 w-3.5" aria-hidden /> Next prayer
          </p>
          <p className="mt-1 text-3xl font-bold">
            {next.name} · <PrayerTime prayer={next} />
          </p>
          <p className="mt-1 text-sm opacity-80">
            {liveCountdown ? (
              <>
                in{" "}
                <span className="font-mono font-semibold tabular-nums">
                  {liveCountdown}
                </span>
              </>
            ) : (
              <>
                in <span className="font-mono font-semibold">{next.countdownPlaceholder}</span>{" "}
                <span className="opacity-70">(placeholder)</span>
              </>
            )}
          </p>
        </div>
        <Link
          href="/prayer"
          className="rounded-xl bg-white/15 px-3 py-2 text-sm font-medium backdrop-blur hover:bg-white/25 dark:bg-[var(--nur-surface-2)] dark:hover:brightness-110"
        >
          Details
        </Link>
      </div>
      <Progress value={next.progress} label="Time until next prayer" className="mt-4" />
    </Card>
  );
}

export function TodaysPrayersCard({ prayers }: { prayers: Prayer[] }) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">Today&apos;s prayer times</h2>
        <Link href="/prayer" className="text-sm font-medium text-nur-deep dark:text-nur-gold">
          View all
        </Link>
      </div>
      <ul className="divide-y divide-[var(--nur-border)]">
        {prayers.map((p) => (
          <li key={p.name} className="flex items-center gap-3 py-2.5 text-sm">
            <span
              aria-hidden
              className={`h-2 w-2 rounded-full ${p.isNext ? "bg-nur-gold" : p.passed ? "bg-nur-deep/40" : "bg-[var(--nur-border)]"}`}
            />
            <span className="font-medium">{p.name}</span>
            {p.isNext ? <Badge className="ml-1">Next</Badge> : null}
            <span className="ml-auto font-mono text-[var(--nur-text-secondary)]">
              <PrayerTime prayer={p} />
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-[var(--nur-text-secondary)]">
        All times local · AlAdhan
      </p>
    </Card>
  );
}

export function HijriCard({ hijri }: { hijri: HijriDate }) {
  return (
    <Card className="flex items-center gap-3 bg-nur-sand/60 dark:bg-[var(--nur-surface)]">
      <span aria-hidden className="text-2xl font-bold text-nur-gold">
        ☾
      </span>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--nur-text-secondary)]">
          Hijri date
        </p>
        <p className="font-semibold">{hijri.formatted}</p>
      </div>
      <Link
        href="/islamic/hijri"
        className="ml-auto text-sm font-medium text-nur-deep dark:text-nur-gold"
      >
        Calendar
      </Link>
    </Card>
  );
}

export function AyahCard({ ayah }: { ayah: QuranVerse & { surahName: string } }) {
  return (
    <Card>
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--nur-text-secondary)]">
        <Quote className="h-3.5 w-3.5" aria-hidden /> Ayah of the day
      </p>
      <p dir="rtl" lang="ar" className="font-arabic mt-3 text-right text-2xl leading-loose">
        {ayah.arabic}
      </p>
      <p className="mt-3 text-[15px] leading-relaxed">“{ayah.translation}”</p>
      <p className="mt-1 text-xs text-[var(--nur-text-secondary)]">
        {ayah.surahName} · mock selection
      </p>
    </Card>
  );
}

export function DuaCard({ dua }: { dua: Dua }) {
  return (
    <Card>
      <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--nur-text-secondary)]">
        Daily dua · {dua.category}
      </p>
      <h3 className="mt-1 font-semibold">{dua.title}</h3>
      <p dir="rtl" lang="ar" className="font-arabic mt-2 text-right text-xl">
        {dua.arabic}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--nur-text-secondary)]">
        {dua.translation}
      </p>
      {dua.reference ? (
        <p className="mt-2 line-clamp-2 break-words text-xs text-[var(--nur-text-secondary)]">
          {dua.reference}
        </p>
      ) : null}
      <Link
        href="/islamic/duas"
        className="mt-3 inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-nur-deep dark:text-nur-gold"
      >
        Lihat semua doa <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </Card>
  );
}

export function ContinueQuranCard({
  surahName,
  surahNumber,
  verse,
  totalVerses,
  progress,
  updatedLabel,
}: {
  surahName: string;
  surahNumber: number;
  verse: number;
  totalVerses: number;
  progress: number;
  updatedLabel: string;
}) {
  return (
    <Card className="nur-card-glow">
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--nur-text-secondary)]">
        <BookOpen className="h-3.5 w-3.5" aria-hidden /> Continue Quran
      </p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-lg font-bold">
            {surahName} · {verse}:{totalVerses}
          </p>
          <p className="text-xs text-[var(--nur-text-secondary)]">{updatedLabel}</p>
        </div>
        <Link
          href={`/quran/${surahNumber}`}
          className="shrink-0 rounded-xl bg-nur-deep px-4 py-2.5 text-sm font-semibold text-white dark:bg-nur-gold dark:text-nur-ink"
        >
          Resume
        </Link>
      </div>
      <Progress value={progress} label="Quran reading progress" className="mt-3" />
    </Card>
  );
}

const TRAVEL_ACTIONS = [
  { href: "/travel/map", label: "Find Mosque", icon: MapPin, desc: "Nearby musallas" },
  { href: "/travel/map", label: "Halal Food", icon: UtensilsCrossed, desc: "Eat with ease" },
  { href: "/travel/qibla", label: "Qibla", icon: Compass, desc: "295° (mock)" },
];

export function QuickTravelActions() {
  return (
    <section aria-labelledby="travel-actions">
      <h2 id="travel-actions" className="mb-3 text-base font-semibold">
        Quick travel actions
      </h2>
      <ul className="grid grid-cols-3 gap-3">
        {TRAVEL_ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <li key={a.label}>
              <Link
                href={a.href}
                className="flex min-h-[104px] flex-col items-start gap-1 rounded-2xl border border-[var(--nur-border)] bg-[var(--nur-surface)] p-3.5 transition-colors hover:bg-[var(--nur-surface-2)]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-nur-deep/10 text-nur-deep dark:bg-nur-gold/15 dark:text-nur-gold">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="mt-1 text-sm font-semibold">{a.label}</span>
                <span className="text-xs text-[var(--nur-text-secondary)]">{a.desc}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function MockNotice({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-[var(--nur-border)] bg-[var(--nur-surface-2)]/60 px-3 py-2 text-xs text-[var(--nur-text-secondary)]">
      {text}
    </p>
  );
}
