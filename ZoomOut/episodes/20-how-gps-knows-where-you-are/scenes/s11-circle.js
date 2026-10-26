// Beat 11 — "A second satellite, | and the two spheres meet in a circle."
// A's sphere grows and lands on the phone; B's steps back. Where the two shells meet, a ring draws itself both ways
// out of the phone (the two rims cross at the phone and at its mirror point: the ring's two ends). Drawn by the
// shared trilateration system in s10; this scene adds the label and the cues.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT } from '../env.js';
import { TRI } from './s10-sphere.js';

export default {
  beat: 11,
  chapter: { num: '11', title: 'Two satellites', sub: 'a circle' },
  captions: true,
  layer: 3,
  cues() {
    const g = TRI.grow[0], r = TRI.ring;
    return [
      { t: g.mark, name: 'blip', gain: 0.16, pitch: 1.15 },
      { t: g.t0 - 0.05, name: 'swell', gain: 0.24, pitch: 0.95 },
      { t: g.t1, name: 'ping', gain: 0.32, pitch: 1.0 },
      { t: r.t0, name: 'shimmer', gain: 0.24, pitch: 1.1 },
      { t: r.t0 + r.dur, name: 'bloom', gain: 0.2, pitch: 1.2 },
    ];
  },
  drawOverlay(ctx, v) {
    const k = v.k * L.enter(v.t, TRI.ring.t0 + 0.35, 0.5);
    L.bigLabel(ctx, { x: 1000, y: 500, big: '1 circle', small: 'where two spheres meet', k, accent: ACCENT, align: 'right', size: 96 });
  },
};
