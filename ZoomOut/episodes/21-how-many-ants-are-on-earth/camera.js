// Camera for "How Many Ants Are on Earth?" (≈77 s, hook format). Owned by the orchestrator — builders: read, don't edit.
//
// WORLD: SIDE VIEW in metres, float64. x horizontal, y DOWN (y = −altitude). The ground is the top of a circle of
// radius R_EARTH centred at (0, +R_EARTH): at macro scale it is flat (y = 0), the zoom-out reveals the curve, then the
// real globe (env.js, earth.js). The world origin (0, 0) is ONE spot on the ground in central Texas (Atta texana
// leafcutter country), which sits on the globe's top limb whenever the camera is near the ground.
//   Macro props (all on the ground line y = 0, x in metres):
//     hero ant        x ≈ 0         (beat 0, 5 mm long)
//     stone colony    x = +0.14     (beat 1, stone ≈ 12 cm wide, nest under it to ≈ 15 cm deep)
//     leafcutter nest x = +3.2      (beat 2, mound ≈ 5 m across, chambers to ≈ 5 m deep; trail runs right of it)
//     amber nugget    x = −0.45     (beat 8, lying on the soil)
//     the ant line    x = 0         (beats 9–11: a column of ants going straight UP from the ground, then 668 AU of line)
//     shoe + ant      toe at x ≈ −0.015, ant at x ≈ +0.007 (beat 12; ant ≈ 120–130 px)
//   Solar System (a top-down map in the SAME plane; planets on true-radius orbits around SUN, angles chosen for layout).
//     The Sun is 1 AU from Earth's centre toward the upper right (screen), so the ant's spot has the Sun high in the
//     sky (daylight) and the line, going straight up (−y), crosses Neptune's orbit at ≈ 30.9 AU and Pluto's at ≈ 38 AU.
//
// SHOTS: makeCamera() with one key per SHOT (not per beat). Shots start at voice-timeline times (beat or phrase starts),
// so the line's flight in beat 10 can hit "passes Neptune" and "then Pluto" on their words. Big zooms tie the pan to the
// zoom (kit.js), so both ends stay on screen.
import { makeCamera } from '../../../engine/runtime/kit.js';
import * as L from '../../../engine/runtime/lib.js';

export const R_EARTH = 6.371e6;
export const AU = 1.496e11;
export const ANT_LEN = 0.005;                          // "half a centimeter each"
export const ANTS = 2e16;                              // Schultheiss et al. 2022, conservative estimate
export const LINE_LEN = ANTS * ANT_LEN;                // 1.0e14 m ≈ 668 AU
export const COL_TOP = 0.081;                          // height (m) of the macro column s09 builds (≈ 16 ants)
export const X = { hero: 0, stone: 0.14, nest: 3.2, amber: -0.45, line: 0, shoeToe: -0.015, lastAnt: 0.007 };
export const EARTH_C = { x: 0, y: R_EARTH };           // Earth's centre

// ------------------------------------------------------------------ Solar System (metres, same plane)
const SUN_DIR = [0.5, -0.866];                        // unit vector Earth centre → Sun (upper right on screen)
export const SUN = { x: EARTH_C.x + SUN_DIR[0] * AU, y: EARTH_C.y + SUN_DIR[1] * AU };
const DEG = Math.PI / 180;
const onOrbit = (rAU, deg) => ({ x: SUN.x + rAU * AU * Math.cos(deg * DEG), y: SUN.y + rAU * AU * Math.sin(deg * DEG) });
// true semi-major axes (AU). `deg` = map angle (y down, so −90° is straight up from the Sun).
export const PLANETS = [
  { name: 'Mercury', a: 0.387, deg: 150, col: [180, 170, 160], px: 1.6 },
  { name: 'Venus', a: 0.723, deg: 20, col: [235, 215, 170], px: 2.2 },
  { name: 'Earth', a: 1.0, deg: 120, col: [120, 180, 255], px: 2.6 },   // = Earth's actual position (Sun → Earth)
  { name: 'Mars', a: 1.524, deg: -150, col: [225, 120, 80], px: 2.0 },
  { name: 'Jupiter', a: 5.203, deg: -30, col: [225, 200, 160], px: 3.6 },
  { name: 'Saturn', a: 9.537, deg: 200, col: [230, 210, 160], px: 3.2 },
  { name: 'Uranus', a: 19.19, deg: 35, col: [170, 225, 230], px: 2.8 },
  { name: 'Neptune', a: 30.07, deg: -97, col: [110, 150, 255], px: 2.8 },  // just left of the line's crossing
].map((p) => ({ ...p, ...onOrbit(p.a, p.deg) }));
// Pluto: a = 39.48 AU, e = 0.2488 (b = 38.24 AU), perihelion pointing +x (screen right). Inclination (17°) ignored on
// this flat map. The line (x = 0, going up) crosses the orbit at ≈ 38.0 AU from Earth; Pluto sits ≈ 3 AU right of it.
export const PLUTO_ORBIT = { a: 39.48 * AU, b: 39.48 * AU * Math.sqrt(1 - 0.2488 ** 2), cx: SUN.x - 0.2488 * 39.48 * AU, cy: SUN.y };
export const plutoAt = (E) => ({ x: PLUTO_ORBIT.cx + PLUTO_ORBIT.a * Math.cos(E), y: PLUTO_ORBIT.cy + PLUTO_ORBIT.b * Math.sin(E) });
export const PLUTO = { name: 'Pluto', ...plutoAt(-Math.acos(((3 * AU) - PLUTO_ORBIT.cx) / PLUTO_ORBIT.a)), col: [215, 190, 170], px: 2.2 };
// where the line crosses each orbit (altitude above the ant's spot, metres) — for flashes, labels and the readout
export const CROSS = {
  neptune: -(SUN.y - Math.sqrt((30.07 * AU) ** 2 - SUN.x ** 2)),                                                     // ≈ 30.9 AU
  pluto: -(PLUTO_ORBIT.cy - PLUTO_ORBIT.b * Math.sqrt(1 - (PLUTO_ORBIT.cx / PLUTO_ORBIT.a) ** 2)),                    // ≈ 38.0 AU
  voyager: 170 * AU,                                                                                                   // distance mark only
  heliopause: 120 * AU,
};

