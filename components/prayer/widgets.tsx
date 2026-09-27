import type { Prayer } from "@/lib/types";
import { PrayerTime } from "./PrayerTime";
import { Badge, Card, Progress } from "@/components/ui/controls";
import { cn } from "@/lib/utils";

export function PrayerTimeline({ prayers }: { prayers: Prayer[] }) {
  return (
    <Card>
      <h2 className="text-base font-semibold">Prayer timeline</h2>
      <p className="text-xs text-[var(--nur-text-secondary)]">
        Fajr → Isha · all times local
      </p>
      <ol className="no-scrollbar mt-3 grid grid-cols-3 gap-2 pb-1 sm:flex sm:overflow-x-auto" aria-label="Prayer timeline">
        {prayers.map((p) => (
          <li
            key={p.name}
            className={cn(
              "min-w-0 flex-1 rounded-xl border p-3 text-center sm:min-w-[108px]",
              p.isNext
                ? "border-nur-gold bg-nur-sand/70 dark:bg-[var(--nur-surface-2)]"
                : "border-[var(--nur-border)]"
            )}
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--nur-text-secondary)]">
              {p.name}
            </p>
            <p className="mt-0.5 whitespace-nowrap font-mono text-sm font-bold"><PrayerTime prayer={p} /></p>
            {p.isNext ? (
              <Badge className="mt-1 border-nur-gold">Next</Badge>
            ) : (
              <p className="mt-1 text-[11px] text-[var(--nur-text-secondary)]">
                {p.passed ? "Done" : "Upcoming"}
              </p>
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}

export function PrayerList({ prayers }: { prayers: Prayer[] }) {
  return (
    <Card>
      <h2 className="mb-1 text-base font-semibold">Daily prayer list</h2>
      <ul className="divide-y divide-[var(--nur-border)]">
        {prayers.map((p) => (
          <li key={p.name} className="flex items-center gap-3 py-3">
            <span
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold",
                p.isNext
                  ? "bg-nur-gold text-nur-ink"
                  : "bg-[var(--nur-surface-2)] text-[var(--nur-text-secondary)]"
              )}
              aria-hidden
            >
              {p.name.slice(0, 2)}
            </span>
            <div>
              <p className="text-sm font-semibold">{p.name}</p>
              <p className="text-xs text-[var(--nur-text-secondary)]">
                {p.isNext ? "Upcoming next" : p.passed ? "Completed" : "Scheduled"}
              </p>
            </div>
            <span className="ml-auto font-mono text-sm"><PrayerTime prayer={p} /></span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function NextPrayerHero({
  name,
  displayTime,
  countdown,
  progress,
  gregorian,
  hijri,
  location,
  liveCountdown,
}: {
  name: string;
  displayTime: string;
  countdown: string;
  progress: number;
  gregorian: string;
  hijri: string;
  location: string;
  /** Live ticking countdown (Stage 2B). Falls back to `countdown` text. */
  liveCountdown?: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby="next-prayer"
      className="nur-card-glow rounded-3xl bg-nur-deep p-6 text-white sm:p-8 dark:bg-[var(--nur-surface)] dark:text-[var(--nur-text)] dark:border dark:border-[var(--nur-border)]"
    >
      <p className="text-xs uppercase tracking-widest opacity-70">
        {location} · {gregorian}
      </p>
      <p className="mt-1 text-xs opacity-70">{hijri}</p>
      <h1 id="next-prayer" className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
        {name} <span className="font-mono text-2xl font-semibold sm:text-3xl">{displayTime}</span>
      </h1>
      <p className="mt-2 text-sm opacity-80">
        {liveCountdown ? (
          <>
            Begins in{" "}
            <span className="font-mono text-base font-bold tabular-nums">
              {liveCountdown}
            </span>
          </>
        ) : (
          <>
            Begins in <span className="font-mono text-base font-bold">{countdown}</span>{" "}
            (countdown placeholder — live timer lands in Stage 2)
          </>
        )}
      </p>
      <Progress value={progress} label="Progress to next prayer" className="mt-5" />
    </section>
  );
}
