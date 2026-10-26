// Beat 10 — "Now squeeze all of that onto a hundred-meter running track."
// env unfolds the ruler into the home straight of a 400 m stadium (start line = the Big Bang at −100 m, finish = now).
// This beat dresses it: starting blocks behind the start line and the lane numbers painted behind them (world space,
// they unfold with the track), a soft accent glow at each end, the tags "START = BIG BANG" / "FINISH = NOW" under the
// straight, and the headline card "13.8 BILLION YEARS / = 100 METERS" in the upper band.
import * as L from '../../../../engine/runtime/lib.js';
import { YR_PER_M, LANES, LANE_W, TRACK_Y0, TRACK_Y1 } from '../camera.js';
import { mx, ACCENT, trackK } from '../env.js';

const { W } = L;
const CARD = { x: 110, w: 860, top: 420, padX: 48, padY: 32 };
const TAG_Y = 1150;

/** screen y of lateral track coord w (m) (env reveals the track by a growing window, geometry is never squashed) */
const ty = (v, w) => v.wy(w * YR_PER_M);

/** draw parts [[text, colour], ...] at one size, aligned 'left' | 'right' | 'center' at x */
function parts(c, list, x, y, align, tracking = 0) {
  c.letterSpacing = `${tracking}px`;
  const wid = list.map(([t]) => c.measureText(t).width);
  const total = wid.reduce((a, b) => a + b, 0) - tracking;
  let cx = align === 'right' ? x - total : align === 'center' ? x - total / 2 : x;
  c.textAlign = 'left';
  list.forEach(([t, col], i) => { c.fillStyle = col; c.fillText(t, cx, y); cx += wid[i]; });
  c.letterSpacing = '0px';
  return total;
}

