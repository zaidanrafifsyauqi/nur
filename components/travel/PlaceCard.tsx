"use client";

import { Building2, ExternalLink, MapPin, MoonStar, UtensilsCrossed } from "lucide-react";
import { Badge, Card } from "@/components/ui/controls";
import { hasHalalTag } from "@/lib/services/travel/overpassMapper";
import { cn } from "@/lib/utils";
import type { Place } from "@/lib/types";

const CATEGORY_META = {
  mosque: { label: "Mosque", Icon: MoonStar },
  "islamic-center": { label: "Islamic Center", Icon: Building2 },
  "halal-food": { label: "Halal Food", Icon: UtensilsCrossed },
  hotel: { label: "Hotel", Icon: MapPin },
  landmark: { label: "Landmark", Icon: MapPin },
} as const;

/**
 * Stage 3C — OSM-backed place card. Fully self-describing (name, category,
 * distance, address) so the list works without the map. Halal status is
 * shown ONLY as "OSM tagged halal" from source tags — never a
 * certification claim.
 */
export function PlaceCard({
  place,
  selected,
  onSelect,
  cardRef,
}: {
  place: Place;
  selected: boolean;
  onSelect: () => void;
  cardRef?: (el: HTMLLIElement | null) => void;
}) {
  const meta = CATEGORY_META[place.category] ?? CATEGORY_META.landmark;
  const Icon = meta.Icon;
  const halalTagged = place.category === "halal-food" && hasHalalTag(place.sourceTags);

  return (
    <li ref={cardRef}>
      <Card
        className={cn(
          "transition-colors",
          selected && "border-nur-gold shadow-[0_0_0_1px_var(--color-nur-gold)]"
        )}
      >
        <button
          type="button"
          onClick={onSelect}
          aria-label={`Show ${place.name} on map`}
          aria-pressed={selected}
          className="flex w-full items-start gap-3 rounded-xl text-left"
        >
          <span
            aria-hidden
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              selected
                ? "bg-nur-gold text-nur-ink"
                : "bg-[var(--nur-surface-2)] text-nur-deep dark:text-nur-gold"
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{place.name}</span>
            {place.address ? (
              <span className="block truncate text-xs text-[var(--nur-text-secondary)]">
                {place.address}
              </span>
            ) : null}
            <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
              <Badge>{meta.label}</Badge>
              <span className="font-mono text-[var(--nur-text-secondary)]">
                {place.distance}
              </span>
              {halalTagged ? <Badge className="border-nur-gold">OSM tagged halal</Badge> : null}
              {selected ? <Badge className="border-nur-gold">Selected</Badge> : null}
            </span>
          </span>
        </button>
        {place.osmUrl ? (
          <a
            href={place.osmUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`View ${place.name} on OpenStreetMap (opens in new tab)`}
            className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-1 text-sm font-medium text-nur-deep dark:text-nur-gold"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            View on OpenStreetMap
          </a>
        ) : null}
      </Card>
    </li>
  );
}
