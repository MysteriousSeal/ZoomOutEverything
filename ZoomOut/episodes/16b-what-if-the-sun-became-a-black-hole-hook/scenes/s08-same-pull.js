// Beat 8 — "From that far, | a black hole pulls like any star of the same mass."
// The camera leans toward Earth (lower-right). On "pulls" a violet pull vector (a tapered shape, no glyphs) grows from
// Earth toward the black hole. On "like any star" a warm star of the same mass glows up at the centre (the tag above
// it changes from BLACK HOLE to OR A STAR OF THE SAME MASS) and its own warm pull vector draws in right beside the
// violet one. On "same mass" two dashed rails lock the tails and heads together: identical length. The radius
// bracket from beat 7 recedes so the vectors are the focal point.
import * as L from '../../../../engine/runtime/lib.js';
import { filmScene } from '../camera.js';   // 16b: draws run on film time
import { ACC, drawLabels } from './s05-dark.js';
import { drawOrbitTags, orbitGeom } from './s06-no-fly-off.js';

const WARM = [255, 200, 130];
const LEN = 250;                 // both vectors, px (equal by construction: same mass, same distance)
const T_BH = 33.95, T_STAR = 35.25, T_WARM = 35.4, T_EQ = 36.05, T_OUT = 37.4;

/** A tapered pull vector from (x, y) along unit (dx, dy): shaft + head as one filled shape. k = draw-on 0..1. */
function vector(c, x, y, dx, dy, k, col, a, gt, seed) {
  if (k <= 0 || a <= 0) return;
  const len = LEN * k;
  const px = -dy, py = dx;
  const head = Math.min(36, len * 0.45), hw = 15, w0 = 2.4, w1 = 5.5;
  const bx = x + dx * (len - head), by = y + dy * (len - head);
  const tx = x + dx * len, ty = y + dy * len;
  c.save();
  c.globalAlpha *= a;
  c.shadowColor = L.rgba(col, 0.8); c.shadowBlur = 16;
  c.fillStyle = L.rgba(col, 0.95);
  c.beginPath();
  c.moveTo(x + px * w0, y + py * w0);
  c.lineTo(bx + px * w1, by + py * w1);
  c.lineTo(bx + px * hw, by + py * hw);
  c.lineTo(tx, ty);
  c.lineTo(bx - px * hw, by - py * hw);
  c.lineTo(bx - px * w1, by - py * w1);
  c.lineTo(x - px * w0, y - py * w0);
  c.closePath();
  c.fill();
  // a pulse of light running tail -> head (secondary motion)
  c.shadowBlur = 0;
  const ph = ((gt * 0.8 + seed) % 1);
  const qx = x + dx * (len - head) * ph, qy = y + dy * (len - head) * ph;
  c.globalCompositeOperation = 'lighter';
  L.lightBlob(c, qx, qy, 16, [255, 255, 255], 0.45 * Math.sin(Math.PI * ph));
  c.restore();
}

