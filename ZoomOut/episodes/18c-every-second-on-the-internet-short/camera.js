// Camera for "Every Second on the Internet" (90 s): one phone -> its room -> the block -> a city of screens -> the
// data centre -> the region -> the planet wrapped in undersea cables -> back down to the same phone.
// Owned by the orchestrator — builders: read, don't edit (put needs in "sharedRequests").
//
// WORLD: TOP-DOWN, metres. x = east, y = south (screen down), north up. The phone lies screen-up on a nightstand in a
// New York apartment (HOME, Midtown Manhattan). The planet is an orthographic globe whose DISC CENTRE is the world
// origin: the face point (the lat/lon looking straight at the camera) always sits at (0, 0). While the face is HOME
// (beats 0-9 and 17-18) HOME itself is at the origin, so local plan drawings (phone, room, block, city, data centre)
// are simply drawn at metres from (0, 0). During the planet act (beats 10-16) the globe turns (`face(gt)`), and
// everything on it is placed with env's `project(v, lat, lon)`.
//
//   phone 7.2 x 14.8 cm at (0, 0) · nightstand top 46 x 40 cm · bedroom 4 x 4.5 m · apartment building 40 x 30 m
//   city grid (Manhattan-style, rotated 29 deg) · data-centre campus DC 7.3 km WNW (Secaucus, NJ) · NY metro ~60 km
//   Earth R = 6,371 km: whole globe ≈ 15,000 m/px
import * as L from '../../../engine/runtime/lib.js';
import { makeCamera } from '../../../engine/runtime/kit.js';
import { legacy, CUT } from './legacy.js';

export const R_EARTH = 6.371e6;
export const DEG = Math.PI / 180;
/** The phone's location: a Midtown Manhattan apartment. */
export const HOME = { lat: 40.758, lon: -73.985 };
/** The city grid (Manhattan's) is rotated 29 deg clockwise from north. PLAN frame: metres from the phone, x across
 *  the avenues (ESE), y along them (SSW). world = rotate(plan, GRID_ROT). */
export const GRID_ROT = 29 * DEG;
const GC = Math.cos(GRID_ROT), GS = Math.sin(GRID_ROT);
export const toWorld = (px, py) => ({ x: px * GC - py * GS, y: px * GS + py * GC });
export const toPlan = (x, y) => ({ x: x * GC + y * GS, y: -x * GS + y * GC });
/** The data-centre campus pad in PLAN metres (~850 x 610 m, across the Hudson in Secaucus, NJ, where New York's big
 *  interconnection campuses are) and its centre in WORLD metres. */
export const DC_PLAN = { x0: -7650, y0: -760, x1: -6800, y1: -150 };
export const DC = toWorld((DC_PLAN.x0 + DC_PLAN.x1) / 2, (DC_PLAN.y0 + DC_PLAN.y1) / 2);
/** Faces (lat, lon in degrees; longitudes unwrapped so the planet always turns the same way, eastward). */
export const FACES = {
  home: [HOME.lat, HOME.lon],
  france: [46.6, 2.4],
  atlantic: [33, -42],
  atlantic2: [35, -30],
  europeAfrica: [24, 18],
  indian: [16, 62],
  arabian: [15, 63],
  asiaPacific: [22, 112],
  homeAgain: [HOME.lat, HOME.lon + 360],
};

// screen y of the anchor = H * 0.47 = 902. A key's y puts world y at the anchor; to put world point P at screen
// row S use y = P - (S - 902) * mpp.
const A = 0.47 * L.H;
const at_ = (py, screenY, mpp) => py - (screenY - A) * mpp;
const GLOBE_Y = (mpp) => at_(0, 840, mpp);   // whole-globe framing: disc centre at screen y 840

