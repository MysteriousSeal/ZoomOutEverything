// Camera + shared world constants for "From Your Hand to the Edge of the Universe" (landscape 1920x1080).
// Owned by the orchestrator — builders: read, don't edit.
//
// ONE continuous zoom. The camera is described by F = the field of view in metres across the 1920 px frame
// (mpp = F / 1920). log10(F) follows a smooth monotone spline (PCHIP) through per-beat keys, so the zoom never stops
// dead and never overshoots. The camera centre is a function of F alone (CENTRES below), so it drifts from the hand
// to the park, Manhattan, the Sun, the galactic centre, the Local Group, Laniakea and back to us, and the fast
// zoom back in (beat 35) retraces exactly the same path.
//
// WORLD FRAME: metres, x = east / right, y = south / down (screen convention), origin = the hand (Sheep Meadow).
// Up to Earth scale it is a true orthographic projection about HAND (geo.js, earth.js with lat0/lon0 = HAND, tilt 0).
// Beyond that it is a top-down "map" at each scale (see SUN, ECL, GAL below).
import * as L from '../../../engine/runtime/lib.js';
import { HAND } from './geo.js';
import { MEADOW_C } from './layers/park-data.js';

export { HAND };
export const R_EARTH = 6.371e6;
export const C = 299792458;
export const AU = 1.496e11;
export const LY = 9.4607e15;
export const DEG = Math.PI / 180;

// ------------------------------------------------------------------ the person
// Lying on their back in the grass, face up, LEFT arm stretched out sideways (seen from above with the head toward the
// upper left, a face-up body's left side is on the screen's right), the open hand (palm up, ~10 cm wide) resting at the
// origin. PERSON = the middle of the body (metres, world frame); the head points along HEAD_DIR (unit vector).
export const PERSON = { x: -0.55, y: 0.3 };
export const HEAD_DIR = { x: -0.45, y: -0.89 };   // head toward the upper left; feet toward the lower right

// ------------------------------------------------------------------ the day
// A summer afternoon: 15 July 2026, 15:30 in New York (19:30 UTC). The Sun stands in the south-west, so on screen
// (north up) daylight comes from the LOWER LEFT and every shadow falls toward the UPPER RIGHT.
export const SUBSOLAR = { lat: 21.5, lon: -114 };                 // earth.js drawEarth({sun: SUBSOLAR})
export const SUN_SCREEN = { x: -0.6, y: 0.8 };                      // unit vector toward the Sun, screen axes (x right, y down)
export const SHADOW = { x: 0.6, y: -0.8 };                          // shadows fall this way (screen axes)

// ------------------------------------------------------------------ solar system (ecliptic, seen from the north)
// Earth sits at the origin; the Sun is one AU to the lower left (matching the light direction above).
export const SUN = { x: -AU * Math.cos(20 * DEG), y: AU * Math.sin(20 * DEG) };
// Heliocentric ecliptic longitude λ (deg) -> world direction from the Sun. Earth's longitude on the date is 293°,
// and it must land at screen angle 20° (up-right of the Sun). Angles counter-clockwise, y up on screen.
export const ECL_ROT = 20 - 293;
export function eclDir(lonDeg) {
  const a = (lonDeg + ECL_ROT) * DEG;
  return { x: Math.cos(a), y: -Math.sin(a) };
}
/** World position of a body at heliocentric ecliptic longitude `lonDeg`, distance `r` metres from the Sun. */
export const helio = (lonDeg, r) => { const d = eclDir(lonDeg); return { x: SUN.x + d.x * r, y: SUN.y + d.y * r }; };
export const MOON = { angle: 32, dist: 3.844e8 };                   // geocentric screen angle (ccw, deg) and distance
export const MOON_POS = { x: Math.cos(MOON.angle * DEG) * MOON.dist, y: -Math.sin(MOON.angle * DEG) * MOON.dist };
// Voyager 1: ecliptic longitude ~256°, ~168 AU from the Sun in mid-2026 (nearly one light-day = 173 AU).
export const VOYAGER = helio(256, 168 * AU);

// ------------------------------------------------------------------ the galaxy (galactic plane, seen from the north pole)
// Galactic longitude l (deg) -> screen angle l + GAL_ROT (ccw, y up). l = 0 (the galactic centre) points RIGHT, l = 90
// (the direction of rotation) points UP, so the disc turns clockwise, as it really does seen from the north.
export const GAL_ROT = 0;
/** World position of an object at galactic (l, b) deg and distance d metres from the Sun (projected onto the plane). */
export function gal(l, b, d) {
  const a = (l + GAL_ROT) * DEG, p = d * Math.cos(b * DEG);
  return { x: p * Math.cos(a), y: -p * Math.sin(a) };
}
export const GC = gal(0, 0, 26000 * LY);                            // Sagittarius A*, 26,000 ly away
export const R_MW = 50000 * LY;                                     // Milky Way disc radius
export const ANDROMEDA = gal(121.17, -21.57, 2.5e6 * LY);
export const LANIAKEA = gal(307, 9, 2.0e8 * LY);                    // ~ the Great Attractor (Norma), Laniakea's heart
export const R_OBS = 46.5e9 * LY;                                   // observable universe radius (93 billion ly across)

