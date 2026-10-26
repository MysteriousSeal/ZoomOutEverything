// Beat 3: A blanket, a few trees, and a footpath.
// Builder A. Minimal labels: the blanket's size, then the footpath (the Sheep Meadow's perimeter path).
import * as L from '../../../../engine/runtime/lib.js';
import { phrase, scr, label, leaderTo } from '../layers/a-ui.js';
import { toWorld } from '../layers/park-data.js';
import { BLANKET_WORLD } from '../layers/a-hero.js';

export default {
  beat: 3,
  chapter: null,
  cues() { return []; },
  drawOverlay(c, v) {
    const p0 = phrase(v, 3, 0), last = phrase(v, 3, 9);   // one phrase (or two): the footpath comes at the end
    c.save();
    c.globalAlpha = v.k;
    // the blanket: 1.8 x 1.5 m
    const kb = L.ease.outCubic(L.prog(v.gt, p0.start + 0.2, 0.6)) * (1 - L.ease.inCubic(L.prog(v.gt, last.end - 1.3, 0.5)));
    if (kb > 0) {
      const cx = BLANKET_WORLD.reduce((s, q) => s + q[0], 0) / BLANKET_WORLD.length, cy = BLANKET_WORLD.reduce((s, q) => s + q[1], 0) / BLANKET_WORLD.length;
      const [bx, by] = scr(v, [cx, cy]);
      const to = [bx - 150, by + 120];
      leaderTo(c, [bx - 14, by + 22], to, kb);
      label(c, 'BLANKET  1.8 × 1.5 M', to[0] - 10, to[1] + 2, { size: 18, align: 'right', alpha: L.clamp(kb * 2 - 0.6) });
    }
    // the footpath, 4 m wide, along the meadow's east edge
    const kp = L.ease.outCubic(L.prog(v.gt, last.end - 0.85, 0.6));
    if (kp > 0) {
      // the point of the path's centre line nearest the frame centre (left of the label zone of the ladder)
      let best = null;
      for (let u = -60; u <= 60; u += 0.5) {
        const w = toWorld(u, 99), s = scr(v, [w.x, w.y]);
        const d = Math.hypot(s[0] - 1330, s[1] - 300);
        if (!best || d < best.d) best = { d, s };
      }
      const from = best.s, to = [from[0] - 190, from[1] - 40];
      leaderTo(c, from, to, kp);
      label(c, 'FOOTPATH  ·  4 M', to[0] - 10, to[1], { size: 18, align: 'right', alpha: L.clamp(kp * 2 - 0.6) });
    }
    c.restore();
  },
};
