// Camera for "Why Does a Week Have 7 Days?" (90 s). Owned by the orchestrator — builders: read, don't edit
// (put needs in "sharedRequests").
//
// WORLD: a stylised side view in design units "u" (1 u = 1 px at mpp 1). Not to scale, and never claimed to be.
//   EARTH  a sphere of radius 260 u centred at the origin, drawn by env (real ETOPO relief, day/night, spin).
//   MOON   orbits the Earth at 1,300 u (radius 70 u). SUN at (6200, 7200), radius 520 u: Earth's orbit radius ≈ 9,501 u.
//          The Sun is BELOW-RIGHT of the Earth, so the Earth's top limb is on the NIGHT side.
//   CAL    the hook's paper calendar page, floating in the dark 1,650 u below the Earth (720 × 820 u).
//   ROOF   the Babylonian rooftop stands on the Earth's top limb, (0, −260). At rooftop zoom (mpp ≈ 0.016) the
//          limb is a horizon and env's atmosphere is a night sky. 1 u there ≈ "a couple of metres" (stylised).
//   LIGHTS the seven moving lights, in the sky above the rooftop: an arc (beats 8-11), then a vertical column in
//          weekday order (beats 12-15), then the header row of CAL2 (beat 16+, owned by s16).
//   CAL2   the final calendar page, hung in the sky above the rooftop (11.6 × 12.4 u).
//
// ACTS (one continuous journey, no cuts):
//   I   0-6   calendar page → tilt up to the spinning Earth → Moon's orbit → Earth's orbit round the Sun → back in
//   II  7-15  dive into the Earth's top limb onto a Babylonian rooftop at night → the seven lights rise →
//             pull back to the globe (the week spreads) → back into the sky: the lights line up as the weekdays
//   III 16-18 the column of lights swings into the header row of a calendar page: reforms try 10, 5 and 6 columns
import { makeCamera } from '../../../engine/runtime/kit.js';

const H = 1920, ANCHOR = 0.5;
/** Camera y that puts world y `wy` at screen y `sy` for a given mpp. */
const frameY = (wy, sy, mpp) => wy + (H * ANCHOR - sy) * mpp;
/** Rooftop beats: camera y that puts the horizon (ROOF.y) at screen y `sy`. */
const horizonY = (sy, mpp) => frameY(-260, sy, mpp);
/** Beats 12-15: the horizon low enough that the set's tallest bits (watcher, palms, ~2.45 u) stay under the captions. */
const SET_TOP = 2.45;
const headClear = (mpp, sy = 1398) => horizonY(sy + SET_TOP / mpp, mpp);

export const EARTH = { x: 0, y: 0, r: 260 };
export const MOON_ORBIT = 1300, MOON_R = 70;
export const SUN = { x: 6200, y: 7200, r: 520 };
export const EARTH_ORBIT = Math.hypot(SUN.x - EARTH.x, SUN.y - EARTH.y);
export const CAL = { x: 0, y: 1650, w: 720, h: 820 };
export const ROOF = { x: 0, y: -EARTH.r };
export const CAL2 = { x: 0.5, y: -268.0, w: 11.6, h: 12.4 };

