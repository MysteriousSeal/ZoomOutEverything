// Camera for "What If the Moon Disappeared?" (11c, ~50 s cut): one continuous pull-back. Owned by the orchestrator.
//
// WORLD: SIDE VIEW in metres. x horizontal (sea to the right, land to the left), y = −altitude (up is negative).
// Mean sea level is the top of a circle of radius R_EARTH centred at EARTH = (0, +R_EARTH), so at beach scale the
// sea is flat and the pull-back turns it into the globe. The shoreline is at x = 0.
//   beach: shoreline x = 0, wet sand slope 1:6, dune crest ~4.2 m at x ≈ −9.5 m, seabed drops to ~10 m by x ≈ 20 m (env.terrain)
//   globe: night side up (the beach sits on the top limb, in darkness); the Sun is to the LOWER-LEFT (SUN_DIR)
//   MOON: true distance 384,400 km from Earth's centre, to the UPPER-RIGHT (MOON_DIR = −SUN_DIR, a full Moon),
//         which is also where the sky-Moon hangs over the sea in the beach shots.
import { makeCamera } from '../../../engine/runtime/kit.js';

export const R_EARTH = 6.371e6;
export const R_MOON = 1.7374e6;
export const D_MOON = 3.844e8;                 // mean centre-to-centre distance (m)
export const RECEDE = 0.038;                   // m per year (lunar laser ranging: 3.82 ± 0.07 cm/yr)
export const EARTH = { x: 0, y: R_EARTH };
const MD = { x: 0.614, y: -0.789 };            // unit vector Earth -> Moon (screen-up-right)
const ml = Math.hypot(MD.x, MD.y);
export const MOON_DIR = { x: MD.x / ml, y: MD.y / ml };
export const SUN_DIR = { x: -MOON_DIR.x, y: -MOON_DIR.y };   // direction toward the Sun (full Moon opposite)
export const MOON = { x: EARTH.x + D_MOON * MOON_DIR.x, y: EARTH.y + D_MOON * MOON_DIR.y };

// helper: camera centre that puts world point p at screen (sx, sy) for a given mpp (anchor 0.5)
const place = (p, sx, sy, mpp) => ({ x: p.x - (sx - 540) * mpp, y: p.y - (sy - 960) * mpp, mpp });

// beach framings: shoreline (0, 0) at screen (sx, sy)
const SHORE = { x: 0, y: 0 };
// globe framings: Earth's centre at screen (sx, sy); radius on screen = R_EARTH / mpp
// system framing: Earth at (230, 1120), Moon at ~(790, 400): 912 px apart -> 4.215e5 m/px
const SYS = 4.215e5;

const cam = makeCamera([
  { ...place(SHORE, 430, 1140, 0.030), travel: 0 },                  // 0 hook: night beach under the full Moon
  { ...place(SHORE, 420, 1170, 0.041), travel: 1.6 },                // 1 a hundred times darker: slow pull-back
  { ...place(EARTH, 480, 830, 1.85e4), travel: 2.5 },                // 2 tides: the big pull-back to the globe (r 344 px), low-left so the ghost Moon has room
  { ...place(EARTH, 490, 815, 1.75e4), travel: 1.0 },                // 3 only the Sun left: a third
  { ...place(EARTH, 600, 712, 1.65e4), travel: 1.2 },                // 4 eclipses: drift toward the lit (lower-left) side
  { ...place(EARTH, 540, 760, 2.05e4), travel: 1.4 },                // 5 tilt: room for the axis above/below the poles
  { ...place(EARTH, 540, 760, 2.15e4), travel: 0.9 },                // 6 wobble (+ seasons haywire)
  { ...place(EARTH, 230, 1120, SYS), travel: 2.1 },                  // 7 the Moon is leaving: Earth–Moon system, true scale
  { ...place(EARTH, 230, 1120, SYS * 0.985), travel: 0.8, push: 0.98 }, // 8 3.8 cm a year
  { ...place(EARTH, 230, 1120, SYS * 1.0), travel: 0.9, push: 1.04 },   // 9 fingernails: a slow final pull-out
], { anchor: 0.5, hookFrom: 0.85, drift: 3 });
export const at = cam.at;
export const KEYS = cam.KEYS;
