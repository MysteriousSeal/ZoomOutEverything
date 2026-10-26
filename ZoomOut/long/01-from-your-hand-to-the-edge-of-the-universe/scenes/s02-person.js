// Beat 2: A person, lying in the grass on a summer afternoon.
// Builder A. A body-length dimension line beside the figure.
import * as L from '../../../../engine/runtime/lib.js';
import { INK } from '../world.js';
import { phrase, scr, label, dimLine, P } from '../layers/a-ui.js';

export default {
  beat: 2,
  chapter: { num: '02', title: "You", sub: "1 metre" },
  cues(d) { return [{ t: d * 0.45, name: 'tick', gain: 0.14, pitch: 1.0 }]; },
  drawOverlay(c, v) {
    const p = phrase(v, 2, 0);
    const k = L.prog(v.gt, p.start + 1.3, 0.9);
    if (k <= 0) return;
    // alongside the body, between it and the things on the blanket (b = -0.39 m), crown to heels
    const a = scr(v, P(0.86, -0.39)), b = scr(v, P(-0.86, -0.39));
    c.save();
    c.globalAlpha = v.k;
    dimLine(c, a, b, k, { tick: 10, width: 2 });
    const [mx, my] = scr(v, P(-0.62, -0.39));
    const ka = L.clamp(k * 2 - 0.8);
    const w = label(c, '1.7 M', mx - 18, my, { size: 24, align: 'right', alpha: ka, track: 2 });
    label(c, '5 FT 7 IN', mx - 18 - w - 12, my + 1, { size: 16, weight: 600, color: [175, 190, 210], alpha: ka * 0.9, align: 'right', track: 2 });
    c.restore();
    void INK;
  },
};
