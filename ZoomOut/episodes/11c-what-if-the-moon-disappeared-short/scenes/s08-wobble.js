// Beat 6 (11c) — "Without it, | that tilt could wobble far more, and seasons could go haywire."
// 11c: this beat also carries s09's line (cut), so the swings widen once more on "haywire", the axis clears on the
// beat-7 pull-out itself, and the globe-tilt hook that s09 used to register lives here.
// The axis from s07 keeps breathing inside today's narrow wedge. On "Without it" it loosens (a small shiver), then
// it starts to swing, wider and wider: an irregular, slow wobble. The accent wedge is the envelope of every tilt
// visited so far, so it opens up with the swings, while today's 22.1–24.5° wedge stays as a dashed outline for
// comparison. Label "FAR WIDER SWINGS" · "in many models" (never a number range as fact).
import * as L from '../../../../engine/runtime/lib.js';
import { wordAt } from './s04-tides.js';
import { drawAxis, steadyTilt, TODAY, axis7, tiltLabel } from './s07-tilt.js';
import { setGlobeTilt, beatAt, GLOBE0 } from '../env.js';

export function wobbleTimes(v) {
  const tl = v.tl, s = tl.scenes[6].start;
  return {
    loosen: wordAt(tl, 6, /^Without/) - s + 0.2,
    swing: wordAt(tl, 6, /^tilt/) - s,
    label: wordAt(tl, 6, /^wobble/) - s - 0.15,
    haywire: wordAt(tl, 6, /^seasons/) - s,
  };
}

/** Tilt (degrees) during beat 8 at beat time t (pure function of time). */
function tiltAt(v, t) {
  const T = wobbleTimes(v), gt = v.tl.scenes[6].start + t;
  const shiver = 1.2 * Math.sin(t * 13) * Math.sin(Math.PI * L.prog(t, T.loosen, 0.8));
  const A = L.ease.inOutCubic(L.prog(t, T.swing - 0.4, 2.6));
  const tau = Math.max(0, t - T.swing + 0.4);
  const w = 0.74 * Math.sin(2.0 * tau - Math.PI / 2) + 0.2 * Math.sin(4.3 * tau + 0.6) + 0.06 * L.noise1(tau * 3, 8);
  // swings around ~39°, reaching ~20°..~58° at full amplitude, then ~12°..~66° from "seasons… haywire"
  // (illustrative, no numbers on screen)
  const H = L.ease.inOutCubic(L.prog(t, T.haywire, 1.8));
  const wild = 39 + 19 * w * (1 + 0.42 * H);
  // continuous with s07 across the boundary: s07's wedge (and so its breathing) may not be fully open on its last
  // frame, so the steadied breathing finishes opening here instead of jumping
  const wk = L.lerp(wk7(v), 1, L.ease.inOutCubic(L.prog(t, 0, 0.6)));
  return L.lerp(L.lerp(23.4, steadyTilt(gt), wk) + shiver, wild, A);
}

/** s07's wedge opening (0..1) on its last frame. */
function wk7(v) {
  const tl = v.tl, d5 = tl.scenes[5].end - tl.scenes[5].start;
  return axis7({ ...v, gt: tl.scenes[5].end }, d5).wedgeK;
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
  // the wedge picks up exactly where s07 left it (partly open) and finishes opening: no pop on the boundary frame
  const e = L.ease.inOutCubic(L.prog(t, 0, 0.6)), k7 = wk7(v);
  const hi7 = L.lerp(TODAY[0], TODAY[1], k7);
  return {
    tilt: tiltAt(v, t), grow: 1, ref: 1, arc: 1,
    wedge: [lo, L.lerp(Math.min(hi, hi7), hi, e)], wedgeK: L.lerp(k7, 1, e),
    todayK: L.ease.outCubic(L.prog(t, T.swing + 0.3, 0.6)),
    ext: ext8(v, t),
  };
}

/** Axis length (Earth radii) in this beat: shorter than s07's 1.34 so the swept wedge stays clear of the label. */
export const EXT8 = 1.2;
function ext8(v, t) {
  return L.lerp(1.34, EXT8, L.ease.inOutCubic(L.prog(t, 0.3, 1.2)));
}

// The REAL globe (env) rolls with the axis these beats draw, so the axis always runs through its true poles:
// beat 5 the steadied tilt, beat 6 the wobble, then back to rest on the beat-7 pull-out. (Was s09's in 11b.)
setGlobeTilt((v) => {
  const tl = v.tl, b = beatAt(tl, v.gt), t = v.gt - tl.scenes[b].start;
  if (b === 5) return axis7(v, t).tilt + (GLOBE0.tilt - 23.4) * (1 - L.prog(t, 0, 0.5));
  if (b === 6) return axis8(v, t).tilt;
  if (b === 7) {
    const d6 = tl.scenes[6].end - tl.scenes[6].start;
    return L.lerp(axis8({ ...v, gt: tl.scenes[6].end }, d6).tilt, GLOBE0.tilt, L.ease.inOutCubic(L.prog(t, 0.2, 1.4)));
  }
  return null;
});

export default {
  beat: 6,
  chapter: { num: '06', title: 'The wobble', sub: 'without the Moon’s steadying pull' },
  captions: true,
  layer: 2,
  cues(d) {
    // 11c: "Without" ≈ 0.15 s, "tilt" ≈ 1.62 s, "wobble" ≈ 2.22 s, "seasons" ≈ 3.47 s
    return [
      { t: 0.35, name: 'creak', gain: 0.2, pitch: 0.8 },
      { t: 1.3, name: 'swell', gain: 0.26, pitch: 0.65 },
      { t: 1.9, name: 'swish', gain: 0.16, pitch: 0.7 },
      { t: 2.07, name: 'ping', gain: 0.26, pitch: 0.9 },
      { t: 3.5, name: 'swell', gain: 0.22, pitch: 0.9 },
      { t: 4.4, name: 'swish', gain: 0.18, pitch: 0.6 },
    ];
  },
  drawWorld(ctx, v) {
    // 11c: no s09 any more, so the axis clears here, frozen at its last tilt, as the camera pulls out (beat 7)
    if (v.t < 0 || v.t > v.d + 0.6) return;
    const out = 1 - L.ease.inCubic(L.prog(v.t, v.d - 0.05, 0.5));
    if (out <= 0) return;
    drawAxis(ctx, v, { ...axis8(v, Math.min(v.t, v.d)), k: out });
  },
  drawOverlay(ctx, v) {
    const T = wobbleTimes(v);
    // 11c: s07's "23.4°" label is carried over the boundary (s07 draws it up to its last frame), then leaves
    // before this beat's own label lands, so the two never overlap
    if (v.t > 1e-6) tiltLabel(ctx, v, 1 - L.ease.inCubic(L.prog(v.t, T.label - 0.55, 0.4)));
    // (11b fix) gone by the beat end, ahead of the pull-out; right edge 920, Shorts-safe (< 940)
    const out = 1 - L.ease.inOutCubic(L.prog(v.t, v.d - 0.45, 0.4));
    L.bigLabel(ctx, { x: 920, y: 1212, big: 'FAR WIDER SWINGS', small: 'in many models', k: L.enter(v.t, T.label, 0.55) * v.k * out, accent: v.accent, align: 'right', size: 72 });
  },
};
