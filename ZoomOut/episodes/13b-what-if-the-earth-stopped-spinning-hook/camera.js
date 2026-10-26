// Camera for "What If the Earth Stopped Spinning?" (60 s). Owned by the orchestrator.
//
// WORLD: metres, a 2D view. Earth's centre is at the origin, seen EQUATOR-ON (north up, east to the right) as an
// orthographic globe centred on longitude LON0 (Ecuador). So:
//   · the CITY on the equator sits exactly at the disc centre (0, 0): at street scale the world is just local
//     metres (x = east, y = south), and the equator is the straight line y = 0 from street to globe;
//   · the poles are the top / bottom of the disc (north = −y), where the oceans gather in beats 7–8;
//   · SUN sits 1 AU to the left (−x) for the orbit view (beats 9–11; Earth is then a sub-pixel point);
//   · CORAL is a Devonian fossil coral in upstate New York (projected onto the same globe), where beat 12 dives.
// Journey: hook globe (spins, brakes) → dive to a street at the equator → district (winds) → pull back to the
// globe (oceans migrate) → pull out to Earth's orbit (day = year, 400 days) → dive back down into a coral.
import * as L from '../../../engine/runtime/lib.js';
import { makeCamera } from '../../../engine/runtime/kit.js';

export const DEG = Math.PI / 180;
export const R_EARTH = 6.371e6;
export const AU = 1.496e11;
export const LON0 = -78.5 * DEG;              // the longitude facing us once Earth has stopped (the equator city)
export const SUN = { x: -AU, y: 0, r: 6.96e8 };

/** Orthographic projection of (lat, lon) in radians onto the world: {x, y, z}; z > 0 faces the camera. */
export function project(la, lo, lon0 = LON0) {
  const cl = Math.cos(la), dl = lo - lon0;
  return { x: R_EARTH * cl * Math.sin(dl), y: -R_EARTH * Math.sin(la), z: cl * Math.cos(dl) };
}
// Devonian rocks of upstate New York (Hamilton Group), home of classic fossil corals
export const CORAL = (() => { const p = project(42.6 * DEG, -76.2 * DEG); return { x: p.x, y: p.y }; })();

// ------------------------------------------------------------------ 13b hook version
/**
 * 13b: the cold-open preroll plays first, so the film starts later. Every absolute (global-second) time in this
 * episode was tuned on the original 60 s timeline; OFF shifts it onto this one. OFF is the constant shift of every
 * film line and of beats 1-12 (build/timeline.json: scenes[i+1].start - the original scenes[i].start = 6.309 s).
 * Beat 0 starts at OFF + FILM_START (the film opens 0.2 s into its original hook; its VO starts 0.15 s later, as in
 * the original at 0.35 s). Checked in at().
 */
export const OFF = 6.309;
export const FILM_START = 0.2;
const ORIG_BEAT1 = 3.103;

// ------------------------------------------------------------------ hook spin
// The globe spins east (features slide right) at SPIN0 deg/s, brakes from BRAKE0 to BRAKE1 s and stops dead
// with LON0 facing us. After BRAKE1 it never turns again.
export const SPIN0 = 50 * DEG, BRAKE0 = 1.1, BRAKE1 = 2.45;
/** Longitude at the disc centre at global time gt (13b: the spin runs on film time gt - OFF). */
export function lonAt(gt) {
  gt -= OFF;
  const T = BRAKE1 - BRAKE0;
  let rem;
  if (gt <= BRAKE0) rem = SPIN0 * (BRAKE0 - gt) + (SPIN0 * T) / 3;
  else if (gt < BRAKE1) rem = (SPIN0 * T * Math.pow(1 - (gt - BRAKE0) / T, 3)) / 3;
  else rem = 0;
  return LON0 + rem;
}

/** The moment the planet stops in beat 3 (global s): the end of "Stop the planet suddenly,". */
export const stopTime = (tl) => (tl.lines[3].phrases ?? [tl.lines[3]])[0].end;

const ANCHOR = 0.42;                           // world origin sits at screen y ≈ 806 (content area 300–1280)
const HOOK_Y = -(1010 - 1920 * ANCHOR) * 1.7e4; // hook: globe centre low at y ≈ 1010, headline above it

