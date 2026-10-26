// Beat 0 — "How did ten days vanish from history?"
// The torn October 1582 page (drawn by s08 in its END STATE) under a 2-line headline that is fully readable on the
// beat's FIRST frame (overlayIn: false, no fade-in): HOW DID 10 DAYS / VANISH?, fitted ≤ 900 px in the band
// y ≈ 260–520, closed by an engraved double rule with a lozenge. A gold glint then runs down the red seam between
// Thursday 4 and Friday 15 — the eye lands on the cut. No captions, no chapter card.
import * as L from '../../../../engine/runtime/lib.js';
import { OCT_LAYOUT } from './s08-gregory.js';
import { ACCENT, deskK } from '../env.js';

const { W } = L;
const MAXW = 900;
const TOP = 268;                     // top of the headline band (cap top of line 1)
const WHITE = 'rgb(242,236,224)';
const L1 = [['HOW DID ', WHITE], ['10 DAYS', null]];
const L2 = [['VANISH?', WHITE]];
const txt = (parts) => parts.map((p) => p[0]).join('');

function line(c, parts, y, size, acc) {
  c.font = L.font(size, 800, L.FONT.display);
  let x = W / 2 - c.measureText(txt(parts)).width / 2;
  c.textAlign = 'left';
  for (const [t, col] of parts) { c.fillStyle = col ?? L.rgba(acc); c.fillText(t, x, y); x += c.measureText(t).width; }
}

/** engraved double rule with a centre lozenge, centred at (cx, y), half-width hw (drawn in from the centre by e) */
function ornamentRule(c, cx, y, hw, e) {
  if (e <= 0) return;
  const w = hw * e;
  c.save();
  c.strokeStyle = L.rgba(ACCENT, 0.85);
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(cx - 22, y); c.lineTo(cx - w, y);
  c.moveTo(cx + 22, y); c.lineTo(cx + w, y);
  c.stroke();
  c.strokeStyle = L.rgba(ACCENT, 0.4);
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(cx - 22, y + 6); c.lineTo(cx - w * 0.82, y + 6);
  c.moveTo(cx + 22, y + 6); c.lineTo(cx + w * 0.82, y + 6);
  c.stroke();
  c.fillStyle = L.rgba(ACCENT, 0.95);
  c.beginPath(); c.moveTo(cx, y - 8); c.lineTo(cx + 11, y + 3); c.lineTo(cx, y + 14); c.lineTo(cx - 11, y + 3); c.closePath(); c.fill();
  c.restore();
}

/** a gold glint travelling down the seam between Thursday 4 and Friday 15 (world → screen) */
function seamGlint(c, v) {
  const dk = deskK(v);
  const g = L.prog(v.t, 0.55, 1.3);
  if (dk <= 0 || g <= 0 || g >= 1) return;
  const lay = OCT_LAYOUT;
  const x = v.wx(lay.gx0 + 5 * lay.cw);
  const y0 = v.wy(lay.gy0), y1 = v.wy(lay.gy0 + lay.ch);
  const e = L.ease.inOutCubic(g);
  const y = L.lerp(y0 - 10, y1 + 10, e);
  const a = Math.sin(Math.PI * g) * dk * v.k;
  c.save();
  L.lightBlob(c, x, y, 70, [255, 214, 140], 0.55 * a);
  // a short bright streak trailing the glint along the seam
  const gr = c.createLinearGradient(x, y - 70, x, y);
  gr.addColorStop(0, 'rgba(255,236,190,0)');
  gr.addColorStop(1, `rgba(255,240,205,${0.9 * a})`);
  c.strokeStyle = gr;
  c.lineWidth = 3;
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(x, Math.max(y0, y - 70)); c.lineTo(x, y); c.stroke();
  // four-point sparkle
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = `rgba(255,240,210,${0.85 * a})`;
  const s = 16 * (0.7 + 0.3 * Math.sin(Math.PI * g));
  c.beginPath();
  c.moveTo(x, y - s); c.quadraticCurveTo(x, y, x + s * 0.55, y); c.quadraticCurveTo(x, y, x, y + s);
  c.quadraticCurveTo(x, y, x - s * 0.55, y); c.quadraticCurveTo(x, y, x, y - s);
  c.fill();
  c.restore();
}

export default {
  beat: 0,
  chapter: null,
  captions: false,
  overlayIn: false,
  layer: 5,
  cues() {
    return [
      { t: 0.0, name: 'impact', gain: 0.3, pitch: 0.8 },
      { t: 0.6, name: 'shimmer', gain: 0.16, pitch: 1.2 },
    ];
  },
  drawOverlay(c, v) {
    if (v.k <= 0) return;
    seamGlint(c, v);
    c.save();
    c.globalAlpha = v.k;
    const size = Math.min(
      L.fitSize(c, txt(L1), MAXW, 132, 800, L.FONT.display, 50),
      L.fitSize(c, txt(L2), MAXW, 132, 800, L.FONT.display, 50));
    const cap = size * 0.72;
    const b1 = TOP + cap, b2 = b1 + size * 0.98;
    c.textBaseline = 'alphabetic';
    c.shadowColor = 'rgba(0,0,0,0.7)';
    c.shadowBlur = 18;
    line(c, L1, b1, size, v.accent);
    line(c, L2, b2, size, v.accent);
    c.shadowBlur = 0;
    // the rule is part of the frame-1 composition (already drawn), then breathes out a little wider
    ornamentRule(c, W / 2, b2 + 38, L.lerp(150, 200, L.enter(v.t, 0.2, 1.2)), 1);
    c.restore();
  },
};
