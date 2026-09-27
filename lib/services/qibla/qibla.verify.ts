/**
 * Stage 3A — pure-logic verification (run: `npx tsx lib/services/qibla/qibla.verify.ts`).
 * Bearing references are published Qibla values ± tolerance; sensor tests
 * use synthetic readings (no physical compass claims — see report).
 */
import {
  isAligned,
  lerpAngleCircular,
  normalize360,
  shortestAngularDifference,
} from "./angles";
import { calculateQiblaBearing, QiblaBearingError } from "./bearing";
import { KAABA_COORDINATES } from "./config";
import { orientationToHeading } from "./heading";

let pass = 0;
let fail = 0;
function check(cond: boolean, name: string, extra = ""): void {
  if (cond) {
    pass++;
    console.log(`PASS ${name}`);
  } else {
    fail++;
    console.log(`FAIL ${name} ${extra}`);
  }
}

function near(actual: number, expected: number, tol: number): boolean {
  return Math.abs(actual - expected) <= tol;
}

// --- Bearing: known locations (published values ± tolerance) ---
const jakarta = calculateQiblaBearing({ latitude: -6.2, longitude: 106.85 });
check(near(jakarta.bearing, 295, 1.5), "jakarta bearing", String(jakarta.bearing));
check(!jakarta.atKaaba && jakarta.distanceKm > 7000 && jakarta.distanceKm < 8500, "jakarta distance sane");

const yogya = calculateQiblaBearing({ latitude: -7.8, longitude: 110.36 });
check(near(yogya.bearing, 295, 1.5), "yogyakarta bearing", String(yogya.bearing));

const london = calculateQiblaBearing({ latitude: 51.5, longitude: -0.12 });
check(near(london.bearing, 119, 1.5), "london bearing", String(london.bearing));

const nyc = calculateQiblaBearing({ latitude: 40.71, longitude: -74.0 });
check(near(nyc.bearing, 58.5, 1.5), "new york bearing", String(nyc.bearing));

const tokyo = calculateQiblaBearing({ latitude: 35.68, longitude: 139.69 });
check(near(tokyo.bearing, 293, 1.5), "tokyo bearing", String(tokyo.bearing));

// --- Zero distance: explicit state, never NaN ---
const kaaba = calculateQiblaBearing({
  latitude: KAABA_COORDINATES.latitude,
  longitude: KAABA_COORDINATES.longitude,
});
check(kaaba.atKaaba === true, "kaaba zero-distance flagged");
check(Number.isFinite(kaaba.bearing) && Number.isFinite(kaaba.distanceKm), "kaaba no NaN");

// --- Validation rejects (never clamps) ---
for (const [name, coords] of [
  ["lat>90", { latitude: 91, longitude: 0 }],
  ["lat<-90", { latitude: -91, longitude: 0 }],
  ["lng>180", { latitude: 0, longitude: 181 }],
  ["lng<-180", { latitude: 0, longitude: -181 }],
  ["NaN", { latitude: NaN, longitude: 0 }],
  ["Infinity", { latitude: 0, longitude: Infinity }],
] as const) {
  try {
    calculateQiblaBearing(coords);
    check(false, `reject ${name}`);
  } catch (e) {
    check(e instanceof QiblaBearingError, `reject ${name}`);
  }
}

// --- Normalization ---
check(normalize360(-1) === 359, "norm -1 → 359");
check(normalize360(360) === 0, "norm 360 → 0");
check(normalize360(721) === 1, "norm 721 → 1");

// --- Shortest difference (positive = turn right) ---
check(shortestAngularDifference(359, 1) === 2, "diff 359→1 = +2");
check(shortestAngularDifference(1, 359) === -2, "diff 1→359 = -2");
check(shortestAngularDifference(10, 350) === -20, "diff wrap left");
check(shortestAngularDifference(0, 180) === 180, "diff opposite");

// --- Alignment (tolerance 5) ---
check(isAligned(0, 5) && isAligned(4, 5) && isAligned(5, 5), "aligned ≤5");
check(!isAligned(6, 5) && !isAligned(-6, 5), "not aligned >5");

// --- Circular smoothing (never 180 for 359→1) ---
check(lerpAngleCircular(359, 1, 0.5) === 0, "lerp 359→1 = 0");
check(near(lerpAngleCircular(10, 350, 0.5), 0, 1e-9), "lerp 10→350 ≈ 0");
check(near(lerpAngleCircular(0, 90, 0.25), 22.5, 1e-9), "lerp fraction");

// --- Heading synthetics ---
check(orientationToHeading({ alpha: 0, absolute: true, screenAngle: 0 }).heading === 0, "alpha 0 → 0");
check(orientationToHeading({ alpha: 90, absolute: true, screenAngle: 0 }).heading === 270, "alpha 90 → 270");
check(orientationToHeading({ alpha: 180, absolute: true, screenAngle: 0 }).heading === 180, "alpha 180 → 180");
check(orientationToHeading({ alpha: 270, absolute: true, screenAngle: 0 }).heading === 90, "alpha 270 → 90");
check(orientationToHeading({ alpha: null, absolute: true, screenAngle: 0 }).reliable === false, "null alpha unreliable");
check(orientationToHeading({ alpha: 45, absolute: false, screenAngle: 0 }).reliable === false, "relative unreliable");
check(orientationToHeading({ alpha: 0, absolute: true, screenAngle: 90 }).heading === 90, "landscape +90");
check(orientationToHeading({ alpha: 0, absolute: true, screenAngle: 270 }).heading === 270, "landscape 270");
check(orientationToHeading({ alpha: NaN, absolute: true, screenAngle: 0 }).reliable === false, "NaN unreliable");

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