const cam = makeCamera([
  { x: 0, y: HOOK_Y, mpp: 1.7e4, travel: 0 },              // 0 hook: the globe spins, brakes, stops dead
  { x: 0, y: 0, mpp: 0.14, travel: 2.6 },                  // 1 dive to a street on the equator (lands on "you're moving")
  { x: 6, y: 0, mpp: 0.12, travel: 1.0 },                  // 2 "you don't feel it": a slow drift east
  { x: 22, y: 0, mpp: 0.2, travel: 1.2, push: 0.985 },     // 3 the stop: ease back so loose things have room to fly east
  { x: 300, y: 0, mpp: 3.2, travel: 1.6 },                 // 4 winds over 1,000 km/h across the district
  { x: 0, y: 0, mpp: 1.55e4, travel: 2.3 },                // 5 pull back to the whole planet
  { x: 0, y: -(880 - 806) * 1.75e4, mpp: 1.75e4, travel: 1.0 }, // 6 the 21 km bulge: globe low (centre y ≈ 880), label room above
  { x: 0, y: -(850 - 806) * 1.6e4, mpp: 1.6e4, travel: 1.0 },    // 7 the water slides toward the poles
  { x: 0, y: -(880 - 806) * 1.7e4, mpp: 1.7e4, travel: 1.0 },    // 8 two polar oceans, one ring continent (label above)
  { x: -AU, y: 0, mpp: 3.7e8, travel: 1.7 },               // 9 pull out to Earth's orbit: one day = one year (travel 1.7, was 2.2: the Sun is in frame before the label)
  { x: -AU, y: 0, mpp: 3.5e8, travel: 0.8 },               // 10 Earth is slowing down
  { x: -AU, y: 0, mpp: 3.6e8, travel: 0.8, push: 0.97 },   // 11 400 million years ago: 400 days
  { ...CORAL, mpp: 1.1e-4, travel: 2.7, push: 0.95 },      // 12 dive into a fossil coral's growth rings
], { anchor: ANCHOR, hookFrom: 0.88 });

export const KEYS = cam.KEYS;

/** Camera at global time gt; adds a short decaying jolt when the planet stops (beat 3). */
const DRIFT = 4;                               // makeCamera's default drift (px), re-derived below
const B12 = 12, LEAD12 = 0.36;                 // beat 12: share of the dive's travel used to bring CORAL to the centre
let offChecked = false;
export function at(gt, tl) {
  if (!offChecked) {
    offChecked = true;
    if (Math.abs(tl.scenes[1].start - (ORIG_BEAT1 + OFF)) > 0.01) console.warn(`camera.js: OFF ${OFF} does not match the timeline (beat 1 at ${tl.scenes[1].start})`);
  }
  const c = cam.at(gt, tl);
  // Beat 12: a log-scale dive keeps CORAL at a fixed screen offset (x ≈ 968, under the YouTube buttons) until
  // the very end. Pan it to the frame centre during the first ~45 % of the travel instead.
  const s12 = tl.scenes[B12];
  if (s12 && gt >= s12.start) {
    const k = KEYS[B12], t = gt - s12.start;
    const f = 1 - L.ease.inOutCubic(L.prog(t, 0, k.travel * LEAD12));
    if (f < 1) {
      const dx = L.noise1(gt * 0.3, 1) * DRIFT * c.mpp, dy = L.noise1(gt * 0.27, 2) * DRIFT * c.mpp;
      c.x = CORAL.x + (c.x - dx - CORAL.x) * f + dx;
      c.y = CORAL.y + (c.y - dy - CORAL.y) * f + dy;
    }
  }
  const u = gt - stopTime(tl);
  if (u > 0 && u < 1.4) {
    const a = 9 * Math.exp(-u * 4) * L.smoothstep(L.clamp(u / 0.05));
    c.x += a * c.mpp * L.noise1(u * 24, 5);
    c.y += a * 0.6 * c.mpp * L.noise1(u * 24, 6);
  }
  return c;
}
