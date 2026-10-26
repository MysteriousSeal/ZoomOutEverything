// Camera for "The Year 10 Days Vanished" (EP 24, Hidden History). Owned by the orchestrator — builders: read, don't edit.
//
// WORLD: one flat, top-down "orrery + manuscript" plane. Units: u, where the ORBIT RADIUS = 9,000 u (1 AU), so
//   1 u = 16,622 km and Earth's radius = 0.3833 u. Everything orbital is TRUE SCALE (Earth, the 11-minute gap, days).
//   y points DOWN (screen convention). The Sun is at (0, 0). The spring-equinox point E is straight UP from the Sun:
//   E = (0, −R_ORB). Earth moves counter-clockwise as seen from the north (on screen: from E it moves to the LEFT).
//   orbitPos(phi) = position after an angle phi (rad) PAST the equinox: (−R sin phi, −R cos phi).
//   1 day of orbit = U_PER_DAY = 154.83 u; 11 min 15 s (one Julian year's error) = G1 = 1.209 u ≈ 1.6 Earth diameters.
//
// THE DESK: the manuscript props sit "above" the orbit (y < −10,000), far from it, and are only seen at mpp ≈ 1
//   (1 u ≈ 1 px):
//     P_OCT   (0, −11400)       the October 1582 calendar page (PAGE_W × PAGE_H u), beats 0, 1, 8, 13 and the preroll
//     P_COIN  (−1250, −11400)   Julius Caesar coin medallion (≈ 560 u across), beat 2
//     P_LEAP  (1250, −11500)    the 400-year leap-rule grid, beat 9
//     P_FEB   (1250, −10550)    February 1900 vs February 2000 mini-calendars, beat 10
//     P_UK    (2600, −11760)    real-coastline map of Britain (earth.js), beat 11 (upper half of the frame)
//     P_SEP   (2600, −10930)    September 1752 page, beat 11 (lower half)
//
// SHOTS: kit.js makeCamera with one key per SHOT (not per beat), started at voice-timeline times (as in ep 21). The
//   drift beats (4 → 7) are one continuous pull-out from two real Earths 11 minutes apart to a 10-day gap; env.js ties
//   the gap to the camera's mpp so it always fills the frame (driftU).
import { makeCamera } from '../../../engine/runtime/kit.js';
import * as L from '../../../engine/runtime/lib.js';

// ------------------------------------------------------------------ astronomy (true numbers; see script.md FACT-CHECK)
export const R_ORB = 9000;                                  // u = 1 AU
export const KM_PER_U = 149597870.7 / R_ORB;                // 16,622 km
export const R_EARTH_U = 6371 / KM_PER_U;                   // 0.3833 u
export const R_SUN_U = 696000 / KM_PER_U;                   // 41.9 u
export const TROPICAL = 365.24219;                          // mean tropical year (days)
export const JULIAN = 365.25;
export const GREGORIAN = 365.2425;
export const ERR_JUL = JULIAN - TROPICAL;                   // 0.00781 d/yr = 11 min 14.8 s
export const ERR_GREG = GREGORIAN - TROPICAL;               // 0.00031 d/yr = 26.8 s
export const U_PER_DAY = (2 * Math.PI * R_ORB) / TROPICAL;  // 154.83 u of orbit per day
export const G1 = ERR_JUL * U_PER_DAY;                      // 1.209 u: one Julian year's slip along the orbit
export const DRIFT_1582 = (1582 - 325) * ERR_JUL;           // 9.82 days (counted from the Council of Nicaea, AD 325)
export const D1 = U_PER_DAY;                                // 1 day of orbit (u)
export const D10 = DRIFT_1582 * U_PER_DAY;                  // ≈ 1,520 u
export const SUN = { x: 0, y: 0 };
export const EQX = { x: 0, y: -R_ORB };
/** World position after angle phi (rad) past the spring equinox (counter-clockwise from the north = leftward on screen). */
export const orbitPos = (phi) => ({ x: -R_ORB * Math.sin(phi), y: -R_ORB * Math.cos(phi) });
/** World position `u` arc-units past the equinox. */
export const arcPos = (u) => orbitPos(u / R_ORB);
/** Midpoint of the arc between the equinox and `u` units past it. */
const arcMid = (u) => arcPos(u / 2);

