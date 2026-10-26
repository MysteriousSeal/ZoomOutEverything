// Beat 8 — "Without it, | many models say that tilt could wobble far more."
// The axis from s07 keeps breathing inside today's narrow wedge. On "Without it" it loosens (a small shiver), then
// it starts to swing, wider and wider: an irregular, slow wobble. The accent wedge is the envelope of every tilt
// visited so far, so it opens up with the swings, while today's 22.1–24.5° wedge stays as a dashed outline for
// comparison. Label "FAR WIDER SWINGS" · "in many models" (never a number range as fact).
// Exports axis8() so s09 can continue the axis exactly where this beat leaves it.
import * as L from '../../../../engine/runtime/lib.js';
import { wordAt } from './s04-tides.js';
import { drawAxis, steadyTilt, TODAY } from './s07-tilt.js';

export function wobbleTimes(v) {
  const tl = v.tl, s = tl.scenes[8].start;
  return {
    loosen: wordAt(tl, 8, /^Without/) - s + 0.2,
    swing: wordAt(tl, 8, /^models/) - s,
    label: wordAt(tl, 8, /^wobble/) - s - 0.15,
  };
}

/** Tilt (degrees) during beat 8 at beat time t (pure function of time). */
function tiltAt(v, t) {
  const T = wobbleTimes(v), gt = v.tl.scenes[8].start + t;
  const shiver = 1.2 * Math.sin(t * 13) * Math.sin(Math.PI * L.prog(t, T.loosen, 0.8));
  const A = L.ease.inOutCubic(L.prog(t, T.swing - 0.4, 2.6));
  const tau = Math.max(0, t - T.swing + 0.4);
  const w = 0.74 * Math.sin(2.0 * tau - Math.PI / 2) + 0.2 * Math.sin(4.3 * tau + 0.6) + 0.06 * L.noise1(tau * 3, 8);
  // swings around ~39°, reaching ~20°..~58° at full amplitude (illustrative, no numbers on screen)
  const wild = 39 + 19 * w;
  return L.lerp(steadyTilt(gt) + shiver, wild, A);
}

/** Axis state for beat 8 at beat time t: { tilt, wedge, wedgeK, ... } for drawAxis. */
export function axis8(v, t = v.t) {
  let lo = TODAY[0], hi = TODAY[1];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const a = tiltAt(v, (t * i) / N);
    lo = Math.min(lo, a); hi = Math.max(hi, a);
  }
  const T = wobbleTimes(v);
  return {
    tilt: tiltAt(v, t), grow: 1, ref: 1, arc: 1,
    wedge: [lo, hi], wedgeK: 1,
    todayK: L.ease.outCubic(L.prog(t, T.swing + 0.3, 0.6)),
    ext: ext8(v, t),
  };
}

/** Axis length (Earth radii) in beat 8: shorter than s07's 1.34 so the swept wedge stays clear of the label,
 *  easing back to 1.34 over the last ~0.4 s so s09 (which draws at 1.34) picks it up without a jump. */
export const EXT8 = 1.2;
function ext8(v, t) {
  const d = v.tl.scenes[8].end - v.tl.scenes[8].start;
  return L.lerp(1.34, EXT8, L.ease.inOutCubic(L.prog(t, 0.3, 1.2))) + (1.34 - EXT8) * L.ease.inOutCubic(L.prog(t, d - 0.4, 0.4));
}

export default {
  beat: 8,
  chapter: { num: '08', title: 'The wobble', sub: 'without the Moon’s steadying pull' },
  captions: true,
  layer: 2,
  cues(d) {
    // "Without" ≈ 0.15 s, "models" ≈ 1.8 s, "wobble" ≈ 3.1 s
    return [
      { t: 0.35, name: 'creak', gain: 0.2, pitch: 0.8 },
      { t: 1.5, name: 'swell', gain: 0.26, pitch: 0.65 },
      { t: 2.2, name: 'swish', gain: 0.16, pitch: 0.7 },
      { t: 2.9, name: 'ping', gain: 0.26, pitch: 0.9 },
      { t: 3.75, name: 'swish', gain: 0.16, pitch: 0.6 },
    ];
  },
  drawWorld(ctx, v) {
    if (v.t < 0 || v.t >= v.d) return;           // s09 takes the axis over (see axis8)
    drawAxis(ctx, v, axis8(v));
  },
  drawOverlay(ctx, v) {
    const T = wobbleTimes(v);
    L.bigLabel(ctx, { x: 950, y: 1212, big: 'FAR WIDER SWINGS', small: 'in many models', k: L.enter(v.t, T.label, 0.55) * v.k, accent: v.accent, align: 'right', size: 72 });
  },
};
