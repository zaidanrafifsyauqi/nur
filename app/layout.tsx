import type { Metadata, Viewport } from "next";
import { Amiri, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// Stage 3B — MapLibre styles (global CSS must live in the root layout).
import "maplibre-gl/dist/maplibre-gl.css";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { OfflineBanner } from "@/components/system/OfflineBanner";
import { ServiceWorkerRegister } from "@/components/system/ServiceWorkerRegister";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "NUR — Islamic & Muslim Travel Companion",
  description:
    "A modern Islamic companion for prayer times, Quran, duas, Hijri calendar, Qibla and Muslim-friendly travel.",
  metadataBase: new URL("https://nur.app"),
  openGraph: {
    title: "NUR — Islamic & Muslim Travel Companion",
    description:
      "A modern Islamic companion for prayer times, Quran, duas, Hijri calendar, Qibla and Muslim-friendly travel.",
    type: "website",
  },
};

/** Stage 5C — PWA theme color (matches manifest + NUR Deep Emerald). */
export const viewport: Viewport = {
  themeColor: "#0F5C4D",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${amiri.variable} min-h-screen antialiased`}
      >
        <ThemeProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium"
          >
            Skip to content
          </a>
          <AppHeader />
          <div className="mx-auto flex w-full max-w-5xl items-start gap-6 px-0 sm:px-0 lg:px-0">
            <AppSidebar />
            <main id="main" className="min-h-[calc(100vh-4rem)] min-w-0 flex-1">
              {children}
            </main>
          </div>
          <MobileBottomNav />
          <OfflineBanner />
          <ServiceWorkerRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
