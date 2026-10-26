// Camera for "How to Survive a Nuclear Blast" (EP 27, How to Survive #1). Owned by the setup agent / orchestrator —
// builders: read, don't edit.
//
// WORLD: one SIDE CROSS-SECTION of a city at dusk. Units: metres. x = right, y = DOWN (screen convention).
//   Street level (the foreground ground line) is y = 0; the soil cross-section is y > 0.
//   THE BUILDING (env.js BLD, foreground plane): x −12 … 12, six floors of 3.3 m (y 0 … −19.8), parapet to −20.8,
//     basement 0 … 3.6 (slab to 4.1), central concrete core x −2.4 … 2.4. Brick facade with 6 × 6 windows until beat 3,
//     then cut away (env cutK). Full geometry + screen helpers in env.js.
//   Street both sides: sodium lamps at x ±14.6, trees at x −27 and 28, ONE PARKED CAR at x 16.2 … 20.6 (env CAR).
//   Everything behind the foreground (three skyline layers, the distant fireball/column/cloud) lives on PARALLAX LAYERS
//   authored in "hook px" (how they look in the hook framing) — see env.js layerProj(v, p).
//   The detonation is far away on the RIGHT, on the horizon (hook px x ≈ 860). The blast front travels right → left.
//
// TIMING: every time is derived from build/timeline.json (beat starts B(i), phrase starts PH(i, j)); never hard-code.
//   timesFor(tl) → T (flash, blast0, impact, cut0, safe0, fallout0, night0, dawn0, …), shared with env.js.
//
// SHOTS (kit.js makeCamera, one key per SHOT started at a timeline time, as in ep 24; anchor 0.47 → the camera point
// lands at screen (540, 902)). Times below are for the current 60.06 s timeline.
//   hook      B0      0.00  wide city, building lower-left (screen x 260–500, parapet y ≈ 1312, street y 1520, road strip
//                           1520–1650); sky y 260–780 free for the headline + countdown; slow pull-out over the 8.3 s beat
//   flash     B1      8.26  slight drift right toward the flash, a touch wider (street ≈ 1515)
//   blast     B2     15.18  wider (mpp 0.12, street 1520): the front leaves the fireball at T.blast0 ≈ 16.5, hits the
//                           building ≈ 17.5 (≈ 22 px camera kick, gone in ≈ 0.5 s), leaves the screen ≈ 19.0
//   windows   PH2.2  20.53  push onto the shattered windows (mpp 0.016): window x 4.1–5.7 m, y −9.2…−7.4 ≈ y 1130–1250;
//                           the parapet stays at y ≥ 360 (never behind the HUD), the pavement ≈ 1730
//   inside    B3     24.73  pull back while the facade is wiped away from the core outward (cutK, 0.55 s) into the
//                           section (mpp 0.032): parapet ≈ 600, basement foot ≈ 1385 (above the caption band)
//   car       PH3.2  30.88  slide right (mpp 0.03): the building's right half + the parked car on "Not your car"
//   fallout   B4     34.16  pull back up (mpp 0.062): street ≈ 1320; sky for the dust
//   decay     B5     40.32  fast tilt up into the night sky (mpp 0.08): the street + building leave the frame (street ≈ 2260;
//                           env fades the building during the tilt); sky y 380–1300 = chart
//   h24       B6−0.45 46.20 fast tilt back down onto the building (mpp 0.045): parapet ≈ 828, street ≈ 1290
//   family    PH6.1  50.27  wide over the whole city (mpp 0.115, street ≈ 1360) at dawn: every building shelters
//   question  B7     54.33  settle into the hook framing under the opaque card (card y 560–1250, building under it)
import { makeCamera } from '../../../engine/runtime/kit.js';
import * as L from '../../../engine/runtime/lib.js';

export const ANCHOR = 0.47;
export const AY = L.H * ANCHOR;                               // 902.4
/** cam.y that puts world y `wy` at screen row `sy` for a given mpp */
export const rowAt = (wy, sy, mpp) => wy + (AY - sy) * mpp;
/** cam.x that puts world x `wx` at screen column `sx` */
export const colAt = (wx, sx, mpp) => wx + (L.W / 2 - sx) * mpp;

// the hook framing = the reference for every parallax layer ("hook pixels")
export const HOOK = { x: 16, y: rowAt(0, 1520, 0.1), mpp: 0.1 };   // street (y 0) at screen y 1520; building centre at x 380

export const MPP = { hook: 0.1, flash: 0.105, blast: 0.12, windows: 0.016, inside: 0.032, car: 0.03, fallout: 0.062, decay: 0.08, h24: 0.045, family: 0.115, question: 0.1 };

const B = (i, dt = 0) => (tl) => tl.scenes[i].start + dt;
const PH = (i, j, dt = 0) => (tl) => tl.lines[i].phrases[j].start + dt;
export { B, PH };

