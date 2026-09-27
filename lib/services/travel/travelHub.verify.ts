/**
 * Stage 3D — Travel Hub config tests (run: `npx tsx lib/services/travel/travelHub.verify.ts`).
 * Covers §20: routes valid, labels/icons/hrefs present, category links sane.
 */
import { TRAVEL_FEATURES, TRAVEL_QUICK_ACTIONS, isValidTravelHref } from "./travelHub";

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

check(TRAVEL_FEATURES.length === 3, "three travel essentials");
for (const f of TRAVEL_FEATURES) {
  check(
    f.id.trim() !== "" && f.title.trim() !== "" && f.description.trim() !== "",
    `feature labels exist: ${f.id}`
  );
  check(typeof f.icon === "function" || typeof f.icon === "object", `feature icon exists: ${f.id}`);
  check(isValidTravelHref(f.href), `feature href valid: ${f.href}`);
}
check(
  ["/travel/map", "/travel/qibla", "/prayer"].every((h) =>
    TRAVEL_FEATURES.some((f) => f.href === h)
  ),
  "all routes covered"
);
const ids = TRAVEL_QUICK_ACTIONS.map((a) => a.id);
check(new Set(ids).size === ids.length, "quick action ids unique");
for (const a of TRAVEL_QUICK_ACTIONS) {
  check(a.shortLabel.trim() !== "" && isValidTravelHref(a.href), `quick action valid: ${a.id}`);
}
check(
  TRAVEL_QUICK_ACTIONS.some((a) => a.id === "mosques" && a.href === "/travel/map"),
  "mosques shortcut links map"
);
check(
  TRAVEL_QUICK_ACTIONS.some((a) => a.id === "halal-food" && a.href === "/travel/map"),
  "halal shortcut links map"
);
check(!isValidTravelHref("https://evil.example") && !isValidTravelHref("/has space"), "href guard rejects");

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
