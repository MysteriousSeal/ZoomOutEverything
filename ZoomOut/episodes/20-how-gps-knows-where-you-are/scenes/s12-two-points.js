// Beat 12 — "A third narrows it to two points, | one of them usually far out in space."
// C's sphere lands: its shell cuts the A ∩ B ring at exactly two points, the phone and one far out in space. On
// "far out in space" the far one is struck out and greys. Drawn by the shared system in s10; label + tag here.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT } from '../env.js';
import { Q_WORLD, TRI, WARN } from './s10-sphere.js';

export default {
  beat: 12,
  chapter: { num: '12', title: 'Three satellites', sub: 'two points' },
  captions: true,
  layer: 3,
  cues() {
    const g = TRI.grow[2], s = TRI.strike;
    return [
      { t: g.mark, name: 'blip', gain: 0.16, pitch: 1.4 },
      { t: g.t0 - 0.05, name: 'swell', gain: 0.24, pitch: 1.2 },
      { t: g.t1, name: 'ping', gain: 0.32, pitch: 1.2 },
      { t: g.t1 + 0.12, name: 'ping', gain: 0.22, pitch: 1.5 },
      { t: s.t0, name: 'swish', gain: 0.2, pitch: 1.5 },
      { t: s.t0 + 0.12, name: 'impact', gain: 0.18, pitch: 1.5 },
    ];
  },
  drawOverlay(ctx, v) {
    const g = TRI.grow[2];
    const k = v.k * L.enter(v.t, g.t1 + 0.05, 0.5);
    L.bigLabel(ctx, { x: 1000, y: 500, big: '2 points', k, accent: ACCENT, align: 'right', size: 96 });
    // the small line (bigLabel's style) steps back when the strike lands, so 'NOT ON EARTH' is the second element
    if (k > 0) {
      const e = L.ease.outCubic(L.clamp(k));
      const dim = 1 - 0.65 * L.ease.inOutCubic(L.prog(v.t, TRI.strike.t0, 0.4));
      ctx.save();
      ctx.globalAlpha *= L.clamp(k * 1.4) * dim;
      ctx.textBaseline = 'alphabetic';
      ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 8;
      ctx.font = L.font(30, 600, L.FONT.body);
      ctx.fillStyle = L.rgba([205, 215, 230], 0.95);
      L.trackedText(ctx, 'WHERE THREE SPHERES MEET', 1000, 500 + 52 + (1 - e) * 18, 3, 'right');
      ctx.restore();
    }
    // the far point's tag
    if (!Q_WORLD) return;
    const tk = v.k * L.enter(v.t, TRI.strike.t0 + 0.15, 0.45);
    if (tk <= 0) return;
    const qx = v.wx(Q_WORLD.x), qy = v.wy(Q_WORLD.y);
    ctx.save();
    ctx.globalAlpha = tk;
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.75)'; ctx.shadowBlur = 10;
    ctx.font = L.font(26, 700, L.FONT.body);
    ctx.fillStyle = L.rgba(WARN);
    const y = Math.max(400, qy - 44) + (1 - L.ease.outCubic(tk)) * 10;
    L.trackedText(ctx, 'NOT ON EARTH', qx, y, 3, 'center');
    ctx.restore();
  },
};