// ------------------------------------------------------------------ the desk (manuscript props)
export const PAGE_W = 860, PAGE_H = 960;                    // the October 1582 page (u)
export const P_OCT = { x: 0, y: -11400 };
export const P_COIN = { x: -1250, y: -11400 };
export const P_LEAP = { x: 1250, y: -11500 };
export const P_FEB = { x: 1250, y: -10550 };
export const P_UK = { x: 2600, y: -11760 };
export const P_SEP = { x: 2600, y: -10930 };

// ------------------------------------------------------------------ shots
const ANCHOR = 0.47, AY = L.H * ANCHOR;                     // world (x, y) = cam centre lands at screen (540, 902.4)
/** cam.y that puts world y `wy` at screen row `sy` for a given mpp */
const rowAt = (wy, sy, mpp) => wy + (AY - sy) * mpp;
const B = (i) => (tl) => tl.scenes[i].start;
const PH = (i, j, dt = 0) => (tl) => tl.lines[i].phrases[j].start + dt;
const END = (i, dt = 0) => (tl) => tl.lines[i].end + dt;

export const MPP = { page: 1.12, oct: 0.92, coin: 0.95, orbit: 22, close: 0.0024, day: 0.298, ten: 2.92, gorbit: 23, leap: 1.0, feb: 1.0, uk: 1.3, home: 1.2 };
export const EARTH_SY = 860;                                // screen row of the orbit at the equinox in beats 4–7 and 12
export const SUN_SY = 880;                                  // screen row of the Sun in the full-orbit view (beat 3)

