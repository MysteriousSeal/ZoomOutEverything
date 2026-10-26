// Beat 32: At the edge is the oldest light there is: | the afterglow of the Big Bang.
// Builder E. The CMB ring brightens (layers/cosmos.js reads this beat's time); a callout names it.
import * as L from '../../../../engine/runtime/lib.js';
import { ph, kin, callout, text, SUB } from '../layers/e-ui.js';
import { uni } from './s30-observable.js';

const A = Math.PI * 0.76;   // the callout's point on the ring (lower left)

function drawOverlay(c, v) {
  const t = v.t;
  const { x, y, r } = uni(v);
  const k = kin(t, 0.55, 0.7) * v.k;
  if (k <= 0) return;
  const ax = x + r * Math.cos(A), ay = y + r * Math.sin(A);
  const lx = Math.min(ax - 60, 600), ly = Math.min(ay - 40, 790);
  callout(c, ax, ay, lx, ly, [
    { s: 'COSMIC MICROWAVE BACKGROUND', color: [255, 200, 150], size: 19, track: 2.5 },
    { s: 'LIGHT FROM 380,000 YEARS', size: 17 },
    { s: 'AFTER THE BIG BANG', size: 17 },
  ], k, { side: 'left', ring: 0 });
}

export default {
  beat: 32,
  chapter: null,
  cues() {
    return [
      { t: 0.35, name: 'bloom', gain: 0.26, pitch: 0.55 },
      { t: 0.45, name: 'shimmer', gain: 0.18, pitch: 0.5 },
    ];
  },
  drawOverlay,
};
