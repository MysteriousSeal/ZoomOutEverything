// Camera for "What Happens in Your Body in One Second?" (90 s, series "Inside You"). Owned by the orchestrator.
//
// ONE CONTINUOUS JOURNEY in three acts, all on one world (no cuts):
//   Act I   (beats 0-3)  the hand on the stopwatch, then the heart behind it          (~0.15-0.5 mm/px)
//   Act II  (beats 4-11) INTO the thumb's skin (nerve), INTO a dermal blood vessel (red cells), back OUT to the
//                        body (red-marrow map) and INTO the hip bone's marrow           (5 µm/px ... 0.1 µm/px)
//   Act III (beats 12-18) back OUT to the chest (breath), the whole body (100 W) and the reveal
//
// WORLD: a FRONT VIEW of a standing person, in metres. x to the viewer's right, y DOWN (y = −height above the floor):
//   feet on y = 0, top of the head at y = −1.75. The person's right hand (viewer's LEFT) holds a stopwatch in front
//   of the belly, thumb on the crown. Microscopic worlds are nested at their true positions inside the body, so every
//   zoom is a straight dive into (or out of) the previous frame:
//   SKIN    a fingertip section inside the thumb pad (5 mm across); the nerve and the vessel are inside it
//   VESSEL  a ~60 µm dermal venule 1 mm under the skin surface, running horizontally (+x = downstream)
//   MARROW  red marrow inside the right iliac crest (hip bone, viewer's left)
import * as L from '../../../engine/runtime/lib.js';
import { makeCamera } from '../../../engine/runtime/kit.js';
import { legacy, CUT } from './legacy.js';

export const H_BODY = 1.75;

/** Key points (world metres). */
export const P = {
  watch: { x: -0.06, y: -1.1 },                 // stopwatch centre (face toward the viewer)
  crown: { x: -0.06, y: -1.1 - 0.033 },         // crown / start button on top of the case
  thumb: { x: -0.06, y: -1.142 },               // thumb pad pressing the crown
  heart: { x: 0.035, y: -1.3 },                 // heart centre (person's left = viewer's right)
  lungs: { x: 0, y: -1.33 },                    // between the two lungs
  gut: { x: 0, y: -1.0 },                       // small intestine, centre of the belly
  skin: { x: -0.0585, y: -1.1475 },             // centre of the fingertip-section frame (beat 4)
  marrow: { x: -0.11, y: -0.975 },              // red marrow in the right iliac crest
};
/** Fingertip section geometry (world y of its layers, surface up like a textbook slice). */
export const SKIN = {
  surface: P.skin.y - 0.0012,                   // epidermis surface (ridged, ~0.5 mm ridge spacing)
  dermis: P.skin.y - 0.0012 + 0.0006,           // epidermis/dermis junction (epidermis ≈ 0.6 mm at the fingertip)
  nerve: P.skin.y + 0.0004,                     // a myelinated nerve fibre bundle (≈ 0.3 mm), running along x
  fat: P.skin.y - 0.0012 + 0.0026,              // dermis/subcutaneous fat (dermis ≈ 2 mm)
};
export const VESSEL = { x: P.skin.x + 0.0006, y: P.skin.y + 0.0009, r: 30e-6 };   // centreline + inner radius
/** True sizes (m). */
export const SIZE = { watchR: 0.028, heart: 0.12, rbc: 7.5e-6, rbcThick: 2.5e-6, ridge: 0.5e-3, nerve: 0.3e-3 };

// screen-anchored framing: the camera key that puts world point p at screen (sx, sy) at this mpp (anchor 0.5)
const frame = (p, mpp, sx = 540, sy = 960, extra = {}) => ({ x: p.x + (540 - sx) * mpp, y: p.y + (960 - sy) * mpp, mpp, target: p, sx, sy, ...extra });
const FEET = { x: 0, y: 0 };