// KEYS[i]: {x, y, mpp, travel, push, lift} (kit.makeCamera) + face (globe orientation reached at the end of the travel)
// + spin (deg/s of eastward drift while held).
const KEYS = [
  { x: 0, y: at_(0, 1000, 2.6e-4), mpp: 2.6e-4, travel: 0, face: FACES.home },                    // 0 hook: the phone, dark
  { x: 0, y: at_(0, 880, 2.2e-4), mpp: 2.2e-4, travel: 1.0, push: 0.95, face: FACES.home },        // 1 one phone lights up
  { x: 0.02, y: at_(0, 900, 6.5e-4), mpp: 6.5e-4, travel: 1.3, face: FACES.home },                 // 2 searches stream out
  { x: 0.35, y: at_(0, 860, 1.9e-3), mpp: 1.9e-3, travel: 1.3, face: FACES.home },                 // 3 a day of searches: the nightstand + bed
  { x: 6, y: at_(-2, 860, 0.1), mpp: 0.1, travel: 1.7, face: FACES.home },                         // 4 "zoom out": the block, emails
  { x: 6, y: at_(-2, 860, 0.1), mpp: 0.095, travel: 0.6, push: 0.94, face: FACES.home },           // 5 half of them spam
  { x: 120, y: at_(-80, 840, 2.0), mpp: 2.0, travel: 1.6, face: FACES.home },                      // 6 the city: 8 hours of video
  { x: 120, y: at_(-80, 840, 2.0), mpp: 1.75, travel: 0.7, push: 0.93, face: FACES.home },         // 7 not every minute: every second
  { x: DC.x, y: at_(DC.y, 820, 1.1), mpp: 1.1, travel: 2.0, push: 0.95, face: FACES.home },        // 8 the data-centre campus
  { x: -3000, y: at_(0, 900, 150), mpp: 150, travel: 1.9, push: 0.95, face: FACES.home },          // 9 the region: power (HOME low: the label + bar own the top-left)
  { x: 0, y: at_(0, 820, 2600), mpp: 2600, travel: 1.15, lift: 0.75, face: FACES.france },        // 10 France lights up (lands ~47.4)
  { x: 0, y: GLOBE_Y(15500), mpp: 15500, travel: 2.2, push: 0.97, face: FACES.atlantic, spin: 1.2 }, // 11 the whole planet
  { x: 0, y: GLOBE_Y(14000), mpp: 14000, travel: 1.2, push: 0.97, face: FACES.atlantic2, spin: 1.5 }, // 12 cables draw on
  { x: 0, y: GLOBE_Y(15000), mpp: 15000, travel: 2.4, push: 0.97, face: FACES.europeAfrica, spin: 1.5 }, // 13 1.4 million km
  { x: 0, y: GLOBE_Y(16500), mpp: 16500, travel: 1.8, push: 0.98, face: FACES.indian, spin: 1.2 },  // 14 35 times around
  { x: 0, y: at_(0, 820, 3600), mpp: 3600, travel: 1.6, push: 0.94, face: FACES.arabian },         // 15 one cable, close
  { x: 0, y: at_(0, 900, 20000), mpp: 20000, travel: 2.0, push: 0.97, face: FACES.asiaPacific, spin: 2.0 }, // 16 99% of traffic (smaller, lower disc: the label stack sits top-left clear of the ring)
  { x: 0, y: at_(0, 960, 4.2e-4), mpp: 4.2e-4, travel: 4.4, face: FACES.homeAgain },               // 17 back down to the phone (zoom profile: DIVE below)
  { x: 0, y: at_(0, 1010, 3.2e-4), mpp: 3.2e-4, travel: 1.2, push: 0.95, face: FACES.homeAgain },  // 18 82 years
];

// 18c: the dive home is shorter (18c's 18 beat 17 is ~3.0 s, 18's was 5.5 s): see DIVE below
KEYS[17].travel = 2.95;
// 18c: from the phone straight out to the city of screens (18 beats 3-5 cut): a longer pull-out than 18's last leg
KEYS[6] = { ...KEYS[6], travel: 2.3 };
// 18c: from the city straight up to the whole planet (18 beats 8-11 cut), turning to the Atlantic on the way out
KEYS[12] = { ...KEYS[12], travel: 2.35 };