// ------------------------------------------------------------------ shots
// key: x, y, mpp (m/px), travel (s), push (hold zoom factor; 1 = none, >1 = slow pull-out). anchor = 0.47 → screen
// y of world y is  902.4 + (y − cam.y) / mpp.  `ground(sy, mpp)` gives the cam.y that puts the ground (y = 0) at
// screen row sy; `centre(sy, mpp)` puts Earth's centre there.
const ANCHOR = 0.47, AY = L.H * ANCHOR;
const ground = (sy, mpp) => (AY - sy) * mpp;
const centre = (sy, mpp) => R_EARTH + (AY - sy) * mpp;
const B = (i) => (tl) => tl.scenes[i].start;
const PH = (i, j, edge = 'start', dt = 0) => (tl) => tl.lines[i].phrases[j][edge] + dt;

// line-flight constants: the tip of the line sits TIP_PX above Earth's top on screen while the camera pulls out
export const TIP_PX = { flight: 700, full: 900 };
export const EARTH_SY = { leave: 1180, flight: 1250, full: 1300 };   // screen y of the ant's spot during beats 10–11

export const SHOTS = [
  { name: 'hook', beat: 0, at: B(0), x: 0, y: ground(1180, 2.0e-5), mpp: 2.0e-5, travel: 0 },
  { name: 'colony', beat: 1, at: B(1), x: 0.09, y: ground(760, 2.6e-4), mpp: 2.6e-4, travel: 1.6 },
  { name: 'leafcutters', beat: 2, at: B(2), x: 2.6, y: ground(640, 7e-3), mpp: 7e-3, travel: 1.7 },
  { name: 'globe', beat: 3, at: B(3), x: 0, y: centre(880, 1.6e4), mpp: 1.6e4, travel: 2.6 },
  { name: 'estimate', beat: 4, at: B(4), x: 0, y: centre(690, 2.12e4), mpp: 2.12e4, travel: 1.4 },
  { name: 'zeros', beat: 5, at: B(5), x: 0, y: centre(690, 2.05e4), mpp: 2.05e4, travel: 0.8 },
  { name: 'per-person', beat: 6, at: B(6), x: 0, y: centre(690, 1.98e4), mpp: 1.98e4, travel: 0.8 },
  { name: 'biomass', beat: 7, at: B(7), x: 0, y: centre(560, 3.03e4), mpp: 3.03e4, travel: 1.3 },
  { name: 'amber', beat: 8, at: B(8), x: X.amber, y: ground(1150, 6e-5), mpp: 6e-5, travel: 2.4 },
  { name: 'line-up', beat: 9, at: B(9), x: 0, y: ground(1300, 9e-5), mpp: 9e-5, travel: 1.5 },
  // beat 10: the line's flight. push 1 (no hold zoom) so the tip (TIP_PX × mpp) only ever grows.
  { name: 'leaves-earth', beat: 10, at: B(10), x: 0, y: ground(EARTH_SY.leave, 4.5e4), mpp: 4.5e4, travel: 1.53, push: 1 },
  { name: 'neptune', beat: 10, at: PH(10, 1, 'start', -0.4), x: 0, y: ground(EARTH_SY.flight, 7.05e9), mpp: 7.05e9, travel: 1.64, push: 1 },
  { name: 'pluto', beat: 10, at: PH(10, 2, 'start', -0.35), x: 0, y: ground(EARTH_SY.flight, 9.4e9), mpp: 9.4e9, travel: 1.72, push: 1 },
  // beat 11: the whole 668 AU line, Earth at y 1300, tip at y 400; then a slow pull-out (tip is clamped at LINE_LEN)
  { name: 'full-line', beat: 11, at: B(11), x: 0, y: ground(EARTH_SY.full, LINE_LEN / TIP_PX.full), mpp: LINE_LEN / TIP_PX.full, travel: 2.6, push: 1.04 },
  // beat 12: all the way back down to one ant beside a shoe
  { name: 'never-alone', beat: 12, at: B(12), x: -0.001, y: ground(1120, 4.2e-5), mpp: 4.2e-5, travel: 2.6, push: 0.97 },   // ant ≈ 120–130 px at x ≈ 740
  { name: 'question', beat: 13, at: B(13), x: -0.001, y: ground(1120, 4.0e-5), mpp: 4.0e-5, travel: 0.6, push: 0.98 },
];
export const KEYS = SHOTS;

const cam = makeCamera(SHOTS, { anchor: ANCHOR, hookFrom: 0.85, drift: 3 });
// makeCamera walks tl.scenes: hand it the SHOT timeline instead (one "scene" per shot)
const shotCache = new WeakMap();
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
/** Index of the shot playing at gt (and its start/travel progress). */
export function shotAt(gt, tl) {
  const st = shotTl(tl).scenes;
  let i = 0;
  st.forEach((s, j) => { if (s.start <= gt) i = j; });
  return { index: i, name: SHOTS[i].name, start: st[i].start, end: st[i].end, p: L.prog(gt - st[i].start, -0.05, SHOTS[i].travel) };
}
export const shotStart = (name, tl) => shotTl(tl).scenes[SHOTS.findIndex((s) => s.name === name)].start;
