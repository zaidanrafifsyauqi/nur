import { Navigation } from "lucide-react";
import { Card } from "@/components/ui/controls";
import { cn } from "@/lib/utils";

/**
 * Stage 3A — live compass dial (presentational).
 *
 * Heading-up display: the rose rotates by -heading so the device's
 * forward direction stays at the top; the gold Qibla marker sits at the
 * bearing on the rose. With no heading (manual mode) the rose stays
 * north-up and the marker shows where Qibla lies.
 */
export function QiblaCompass({
  bearing,
  heading,
  aligned,
  manual,
}: {
  /** Qibla bearing ° clockwise from true north. */
  bearing: number;
  /** Smoothed device heading, or null in manual mode. */
  heading: number | null;
  aligned: boolean;
  manual: boolean;
}) {
  const live = heading != null && !manual;
  const ariaLabel = manual
    ? `Qibla direction ${Math.round(bearing)} degrees from true north. Compass unavailable, manual mode.`
    : `Qibla ${Math.round(bearing)} degrees from true north. Device heading ${Math.round(heading ?? 0)} degrees.${aligned ? " Aligned with Qibla." : ""}`;

  return (
    <Card
      className={cn(
        "flex flex-col items-center py-8",
        aligned && live && "border-nur-gold"
      )}
    >
      <div
        role="img"
        aria-label={ariaLabel}
        className="relative h-56 w-56 sm:h-64 sm:w-64"
      >
        {/* dial face */}
        <div
          className={cn(
            "absolute inset-0 rounded-full border-2 bg-[var(--nur-surface-2)]",
            aligned && live ? "border-nur-gold" : "border-[var(--nur-border)]"
          )}
        />
        {/* rotating rose (heading-up when live) */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={live ? { transform: `rotate(${-heading}deg)` } : undefined}
        >
          {(["N", "E", "S", "W"] as const).map((c, i) => (
            <span
              key={c}
              className="absolute inset-0"
              style={{ transform: `rotate(${i * 90}deg)` }}
            >
              <span
                className={cn(
                  "absolute left-1/2 top-[7%] text-sm font-bold",
                  c === "N"
                    ? "text-nur-deep dark:text-nur-gold"
                    : "text-[var(--nur-text-secondary)]"
                )}
                style={{ transform: `translateX(-50%) rotate(${-i * 90}deg)` }}
              >
                {c}
              </span>
            </span>
          ))}
          {Array.from({ length: 12 }, (_, i) =>
            i % 3 !== 0 ? (
              <span
                key={i}
                className="absolute inset-0"
                style={{ transform: `rotate(${i * 30}deg)` }}
              >
                <span className="absolute left-1/2 top-[5%] h-2 w-px -translate-x-1/2 bg-[var(--nur-border)]" />
              </span>
            ) : null
          )}
          {/* Qibla marker on the rim (icon stays upright = pointing outward) */}
          <span
            className="absolute inset-0"
            style={{ transform: `rotate(${bearing}deg)` }}
          >
            <span
              className="absolute left-1/2 top-[13%] flex h-9 w-9 items-center justify-center rounded-full bg-nur-gold text-nur-ink shadow"
              style={{ transform: `translateX(-50%) rotate(${-bearing}deg)` }}
            >
              <Navigation className="h-4 w-4 fill-nur-ink" />
            </span>
          </span>
        </div>
        {/* fixed forward pointer */}
        <span
          aria-hidden
          className="absolute -top-1 left-1/2 h-0 w-0 -translate-x-1/2 border-x-8 border-t-[12px] border-x-transparent border-t-nur-deep dark:border-t-nur-gold"
        />
        {/* center readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-4xl font-bold tabular-nums">
            {Math.round(bearing)}°
          </span>
          <span className="mt-1 rounded-full bg-nur-deep/10 px-2.5 py-0.5 text-[11px] font-semibold text-nur-deep dark:bg-nur-gold/15 dark:text-nur-gold">
            QIBLA
          </span>
          {aligned && live ? (
            <span className="mt-1.5 rounded-full bg-nur-gold px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-nur-ink">
              Aligned
            </span>
          ) : null}
        </div>
      </div>
      <p className="mt-5 text-sm text-[var(--nur-text-secondary)]">
        {manual ? "from true north · manual mode" : "from true north · live compass"}
      </p>
    </Card>
  );
}
