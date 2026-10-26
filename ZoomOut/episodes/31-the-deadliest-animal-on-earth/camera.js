// Camera for "The Deadliest Animal on Earth" (Zoom Out 31, By the Numbers, ≈ 53.2 s).
//
// ONE CONTINUOUS DATA SPACE. World units = screen pixels at rest (z = 1): the leaderboard panel, its rows and icons live
// in world space (layout.js CH), so the camera's slow push and the dive move them for real.
//   beats 0–4   rest: a slow continuous push (z 1.000 → 1.02 about the anchor) + ±3 px drift. Never dead still.
//   beat 5      THE DIVE: on "tiny" the camera dives into the #1 icon slot (layout MOSQ) — z 1 → 24 (log-eased, 1.5 s),
//               the slot travelling to screen (540, 640) — so the tiny mosquito icon becomes a macro close-up. Holds
//               with a slow push (+6 %).
//   beat 6      PULL BACK: 0 → 1.35 s into the beat the camera returns to rest: the macro mosquito shrinks back into
//               the #1 slot of the leaderboard.
//   beat 7      rest.
// zoomAt(gt, tl) is exported for env.js (fades, parallax).
import * as L from '../../../engine/runtime/lib.js';
import { B, W8, MOSQ, MACRO_SCREEN, MACRO_Z, ANCHOR, AY } from './layout.js';

const DIVE = 1.5, BACK = 1.35;
const PRE_Z = 0;   // (no slow approach: a zoom about the left-hand slot would crop the board's values)
/** {z: 0..1 log-zoom progress, p: 0..1 screen-travel progress of the #1 slot} at gt */
function prog2(gt, tl) {
  const d0 = W8(tl, 'tiny', -0.05);
  const a0 = B(tl, 5, 0.75);
  const pre = L.ease.inOutCubic(L.prog(gt, a0, Math.max(0.3, d0 - a0)));
  const inn = Math.pow(L.smoothstep(L.prog(gt, d0, DIVE)), 0.7);   // front-loaded log zoom: the mosquito grows early (no near-empty frames)
  const out = 1 - L.ease.inOutCubic(L.prog(gt, B(tl, 6), BACK));
  return { z: (PRE_Z * pre + (1 - PRE_Z) * inn) * out, p: L.clamp(inn * 1.15) * out };
}
/** 0..1 dive progress (eased) at gt */
export function diveK(gt, tl) { return prog2(gt, tl).z; }
function restZ(gt, tl) { return 1 + 0.02 * L.smoothstep(L.clamp(gt / tl.total)); }
function macroZ(gt, tl) { return MACRO_Z * (1 + 0.06 * L.smoothstep(L.prog(gt, W8(tl, 'tiny') + DIVE, B(tl, 6) - W8(tl, 'tiny') - DIVE))); }
export function zoomAt(gt, tl) {
  const e = diveK(gt, tl);
  return Math.exp(L.lerp(Math.log(restZ(gt, tl)), Math.log(macroZ(gt, tl)), e));
}

export function at(gt, tl) {
  const z0 = restZ(gt, tl), z = zoomAt(gt, tl);
  // rest camera: centred on (540, AY) — world = screen, pushed about the anchor
  const rest = { x: L.W / 2, y: AY };
  // where MOSQ sits on screen at rest, then travel it to MACRO_SCREEN with the same easing as the zoom
  const sx0 = L.W / 2 + (MOSQ.x - rest.x) * z0, sy0 = AY + (MOSQ.y - rest.y) * z0;
  // the slot reaches its macro screen position a little ahead of the zoom (it never sweeps off-screen)
  const ep = prog2(gt, tl).p;
  const sx = L.lerp(sx0, MACRO_SCREEN.x, ep), sy = L.lerp(sy0, MACRO_SCREEN.y, ep);
  let x = MOSQ.x - (sx - L.W / 2) / z, y = MOSQ.y - (sy - AY) / z;
  // drift: ±3 px on screen
  x += L.noise1(gt * 0.3, 1) * 3 / z;
  y += L.noise1(gt * 0.27, 2) * 3 / z;
  return { x, y, mpp: 1 / z, anchor: ANCHOR };
}
