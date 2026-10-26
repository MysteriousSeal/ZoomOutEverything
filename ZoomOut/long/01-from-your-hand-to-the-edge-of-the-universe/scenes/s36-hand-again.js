// Beat 36: A human hand. | About twenty-eight steps of ten | from the edge of everything we can see.
// Builder A. Back on the hand: its breadth, then the whole journey in one line.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, INK } from '../world.js';
import { phrase, label, bigNum } from '../layers/a-ui.js';
import { drawSpan } from './s00-hook.js';

export default {
  beat: 36,
  chapter: { num: '17', title: "Home", sub: "10 centimetres" },
  cues(d) { return [{ t: d * 0.27, name: 'bloom', gain: 0.22, pitch: 0.9 }]; },
  drawOverlay(c, v) {
    const p0 = phrase(v, 36, 0), p1 = phrase(v, 36, 1), p2 = phrase(v, 36, 2);
    c.save();
    c.globalAlpha = v.k;
    drawSpan(c, v, L.prog(v.gt, p0.start + 0.2, 0.9), '10 CM', null);
    const k = L.ease.outCubic(L.prog(v.gt, p1.start - 0.05, 0.7));
    if (k > 0) {
      const x = 1188, y = 232;
      c.save();
      c.globalAlpha *= k;
      c.fillStyle = L.rgba(ACCENT, 0.9);
      c.fillRect(x, y - 78, 70 * k, 3);
      const w = bigNum(c, '×10', x, y + (1 - k) * 16, { size: 66 });
      // superscript exponent, set by hand
      bigNum(c, '28', x + w + 4, y - 30 + (1 - k) * 16, { size: 36 });
      c.restore();
      const k2 = L.ease.outCubic(L.prog(v.gt, p2.start - 0.1, 0.7));
      label(c, 'THE OBSERVABLE UNIVERSE', x, y + 32, { size: 18, color: INK, alpha: k2 });
      label(c, '93 BILLION LIGHT-YEARS ACROSS', x, y + 58, { size: 16, weight: 600, color: [175, 190, 210], alpha: k2 });
    }
    c.restore();
  },
};
