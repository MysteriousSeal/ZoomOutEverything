// Camera for "What If the Earth Stopped Spinning?" (13c: the ~50 s cut of 13b). Owned by the orchestrator.
//
// WORLD: metres, a 2D view. Earth's centre is at the origin, seen EQUATOR-ON (north up, east to the right) as an
// orthographic globe centred on longitude LON0 (Ecuador). So:
//   · the CITY on the equator sits exactly at the disc centre (0, 0): at street scale the world is just local
//     metres (x = east, y = south), and the equator is the straight line y = 0 from street to globe;
//   · the poles are the top / bottom of the disc (north = −y), where the oceans gather in beats 4–5;
//   · SUN sits 1 AU to the left (−x) for the orbit view (beats 6–8; Earth is then a sub-pixel point);
//   · CORAL is a Devonian fossil coral in upstate New York (13b's last dive; 13c cuts the coral beat).
// Journey: hook globe (spins, brakes) → dive to a street at the equator → district (winds) → pull back to the
// globe (oceans migrate) → pull out to Earth's orbit (day = year, 400 days), held under the question card.
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

// ------------------------------------------------------------------ 13c: the ~50 s cut of 13b
/**
 * 13c cuts 13b's beats 2 ("You don't feel it"), 5 ("Over time, the oceans would start to move"), 6 + 7 (folded
 * into one line: "Without the spin, | the water bulging at the equator slides toward the poles") and 12 (the fossil
 * corals). So no time here is absolute: every scene finds its beat through BEAT (below), and the old 13b
 * film-time offset (OFF = 6.309) is gone:
 *   · the hook's spin and the scale bar / equator fade-ins run on hook time, gt - filmZero(tl): filmZero is the
 *     hook beat's start minus FILM_START (the film opens 0.2 s into the original hook, whose clock started at 0);
 *   · the street runs on stop-relative time (streetTime): at stopTime it shows exactly the original arrangement
 *     (ORIG_STOP = the stop's film time in the original), so the frozen street of the stop is unchanged.
 */
export const FILM_START = 0.2;
export const ORIG_STOP = 14.202;
/** Beat index of every film beat in this cut (episode.json scenes[]); question = the closing card. */
export const BEAT = { hook: 0, equator: 1, stop: 2, winds: 3, poles: 4, continent: 5, day: 6, slowing: 7, days400: 8, question: 9 };
/** Global time at which the hook's own clock (the original film's t = 0) reads 0. */
export const filmZero = (tl) => tl.scenes[BEAT.hook].start - FILM_START;
/** Street clock at global gt: the original film time, aligned on the stop. */
export const streetTime = (gt, tl) => gt - stopTime(tl) + ORIG_STOP;

// ------------------------------------------------------------------ hook spin
// The globe spins east (features slide right) at SPIN0 deg/s, brakes from BRAKE0 to BRAKE1 s and stops dead
// with LON0 facing us. After BRAKE1 it never turns again.
export const SPIN0 = 50 * DEG, BRAKE0 = 1.1, BRAKE1 = 2.45;
/** Longitude at the disc centre at global time gt (the spin runs on hook time, gt - filmZero). */
export const lonAt = (gt, tl) => lonFilm(gt - filmZero(tl));
/** Longitude at the disc centre at hook time t (the original film's clock). */
export function lonFilm(gt) {
  const T = BRAKE1 - BRAKE0;
  let rem;
  if (gt <= BRAKE0) rem = SPIN0 * (BRAKE0 - gt) + (SPIN0 * T) / 3;
  else if (gt < BRAKE1) rem = (SPIN0 * T * Math.pow(1 - (gt - BRAKE0) / T, 3)) / 3;
  else rem = 0;
  return LON0 + rem;
}

/** The moment the planet stops (global s): the end of "Stop the planet suddenly," (BEAT.stop's first phrase). */
export function stopTime(tl) { const ln = tl.lines[BEAT.stop]; return (ln.phrases ?? [ln])[0].end; }

const ANCHOR = 0.42;                           // world origin sits at screen y ≈ 806 (content area 300–1280)
const HOOK_Y = -(1010 - 1920 * ANCHOR) * 1.7e4; // hook: globe centre low at y ≈ 1010, headline above it

const cam = makeCamera([
  { x: 0, y: HOOK_Y, mpp: 1.7e4, travel: 0 },              // 0 hook: the globe spins, brakes, stops dead
  { x: 0, y: 0, mpp: 0.14, travel: 2.6 },                  // 1 dive to a street on the equator (lands on "you're moving")
  { x: 22, y: 0, mpp: 0.2, travel: 1.2, push: 0.985 },     // 2 the stop: ease back so loose things have room to fly east
  { x: 300, y: 0, mpp: 3.2, travel: 1.6 },                 // 3 winds over 1,000 km/h across the district
  // 4 13c: pull back from the district straight to the globe (13b's beat-5 pull-back, landing on its beat-7 framing):
  //   the bulge of water swells while the planet forms, then slides toward the poles
  { x: 0, y: -(850 - 806) * 1.6e4, mpp: 1.6e4, travel: 2.3 },
  { x: 0, y: -(880 - 806) * 1.7e4, mpp: 1.7e4, travel: 1.0 },    // 5 two polar oceans, one ring continent (label above)
  // 6 pull out to Earth's orbit: one day = one year. 13c: travel 1.7 (13b: 2.2), so the Sun and the orbit are in frame
  //   by ~31.9 s, before "a whole year" and the "1 day = 1 year" label, instead of ~1 s of a lone dot in black
  { x: -AU, y: 0, mpp: 3.7e8, travel: 1.7 },
  { x: -AU, y: 0, mpp: 3.5e8, travel: 0.8 },               // 7 Earth is slowing down
  { x: -AU, y: 0, mpp: 3.6e8, travel: 0.8, push: 0.97 },   // 8 400 million years ago: 400 days (held under the question)
], { anchor: ANCHOR, hookFrom: 0.88 });

export const KEYS = cam.KEYS;

/** Camera at global time gt; adds a short decaying jolt when the planet stops (BEAT.stop). */
export function at(gt, tl) {
  const c = cam.at(gt, tl);
  const u = gt - stopTime(tl);
  if (u > 0 && u < 1.4) {
    const a = 9 * Math.exp(-u * 4) * L.smoothstep(L.clamp(u / 0.05));
    c.x += a * c.mpp * L.noise1(u * 24, 5);
    c.y += a * 0.6 * c.mpp * L.noise1(u * 24, 6);
  }
  return c;
}
