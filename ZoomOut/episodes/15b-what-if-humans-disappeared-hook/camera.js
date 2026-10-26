// Camera for "What If Humans Disappeared Tomorrow?" (60 s): one time-lapse journey. Owned by the orchestrator.
//
// WORLD: TOP-DOWN (satellite view) in metres. x = east, y = south (screen down). The frame is rotated so that
// Manhattan's long axis points straight up (a portrait-friendly island), so "north" here means "uptown".
//   PLAZA (0, 0) region: a busy avenue/street crossing in Lower Manhattan; a small plaza with a bronze statue.
//   City grid: avenues every 260 m (30 m wide) at x = k·260, streets every 80 m (18 m wide) at y = k·80.
//   PLANT: a power station on the far (Brooklyn/Queens) bank of the East River.
//   BRIDGES: three East River suspension bridges (Brooklyn, Manhattan, Williamsburg), as deck end points.
//   The Earth's centre is ALSO the origin: the final pull-back looks straight down on New York, so the city sits at
//   the centre of the planet's disc, then the planet becomes a dot at the centre of the radio bubble.
import { makeCamera } from '../../../engine/runtime/kit.js';
import * as L from '../../../engine/runtime/lib.js';

export const R_EARTH = 6.371e6;
export const C = 299792458;
export const LY = 9.4607e15;
export const AU = 1.496e11;

export const GRID = { ave: 260, aveW: 30, st: 80, stW: 18 };
// REAL GEOGRAPHY: the world is an orthographic projection of the Earth about GEO_ORIGIN (world 0,0), rolled by GEO_TILT
// (deg, earth.js convention) so Manhattan's street grid runs straight up. geo-nyc.js holds the real coastlines in these
// metres; the planet (earth.js drawEarth with the same lat0/lon0/tilt) lines up with them exactly.
export const GEO_ORIGIN = { lat: 40.704869047, lon: -74.012910625 };
export const GEO_TILT = -29;
export const PLAZA = { x: -75, y: -45 };                       // the bronze statue: the Charging Bull, Bowling Green
export const PLANT = { x: 2110, y: -8000, w: 380, h: 300 };    // Ravenswood Generating Station, Queens bank of the East River
// suspension bridges: main-span TOWERS (Manhattan tower x0,y0 -> Brooklyn tower x1,y1) and the anchorages (a0, a1)
export const BRIDGES = {
  brooklyn: { x0: 921, y0: -845, x1: 1370, y1: -713 },
  manhattan: { x0: 1314, y0: -1178, x1: 1757, y1: -1092 },
  williamsburg: { x0: 2277, y0: -2449, x1: 2757, y1: -2538 },
};
export const CENTRAL_PARK = { x0: -1126, y0: -11548, x1: -270, y1: -7416 };
export const NARROWS = { x: 2950, y: 10858 };                 // the Verrazzano Narrows, the harbour mouth
export const SUN_DIR = { x: 0.62, y: -0.78 };                  // sunlight comes from the upper right (planet crescent)
export const BUBBLE_R = 100 * LY;                              // radio bubble radius today (≈ 1920s broadcasts)

// Time-lapse clock: hours elapsed since everyone vanished, reached by each beat (null = clock leaves).
// `at`/`dur`: when the count runs inside the beat (seconds after the beat start).
const YR = 8766;
export const ELAPSED = [
  { h: 0 },
  { h: 1, at: 0.2, dur: 1.4 },          // 1 the lights stay on
  { h: 4, at: 0.3, dur: 1.8 },          // 2 within hours: plants shut down
  { h: 8, at: 0.2, dur: 2.4 },          // 3 the blackout spreads
  { h: 24, at: 0.2, dur: 2.4 },         // 4 pumps (one day/night sweep)
  { h: 48, at: 0.3, dur: 2.5 },         // 5 the subway floods: locks on 2 DAYS at +2.8 ("about two days"), with the label
  { h: 20 * YR, at: 0.1, dur: 0.7 },    // 6 twenty years: forest (lands on "twenty", ~27.9 s)
  { h: 300 * YR, at: 0.1, dur: 1.9 },   // 7 a few centuries: bridges fall
  { h: 1000 * YR, at: 0.2, dur: 1.5 },  // 8 plastic
  { h: 3e6 * YR, at: 0.3, dur: 2.9 },   // 9 bronze: millions of years (15b: runs on past 1,000,000 to 3,000,000, locking on "millions")
  null, null, null,                     // 10-12 the clock gives way to the light-year scale
];