// The seven lights. `sky` = order named in line 8 (arc left → right); `day` = weekday index, Sunday = 0.
// r = core radius (u) at rooftop scale. fr = the French weekday, norse = the English weekday's god.
export const LIGHTS = [
  { key: 'sun', name: 'SUN', sky: 0, day: 0, weekday: 'SUNDAY', fr: 'DIMANCHE', col: [255, 206, 120], r: 0.36 },
  { key: 'moon', name: 'MOON', sky: 1, day: 1, weekday: 'MONDAY', fr: 'LUNDI', col: [220, 228, 245], r: 0.32 },
  { key: 'mercury', name: 'MERCURY', sky: 2, day: 3, weekday: 'WEDNESDAY', fr: 'MERCREDI', norse: 'WODEN', col: [190, 215, 230], r: 0.11 },
  { key: 'venus', name: 'VENUS', sky: 3, day: 5, weekday: 'FRIDAY', fr: 'VENDREDI', norse: 'FRIGG', col: [255, 248, 225], r: 0.17 },
  { key: 'mars', name: 'MARS', sky: 4, day: 2, weekday: 'TUESDAY', fr: 'MARDI', norse: 'TYR', col: [255, 128, 92], r: 0.13 },
  { key: 'jupiter', name: 'JUPITER', sky: 5, day: 4, weekday: 'THURSDAY', fr: 'JEUDI', norse: 'THOR', col: [255, 226, 176], r: 0.16 },
  { key: 'saturn', name: 'SATURN', sky: 6, day: 6, weekday: 'SATURDAY', fr: 'SAMEDI', col: [236, 210, 150], r: 0.13 },
];
/** Arc position (beats 8-11) of the light named `sky`-th: an ecliptic arc over the rooftop. */
export function skyPos(sky) {
  const th = ((160 - sky * (140 / 6)) * Math.PI) / 180;
  return { x: 7.0 * Math.cos(th), y: -263.5 - 8.0 * Math.sin(th) };
}
/** Column position (beats 12-15) of weekday `day` (Sunday = 0 at the top). */
export const COL = { x: -3.2, y0: -274.0, dy: 1.4 };   // (raised + tightened: the SATURDAY row and its gloss clear the caption band)
export const colPos = (day) => ({ x: COL.x, y: COL.y0 + day * COL.dy });

const cam = makeCamera([
  { x: CAL.x, y: frameY(CAL.y, 1010, 1.2), mpp: 1.2, travel: 0 },                 // 0 hook: the calendar page (pulls out from 1.02)
  { x: CAL.x, y: frameY(CAL.y, 900, 1.12), mpp: 1.12, travel: 0.9 },             // 1 "comes from the sky. Except the week"
  { x: 0, y: frameY(0, 790, 0.78), mpp: 0.78, travel: 1.3 },                      // 2 tilt up to the Earth: one spin
  { x: 0, y: frameY(0, 800, 3.4), mpp: 3.4, travel: 1.3 },                        // 3 the Moon's orbit
  { x: SUN.x, y: frameY(SUN.y, 800, 23.5), mpp: 23.5, travel: 1.4 },              // 4 one orbit of the Sun
  { x: SUN.x, y: frameY(SUN.y, 800, 25), mpp: 25, travel: 0.8 },                  // 5 nothing takes a week
  { x: 0, y: frameY(0, 800, 3.4), mpp: 3.4, travel: 1.5 },                        // 6 the Moon's four phases
  { x: 0, y: frameY(ROOF.y, 1150, 0.016), mpp: 0.016, travel: 2.5 },              // 7 dive into the limb: Babylon rooftop
  { x: 0, y: horizonY(1530, 0.0175), mpp: 0.0175, travel: 1.2 },                 // 8 tilt up: the seven lights rise
  { x: 0.25, y: horizonY(1530, 0.0165), mpp: 0.0165, travel: 0.8 },              // 9 seven wanderers
  { x: 0.2, y: horizonY(1530, 0.0168), mpp: 0.0168, travel: 0.8 },               // 10 the Sabbath
  { x: 0, y: frameY(0, 900, 0.68), mpp: 0.68, travel: 1.35 },                     // 11 pull back to the globe: the spread
  { x: 0.9, y: headClear(0.0125), mpp: 0.0125, travel: 1.8 },                     // 12 back into the sky: the column
  { x: 0.9, y: headClear(0.0122), mpp: 0.0122, travel: 0.6 },                     // 13 Saturday / Sunday / Monday
  { x: 0.6, y: headClear(0.0112), mpp: 0.0112, travel: 1.0 },                     // 14 French: Tue-Fri rows centred, all 7 in frame
  { x: 0.6, y: headClear(0.0109), mpp: 0.0109, travel: 0.6 },                     // 15 English: Norse gods
  { x: CAL2.x, y: frameY(CAL2.y, 800, 0.0142), mpp: 0.0142, travel: 1.4 },        // 16 the calendar: a 10-day week
  { x: CAL2.x, y: frameY(CAL2.y, 800, 0.014), mpp: 0.014, travel: 0.6 },          // 17 Soviet 5 / 6-day weeks
  { x: CAL2.x, y: frameY(CAL2.y, 800, 0.0142), mpp: 0.0142, travel: 0.6, push: 1.12 }, // 18 back to 7: slow pull-out (room for the hero above the page)
], { anchor: ANCHOR });
export const at = cam.at;
export const KEYS = cam.KEYS;
