import type { MetadataRoute } from "next";

/**
 * Stage 5C — Web App Manifest (Next.js metadata route → /manifest.webmanifest).
 * Installable, standalone, NUR brand tokens. Icons are generated PNGs
 * (scripts/make-pwa-icons.mjs) — no emoji, no external URLs.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NUR — Muslim Travel Companion",
    short_name: "NUR",
    description: "Your daily Islamic & Muslim travel companion.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    theme_color: "#0F5C4D",
    background_color: "#FCFBF7",
    lang: "en",
    dir: "ltr",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