// ------------------------------------------------------------------ zoom keys
// Per beat: F (metres across the frame) reached `at` seconds into the beat, then `drift` (F multiplier by the end of
// the beat; > 1 = still easing outward). Keys are joined by a monotone spline in log10(F).
const K = (F, at = 2.2, drift = 1.12) => ({ F, at, drift });
export const KEYS = [
  /* 00 hook       */ { F: 0.30, at: 0, drift: 1.06 },
  /* 01 promise    */ K(0.36, 3.0, 1.25),
  /* 02 person     */ K(3.4, 1.8, 1.12),
  /* 03 blanket    */ K(32, 1.8, 1.15),
  /* 04 meadow     */ K(700, 2.2, 1.12),
  /* 05 park       */ K(8200, 2.4, 1.1),
  /* 06 manhattan  */ K(48e3, 2.4, 1.1),
  /* 07 harbor     */ K(1.7e5, 2.4, 1.15),
  /* 08 coast      */ K(1.45e7, 6.2, 1.06),
  /* 09 earth      */ K(3.3e7, 2.0, 1.04),
  /* 10 iss        */ K(3.5e7, 2.0, 1.03),
  /* 11 moon       */ K(9.5e8, 3.0, 1.05),
  /* 12 handful    */ K(1.6e9, 2.0, 1.05),
  /* 13 sun        */ K(6.0e11, 3.2, 1.06),
  /* 14 inner      */ K(1.6e12, 2.6, 1.08),
  /* 15 giants     */ K(2.4e13, 3.0, 1.05),     // Neptune (30 AU) sits straight up from the Sun on this date
  /* 16 voyager    */ K(7.0e13, 3.0, 1.06),
  /* 17 oort       */ K(5.6e16, 5.0, 1.06),
  /* 18 proxima    */ K(1.5e17, 2.6, 1.06),
  /* 19 dozen      */ K(3.2e17, 2.0, 1.08),
  /* 20 night-sky  */ K(1.3e20, 3.0, 1.06),     // the 2,600 ly naked-eye bubble (Deneb at its top) clears the top bar
  /* 21 milky-way  */ K(1.95e21, 3.0, 1.03),
  /* 22 we-are-here*/ K(2.05e21, 2.0, 1.02),
  /* 23 galactic-yr*/ K(2.15e21, 2.0, 1.03),
  /* 24 local-group*/ K(6.0e22, 3.0, 1.06),
  /* 25 andromeda  */ K(6.6e22, 2.0, 1.05),
  /* 26 clusters   */ K(1.5e24, 3.6, 1.08),
  /* 27 laniakea   */ K(9.0e24, 2.6, 1.06),
  /* 28 cosmic-web */ K(1.6e26, 4.0, 1.08),
  /* 29 every-point*/ K(1.85e26, 1.2, 1.04),
  /* 30 observable */ K(2.1e27, 3.6, 1.03),     // CMB ring (r 46.5 Gly) clears the top bar
  /* 31 stretching */ K(2.18e27, 2.0, 1.02),
  /* 32 edge       */ K(2.23e27, 2.0, 1.02),
  /* 33 beyond     */ K(2.28e27, 2.0, 1.03),
  /* 34 center     */ K(2.38e27, 2.0, 1.0),
  /* 35 back       */ K(0.30, 7.6, 1.0),        // 28 powers of ten in ~7 s, ending on the hand
  /* 36 hand-again */ K(0.30, 0.5, 1.03),
  /* 37 outro      */ K(0.34, 2.0, 1.0),        // end screen: separate slow pull-back below (OUTRO)
];
// End screen (beat 37 tail, ~16 s): after the last line, a slow calm pull-back from the hand to the meadow.
export const OUTRO = { from: 0.34, to: 900, delay: 2.4 };

