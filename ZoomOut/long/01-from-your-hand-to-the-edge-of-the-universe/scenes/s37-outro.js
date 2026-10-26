// Beat 37: Let's zoom out. (then the end screen: a slow pull-back from the hand to the meadow)
// Builder A. A small channel sign-off in the lower-left third, clear of YouTube's end-screen boxes (centre-right).
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, INK } from '../world.js';
import { label } from '../layers/a-ui.js';

export default {
  beat: 37,
  chapter: null,
  cues(d) { return [{ t: 2.0, name: 'swell', gain: 0.12, pitch: 0.8 }]; },
  drawOverlay(c, v) {
    const end = v.tl.lines[v.tl.lines.length - 1].end;
    const k = L.ease.outCubic(L.prog(v.gt, end + 0.9, 1.4));
    if (k <= 0) return;
    const x = 104, y = 880;
    c.save();
    c.globalAlpha = v.k * k;
    // ring mark: a cyan ring with a small dot (the "you are here" of every scale)
    c.shadowColor = 'rgba(2,6,14,0.8)'; c.shadowBlur = 12;
    c.strokeStyle = L.rgba(ACCENT); c.lineWidth = 3.2;
    c.beginPath(); c.arc(x + 24, y - 14, 22 * (0.85 + 0.15 * k), 0, Math.PI * 2); c.stroke();
    c.fillStyle = L.rgba(ACCENT);
    c.beginPath(); c.arc(x + 24, y - 14, 4.5, 0, Math.PI * 2); c.fill();
    c.font = L.font(46, 800, L.FONT.display);
    c.fillStyle = L.rgba(INK);
    c.textBaseline = 'alphabetic';
    L.trackedText(c, 'ZOOM OUT', x + 64, y + 2, 3);
    c.shadowBlur = 0;
    c.restore();
    label(c, 'Let’s zoom out.', x + 66, y + 34, { size: 21, weight: 500, color: [190, 205, 220], alpha: v.k * L.ease.outCubic(L.prog(v.gt, end + 1.6, 1.2)), track: 0.6 });
  },
};
