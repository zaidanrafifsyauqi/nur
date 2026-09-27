import type { DayPrayerTimes, HijriDate } from "@/lib/types";

export const mockHijriToday: HijriDate = {
  day: "2",
  month: "Rabi' al-Akhir",
  year: "1448",
  formatted: "2 Rabi' al-Akhir 1448",
  weekday: "Thursday",
};

export const mockPrayerDay: DayPrayerTimes = {
  location: "Jakarta, Indonesia",
  locationDetail: "Mock location · GPS placeholder",
  gregorianDate: "Thursday, September 24, 2026",
  hijriDate: mockHijriToday,
  prayers: [
    { name: "Fajr", time: "04:38", displayTime: "4:38 AM", passed: true, isNext: false },
    { name: "Dhuhr", time: "11:52", displayTime: "11:52 AM", passed: false, isNext: true },
    { name: "Asr", time: "15:08", displayTime: "3:08 PM", passed: false, isNext: false },
    { name: "Maghrib", time: "17:55", displayTime: "5:55 PM", passed: false, isNext: false },
    { name: "Isha", time: "19:06", displayTime: "7:06 PM", passed: false, isNext: false },
  ],
  next: {
    name: "Dhuhr",
    time: "11:52",
    displayTime: "11:52 AM",
    countdownPlaceholder: "01:24:10",
    progress: 0.62,
  },
};

/** NOTE: Stage 1 mock. Stage 2 replaces with calculation / API service. */
export const mockPrayerNote =
  "Mock schedule for Jakarta. Times are illustrative placeholders, not fatwa-grade calculations.";