// Camera keys. anchor 0.47: world point (x, y) sits at screen (540, 902).
// Beats 0-3 pull back street -> blocks -> power plant -> whole city; 4-7 lean back in on details (subway, forest,
// bridges); 8-12 is the signature pull-back: harbour -> region -> planet -> solar system -> the 100 ly bubble.
const cam = makeCamera([
  { x: -20, y: 10, mpp: 0.16, travel: 0 },                        // 0 hook: the crossing (statue upper left)
  { x: 40, y: -40, mpp: 0.75, travel: 1.4, push: 0.97 },          // 1 a few blocks, all lit (the Battery shore below)
  { x: 1278, y: -7735, mpp: 2.6, travel: 2.3, push: 0.97, lift: 1.0 },     // 2 Ravenswood power plant (screen ~ 860, 800: clear of the clock and the label; slower pull = no grid strobe)
  { x: -500, y: -8400, mpp: 12, travel: 1.5, push: 1.0 },         // 3 the whole of Manhattan goes dark
  { x: -300, y: -5000, mpp: 8.5, travel: 1.3, push: 0.97 },       // 4 subway x-ray (Lower + Midtown)
  { x: -300, y: -4700, mpp: 7.8, travel: 0.9, push: 0.96 },       // 5 the flood spreads up the lines
  { x: 100, y: -3400, mpp: 5.0, travel: 1.5, push: 0.97 },        // 6 forest takes the grid
  { x: 1050, y: -1000, mpp: 1.9, travel: 1.5, push: 0.97 },       // 7 Brooklyn + Manhattan bridges, Lower Manhattan towers (y ~ 760-1200)
  { x: 4964, y: 17052, mpp: 38, travel: 3.0, push: 1.03 },        // 8 the Narrows and the open ocean (15b: slower pull, no stepped blur)
  { x: 0, y: -12000, mpp: 140, travel: 1.5, push: 1.03 },         // 9 the region; the plaza at screen y ~ 988
  { x: 0, y: 0, mpp: 2.1e4, travel: 2.6, push: 1.10 },            // 10 the dark planet (r ~ 303 px, eases to ~280)
  { x: 0, y: 0, mpp: 2.2e14, travel: 4.6, push: 1.0 },            // 11 out past the Sun and the nearest stars
  { x: 0, y: 0, mpp: 2.75e15, travel: 1.9, push: 1.06 },          // 12 the 100 ly bubble (r ~ 344 px, clear of the captions), still growing
], { anchor: 0.47, hookFrom: 0.86 });
// Beat 11 is a true-scale pull-back with three short dwells, so each landmark can be caught at its real distance:
// the Moon (~1.5-2.5 s), the Sun (~3-3.9 s), then the nearest stars (4.7 s on). [beat-11 seconds, log10 m/px]
// 15b: dwells widened so each tag reads >= 1.2 s (Moon tag ~1.3-2.75 s, Sun tag ~3.2-4.45 s)
// v15fx: Sun + stars dwells 0.2-0.5 s earlier, so ALPHA CENTAURI reads ~1.25 s at full strength before the beat-end fade
// (it had < 1 s): Moon tag ~1.3-2.6 s, Sun tag ~2.8-4.1 s, Alpha Centauri ~4.55 s to the beat end
const B11 = [[0, 4.3636], [1.0, 4.7], [1.3, 5.9], [2.55, 6.68], [2.8, 8.3], [4.0, 8.97], [4.55, 13.8], [6.2, 14.3424]];
// monotone cubic (Fritsch-Carlson) through B11: smooth velocity, slow where the keys are close in log scale
const B11M = (() => {
  const n = B11.length, dk = [], m = new Array(n).fill(0);
  m[0] = 0; m[n - 1] = 0;
  for (let i = 0; i < n - 1; i++) dk.push((B11[i + 1][1] - B11[i][1]) / (B11[i + 1][0] - B11[i][0]));
  for (let i = 1; i < n - 1; i++) m[i] = dk[i - 1] * dk[i] <= 0 ? 0 : (2 * dk[i - 1] * dk[i]) / (dk[i - 1] + dk[i]);   // harmonic mean
  return m;
})();
function b11(t) {
  t = L.clamp(t, 0, B11[B11.length - 1][0]);
  let i = 0;
  while (i < B11.length - 2 && t > B11[i + 1][0]) i++;
  const [t0, y0] = B11[i], [t1, y1] = B11[i + 1], h = t1 - t0, u = (t - t0) / h;
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
  return h00 * y0 + h10 * h * B11M[i] + h01 * y1 + h11 * h * B11M[i + 1];
}
export function at(gt, tl) {
  const c = cam.at(gt, tl);
  const s = tl.scenes[11];
  if (gt < s.start || gt >= s.end) return c;
  const mpp = Math.pow(10, b11(gt - s.start));
  return { ...c, x: L.noise1(gt * 0.3, 1) * 4 * mpp, y: L.noise1(gt * 0.27, 2) * 4 * mpp, mpp };
}