// ------------------------------------------------------------------ story times (from the timeline)
const tCache = new WeakMap();
/** All story times (s, film time) for this timeline. Cached; pure. */
export function timesFor(tl) {
  let T = tCache.get(tl);
  if (T) return T;
  const b = (i) => tl.scenes[i].start, ph = (i, j) => tl.lines[i].phrases[j];
  const blast0 = ph(2, 0).start + 1.2;
  T = {
    flash: ph(1, 0).start + 0.72,          // on "…the FLASH"
    flashRise: 0.35,
    blast0,                                // the front leaves the fireball
    impact: blast0 + 0.946,                // front reaches the building's right wall (≈ "…HITS")
    windows: ph(2, 2).start,               // "Then stay away from windows…"
    cut0: b(3) + 0.7, cutDur: 0.55,          // starts once the pull-back has lifted the basement clear of the caption band        // facade → section
    car: ph(3, 2).start,                   // "Not your car…"
    safe0: ph(3, 1).end - 0.5,             // core + basement keep a green glow from here
    fallout0: b(4) + 0.3,
    night0: b(4) - 0.6, nightDur: 6.5,
    dawn0: b(6) + 0.2, dawnDur: 6.0,
    family: ph(6, 1).start,                // "Don't go looking for family…"
    end: tl.total,
  };
  tCache.set(tl, T);
  return T;
}

// ------------------------------------------------------------------ shots
export const SHOTS = [
  { name: 'hook', at: B(0), x: HOOK.x, y: HOOK.y, mpp: MPP.hook, travel: 0 },
  { name: 'flash', at: B(1), x: 21, y: rowAt(0, 1515, MPP.flash), mpp: MPP.flash, travel: 1.0, push: 0.975 },
  { name: 'blast', at: B(2), x: 24, y: rowAt(0, 1520, MPP.blast), mpp: MPP.blast, travel: 1.0, push: 0.97 },
  // facade top (parapet) stays at y ≥ 360 through the push: never behind the HUD
  { name: 'windows', at: PH(2, 2, -0.15), x: colAt(4.9, 540, MPP.windows), y: rowAt(-8.3, 1180, MPP.windows), mpp: MPP.windows, travel: 1.5, push: 0.96 },
  // parapet ≈ 600 (clear of the STEP 3 sub chip), basement foot ≈ 1385 (above the caption band)
  { name: 'inside', at: B(3), x: 0, y: rowAt(-8.35, 989, MPP.inside), mpp: MPP.inside, travel: 1.9, push: 0.98 },
  { name: 'car', at: PH(3, 2, -0.1), x: 10.5, y: rowAt(0, 1150, MPP.car), mpp: MPP.car, travel: 1.2, push: 0.98 },
  { name: 'fallout', at: B(4), x: 4, y: rowAt(0, 1320, MPP.fallout), mpp: MPP.fallout, travel: 1.6, push: 0.97 },
  // the street (and the building) leave the frame entirely: the chart owns the sky; fast tilt (clears the captions)
  { name: 'decay', at: B(5), x: 4, y: rowAt(0, 2260, MPP.decay), mpp: MPP.decay, travel: 1.3, push: 0.98, fast: true },
  // starts 0.3 s before beat 6 so the building has cleared the caption band as the line starts
  { name: 'h24', at: B(6, -0.45), x: 0, y: rowAt(0, 1290, MPP.h24), mpp: MPP.h24, travel: 1.1, push: 0.985, fast: true },
  { name: 'family', at: PH(6, 1, -0.1), x: 22, y: rowAt(0, 1360, MPP.family), mpp: MPP.family, travel: 1.8, push: 0.98 },
  { name: 'question', at: B(7), x: HOOK.x, y: HOOK.y, mpp: MPP.question, travel: 1.6, push: 0.985 },
];
export const KEYS = SHOTS;
export const SHOT = Object.fromEntries(SHOTS.map((s) => [s.name, s]));

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
/** The shot playing at gt: {index, name, start, end, p (0→1 over its travel)}. */
export function shotAt(gt, tl) {
  const st = shotTl(tl).scenes;
  let i = 0;
  st.forEach((s, j) => { if (s.start <= gt) i = j; });
  return { index: i, name: SHOTS[i].name, start: st[i].start, end: st[i].end, p: L.prog(gt - st[i].start, -0.05, SHOTS[i].travel) };
}
export const shotStart = (name, tl) => shotTl(tl).scenes[SHOTS.findIndex((s) => s.name === name)].start;

/** inverse of L.ease.inOutCubic */
const invIOC = (y) => (y < 0.5 ? Math.cbrt(y / 4) : 1 - Math.cbrt(2 * (1 - y)) / 2);
/** Camera at film time gt: {x, y, mpp, anchor}. 'fast' shots re-time their travel (quick out-ease: the foreground clears
 *  the caption band in ≈ 0.4 s). Adds a short, decaying shake when the blast front hits. */
export function at(gt, tl) {
  const sh = shotAt(gt, tl), key = SHOTS[sh.index];
  let g = gt;
  if (key.fast) {
    const u = L.clamp((gt - sh.start + 0.05) / key.travel);
    if (u > 0 && u < 1) {
      const a = 0.1, w = (u < a ? (u * u) / (2 * a) : u - a / 2) / (1 - a / 2);   // short ease-in, then out-quart
      const want = 1 - Math.pow(1 - w, 4);
      g = sh.start - 0.05 + key.travel * invIOC(L.clamp(want));
    }
  }
  const c = cam.at(g, shotTl(tl));
  const dt = gt - timesFor(tl).impact;
  if (dt > 0 && dt < 0.9) {
    const a = 22 * Math.exp(-dt / 0.17) * L.smoothstep(L.clamp(dt / 0.03));   // px, ≈ 22 px kick, gone in ≈ 0.5 s
    c.x += L.noise1(gt * 26, 11) * a * c.mpp;
    c.y += L.noise1(gt * 23, 12) * a * 0.75 * c.mpp;
  }
  return c;
}
