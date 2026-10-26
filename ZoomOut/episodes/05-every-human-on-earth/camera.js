// Camera for "Could Every Human Fit in One Place?" (60 s). Owned by the orchestrator.
//
// WORLD LAYOUT (metres, x right, y down). Several set pieces share the origin so every move is a zoom:
//   beats 0–1  top-down: one person on a 1 m tile at the origin; tiles spread outward
//   beat 2     top-down map: Puerto Rico outline centred on the origin (~180 × 65 km) + the 90.5 km square of everyone
//   beat 3     top-down map: Rhode Island outline centred on the origin (~60 × 77 km) + the 45.3 km concert-crowd square
//   beats 4–6  SIDE VIEW (y = up is negative): ground line y = 0; the 800 m cube stands on x ∈ [−400, 400];
//              Burj Khalifa at x ≈ +900 (828 m); the Grand Canyon cross-section is cut into the ground around the origin
//              (≈ 16 km wide rim to rim, floor at y = +1800); the cube ends on the canyon floor
//   beats 7–8  the globe: centre (0, +R) with R = 6,371 km, so the canyon (origin) sits at the globe's north pole
//   beats 9–12 abstract numbers in SCREEN space (env draws a dark veil over the world; draw in drawOverlay)
import { ease, lerp, noise1, prog } from '../../../engine/runtime/lib.js';

export const R_EARTH = 6.371e6;
const KEYS = [
  { x: 0, y: 0, mpp: 0.0045, travel: 0 },          // 0 one person, one square metre
  { x: 0, y: 0, mpp: 0.9, travel: 2.0 },            // 1 tiles spreading: eight billion
  { x: 0, y: 0, mpp: 210, travel: 2.2 },            // 2 Puerto Rico
  { x: 0, y: 0, mpp: 105, travel: 1.4 },            // 3 Rhode Island
  { x: 0, y: -420, mpp: 2.4, travel: 2.0 },         // 4 the cube (side view)
  { x: 330, y: -430, mpp: 2.25, travel: 1.2 },      // 5 cube + Burj Khalifa
  { x: 0, y: 700, mpp: 16.5, travel: 1.6 },         // 6 Grand Canyon cross-section (both rims in frame)
  { x: 0, y: R_EARTH, mpp: 15500, travel: 2.6 },    // 7 the globe
  { x: 0, y: R_EARTH, mpp: 19000, travel: 1.0 },    // 8 almost nothing
  { x: 0, y: R_EARTH, mpp: 20000, travel: 0.8 },    // 9–12: held (veiled); abstract scenes are screen-space
  { x: 0, y: R_EARTH, mpp: 20500, travel: 0.5 },
  { x: 0, y: R_EARTH, mpp: 21000, travel: 0.5 },
  { x: 0, y: R_EARTH, mpp: 21500, travel: 0.5 },
];

function travelTo(a, b, k) {
  const e = ease.inOutCubic(k);
  const la = Math.log(a.mpp), lb = Math.log(b.mpp);
  const mpp = Math.exp(lerp(la, lb, e));
  // big zooms: tie the pan to the zoom (linear in mpp) so both ends stay on screen
  const ep = Math.abs(lb - la) > 1 ? Math.min(1, Math.max(0, (mpp - a.mpp) / (b.mpp - a.mpp))) : e;
  return { x: lerp(a.x, b.x, ep), y: lerp(a.y, b.y, ep), mpp };
}

function base(gt, tl) {
  const sc = tl.scenes;
  let b = 0;
  sc.forEach((s, i) => { if (s.start <= gt) b = i; });
  const t = gt - sc[b].start, d = sc[b].end - sc[b].start;
  if (b === 0) return { x: 0, y: 0, mpp: KEYS[0].mpp * lerp(0.67, 1.0, ease.inOutCubic(prog(t, 0, d))) };   // hook starts closer on the person
  const key = KEYS[b];
  const cam = travelTo(KEYS[b - 1], key, prog(t, -0.05, key.travel));
  cam.mpp *= lerp(1, 0.96, ease.inOutCubic(prog(t, key.travel, d - key.travel)));
  return cam;
}

export function at(gt, tl) {
  const cam = base(gt, tl);
  cam.x += noise1(gt * 0.3, 1) * 4 * cam.mpp;
  cam.y += noise1(gt * 0.27, 2) * 4 * cam.mpp;
  cam.anchor = 0.47;
  return cam;
}
