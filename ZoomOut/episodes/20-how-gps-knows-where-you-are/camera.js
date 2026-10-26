// Camera for "How Does GPS Know Where You Are?" (90 s): three acts, one continuous camera. Owned by the orchestrator —
// builders: read, don't edit (put needs in "sharedRequests").
//
// WORLD: a SIDE VIEW in metres (exactly like episode 06). x horizontal, y = −altitude (up is negative). The planet is
// a sphere of radius R_EARTH centred at (0, +R_EARTH), so its top limb is (0, 0): the street, the person and the PHONE
// stand there. The globe is drawn by env.js (engine earth.js) as an orthographic view in which New York sits exactly on
// the top limb with the Americas on the face (env.js VIEW), so zooming out of the street reveals the curve of the Earth and then the whole planet.
// The picture plane (z = 0) is the vertical cross-section through the phone and the Earth's centre: a sphere centred
// on a satellite IN that plane cuts it in a circle that passes exactly through the phone (the trilateration beats).
//
//   ACT I   (beats 0-3)   the blue dot on a phone · the street · the planet and its GPS constellation (time-lapse)
//   ACT II  (beats 4-13)  one satellite close up · its signal down to you · 30 cm per nanosecond · 300 m off
//                          · the four signal spheres meeting on one point
//   ACT III (beats 14-18) Einstein: two clocks, satellite vs ground · the dot drifts 10 km · back down to the dot
import { makeCamera } from '../../../engine/runtime/kit.js';

export const R_EARTH = 6.371e6;
export const GPS_ALT = 20.19e6;                 // m above the surface (orbit radius ≈ 26,560 km)
export const GPS_A = R_EARTH + GPS_ALT;
export const C = 299792458;
const DEG = Math.PI / 180;

/** The phone, held at chest height by a person standing on the top limb (the street level is y = 0). */
export const PHONE = { x: 0, y: -1.3, w: 0.075, h: 0.155 };
/** Where the phone is on Earth (Midtown Manhattan): the HUD readout and the globe orientation use it. */
export const HOME = { lat: 40.758, lon: -73.9855 };

/**
 * The four HERO satellites (A, B, C, D) at their resting positions, all IN the picture plane (z = 0), above the
 * phone's horizon. th = angle from the phone's zenith seen from the Earth's centre (deg, + = right).
 * B is the "our satellite" of act II (close-up, broadcast, signal path, the two-clocks act).
 */
export const HERO_TH = [-48, -14, 18, 44];
export const HERO = HERO_TH.map((th, i) => ({
  name: 'ABCD'[i], th,
  x: GPS_A * Math.sin(th * DEG),
  y: R_EARTH - GPS_A * Math.cos(th * DEG),
}));
HERO.forEach((h) => { h.range = Math.hypot(h.x - PHONE.x, h.y - 0); h.delay = h.range / C; });
export const SAT_B = HERO[1];

// framing helpers: the key that puts world point p at screen (sx, sy) for a given mpp (anchor 0.47, W 1080, H 1920)
const ANCHOR = 0.47;
const put = (p, sx, sy, mpp) => ({ x: p.x - (sx - 540) * mpp, y: p.y - (sy - 1920 * ANCHOR) * mpp, mpp });
const MIDB = { x: (SAT_B.x + PHONE.x) / 2, y: 0 };

