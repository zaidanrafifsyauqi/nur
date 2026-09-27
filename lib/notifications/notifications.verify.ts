/**
 * Stage 5B — verification (run: `npx tsx lib/notifications/notifications.verify.ts`).
 * Pure preference/reminder/scheduler tests (no DOM, no real Notification)
 * + static integration/privacy asserts. Browser delivery, permission UI,
 * background and sleep behavior are NOT VERIFIED here by design (§30).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { notifyPrayerReminder } from "./notificationAdapter";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  isNotificationPreferences,
  NOTIF_PREFS_KEY,
  parseNotificationPreferences,
  REMINDER_OFFSETS,
  REMINDER_PRAYERS,
} from "./notificationPreferences";
import { isNotificationSupported } from "./notificationPermission";
import {
  formatReminderBody,
  getReminderTime,
  isFutureReminder,
  reminderId,
} from "./reminder";
import {
  cancelReminder,
  clearScheduledReminders,
  scheduledReminderIds,
  scheduleReminder,
} from "./reminderScheduler";

let pass = 0;
let fail = 0;
function check(cond: boolean, name: string): void {
  if (cond) {
    pass++;
    console.log(`PASS ${name}`);
  } else {
    fail++;
    console.log(`FAIL ${name}`);
  }
}

const root = join(__dirname, "..", "..");
const read = (p: string): string => readFileSync(join(root, p), "utf8");

// --- A. Preferences ---
check(DEFAULT_NOTIFICATION_PREFERENCES.enabled === false, "A. default disabled");
check(
  REMINDER_PRAYERS.length === 5 &&
    Object.values(DEFAULT_NOTIFICATION_PREFERENCES.prayers).every((v) => v === false),
  "A. all five prayers default OFF (no Sunrise)"
);
check(!("Sunrise" in DEFAULT_NOTIFICATION_PREFERENCES.prayers), "A. Sunrise excluded");
check(DEFAULT_NOTIFICATION_PREFERENCES.offsetMinutes === 10, "A. default offset 10");
check(
  isNotificationPreferences({
    enabled: true,
    prayers: { Fajr: true, Dhuhr: false, Asr: false, Maghrib: false, Isha: true },
    offsetMinutes: 5,
  }),
  "A. valid prefs accepted"
);
check(!isNotificationPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES, offsetMinutes: 7 }), "A. invalid offset rejected");
check(!isNotificationPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES, prayers: { Fajr: true } }), "A. incomplete prayers rejected");
check(
  !isNotificationPreferences({
    enabled: true,
    prayers: { ...DEFAULT_NOTIFICATION_PREFERENCES.prayers, Extra: true },
    offsetMinutes: 10,
  }),
  "A. invalid prayer key rejected"
);
check(parseNotificationPreferences(null).enabled === false, "A. null falls back");
check(parseNotificationPreferences("{{bad").offsetMinutes === 10, "A. malformed JSON safe");
check(NOTIF_PREFS_KEY === "nur:notifications:preferences:v1", "A. versioned key");

// --- B. Permission (Node has no Notification API) ---
check(isNotificationSupported() === false, "B. SSR/Node reports unsupported, no crash");

// --- C. Reminder calculation ---
const prayerAt = new Date(2026, 9, 15, 18, 0, 0);
check(getReminderTime(prayerAt, 10).getHours() === 17 && getReminderTime(prayerAt, 10).getMinutes() === 50, "C. 10-min offset");
check(getReminderTime(prayerAt, 0).getTime() === prayerAt.getTime(), "C. 0 offset identity");
check(getReminderTime(prayerAt, 5).getMinutes() === 55, "C. 5-min offset");
check(getReminderTime(prayerAt, 15).getHours() === 17, "C. 15-min offset");
check(prayerAt.getHours() === 18 && prayerAt.getMinutes() === 0, "C. prayer time unchanged");
check(isFutureReminder(new Date(Date.now() + 60000)) === true, "C. future accepted");
check(isFutureReminder(new Date(Date.now() - 60000)) === false, "C. past rejected");
check(reminderId("2026-10-15", "Fajr", 10) === "nur-reminder:2026-10-15:Fajr:10", "C. stable id");
check(
  formatReminderBody("Fajr", new Date(2026, 9, 15, 4, 24), "4:24 AM", 10, "12h") === "Fajr is in 10 minutes.",
  "C. body offset form"
);
check(
  formatReminderBody("Fajr", new Date(2026, 9, 15, 4, 24), "4:24 AM", 0, "12h") === "Fajr is at 4:24 AM.",
  "C. body 12h at-time"
);
check(
  formatReminderBody("Fajr", new Date(2026, 9, 15, 4, 24), "4:24 AM", 0, "24h") === "Fajr is at 04:24.",
  "C. body 24h reuses formatter"
);

// --- D. Duplicate scheduling (timers are real but harmless) ---
clearScheduledReminders();
let fires = 0;
check(scheduleReminder("t1", new Date(Date.now() + 60000), () => { fires++; }) === true, "D. future schedules");
check(scheduleReminder("t1", new Date(Date.now() + 60000), () => { fires += 10; }) === true, "D. same id replaces");
check(scheduledReminderIds().filter((id) => id === "t1").length === 1, "D. no duplicate timer");
check(scheduleReminder("past", new Date(Date.now() - 1000), () => { fires += 100; }) === false, "D. past never schedules");
scheduleReminder("t2", new Date(Date.now() + 60000), () => {});
cancelReminder("t2");
check(!scheduledReminderIds().includes("t2"), "D. cancel works");
clearScheduledReminders();
check(scheduledReminderIds().length === 0 && fires === 0, "D. clear + nothing fired early");

// --- E. Adapter guards ---
check(notifyPrayerReminder({ title: "t", body: "b" }) === false, "E. unsupported → false, no crash");

// --- F. Prayer integration (static) ---
const live = read("components/prayer/PrayerLive.tsx");
const home = read("components/home/HomePrayerSection.tsx");
check(live.includes("PrayerReminderSync") && home.includes("PrayerReminderSync"), "F. sync islands mounted");
const prefs = read("lib/prayer/prayerPreferences.ts");
check(prefs.includes("calculationMethod"), "F. method pref remains source of truth");
check(
  JSON.stringify([...REMINDER_OFFSETS]) === JSON.stringify([0, 5, 10, 15]),
  "A. offset options fixed"
);

// --- G. Privacy (static) ---
for (const f of [
  "lib/notifications/notificationPreferences.ts",
  "lib/notifications/useNotificationPreferences.ts",
  "lib/notifications/reminder.ts",
  "lib/notifications/reminderScheduler.ts",
  "lib/notifications/notificationAdapter.ts",
]) {
  const src = read(f).toLowerCase();
  check(
    !src.includes("latitude") && !src.includes("longitude") && !src.includes("analytic"),
    `G. clean ${f.split("/").pop()}`
  );
}
check(!read("lib/notifications/useNotificationPreferences.ts").includes("Notification("), "G. no delivery in store");

// --- H. Profile UI (static) ---
const profile = read("components/profile/ProfileSettings.tsx");
check(profile.includes("NotificationSettings"), "H. section mounted in profile");
const notif = read("components/notifications/NotificationSettings.tsx");
for (const needle of [
  "Enable Notifications",
  "Prayer reminders",
  "Remind me",
  "Blocked",
  "Not enabled",
  "Unsupported",
  'htmlFor="reminder-offset"',
  'type="checkbox"',
]) {
  check(notif.includes(needle), `H. ui marker: ${needle}`);
}
check(!notif.includes("requestPermission()") || notif.includes("handleEnable"), "H. request only via action");
const prayerSettings = read("components/prayer/PrayerSettings.tsx");
check(prayerSettings.includes("/profile") && prayerSettings.includes("Manage prayer notifications"), "H. prayer CTA links profile");

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
