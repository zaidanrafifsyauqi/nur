import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/containers";
import { ProfileSettings } from "@/components/profile/ProfileSettings";

export const metadata: Metadata = { title: "Settings — NUR" };

/**
 * Anonymous-first settings center (no account, no backend).
 * Server shell; all state comes from existing client stores
 * (theme, prayer prefs, geolocation). No fetching, no new APIs.
 */
export default function ProfilePage() {
  return (
    <PageContainer className="max-w-2xl">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <span
            aria-hidden
            className="flex h-16 w-16 items-center justify-center rounded-3xl bg-nur-sand text-2xl font-bold text-nur-ink dark:bg-[var(--nur-surface-2)] dark:text-[var(--nur-text)]"
          >
            ن
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            <p className="mt-1 text-sm text-[var(--nur-text-secondary)]">
              Your NUR preferences · Stored locally on this device · No account needed
            </p>
          </div>
        </div>
        <ProfileSettings />
      </div>
    </PageContainer>
  );
}
