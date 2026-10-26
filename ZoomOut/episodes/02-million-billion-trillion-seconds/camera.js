// Camera for "A Million vs a Billion vs a Trillion Seconds": a dive into the past. Owned by the orchestrator.
//
// WORLD: y = seconds AGO (down = further into the past), NOW at y = 0. x is free horizontal space in "pixel-like"
// units scaled by mpp too, but scenes should mostly place things in screen x and world y.
// The camera has ONE parameter, mpp (seconds per pixel). NOW stays pinned at screen y = NOW_Y; zooming out
// compresses the past toward NOW, like a powers-of-ten pull-back.
//   1e6 s  = 11.57 days        (beat 1)
//   1e9 s  = 31.7 years        (beats 2–3)
//   1e12 s = 31,700 years      (beats 4–5)
//   3.7e13 s ≈ 1.17 million years (US debt counted at $1/s, beat 6)
import { ease, lerp, noise1, prog } from '../../../engine/runtime/lib.js';

export const NOW_Y = 430;            // screen y of NOW
export const YEAR = 31557600;        // Julian year, seconds
const H = 1920;

// mpp per beat: the key span lands at about screen y 1180 (NOW_Y + 750 px)
const SPAN_PX = 750;
const KEYS = [
  { mpp: 60 / SPAN_PX, travel: 0 },            // 0 hook: the first minute ticking
  { mpp: 1e6 / SPAN_PX, travel: 1.4 },         // 1 one million seconds
  { mpp: 1e9 / SPAN_PX, travel: 1.4 },         // 2 one billion
  { mpp: 1e9 / SPAN_PX * 0.97, travel: 0.6 },  // 3 the comparison (same framing, slight push)
  { mpp: 1e12 / SPAN_PX, travel: 1.6 },        // 4 one trillion
  { mpp: 1e12 / SPAN_PX * 0.96, travel: 0.6 }, // 5 hold on the span
  { mpp: 3.7e13 / 1150, travel: 1.8 },        // 6 the US debt at $1/s: lands lower (~y 1580) so the bar fills the frame
];

function base(gt, tl) {
  const sc = tl.scenes;
  let b = 0;
  sc.forEach((s, i) => { if (s.start <= gt) b = i; });
  const t = gt - sc[b].start, d = sc[b].end - sc[b].start;
  let lm;
  if (b === 0) {
    lm = Math.log(KEYS[0].mpp * lerp(0.6, 1, ease.inOutCubic(prog(t, 0, d))));
  } else {
    const a = Math.log(KEYS[b - 1].mpp), z = Math.log(KEYS[b].mpp);
    lm = lerp(a, z, ease.inOutCubic(prog(t, -0.05, KEYS[b].travel)));
    lm += Math.log(lerp(1, 0.96, ease.inOutCubic(prog(t, KEYS[b].travel, d - KEYS[b].travel))));
  }
  return Math.exp(lm);
}

/** Camera at global time gt: {x, y, mpp, anchor}. y is chosen so NOW sits at screen NOW_Y. Pure function. */
export function at(gt, tl) {
  const mpp = base(gt, tl);
  const y = (H * 0.5 - NOW_Y) * mpp;     // world y at the screen centre
  return { x: noise1(gt * 0.3, 1) * 3 * mpp, y, mpp, anchor: 0.5 };
}