const cam = makeCamera(KEYS, { anchor: 0.47, hookFrom: 0.86, drift: 3 });
export { KEYS };
// 18c: the camera runs on the LEGACY (18-shaped) timeline of legacy.js, so the key numbers above are 18's beats.
//  * the keys of the cut beats (3-5, 8-11; zero length) are re-pointed to where the previous beat's hold push ended,
//    so the next kept beat starts its travel exactly where the camera is (no jump);
//  * every travel is clamped to its (shorter) 18c beat, so each beat lands, and finishes its push, before the next.
for (const i of CUT) {
  const p = KEYS[i - 1];
  KEYS[i] = { ...p, mpp: p.mpp * (i - 1 === 0 ? 1 : (p.push ?? 0.96)), travel: 0.01, push: 1, lift: 0, spin: 0 };
}
const TRAVEL = KEYS.map((k) => k.travel);
let FIT = null;
function fit(T) {
  if (FIT === T) return;
  FIT = T;
  KEYS.forEach((k, i) => {
    const s = T.scenes[i], d = s.end - s.start;
    if (d > 0 && i > 0 && i !== 17) k.travel = Math.min(TRAVEL[i], Math.max(0.3, d - 0.3));
  });
}

/** Which beat the camera is in at gt, seconds into it, and its duration. */
function beatOf(gt, tl) {
  const sc = tl.scenes;
  let b = 0;
  sc.forEach((s, i) => { if (s.start <= gt) b = i; });
  b = Math.min(b, KEYS.length - 1);
  return { b, t: gt - sc[b].start, d: sc[b].end - sc[b].start };
}

/** Camera {x, y, mpp, anchor} (kit). */
export function at(gt, tl) {
  tl = legacy(tl);
  fit(tl);
  const s17 = tl.scenes[17];
  if (gt >= s17.start && gt < s17.end) {
    // beat 17's dive runs on its own log-zoom profile: a gentle push while the planet turns home, then a near-constant
    // speed dive (flat-top, ~7 e-folds/s instead of a 12 e-folds/s cubic peak) so the city does not smear into a
    // radial blur, then a soft landing on the phone. Implemented by warping the kit's travel clock.
    const k = KEYS[17], t = gt - s17.start;
    if (t < k.travel - 0.05) {
      const F = diveF(t + 0.05, k.travel);
      const x = F < 0.5 ? Math.cbrt(F / 4) : 1 - Math.cbrt(2 * (1 - F)) / 2;   // inverse of inOutCubic
      return cam.at(s17.start - 0.05 + x * k.travel, tl);
    }
  }
  // 18c: the climb from the city to the whole planet (18 beat 12, ~9 e-folds in 2.35 s) runs at a near-constant log speed
  // (short soft ramps) instead of the kit's cubic, whose ~7 e-folds/s peak smeared the city into a brown blur
  const s12 = tl.scenes[12];
  if (gt >= s12.start - 0.05 && gt < s12.end) {
    const k = KEYS[12], t = gt - s12.start + 0.05;
    if (t < k.travel) {
      const F = flatF(t / k.travel, 0.42 / k.travel);
      const x = F < 0.5 ? Math.cbrt(F / 4) : 1 - Math.cbrt(2 * (1 - F)) / 2;   // inverse of inOutCubic
      return cam.at(s12.start - 0.05 + x * k.travel, tl);
    }
  }
  return cam.at(gt, tl);
}
/** 18c: progress (0..1) of a move at constant speed with smoothstep ramps of length r (both as fractions of the move). */
function flatF(u, r) {
  const N = 200;
  let acc = 0, tot = 0;
  for (let i = 0; i < N; i++) {
    const x = (i + 0.5) / N;
    const sp = L.smoothstep(L.clamp(x / r)) * L.smoothstep(L.clamp((1 - x) / r));
    tot += sp;
    if (x < u) acc += sp * Math.min(1, (u - i / N) * N);
  }
  return L.clamp(acc / tot);
}
// 18c: 18's profile (a 1.05, b 3.75 over a 4.4 s travel) compressed to the 2.95 s dive: the flat top runs ~2.0 s
const DIVE = { a: 0.62, b: 2.55, ramp: 0.5, base: 0.07 };
let diveTab = null;
function diveF(t, travel) {
  if (!diveTab) {
    const N = 400, v = [], acc = [0];
    for (let i = 0; i <= N; i++) {
      const u = (i / N) * travel;
      const up = L.smoothstep(L.clamp((u - DIVE.a) / DIVE.ramp)), dn = 1 - L.smoothstep(L.clamp((u - (DIVE.b - DIVE.ramp)) / DIVE.ramp));
      v.push(DIVE.base * L.smoothstep(L.clamp(u / 0.5)) * (1 - L.smoothstep(L.clamp((u - travel + 0.6) / 0.6))) + Math.min(up, dn));
    }
    for (let i = 1; i <= N; i++) acc.push(acc[i - 1] + (v[i - 1] + v[i]) / 2);
    diveTab = acc.map((a) => a / acc[N]);
  }
  const f = L.clamp(t / travel) * (diveTab.length - 1), i = Math.min(diveTab.length - 2, Math.floor(f));
  return L.lerp(diveTab[i], diveTab[i + 1], f - i);
}