const cam = makeCamera([
  frame(P.watch, 1.6e-4, 540, 1010, { travel: 0 }),                       // 0 hook: hand + stopwatch (Ø ≈ 350 px)
  frame(P.watch, 1.35e-4, 540, 940, { travel: 1.2, push: 0.97 }),          // 1 start the clock (crown press on 4.8 s)
  frame(P.heart, 4.6e-4, 600, 700, { travel: 1.6, push: 0.95 }),           // 2 heart (≈ 260 px) above, watch at ≈ (394, 1135)
  frame(P.heart, 2.8e-4, 640, 600, { travel: 1.2, push: 0.95 }),           // 3 seventy millilitres (17b): heart ≈ 430 px; watch ≈ (300, 1330), thumb ≈ 1180, clear of the captions
  frame(P.skin, 5.0e-6, 540, 900, { travel: 2.3, push: 0.96, lead: 1.0, leadY: 800 }), // 4 dive into the thumb pad: skin section (pan leads, see at())
  frame({ x: P.skin.x + 0.0016, y: P.skin.y }, 4.6e-6, 540, 900, { travel: 3.6, push: 0.98 }),  // 5 pan along the nerve
  frame(VESSEL, 1.0e-7, 540, 880, { travel: 2.2, push: 0.96 }),            // 6 dive into the venule (RBC ≈ 75 px)
  frame({ x: VESSEL.x + 25e-6, y: VESSEL.y }, 1.45e-7, 540, 880, { travel: 2.0, push: 0.97 }), // 7 pull back: crowd
  frame({ x: VESSEL.x + 110e-6, y: VESSEL.y }, 1.3e-7, 540, 880, { travel: 3.0, push: 0.98 }), // 8 ride the flow
  frame({ x: 0, y: -1.12 }, 1.5e-3, 540, 900, { travel: 2.1, push: 0.96 }),// 9 out to the body: red-marrow map
  frame(P.marrow, 1.2e-7, 540, 880, { travel: 2.6, push: 0.96 }),          // 10 into the hip bone's marrow
  frame({ x: P.marrow.x + 20e-6, y: P.marrow.y }, 1.45e-7, 540, 880, { travel: 1.4, push: 0.97 }), // 11 lifespan
  frame({ x: 0, y: -1.24 }, 1.0e-3, 540, 900, { travel: 2.4, push: 0.97 }),// 12 zoom back out: chest + lungs
  frame(FEET, 2.2e-3, 540, 1250, { travel: 1.8, push: 0.97 }),             // 13 the whole body (head ≈ 455, feet 1250)
  frame(FEET, 2.3e-3, 540, 1275, { travel: 1.2, push: 0.96 }),             // 14 the strangest part (17b): the body stays large (head ≈ 500) for the first sparks
  frame(FEET, 2.65e-3, 540, 1260, { travel: 1.2, push: 0.91 }),            // 15 330 billion a day: a slow push in on the torso
  frame(FEET, 2.75e-3, 540, 1262, { travel: 2.6, push: 0.99 }),            // 16 four million a second: a slow drift back out
  frame(P.gut, 1.52e-3, 540, 1060, { travel: 1.5, push: 0.96 }),           // 17 blood and gut: belly + chest (head top ≈ y 555, clear of the label)
  frame(FEET, 2.9e-3, 540, 1240, { travel: 2.2, push: 1.04 }),             // 18 pull back: the new you
], { anchor: 0.5, hookFrom: 0.88, drift: 3.5 });

