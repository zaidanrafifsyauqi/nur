import { BookOpen, Compass, Home, MoonStar, Plane, Sparkles } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/prayer", label: "Prayer", icon: MoonStar },
  { href: "/quran", label: "Quran", icon: BookOpen },
  { href: "/islamic", label: "Islamic", icon: MoonStar },
  { href: "/travel", label: "Travel", icon: Plane },
  { href: "/nur-ai", label: "NUR AI", icon: Sparkles },
] as const;

export const TRAVEL_QIBLA_ICON = Compass;
