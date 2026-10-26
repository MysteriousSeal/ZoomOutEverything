// Beat 33: Beyond it, light hasn't had time to reach us yet. | Nobody knows how far the universe really goes.
// Builder E. Outside the ring: nothing visible. A faint question mark and a short note on the black.
import * as L from '../../../../engine/runtime/lib.js';
import { ph, kin, text, INK, SUB } from '../layers/e-ui.js';
import { uni } from './s30-observable.js';

function drawWorld(c, v) {
  // a faint dashed shell just beyond the edge: the unknown goes on
  const t = v.gt - v.tl.scenes[33].start;
  const k = kin(t, 0.4, 1.0) * (1 - L.ease.inCubic(L.prog(t, v.d + 0.2, 0.6)));
  if (k <= 0) return;
  const { x, y, r } = uni(v);
  c.save();
  c.globalAlpha = k * 0.35;
  c.setLineDash([3, 9]);
  c.lineDashOffset = t * 4;
  c.strokeStyle = 'rgba(160,175,200,0.8)'; c.lineWidth = 1.3;
  for (const f of [1.09, 1.2]) { c.beginPath(); c.arc(x, y, r * f, 0, Math.PI * 2); c.stroke(); c.globalAlpha *= 0.55; }
  c.restore();
}

function drawOverlay(c, v) {
  const t = v.t, p = [0, 1].map((i) => ph(v, 33, i));
  const { x, y, r } = uni(v);
  const cx = Math.min(x - r - 150, 330), cy = y - 70;
  const k1 = kin(t, 0.6, 0.8) * v.k;
  if (k1 > 0) {
    text(c, '?', cx, cy - 20, { size: 110, weight: 700, family: L.FONT.display, color: [150, 165, 190], track: 0, align: 'center', alpha: k1 * 0.4 });
    text(c, 'UNOBSERVABLE', cx, cy + 34, { size: 20, color: INK, align: 'center', alpha: k1 });
    text(c, 'LIGHT HASN’T REACHED US YET', cx, cy + 60, { size: 16, weight: 600, color: SUB, track: 2, align: 'center', alpha: k1 });
  }
}

export default {
  beat: 33,
  chapter: null,
  cues() {
    return [
      { t: 0.5, name: 'swell', gain: 0.16, pitch: 0.45 },
    ];
  },
  drawWorld,
  drawOverlay,
};