export default {
  beat: 10,
  chapter: { num: '10', title: 'The 100 m track', sub: '13.8 billion years = 100 meters' },
  layer: 10,
  cues(d) {
    return [
      { t: 0.25, name: 'swell', gain: 0.32, pitch: 0.9 },
      { t: 1.5, name: 'ping', gain: 0.26, pitch: 1.0 },
      { t: 1.95, name: 'tick', gain: 0.2, pitch: 0.9 },
      { t: 2.25, name: 'tick', gain: 0.2, pitch: 1.2 },
    ];
  },
  drawWorld(ctx, v) {
    const tk = trackK(v);
    if (tk <= 0.05 || v.cam.mpp > 4e7) return;
    const s = YR_PER_M / v.cam.mpp;                   // px per metre
    const xs = mx(v, 100);                            // start line (its leading edge)
    if (xs < -200 || xs > W + 200) return;
    ctx.save();
    ctx.globalAlpha = L.clamp((tk - 0.2) / 0.3);
    for (let i = 1; i <= LANES; i++) {
      const wc = TRACK_Y0 + (i - 0.5) * LANE_W, yc = ty(v, wc), lh = Math.abs(ty(v, wc + LANE_W) - yc);
      // starting block: rail + two pedals, 0.35–1.0 m behind the line
      const bx0 = mx(v, 101.0), bx1 = mx(v, 100.35);
      ctx.fillStyle = 'rgba(40,44,52,0.95)';
      ctx.fillRect(bx0, yc - lh * 0.06, bx1 - bx0, Math.max(1, lh * 0.12));
      ctx.fillStyle = 'rgba(210,214,220,0.9)';
      for (const [f, side] of [[0.35, -1], [0.7, 1]]) ctx.fillRect(L.lerp(bx0, bx1, f), yc + side * lh * 0.08 - lh * 0.09, Math.max(1, 0.1 * s), Math.max(1, lh * 0.18));
      // lane number, painted behind the blocks, reading toward the runner (rotated a quarter turn)
      const size = 0.62 * s;
      if (size >= 3) {
        ctx.save();
        ctx.translate(mx(v, 101.7), yc);
        ctx.rotate(Math.PI / 2);
        ctx.font = L.font(size, 700, L.FONT.display);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(244,242,236,0.9)';
        ctx.fillText(String(i), 0, 0);
        ctx.restore();
      }
    }
    ctx.restore();
  },
  drawOverlay(ctx, v) {
    const t = v.t, tk = trackK(v);
    const xs = mx(v, 100), xf = mx(v, 0), yb = ty(v, TRACK_Y1);
    // soft glows at both ends of the straight: the beginning of time and now
    const gk = L.clamp((tk - 0.4) / 0.6) * v.k;
    if (gk > 0) {
      L.lightBlob(ctx, xs, ty(v, 0), 90, ACCENT, 0.22 * gk);
      L.lightBlob(ctx, xf, ty(v, 0), 90, ACCENT, 0.3 * gk * (0.8 + 0.2 * Math.sin(v.gt * 3)));
    }
    // tags under the straight, with leaders up to each line
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    for (const [x, at, list, align] of [
      [xs, 1.85, [['START', 'rgb(236,240,244)'], ['  =  BIG BANG', L.rgba(ACCENT)]], 'left'],
      [xf, 2.15, [['FINISH', 'rgb(236,240,244)'], ['  =  NOW', L.rgba(ACCENT)]], 'right'],
    ]) {
      const k = L.ease.outCubic(L.prog(t, at, 0.5)) * v.k;
      if (k <= 0) continue;
      ctx.save();
      ctx.globalAlpha *= k;
      ctx.strokeStyle = 'rgba(232,236,240,0.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, yb + 8); ctx.lineTo(x, L.lerp(yb + 8, TAG_Y - 34, k)); ctx.stroke();
      ctx.fillStyle = 'rgba(232,236,240,0.9)';
      ctx.beginPath(); ctx.arc(x, yb + 8, 4, 0, Math.PI * 2); ctx.fill();
      const fs = L.fitSize(ctx, list.map((p) => p[0]).join(''), 380, 30, 700, L.FONT.body, 18);
      ctx.font = L.font(fs, 700, L.FONT.body);
      ctx.shadowColor = 'rgba(2,6,12,0.85)'; ctx.shadowBlur = 10;
      const ax = align === 'left' ? Math.max(64, x - 18) : Math.min(930, x + 18);
      parts(ctx, list, ax, TAG_Y + (1 - k) * 10, align, 2);
      ctx.restore();
    }
    ctx.restore();
    // headline card
    const ck = L.ease.outCubic(L.prog(t, 1.45, 0.55)) * v.k;
    if (ck <= 0) return;
    const { x, w, top, padX, padY } = CARD, inner = w - 2 * padX;
    const l1 = '13.8 BILLION YEARS', l2 = '= 100 METERS';
    const fs = Math.min(L.fitSize(ctx, l1, inner, 84, 800, L.FONT.display, 50), L.fitSize(ctx, l2, inner, 84, 800, L.FONT.display, 50));
    const cap = fs * 0.72, gap = fs * 0.3;
    const b1 = top + padY + cap, b2 = b1 + gap + cap, h = b2 - top + padY;
    ctx.save();
    ctx.globalAlpha *= ck;
    ctx.translate(0, (1 - ck) * 24);
    ctx.fillStyle = 'rgba(4,9,16,0.86)';
    L.roundRect(ctx, x, top, w, h, 22); ctx.fill();
    ctx.strokeStyle = L.rgba(ACCENT, 0.4); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = L.rgba(ACCENT); ctx.fillRect(x, top + 22, 6, h - 44);
    ctx.font = L.font(fs, 800, L.FONT.display);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'center';
    ctx.fillStyle = L.rgba(ACCENT);
    ctx.fillText(l1, x + w / 2, b1);
    const k2 = L.ease.outCubic(L.prog(t, 1.75, 0.5));
    ctx.globalAlpha *= k2;
    ctx.fillStyle = 'rgb(240,242,245)';
    ctx.fillText(l2, x + w / 2, b2 + (1 - k2) * 14);
    ctx.restore();
  },
};