export const KEYS = cam.KEYS;
// 17c: the camera runs on the LEGACY (17-shaped) timeline of legacy.js, so the key numbers above are 17's beats.
//  * the keys of the cut beats (1, 8, 11, 12, 13, 17; zero length) are re-pointed to where the previous beat's hold
//    push ended, so the next kept beat starts its travel exactly where the camera is (no jump);
//  * every travel is clamped to its (shorter) 17c beat, so each beat lands, and finishes its push, before the next.
for (const i of CUT) {
  const p = KEYS[i - 1];
  KEYS[i] = { ...p, mpp: p.mpp * (i - 1 === 0 ? 1 : (p.push ?? 0.96)), travel: 0.01, push: 1, lead: 0 };
}
// 17c: the pull-out from the venule to the body (beat 9, ~2 s now) lands in 1 s, so the marrow sites and the reticle
// have the body framing for the second half of the beat
KEYS[9] = { ...KEYS[9], travel: 1.0 };
const TRAVEL = KEYS.map((k) => k.travel);
let FIT = null;
function fit(T) {
  if (FIT === T) return;
  FIT = T;
  KEYS.forEach((k, i) => {
    const s = T.scenes[i], d = s.end - s.start;
    if (d > 0 && i > 0) k.travel = Math.min(TRAVEL[i], Math.max(0.3, d - 0.3));
  });
}
/**
 * Camera at gt. A key with `lead` (s) overrides the zoom-tied pan of its dive: the dive target (the key's framed
 * point) glides from where it lay at the beat start to its final screen spot over `lead` seconds, so the eye has the
 * target near the centre early in the dive instead of in a corner until the last moment.
 */
export function at(gt, tl) {
  tl = legacy(tl);
  fit(tl);
  // 17c: the pull-out of the hip bone is beat 14 now (11-13 are cut)
  // the dive into (beat 10) and the pull-out of (beat 12) the hip bone cross ~3 decades a second: the engine's
  // sub-frame motion blur would smear the ilium surface and the trabecular lattice into radial streaks, so between
  // the bone surface and the marrow's focal plane every sub-frame shares its frame's camera (crisp lattice, ~10+ frames)
  const raw = at0(gt, tl);
  const b = beatOf(gt, tl);
  // 17c: the venule -> body pull-out (beat 9) now crosses ~4 decades in 1 s; its sub-frame blur smeared the skin layers
  // into ~6 frames of radial haze (26.0-26.2 s), so it gets the same per-frame camera (crisp layers, no dark smear band)
  if ((b === 10 || b === 14 || (b === 9 && raw.mpp < 1.4e-3 && raw.mpp > 1.5e-7)) && raw.mpp < 1.5e-3 && raw.mpp > 1.4e-7) {
    const g2 = Math.round(gt * 30) / 30;
    if (Math.abs(g2 - gt) > 1e-9) return at0(g2, tl);
  }
  return raw;
}
function at0(gt, tl) {
  const c = cam.at(gt, tl);
  const sc = tl.scenes;
  let b = 0;
  sc.forEach((s, i) => { if (s.start <= gt) b = i; });
  const key = KEYS[Math.min(b, KEYS.length - 1)];
  if (!key.lead || b === 0) return c;
  const t = gt - sc[b].start;
  const e = L.ease.inOutCubic(L.prog(t, 0, key.lead));
  if (e <= 0) return c;
  // the target and its final screen spot (frame() stored x/y so that the target sits at (sx, sy) at key.mpp)
  const tgt = key.target, fx = key.sx, fy = key.sy;
  const bx = 540 + (tgt.x - c.x) / c.mpp, by = 960 + (tgt.y - c.y) / c.mpp;   // where the plain camera puts it
  // mid-dive the target rides a little higher (key.leadY), clear of the captions, and settles as the zoom lands
  const z = L.clamp(L.invLerp(Math.log(KEYS[b - 1].mpp), Math.log(key.mpp), Math.log(c.mpp)));
  const hy = L.lerp(fy, key.leadY ?? fy, e * (1 - L.smoothstep(z)));
  const qx = L.lerp(bx, fx, e), qy = L.lerp(by, hy, e);
  return { ...c, x: tgt.x - (qx - 540) * c.mpp, y: tgt.y - (qy - 960) * c.mpp };
}

/** Which beat is playing at gt. */
export const beatOf = (gt, tl) => { tl = legacy(tl); let b = 0; tl.scenes.forEach((s, i) => { if (s.start <= gt) b = i; }); return Math.min(b, KEYS.length - 1); };
/** Log-zoom speed (decades per second, signed: + = zooming in) at gt, from the camera itself. */
export function zoomSpeed(gt, tl, dt = 1 / 30) {
  const a = at(Math.max(0, gt - dt), tl).mpp, b = at(gt + dt, tl).mpp;
  return (Math.log10(a) - Math.log10(b)) / (2 * dt);
}
