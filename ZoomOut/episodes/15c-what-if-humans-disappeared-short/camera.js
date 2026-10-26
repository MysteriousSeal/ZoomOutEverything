// Camera for "What If Humans Disappeared Tomorrow?" (60 s): one time-lapse journey. Owned by the orchestrator.
// 15c (the ~50 s cut): the camera runs on the LEGACY (15b-shaped) timeline of legacy.js, so the key numbers below are
// 15b's beats; the keys of the cut beats (1, 9) and the pumps window (4) are re-pointed so nothing jumps (notes '15c').
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
import { legacy } from './legacy.js';

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

// 15c: the time-lapse clock table (ELAPSED) lives in legacy.js (its values depend on the 15c word times).


// Camera keys. anchor 0.47: world point (x, y) sits at screen (540, 902).
// Beats 0-3 pull back street -> blocks -> power plant -> whole city; 4-7 lean back in on details (subway, forest,
// bridges); 8-12 is the signature pull-back: harbour -> region -> planet -> solar system -> the 100 ly bubble.
const cam = makeCamera([
  { x: -20, y: 10, mpp: 0.16, travel: 0 },                        // 0 hook: the crossing (statue upper left)
  // 1 15c: cut (zero length). It repeats the hook framing (push 1), so beat 2 pulls straight out of the hook
  { x: -20, y: 10, mpp: 0.16, travel: 0.5, push: 1.0 },
  // 2 Ravenswood power plant (screen ~ 860, 800: clear of the clock and the label). 15c: straight from the street
  // (0.16 m/px, 15b: from the 0.75 m/px blocks), so a higher pull keeps the pan speed near 15b's (no grid strobe). It
  // leaves 1.0 s before the beat (camTl below, ~5.9 s: the hook headline is already set), so the plant is on screen
  // as "power plants" is said. v15fx: a longer, gentler pull (15c had 2.5 s, lift 1.5: ~245 px/frame of zoom + pan
  // over the 0.4-1.4 m/px street detail, which strobed into stepped motion-blur copies); now peak ~175 px/frame (15b ~176)
  { x: 1278, y: -7735, mpp: 2.6, travel: 3.5, push: 0.98, lift: 1.3 },
  { x: -500, y: -8400, mpp: 12, travel: 1.5, push: 1.0 },         // 3 the whole of Manhattan goes dark
  // 4 15c: the pumps window is ~0.75 s now: the camera holds the whole dark island while the x-ray scan runs
  { x: -500, y: -8400, mpp: 12, travel: 0.3, push: 1.0 },
  { x: -300, y: -4700, mpp: 7.8, travel: 1.4, push: 0.96 },       // 5 the flood spreads up the lines (15c: from the island)
  { x: 100, y: -3400, mpp: 5.0, travel: 1.5, push: 0.97 },        // 6 forest takes the grid
  { x: 1050, y: -1000, mpp: 1.9, travel: 1.5, push: 0.97 },       // 7 Brooklyn + Manhattan bridges, Lower Manhattan towers (y ~ 760-1200)
  { x: 4964, y: 17052, mpp: 38, travel: 3.0, push: 1.03 },        // 8 the Narrows and the open ocean (15b: slower pull, no stepped blur)
  { x: 4964, y: 17052, mpp: 38, travel: 0.5, push: 1.03 },        // 9 15c: cut (zero length): repeats key 8, so beat 10 leaves from the Narrows
  { x: 0, y: 0, mpp: 2.1e4, travel: 2.6, push: 1.10 },            // 10 the dark planet (r ~ 303 px, eases to ~280)
  { x: 0, y: 0, mpp: 2.2e14, travel: 4.6, push: 1.0 },            // 11 out past the Sun and the nearest stars
  { x: 0, y: 0, mpp: 2.75e15, travel: 1.9, push: 1.06 },          // 12 the 100 ly bubble (r ~ 344 px, clear of the captions), still growing
], { anchor: 0.47, hookFrom: 0.86 });
// Beat 11 is a true-scale pull-back with three short dwells, so each landmark can be caught at its real distance:
// the Moon (~1.5-2.5 s), the Sun (~3-3.9 s), then the nearest stars (4.7 s on). [beat-11 seconds, log10 m/px]
// 15b: dwells widened so each tag reads >= 1.2 s (Moon tag ~1.3-2.75 s, Sun tag ~3.2-4.45 s)
// 15c: the beat is ~5.7 s (15b 6.1): the last leg (stars -> the key-12 start) lands at 5.55 s (15b 6.2), before the beat ends
// v15fx: dwells moved earlier so ALPHA CENTAURI gets its own ~1.3 s (it had ~0.75 s and popped off at the cut): Moon
// tag ~1.0-2.3 s, Sun tag ~2.5-3.75 s, Alpha Centauri ~4.1 s to the beat end, then the slow drift to the key-12 start
const B11 = [[0, 4.3636], [0.8, 4.7], [1.05, 5.9], [2.2, 6.68], [2.45, 8.3], [3.6, 8.97], [4.1, 13.8], [5.55, 14.3424]];
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
// 15c: the camera's own copy of the legacy timeline: the hook -> plant pull starts PULL_LEAD s before 15c beat 1 (the
// hook line has ended by then), so it lands on the plant by "power plants" (~1.5 s into the beat; 15b had ~2.9 s)
const PULL_LEAD = 1.0;   // v15fx: 0.4 -> 1.0 (with travel 3.5, see key 2)
const CAM_TL = new WeakMap();
function camTl(T) {
  let C = CAM_TL.get(T);
  if (C) return C;
  const t = T.scenes[2].start - PULL_LEAD;
  const scenes = T.scenes.map((s, i) => (i === 0 ? { ...s, end: t } : i === 1 || i === 2 ? { ...s, start: t } : s));
  C = { ...T, scenes };
  CAM_TL.set(T, C);
  return C;
}
export function at(gt, tl) {
  tl = camTl(legacy(tl));
  const c = cam.at(gt, tl);
  const s = tl.scenes[11];
  if (gt < s.start || gt >= s.end) return c;
  const mpp = Math.pow(10, b11(gt - s.start));
  return { ...c, x: L.noise1(gt * 0.3, 1) * 4 * mpp, y: L.noise1(gt * 0.27, 2) * 4 * mpp, mpp };
}