export function drawPull(c, v) {
  const gt = v.gt;
  if (gt < T_BH || gt > T_OUT + 0.6) return;
  const g = orbitGeom(v);
  if (g.R < 60 || g.R > 4000) return;
  const out = 1 - L.ease.inCubic(L.prog(gt, T_OUT, 0.5));
  const dx = -g.n.x, dy = -g.n.y;                                // Earth -> black hole
  const px = -dy, py = dx;
  const kBH = L.ease.outCubic(L.prog(gt, T_BH, 0.65));
  const kW = L.ease.outCubic(L.prog(gt, T_WARM, 0.65));
  const sep = 21 * L.ease.inOutCubic(L.prog(gt, T_WARM - 0.1, 0.5)); // the violet one slides aside to make room
  const x0 = g.ex + dx * 24, y0 = g.ey + dy * 24;
  vector(c, x0 + px * sep, y0 + py * sep, dx, dy, kBH, L.mix(ACC, [255, 255, 255], 0.15), out, gt, 0);
  vector(c, x0 - px * sep, y0 - py * sep, dx, dy, kW, WARM, out, gt, 0.5);
  // equality rails across the tails and the heads
  const eq = L.ease.outCubic(L.prog(gt, T_EQ, 0.4)) * out;
  if (eq > 0) {
    c.save();
    c.strokeStyle = `rgba(240,236,250,${0.85 * eq})`;
    c.lineWidth = 2;
    c.lineCap = 'round';
    for (const f of [0, LEN]) {
      const cx = x0 + dx * f, cy = y0 + dy * f, e = (sep + 16) * eq;
      c.beginPath(); c.moveTo(cx + px * e, cy + py * e); c.lineTo(cx - px * e, cy - py * e); c.stroke();
    }
    // a confirming flash on the rails
    const fl = gt - T_EQ;
    if (fl > 0 && fl < 0.8) {
      c.globalCompositeOperation = 'lighter';
      for (const f of [0, LEN]) L.lightBlob(c, x0 + dx * f, y0 + dy * f, 50, [235, 225, 255], 0.5 * (1 - fl / 0.8));
    }
    c.restore();
  }
}

/** The "any star of the same mass": a warm star glowing up over the black hole's position. */
export function drawStarTwin(c, v) {
  const gt = v.gt;
  const k = L.ease.inOutCubic(L.prog(gt, T_STAR, 0.6)) * (1 - L.ease.inCubic(L.prog(gt, T_OUT, 0.5)));
  if (k <= 0) return;
  const g = orbitGeom(v);
  const pulse = 1 + 0.05 * Math.sin(gt * 2.2);
  c.save();
  c.globalCompositeOperation = 'lighter';
  L.lightBlob(c, g.cx, g.cy, 120 * pulse, [255, 150, 70], 0.22 * k);
  L.lightBlob(c, g.cx, g.cy, 46 * pulse, [255, 205, 140], 0.65 * k);
  L.lightBlob(c, g.cx, g.cy, 12, [255, 250, 235], 0.95 * k);
  // a soft four-point flare
  for (const [ax, ay, len] of [[1, 0, 70], [0, 1, 44]]) {
    const gr = c.createLinearGradient(g.cx - ax * len, g.cy - ay * len, g.cx + ax * len, g.cy + ay * len);
    gr.addColorStop(0, 'rgba(255,220,170,0)'); gr.addColorStop(0.5, `rgba(255,236,205,${0.5 * k})`); gr.addColorStop(1, 'rgba(255,220,170,0)');
    c.strokeStyle = gr; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(g.cx - ax * len, g.cy - ay * len); c.lineTo(g.cx + ax * len, g.cy + ay * len); c.stroke();
  }
  c.restore();
}

export default filmScene({
  beat: 8,
  chapter: { num: '08', title: 'Same pull', sub: 'same mass, same distance' },
  captions: true,
  layer: 2,
  cues() {
    // beat starts 32.225 s
    const s = 32.225;
    return [
      { t: T_BH - s, name: 'swish', gain: 0.26, pitch: 0.9 },
      { t: T_BH - s + 0.05, name: 'deep', gain: 0.2, pitch: 1.1 },
      { t: T_STAR - s, name: 'shimmer', gain: 0.28, pitch: 1.0 },
      { t: T_WARM - s + 0.05, name: 'swish', gain: 0.2, pitch: 1.1 },
      { t: T_EQ - s, name: 'ping', gain: 0.3, pitch: 1.0 },
      { t: T_EQ - s + 0.08, name: 'ping', gain: 0.24, pitch: 1.5 },
    ];
  },
  drawWorld(c, v) {
    drawStarTwin(c, v);
    drawPull(c, v);
  },
  drawOverlay(c, v) {
    drawLabels(c, v);
    drawOrbitTags(c, v);
  },
});
