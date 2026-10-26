// Camera for "The Universe in One Year" (10c, ~50 s cut: one key per beat, the question holds key 8): dive into a nested calendar. Owned by the orchestrator.
//
// WORLD: abstract calendar units (1 = one day cell). LAYOUT (exported, also used by env.js and scenes):
//   12 month blocks in 3 columns × 4 rows; each block = 7 × 5 day cells (title band above).
//   Dec 31's cell holds 24 hour cells (4 × 6); 23:00 holds 60 minute cells (10 × 6); 23:59 holds 60 seconds (10 × 6).
//   rect functions return {x, y, w, h} in world units.
import { makeCamera } from '../../../engine/runtime/kit.js';
import * as L from '../../../engine/runtime/lib.js';

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const DAYS_IN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const PX = 8.2, PY = 7.2, TITLE = 1.0;
export const monthRect = (m) => ({ x: (m % 3) * PX, y: Math.floor(m / 3) * PY + TITLE, w: 7, h: 5 });
export const dayRect = (m, d) => { const o = monthRect(m); return { x: o.x + (d % 7), y: o.y + Math.floor(d / 7), w: 1, h: 1 }; };
export const hourRect = (h, day = dayRect(11, 30)) => ({ x: day.x + (h % 4) * 0.25, y: day.y + Math.floor(h / 4) * (1 / 6), w: 0.25, h: 1 / 6 });
export const minuteRect = (mi, hr = hourRect(23)) => ({ x: hr.x + (mi % 10) * (hr.w / 10), y: hr.y + Math.floor(mi / 10) * (hr.h / 6), w: hr.w / 10, h: hr.h / 6 });
export const secondRect = (s, mn = minuteRect(59)) => ({ x: mn.x + (s % 10) * (mn.w / 10), y: mn.y + Math.floor(s / 10) * (mn.h / 6), w: mn.w / 10, h: mn.h / 6 });
export const centre = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
export const YEAR_RECT = { x: 0, y: 0, w: 2 * PX + 7, h: 3 * PY + TITLE + 5 };

/** Calendar date (day-of-year, fractional) for an event `ya` years ago (13.8 Gyr year). */
export const UNIVERSE_AGE = 13.8e9;
export const dayOfYear = (yearsAgo) => 365 * (1 - yearsAgo / UNIVERSE_AGE);

const C = (r, mpp, travel, extra = {}) => ({ ...centre(r), mpp, travel, ...extra });
const YEAR = { ...centre(YEAR_RECT) };
const cam = makeCamera([
  { ...YEAR, mpp: 0.0305, travel: 0 },                                         // 0 the whole year
  C(monthRect(0), 0.0115, 1.6),                                               // 1 Big Bang: Jan 1
  C(monthRect(8), 0.0118, 1.5),                                               // 2 the Sun, early September (inOutSine-retimed below: calmer peak, lands before the ignition)
  C(monthRect(11), 0.0112, 1.6, { y: centre(monthRect(11)).y + 0.6, push: 0.92 }),   // 3 December: dinosaurs (September's lit cells dimmed under the HUD by env.drawForeground); a slower, deeper hold push keeps the post-impact hold alive
  C(dayRect(11, 30), 0.0012, 2.0, { x: centre(dayRect(11, 30)).x + 0.04, y: centre(dayRect(11, 30)).y + 0.22 }),  // 4 Dec 31, biased to 23:00 (above captions)
  C(minuteRect(59), 0.0000325, 2.1, { y: centre(minuteRect(59)).y + minuteRect(59).h * 0.12 }),  // 5 10c: straight down into 23:59 (history; was 10b's beats 8 + 9)
  C(secondRect(59), 0.0000043, 1.8, { y: centre(secondRect(59)).y + secondRect(59).h * 0.08 }),   // 6 the last second: you (cell bottom above the captions)
  C(secondRect(59), 0.0000041, 0.6, { y: centre(secondRect(59)).y + secondRect(59).h * 0.08 }),   // 7 a fifth of a second
  { ...YEAR, x: YEAR.x + 2.3, y: YEAR.y - 1.55, mpp: 0.0311, travel: 1.4, push: 0.94 },   // 8 back out to the whole year (fills the width left of the YOU ARE HERE gutter) + slow push-in
], { anchor: 0.48 });

// Beat 8's pull-back (10c) spans ~9 log-units of zoom. The kit eases every move with inOutCubic (peak rate 3x the mean),
// which smeared the nested grids into streaks. Re-time it to an inOutSine over a slightly longer span (peak 1.57x).
const PULL = 8, PULL_T = 1.65;   // f10cb: 3.35 -> 1.65 (beat 8 is now 3.67 s): the year settles by ~1.5 s, so YOU ARE HERE holds >= 2 s
const invInOutCubic = (e) => (e < 0.5 ? Math.cbrt(e / 4) : 1 - Math.cbrt(2 * (1 - e)) / 2);
// Beat 2 (Jan → Sept, ~22 cells): the same inOutSine re-timing (peak 1.57x the mean instead of 3x) so the fly-over
// no longer smears the month blocks; with travel 1.5 the camera is ~90% there when the Sun ignites (T_SUN 1.15).
const SUN = 2;
function retime(gt, tl, b, T) {
  const s = tl.scenes[b], t = gt - s.start, travel = cam.KEYS[b].travel;
  if (t >= T - 0.05) return s.start + t - (T - travel);
  const u = L.clamp((t + 0.05) / T);
  return s.start - 0.05 + travel * invInOutCubic(0.5 - 0.5 * Math.cos(Math.PI * u));
}
export function at(gt, tl) {
  const s2 = tl.scenes[SUN];
  if (s2 && gt >= s2.start && gt < s2.end) {
    return cam.at(retime(gt, tl, SUN, cam.KEYS[SUN].travel), tl);
  }
  const s = tl.scenes[PULL];
  if (!s || gt < s.start) return cam.at(gt, tl);
  const t = gt - s.start, travel = cam.KEYS[PULL].travel;
  let tt;
  if (t >= PULL_T - 0.05) tt = t - (PULL_T - travel);
  else {
    const u = L.clamp((t + 0.05) / PULL_T);
    tt = -0.05 + travel * invInOutCubic(0.5 - 0.5 * Math.cos(Math.PI * u));
  }
  const c = cam.at(s.start + tt, tl);
  return c;
}