export const SHOTS = [
  // beat 0: the torn October 1582 page (end state); the page centre at screen y ≈ 1050 (top ≈ 600) under the hook headline
  { name: 'hook', beat: 0, at: B(0), x: P_OCT.x, y: rowAt(P_OCT.y, 1050, MPP.page), mpp: MPP.page, travel: 0 },
  // beat 1: gentle push in on the whole page (860 u → 935 px wide, x 72–1007); page centre at y 900 → top ≈ 378,
  // the resting strip (page y +342) at ≈ 1272, above the caption band
  { name: 'oct', beat: 1, at: B(1), x: P_OCT.x, y: rowAt(P_OCT.y, 900, MPP.oct), mpp: MPP.oct, travel: 1.5 },
  // beat 2: slide left to Caesar's coin
  { name: 'caesar', beat: 2, at: B(2), x: P_COIN.x, y: rowAt(P_COIN.y, 900, MPP.coin), mpp: MPP.coin, travel: 1.6 },
  // beat 3: pull out to the whole orbit (Sun at screen y 880, orbit radius ≈ 409 px)
  { name: 'orbit', beat: 3, at: B(3), x: 0, y: rowAt(0, SUN_SY, MPP.orbit), mpp: MPP.orbit, travel: 2.4, push: 0.97 },
  // beat 4: dive 4 orders of magnitude into the equinox: two real Earths (r ≈ 160 px), 11 minutes of orbit apart (≈ 500 px)
  { name: 'close', beat: 4, at: B(4), x: arcMid(G1).x, y: rowAt(-R_ORB, EARTH_SY, MPP.close), mpp: MPP.close, travel: 1.7, push: 1 },
  { name: 'close-hold', beat: 5, at: B(5), x: arcMid(G1).x, y: rowAt(-R_ORB, EARTH_SY, MPP.close), mpp: MPP.close, travel: 0.4, push: 0.975 },
  // beat 6: pull out while the gap grows to one day (≈ 520 px)
  { name: 'day', beat: 6, at: B(6), x: arcMid(D1).x, y: rowAt(arcMid(D1).y, EARTH_SY, MPP.day), mpp: MPP.day, travel: 2.8, push: 1 },
  // beat 7: pull out while the gap grows to ten days (≈ 520 px)
  { name: 'ten', beat: 7, at: B(7), x: arcMid(D10).x, y: rowAt(arcMid(D10).y, EARTH_SY, MPP.ten), mpp: MPP.ten, travel: 2.2, push: 1.03 },
  // beat 8: back to the page (centre at screen y 1000 → page y ≈ 570–1430, leaves the band y 200–540 for the preroll headline)
  { name: 'page', beat: 8, at: B(8), x: P_OCT.x, y: rowAt(P_OCT.y, 1000, MPP.page), mpp: MPP.page, travel: 1.7, push: 0.97 },
  // beat 9: the 400-year leap rule (grid centred at screen y 900)
  { name: 'leap', beat: 9, at: B(9), x: P_LEAP.x, y: rowAt(P_LEAP.y, 900, MPP.leap), mpp: MPP.leap, travel: 1.5 },
  // beat 10: February 1900 vs February 2000 (centred at screen y 900)
  { name: 'feb', beat: 10, at: B(10), x: P_FEB.x, y: rowAt(P_FEB.y, 900, MPP.feb), mpp: MPP.feb, travel: 1.4 },
  // beat 11: Britain (map, upper) + September 1752 (page, lower); P_UK lands at screen y ≈ 620, P_SEP at ≈ 1260
  { name: 'uk', beat: 11, at: B(11), x: P_UK.x, y: rowAt((P_UK.y + P_SEP.y) / 2, 940, MPP.uk), mpp: MPP.uk, travel: 1.6, push: 0.97 },
  // beat 12: pull out to the WHOLE orrery (Sun at y 900, ring r 391 px + month ring; equinox label clear of the HUD readout) on "Even today, the calendar drifts…",
  // then dive to the equinox (1 day ≈ 370 px) on "…every three thousand years"; env grows the Gregorian drift during the dive
  { name: 'gorbit', beat: 12, at: B(12), x: 0, y: rowAt(0, 900, MPP.gorbit), mpp: MPP.gorbit, travel: 1.6, push: 0.97 },
  { name: 'drift', beat: 12, at: (tl) => tl.scenes[12].start + 2.35, x: arcMid(D1).x, y: rowAt(arcMid(D1).y, EARTH_SY, 0.42), mpp: 0.42, travel: 1.5, push: 1.02 },
  // home: back to the page for the question card (starts at beat 13; the card fades in at +0.4 s)
  { name: 'home', beat: 13, at: (tl) => tl.scenes[13].start, x: P_OCT.x, y: rowAt(P_OCT.y, 1060, MPP.home), mpp: MPP.home, travel: 1.7, lift: 1.0, push: 0.985 },
];
export const KEYS = SHOTS;

const cam = makeCamera(SHOTS, { anchor: ANCHOR, hookFrom: 0.94, drift: 3 });
const shotCache = new WeakMap();
/** The voice timeline re-cut into one "scene" per SHOT (what makeCamera walks). */
export function shotTl(tl) {
  let s = shotCache.get(tl);
  if (!s) {
    const st = SHOTS.map((k) => k.at(tl));
    s = { ...tl, scenes: st.map((a, i) => ({ start: a, end: i + 1 < st.length ? st[i + 1] : tl.total })) };
    shotCache.set(tl, s);
  }
  return s;
}
/** Camera at film time gt: {x, y, mpp, anchor}. */
export const at = (gt, tl) => cam.at(gt, shotTl(tl));
/** The shot playing at gt: {index, name, start, end, p (0→1 over its travel)}. */
export function shotAt(gt, tl) {
  const st = shotTl(tl).scenes;
  let i = 0;
  st.forEach((s, j) => { if (s.start <= gt) i = j; });
  return { index: i, name: SHOTS[i].name, start: st[i].start, end: st[i].end, p: L.prog(gt - st[i].start, -0.05, SHOTS[i].travel) };
}
export const shotStart = (name, tl) => shotTl(tl).scenes[SHOTS.findIndex((s) => s.name === name)].start;
export { PH, END, B };