// ------------------------------------------------------------------ camera centre as a function of F
// [log10 F, x, y]: the centre glides between consecutive anchors (smootherstep in log F); constant past the ends.
const PARK_C = { x: 746, y: -1155 }, MANHATTAN_C = { x: 800, y: -1850 };
const MID = (a, b, k = 0.5) => ({ x: L.lerp(a.x, b.x, k), y: L.lerp(a.y, b.y, k) });
export const CENTRES = [
  [-0.3, 0, 0],                                 // the hand
  [0.55, PERSON.x, PERSON.y],                   // the person (the hand is at the end of an outstretched arm)
  [1.3, PERSON.x * 0.5, PERSON.y * 0.5],
  [2.0, 0, 0],
  [2.9, MEADOW_C.x, MEADOW_C.y],                // the meadow
  [3.75, PARK_C.x, PARK_C.y],                   // the park
  [4.6, MANHATTAN_C.x, MANHATTAN_C.y],          // Manhattan
  [5.2, 0, 9000],                               // the harbour
  [6.1, 0, 0],                                  // back to the hand: the globe is centred on it
  [8.6, 0, 0],
  [8.98, MOON_POS.x * 0.5, MOON_POS.y * 0.5],   // the Earth-Moon pair
  [9.25, 0, 0],
  [10.6, 0, 0],                                 // stay on Earth until the Sun can share the frame with it
  [11.0, SUN.x * 0.25, SUN.y * 0.25],           // pan only as fast as keeps Earth on screen (offset < ~900 px)
  [11.3, SUN.x * 0.55, SUN.y * 0.55],
  [11.6, SUN.x, SUN.y],                         // the Sun
  [13.3, SUN.x, SUN.y],
  [13.85, MID(SUN, VOYAGER, 0.42).x, MID(SUN, VOYAGER, 0.42).y],
  [14.6, SUN.x, SUN.y],
  [20.3, SUN.x, SUN.y],                         // stay on the Sun through the naked-eye bubble (beat 20, lf ≈ 20.15)
  [21.25, GC.x, GC.y],                          // the galactic centre
  [21.7, GC.x, GC.y],
  [22.8, MID({ x: 0, y: 0 }, ANDROMEDA, 0.5).x, MID({ x: 0, y: 0 }, ANDROMEDA, 0.5).y],
  [23.4, MID({ x: 0, y: 0 }, ANDROMEDA, 0.5).x, MID({ x: 0, y: 0 }, ANDROMEDA, 0.5).y],
  [24.2, LANIAKEA.x * 0.04, LANIAKEA.y * 0.04], // groups → the Virgo Cluster (54 Mly) framed with the Local Group
  [24.95, LANIAKEA.x * 0.6, LANIAKEA.y * 0.6],  // Laniakea (we sit on its outskirts)
  [25.6, LANIAKEA.x * 0.3, LANIAKEA.y * 0.3],
  [26.4, 0, 0],                                 // the observable universe is centred on us
];
export function centreAt(lf) {
  if (lf <= CENTRES[0][0]) return { x: CENTRES[0][1], y: CENTRES[0][2] };
  for (let i = 1; i < CENTRES.length; i++) {
    const [l1, x1, y1] = CENTRES[i];
    if (lf <= l1) {
      const [l0, x0, y0] = CENTRES[i - 1];
      const k = L.invLerp(l0, l1, lf), e = k * k * k * (k * (6 * k - 15) + 10);
      return { x: L.lerp(x0, x1, e), y: L.lerp(y0, y1, e) };
    }
  }
  const e = CENTRES[CENTRES.length - 1];
  return { x: e[1], y: e[2] };
}

// ------------------------------------------------------------------ monotone spline through the keys
let pts = null;
function points(tl) {
  if (pts) return pts;
  const p = [];
  KEYS.forEach((k, i) => {
    const s = tl.scenes[i], d = s.end - s.start;
    const lf = Math.log10(k.F);
    p.push([s.start + Math.min(k.at, d * 0.8), lf]);
    p.push([s.end - 0.02, lf + Math.log10(k.drift)]);
  });
  // keep times strictly increasing, values non-decreasing within each zoom direction (PCHIP handles the rest)
  pts = p.filter((q, i) => i === 0 || q[0] > p[i - 1][0] + 1e-3);
  return pts;
}
function pchip(P, t) {
  if (t <= P[0][0]) return P[0][1];
  const n = P.length;
  if (t >= P[n - 1][0]) return P[n - 1][1];
  let i = 0;
  while (P[i + 1][0] < t) i++;
  const slope = (a, b) => (P[b][1] - P[a][1]) / (P[b][0] - P[a][0]);
  const m = (j) => {
    if (j === 0 || j === n - 1) return 0;
    const s0 = slope(j - 1, j), s1 = slope(j, j + 1);
    if (s0 * s1 <= 0) return 0;
    const h0 = P[j][0] - P[j - 1][0], h1 = P[j + 1][0] - P[j][0];
    return (3 * (h0 + h1)) / ((2 * h1 + h0) / s0 + (h1 + 2 * h0) / s1);   // Fritsch–Carlson weighted harmonic mean
  };
  const h = P[i + 1][0] - P[i][0], u = (t - P[i][0]) / h;
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
  return h00 * P[i][1] + h10 * h * m(i) + h01 * P[i + 1][1] + h11 * h * m(i + 1);
}

/** log10 of the field of view (metres across the frame) at global time gt. */
export function logField(gt, tl) {
  const last = tl.scenes[tl.scenes.length - 1];
  const t0 = tl.lines[tl.lines.length - 1].end + OUTRO.delay;
  if (gt > t0) {   // end screen: a calm pull-back, ease-in-out over the rest of the film
    const k = L.ease.inOutCubic(L.invLerp(t0, last.end, gt));
    return L.lerp(Math.log10(OUTRO.from), Math.log10(OUTRO.to), k);
  }
  return pchip(points(tl), gt);
}

export function at(gt, tl) {
  const lf = logField(gt, tl);
  const F = Math.pow(10, lf);
  const c = centreAt(lf);
  // a breath of hand-held drift, proportional to the field so it reads the same at every scale
  const mpp = F / L.W;
  return {
    x: c.x + L.noise1(gt * 0.23, 1) * 3 * mpp,
    y: c.y + L.noise1(gt * 0.19, 2) * 3 * mpp,
    mpp,
    F,
    lf,
    anchor: 0.5,
  };
}
