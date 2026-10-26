// Beat 1: Now let's zoom out, ten times wider at every step, | until we reach the edge of everything we can see.
// Builder A. A restrained marker for the rule of the film: every step is ×10; 28 of them reach the edge.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, INK } from '../world.js';
import { phrase, label } from '../layers/a-ui.js';

export default {
  beat: 1,
  chapter: null,
  cues() { return []; },
  drawOverlay(c, v) {
    const p0 = phrase(v, 1, 0), p1 = phrase(v, 1, 1);
    const k = L.ease.outCubic(L.prog(v.gt, p0.start + 1.0, 0.7)) * (1 - L.ease.inCubic(L.prog(v.gt, p1.end - 0.2, 0.5)));
    if (k <= 0) return;
    c.save();
    c.globalAlpha = v.k * k;
    const x = L.W / 2, y = 1012;
    // nested frames: one step = a frame ten times wider (drawn small: 6 px inside 60 px)
    c.strokeStyle = L.rgba(ACCENT, 0.95); c.lineWidth = 1.6;
    c.shadowColor = 'rgba(2,6,14,0.85)'; c.shadowBlur = 6;
    const cx = x - 196;
    c.strokeRect(cx - 30, y - 17, 60, 34);
    c.fillStyle = L.rgba(ACCENT); c.fillRect(cx - 3, y - 1.7, 6, 3.4);
    c.shadowBlur = 0;
    label(c, 'EACH STEP  ×10', cx + 46, y, { size: 18, color: INK });
    c.fillStyle = L.rgba(INK, 0.4); c.fillRect(x + 54, y - 9, 1.5, 18);
    label(c, '28 STEPS TO THE EDGE', x + 70, y, { size: 18, color: [175, 190, 210] });
    c.restore();
  },
};
