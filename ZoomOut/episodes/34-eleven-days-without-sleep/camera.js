// Camera for "11 Days Without Sleep" (Zoom Out 34, Inside You, ≈ 61.9 s).
//
// ONE NOTEBOOK PAGE. World units = screen pixels at rest (z = 1): the stage (the pictogram figure, its props and the
// beat illustrations) lives in world space about STAGE, so the slow push and drift move it for real; the experiment-log
// strip, tags and cards are screen-space overlays (crisp, never pushed off their safe zones).
//   every beat: a slow continuous push about the stage (+0.9 % inside each beat, eased so beat boundaries never jump;
//   ≈ 1.06 by the end) + ±3 px drift. Never dead still, never a cut.
//   beat 6 (sleep): the push relaxes a touch (z eases back ≈ 1.8 %) as the lights go out: the calm exhale of the film.
import * as L from '../../../engine/runtime/lib.js';

export const ANCHOR = 0.47;
export const AY = L.H * ANCHOR;          // the screen row the camera centre maps to
export const STAGE = { x: 540, y: AY };  // push centre (world = screen at rest)

function beatPush(gt, tl) {
  const sc = tl.scenes;
  let b = 0;
  sc.forEach((s, i) => { if (s.start <= gt) b = i; });
  // a per-beat push that eases in and holds, then hands over continuously (sum of eased ramps: C1 at every boundary)
  let z = 0;
  for (let i = 0; i <= b; i++) {
    const s = sc[i], d = s.end - s.start;
    z += 0.015 * L.ease.inOutCubic(L.prog(gt, s.start, d));
  }
  const relax = 0.03 * L.ease.inOutCubic(L.prog(gt, sc[6].start + 2.5, 3));
  return z - relax;
}
export function zoomAt(gt, tl) {
  return 1 + beatPush(gt, tl) * 0.6;   // ≈ +0.9 % per beat, ≈ 1.06 at the end
}
export function at(gt, tl) {
  const z = zoomAt(gt, tl);
  const x = STAGE.x + L.noise1(gt * 0.3, 1) * 3 / z;
  const y = STAGE.y + L.noise1(gt * 0.27, 2) * 3 / z;
  return { x, y, mpp: 1 / z, anchor: ANCHOR };
}