// ------------------------------------------------------------------ globe orientation
// The face turns while the camera is zoomed OUT: its progress over a travel is weighted by the current mpp (the integral
// of mpp over the travel), so a dive or a climb finishes turning the planet before it gets close to the surface.
const curveCache = new Map();
function zoomWeighted(b, gt, tl) {
  const key = `${b}:${tl.total}`;
  let tab = curveCache.get(key);
  if (!tab) {
    const N = 96, acc = [0], m = [];
    const t0 = tl.scenes[b].start;
    for (let i = 0; i <= N; i++) m.push(at(t0 - 0.05 + (KEYS[b].travel * i) / N, tl).mpp);   // 18c: the warped camera (beat 12)
    for (let i = 1; i <= N; i++) acc.push(acc[i - 1] + (m[i - 1] + m[i]) / 2);
    tab = acc.map((a) => a / (acc[N] || 1));
    curveCache.set(key, tab);
  }
  const f = L.clamp((gt - tl.scenes[b].start + 0.05) / Math.max(0.01, KEYS[b].travel)) * (tab.length - 1);
  const i = Math.min(tab.length - 2, Math.floor(f));
  return L.lerp(tab[i], tab[i + 1], f - i);
}
/** The turn home: starts HOME_PRE s before beat 17 and lasts HOME_TURN s. */
export const HOME_PRE = 0.85, HOME_TURN = 1.85;   // 18c: starts a little earlier and lands sooner (shorter dive)
/** Face of beat i at the end of its travel, plus its held spin (deg/s, eastward) up to time gt. */
function heldFace(i, gt, tl) {
  const k = KEYS[i], s = tl.scenes[i];
  const spin = k.spin ? k.spin * Math.max(0, gt - s.start - k.travel * 0.5) : 0;
  return [k.face[0], k.face[1] + spin];
}
/** The globe's face (lat, lon degrees) at time gt: the point looking straight at the camera, drawn at world (0, 0). */
export function face(gt, tl) {
  tl = legacy(tl);
  fit(tl);
  const { b } = beatOf(gt, tl);
  if (b === 0) return KEYS[0].face;
  // The turn home (Asia-Pacific -> New York, ~167 deg): a smooth time-eased spin that starts in the breath after line
  // 16 and finishes before the dive gets close (peak ~125 deg/s instead of ~400), so the globe reads as one deliberate
  // whip-pan and not as a glitch.
  const s17 = tl.scenes[17].start;
  if ((b === 16 && gt >= s17 - HOME_PRE) || b === 17) {
    const from = heldFace(16, s17 - HOME_PRE, tl), to = KEYS[17].face;
    const p = L.smoothstep(L.prog(gt, s17 - HOME_PRE, HOME_TURN));
    return [L.lerp(from[0], to[0], p), L.lerp(from[1], to[1], p)];
  }
  const from = heldFace(b - 1, tl.scenes[b].start, tl);
  const to = heldFace(b, gt, tl);
  const p = L.smoothstep(zoomWeighted(b, gt, tl));
  return [L.lerp(from[0], to[0], p), L.lerp(from[1], to[1], p)];
}