const cam = makeCamera([
  // ACT I
  { ...put(PHONE, 540, 1010, 1.9e-4), travel: 0 },                   // 0 the phone screen, blue dot (hook pull-back from 0.85×)
  { ...put({ x: 0, y: 0 }, 540, 1180, 0.008), travel: 1.7 },          // 1 the street: a person, the phone glowing (ground at y 1180)
  { ...put({ x: 0, y: R_EARTH }, 540, 830, 6.0e4), travel: 2.4, push: 0.95 }, // 2 the planet + the constellation (orbits r ≈ 443 px)
  { ...put({ x: 0, y: R_EARTH }, 540, 845, 5.5e4), travel: 1.2, push: 0.97 }, // 3 time-lapse: one day, two laps
  // ACT II
  { ...put(SAT_B, 540, 820, 0.02), travel: 1.4, push: 0.97 },           // 4 satellite B close up (≈ 8 m span ≈ 400 px)
  { ...put(SAT_B, 540, 600, 0.05), travel: 1.2 },                       // 5 broadcasting: the sat rises, rings fall below it
  { ...put(MIDB, 540, 1150, 2.6e4), travel: 1.5, push: 0.97 }, // 6 sat B (≈ 417, 404) over the phone (≈ 664, 1150)
  { ...put(MIDB, 540, 1150, 2.48e4), travel: 0.8, push: 0.97 },   // 7 the signal travels down: 0.07 s
  { ...put(PHONE, 540, 1150, 6e-4), travel: 1.9 },                      // 8 dive to the phone: a 30 cm ruler above it
  { ...put({ x: 150, y: 0 }, 540, 1150, 0.6), travel: 1.9 },            // 9 the street at 0.6 m/px: you + a ghost dot 300 m away
  { ...put({ x: -400e3, y: 0 }, 540, 1110, 4.6e4), travel: 1.6, push: 0.98 }, // 10 the four satellites over the limb: one sphere
  { ...put({ x: -380e3, y: 0 }, 540, 1110, 4.5e4), travel: 0.9, push: 0.98 }, // 11 two spheres: a circle
  { ...put({ x: -350e3, y: 0 }, 540, 1115, 4.4e4), travel: 0.9, push: 0.98 }, // 12 three: two points
  { ...put({ x: -330e3, y: 0 }, 540, 1065, 4.0e4), travel: 1.3, push: 0.97 }, // 13 the fourth: one point
  // ACT III
  { ...put(MIDB, 540, 1120, 3.0e4), travel: 1.9, push: 0.97 },          // 14 Einstein: Earth's gravity well, sat B above (y ≈ 473)
  { ...put(MIDB, 540, 1120, 2.75e4), travel: 1.2, push: 0.97 },         // 15 weaker gravity: + 45 µs a day
  { ...put(MIDB, 540, 1115, 2.6e4), travel: 1.0, push: 0.97 },          // 16 speed: − 7 µs · net + 38 µs
  { ...put({ x: 5000, y: 0 }, 540, 1200, 12.5), travel: 2.4, push: 0.98 }, // 17 the city: the dot drifts 10 km (phone x ≈ 140)
  { ...put(PHONE, 540, 1010, 2.0e-4), travel: 3.4, push: 0.97 },         // 18 back down to the blue dot (the hook frame)
], { anchor: ANCHOR });
/**
 * Beat 4's dive into satellite B is ANCHORED on B: its screen position glides from where it sits in the planet shot to
 * its close-up spot while the zoom runs, so the satellite (env's growing glint, then s04's model) is on screen and
 * near the centre for the whole travel instead of converging from off-frame at the very end.
 */
function anchoredDive(c, gt, tl, beat, target) {
  const s = tl.scenes[beat];
  if (!s || gt < s.start || gt > s.start + cam.KEYS[beat].travel + 0.1) return c;
  const c0 = cam.at(s.start - 1e-3, tl);
  const sx0 = 540 + (target.x - c0.x) / c0.mpp, sy0 = 1920 * ANCHOR + (target.y - c0.y) / c0.mpp;
  const k = Math.min(1, Math.max(0, (gt - s.start + 0.05) / cam.KEYS[beat].travel));
  const e = 1 - Math.pow(1 - k, 2.2);                         // reach the framing early, settle gently
  const sx = sx0 + (540 - sx0) * e, sy = sy0 + (820 - sy0) * e;
  const sxNow = 540 + (target.x - c.x) / c.mpp, syNow = 1920 * ANCHOR + (target.y - c.y) / c.mpp;
  const w = Math.min(1, Math.max(0, (cam.KEYS[beat].travel + 0.1 - (gt - s.start)) / 0.25));   // hand back to the key
  return { ...c, x: c.x + (sxNow - sx) * c.mpp * w, y: c.y + (syNow - sy) * c.mpp * w };
}
export const at = (gt, tl) => anchoredDive(cam.at(gt, tl), gt, tl, 4, SAT_B);
export const KEYS = cam.KEYS;
