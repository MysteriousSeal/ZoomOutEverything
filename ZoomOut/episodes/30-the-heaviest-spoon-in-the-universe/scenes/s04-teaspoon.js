// Beat 4 — "So one teaspoon weighs about a billion tonnes. | All eight billion of us together weigh less."
// The camera pulls out of the dollop (the packed neutrons shrink into it) to the teaspoon (upper half). An opaque
// chart card (x 80–940, y 935–1390) compares, in TRUE proportion on one axis (0 → 1 billion tonnes):
//   ONE TEASPOON OF NEUTRON STAR  ≈ 1,000,000,000 TONNES  (bar lands on "billion")
//   ALL 8 BILLION HUMANS          ≈ 0.4–0.5 BILLION TONNES (bar to 0.45 with a 0.40–0.50 range whisker, phrase 1)
// Each value appears only once its bar has landed.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, phraseGt, wordGt } from '../env.js';

const { ease, clamp, prog } = L;
// below the handle's line (the dollop is pinned at (330, 590) and the handle runs at 25°: y ≤ ≈ 925 at x = 940)
const CARD = { x: 80, w: 860, y: 935, h: 455, pad: 52 };
const WARM = [236, 214, 190];

export default {
  beat: 4,
  chapter: { num: '04', title: 'One teaspoon', sub: 'Weighed against all of humanity' },
  chapterUntil: (d) => d - 0.95,   // gone before the pull-out to the spinning star (beat 5's card then enters clean)
  layer: 12,
  overlayIn: false,
  cues(d) {
    void d;
    return [];
  },
  drawOverlay(c, v) {
    const gt = v.gt, tl = v.tl, sc = tl.scenes[4];
    const tIn = wordGt(tl, 4, 0, 2) - 0.05;                  // on "teaspoon", as the spoon settles
    const kin = ease.outCubic(prog(gt, tIn, 0.3));
    if (kin <= 0) return;
    // exit before the pull-out: contents fade (0.15 s), then the plate scales down a touch and fades (0.15 s)
    const tOut = sc.end - 0.5;
    const cOut = 1 - ease.inCubic(prog(gt, tOut - 0.3, 0.15));
    const pOut = 1 - prog(gt, tOut - 0.22, 0.12);
    if (pOut <= 0) return;
    const { x, w, y, h, pad } = CARD;
    const bx0 = x + pad, bx1 = x + w - pad, BW = bx1 - bx0;
    c.save();
    const s = L.lerp(0.92, 1, kin) * L.lerp(0.94, 1, ease.outCubic(pOut)), cx = x + w / 2, cy = y + h / 2;
    c.translate(cx, cy + (1 - kin) * 20); c.scale(s, s); c.translate(-cx, -cy);
    c.globalAlpha = pOut;
    c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 40; c.shadowOffsetY = 12;
    c.fillStyle = 'rgb(17,26,52)';                            // lighter than the sky: reads as a solid plate
    L.roundRect(c, x, y, w, h, 28); c.fill();
    c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0;
    c.strokeStyle = L.rgba(ACCENT, 0.85); c.lineWidth = 2.5;
    L.roundRect(c, x, y, w, h, 28); c.stroke();
    c.globalAlpha = pOut * cOut * clamp(prog(gt, tIn + 0.02, 0.15));
    c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    // axis: 0 · 0.5 · 1 billion tonnes (both bars share it)
    c.font = L.font(21, 600, L.FONT.body); c.fillStyle = 'rgba(176,188,212,0.92)';
    L.trackedText(c, '0', bx0, y + 420, 1, 'left');
    L.trackedText(c, '0.5', bx0 + BW * 0.5, y + 420, 1, 'center');
    L.trackedText(c, '1 BILLION TONNES', bx1, y + 420, 2, 'right');
    // kicker
    c.fillStyle = L.rgba(ACCENT); c.fillRect(x + pad, y + 44, 44, 6);
    c.font = L.font(25, 700, L.FONT.body); c.fillStyle = 'rgba(225,230,238,0.92)';
    L.trackedText(c, 'WEIGHT, TRUE PROPORTIONS', x + pad + 60, y + 53, 4);
    // rows: bar 1 grows from the card's arrival and lands on "billion"; bar 2 on "all eight billion"
    const tB = wordGt(tl, 4, 0, 6);
    const rows = [
      { label: 'ONE TEASPOON OF NEUTRON STAR', val: '≈ 1,000,000,000 TONNES', f: 1, t0: tIn + 0.2, t1: tB + 0.05, col: ACCENT, y: y + 72 },
      { label: 'ALL 8 BILLION HUMANS', val: '≈ 0.4–0.5 BILLION TONNES', f: 0.45, lo: 0.4, hi: 0.5, t0: phraseGt(tl, 4, 1) + 0.05, t1: phraseGt(tl, 4, 1) + 0.95, col: WARM, y: y + 224 },
    ];
    for (const r of rows) {
      c.font = L.font(25, 700, L.FONT.body); c.fillStyle = 'rgba(214,222,236,0.95)';
      L.trackedText(c, r.label, bx0, r.y + 32, 3);
      const barY = r.y + 46, bh = 34;
      // track + faint ticks at 0.5 and 1
      c.fillStyle = 'rgba(255,255,255,0.08)';
      L.roundRect(c, bx0, barY, BW, bh, 8); c.fill();
      c.fillStyle = 'rgba(200,210,230,0.3)';
      c.fillRect(bx0 + BW * 0.5 - 1, barY - 6, 2, bh + 12);
      const g = ease.outCubic(prog(gt, r.t0, r.t1 - r.t0));
      if (g > 0) {
        const bw = BW * r.f * g;
        c.save();
        if (r.col === ACCENT) { c.shadowColor = L.rgba(ACCENT, 0.8); c.shadowBlur = 18; }
        const gr = c.createLinearGradient(bx0, 0, bx0 + BW, 0);
        gr.addColorStop(0, L.rgba(L.mix(r.col, [255, 255, 255], 0.2))); gr.addColorStop(1, L.rgba(r.col));
        c.fillStyle = gr;
        L.roundRect(c, bx0, barY, Math.max(1, bw), bh, 8); c.fill();
        c.restore();
      }
      const landed = ease.outCubic(prog(gt, r.t1 - 0.1, 0.3));
      if (r.lo != null && landed > 0) {
        // range whisker 0.40–0.50
        const a = bx0 + BW * r.lo, b = bx0 + BW * r.hi, wy = barY + bh / 2;
        c.save(); c.globalAlpha *= landed;
        c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(a, wy); c.lineTo(b, wy); c.moveTo(a, wy - 14); c.lineTo(a, wy + 14); c.moveTo(b, wy - 14); c.lineTo(b, wy + 14); c.stroke();
        c.restore();
      }
      if (landed > 0) {
        c.save(); c.globalAlpha *= landed;
        const vs = L.fitSize(c, r.val, BW, 44, 800, L.FONT.display, 28);
        c.font = L.font(vs, 800, L.FONT.display);
        c.fillStyle = L.rgba(r.col === ACCENT ? ACCENT : [255, 236, 214]);
        c.fillText(r.val, bx0, barY + bh + 52 + (1 - landed) * 8);
        c.restore();
      }
    }
    c.restore();
  },
};
