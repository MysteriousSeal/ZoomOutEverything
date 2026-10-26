// Beat 0: This is a human hand. | About ten centimeters across.
// Builder A. The world (hand, grass) is drawn by layers/hand.js; this beat adds the breadth bracket.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, INK } from '../world.js';
import { phrase, scr, label, dimLine, HAND_SPAN } from '../layers/a-ui.js';

/** The ≈10 cm breadth bracket across the palm (shared with beat 36). */
export function drawSpan(c, v, k, text = '≈ 10 CM', sub = '4 IN') {
  if (k <= 0) return;
  const a = scr(v, HAND_SPAN[0]), b = scr(v, HAND_SPAN[1]);
  dimLine(c, a, b, k, { color: INK, tick: 13, width: 2.2 });
  const dx = a[0] - b[0], dy = a[1] - b[1], l = Math.hypot(dx, dy);
  const tx = a[0] + dx / l * 44, ty = a[1] + dy / l * 44;
  const ka = L.clamp(k * 2 - 0.8);
  const w = label(c, text, tx, ty, { size: 24, color: INK, alpha: ka, align: 'center', track: 2 });
  if (sub) label(c, sub, tx + w / 2 + 12, ty + 1, { size: 16, weight: 600, color: [175, 190, 210], alpha: ka * 0.9, track: 2 });
}

export default {
  beat: 0,
  chapter: { num: '01', title: "A human hand", sub: "10 centimetres" },
  cues(d) { return [{ t: d * 0.53, name: 'tick', gain: 0.18, pitch: 1.2 }]; },
  drawOverlay(c, v) {
    const p = phrase(v, 0, 1);
    const k = L.prog(v.gt, p.start - 0.1, 0.9);
    c.save();
    c.globalAlpha = v.k;
    drawSpan(c, v, k);
    c.restore();
    void ACCENT;
  },
};
