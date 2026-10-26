// Beat 5 — "Eleven minutes a year doesn't sound like much."
// The hold on the two true-scale Earths. The gap meter (s04) breathes; the quieter second fact lands under it:
// 11 minutes of orbit ≈ 20,000 km (29.78 km/s × 674.8 s = 20,100 km; 1.209 u × 16,622 km/u) ≈ 1.6 Earth widths.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT } from '../env.js';
import { bigBlock } from './s04-eleven-minutes.js';

export default {
  beat: 5,
  chapter: null,
  layer: 2,
  cues() {
    return [{ t: 0.35, name: 'shimmer', gain: 0.2, pitch: 1.0 }];
  },
  drawOverlay(c, v) {
    const k = v.k * L.enter(v.t, 0.25, 0.6);
    bigBlock(c, {
      y: 1290,
      parts: [['11 MINUTES ', [242, 236, 224]], ['≈ 20,000 km', ACCENT]],
      small: 'of orbit · about 1.6 Earth widths',
      k,
      size: 96,
    });
  },
};
