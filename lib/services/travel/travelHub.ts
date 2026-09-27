/**
 * Stage 3D — Travel Hub feature configuration (single source of truth).
 *
 * Links only — no services, no fetching, no duplication. Every href must
 * be an existing NUR route (verified by travelHub.verify.ts).
 */
import {
  Compass,
  Map as MapIcon,
  MoonStar,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

export interface TravelFeature {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

export const TRAVEL_FEATURES: TravelFeature[] = [
  {
    id: "muslim-map",
    title: "Muslim Map",
    description: "Find mosques and halal places nearby.",
    href: "/travel/map",
    icon: MapIcon,
  },
  {
    id: "qibla",
    title: "Qibla",
    description: "Find the direction of the Kaaba.",
    href: "/travel/qibla",
    icon: Compass,
  },
  {
    id: "prayer-times",
    title: "Prayer Times",
    description: "Check today's prayer times.",
    href: "/prayer",
    icon: MoonStar,
  },
];

export interface TravelQuickAction {
  id: string;
  shortLabel: string;
  href: string;
  icon: LucideIcon;
}

/** Feature shortcuts + category shortcuts (both land on existing routes). */
export const TRAVEL_QUICK_ACTIONS: TravelQuickAction[] = [
  { id: "map", shortLabel: "Muslim Map", href: "/travel/map", icon: MapIcon },
  { id: "qibla", shortLabel: "Qibla", href: "/travel/qibla", icon: Compass },
  { id: "prayer", shortLabel: "Prayer Times", href: "/prayer", icon: MoonStar },
  { id: "mosques", shortLabel: "Mosques", href: "/travel/map", icon: MoonStar },
  {
    id: "halal-food",
    shortLabel: "Halal Food",
    href: "/travel/map",
    icon: UtensilsCrossed,
  },
];

export function isValidTravelHref(href: string): boolean {
  if (!href.startsWith("/") || href.includes(" ")) return false;
  return (
    TRAVEL_FEATURES.some((f) => f.href === href) ||
    TRAVEL_QUICK_ACTIONS.some((a) => a.href === href)
  );
}
