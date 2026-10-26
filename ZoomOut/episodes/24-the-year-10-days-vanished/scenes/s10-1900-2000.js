// Beat 10 — "That's why 1900 had no leap day, | but 2000 did."
// Two printed February pages at P_FEB, side by side: 1900 (28 days, Feb 1 = Thursday) and 2000 (29 days, Feb 1 =
// Tuesday). Phrase 0: the 1900 page leads (2000 slightly veiled); a ghost "29" appears in 1900's empty Thursday slot and
// is crossed out in red rubric → "28 DAYS / NO LEAP DAY" under the page. Phrase 1 ("but 2000 did", 57.58): the veil
// lifts and 2000's 29 gets a gold pen ring and glow → "29 DAYS / LEAP DAY KEPT".
// The pages ghost at 0.3 in beat 9 (they peek in under the leap-rule plate) and come up as the camera travels down.
import * as L from '../../../../engine/runtime/lib.js';
import { P_FEB, ACCENT, RUBRIC, INKC, NAVY, drawMonthPage, monthDays, deskK, serif } from '../env.js';

const PW = 390, PH = 470, DX = 205;                        // page size (u), centre offset from P_FEB
const PAGES = [
  { yr: '1900', days: monthDays(28, 4), x: -DX, seed: 21 },
  { yr: '2000', days: monthDays(29, 2), x: DX, seed: 22 },
];
const GOLD_INK = [160, 112, 34];
const RED_NAVY = [236, 120, 100];                           // rubric red, lifted to read on navy
// beat-relative (beat 10 starts 54.40; "no leap day" ≈ 56.1; phrase 1 "but 2000 did" 57.58 = +3.18)
const T = { ghost: 1.25, cross: 1.65, v1900: 1.85, ring: 3.12, v2000: 3.3 };

/** last day's cell for 29 in a month starting on col0 */
const cell29 = (col0) => ({ r: Math.floor((col0 + 28) / 7), col: (col0 + 28) % 7 });

export default {
  beat: 10,
  chapter: { num: '09', title: '1900 vs 2000', sub: 'century years: 1900 no, 2000 yes' },
  layer: 1,
  cues(d) {
    return [
      { t: T.cross, name: 'swish', gain: 0.24, pitch: 0.85 },
      { t: T.ring, name: 'ping', gain: 0.26, pitch: 1.15 },
      { t: T.ring + 0.05, name: 'shimmer', gain: 0.16, pitch: 1.1 },
    ];
  },
  drawWorld(c, v) {
    const dk0 = deskK(v);
    if (dk0 <= 0) return;
    const b10 = v.tl.scenes[10].start;
    const b12 = v.tl.scenes[12].start;
    // hidden under the leap plate in beat 9 (they would sit in the bottom safe band), up as the camera travels down;
    // gone before the beat-12 swoop (it would carry them across the HUD readout)
    // leaving: gone within ~0.45 s of beat 11's start, so only Britain arrives in the travel
    const dk = dk0 * (1 - L.ease.inCubic(L.prog(v.gt, v.tl.scenes[11].start, 0.45)));
    if (dk <= 0) return;
    // beat 9: parked below the frame (the bottom safe band stays clear); they rise into place as the camera comes down
    const dn = 320 * (1 - L.ease.inOutCubic(L.prog(v.gt, b10 - 0.2, 1.3)));
    if (v.gt > b12 + 1.5) return;   // the beat-12 swoop must not carry them across the HUD readout
    const s = 1 / v.cam.mpp, t = v.t;
    if (v.wy(P_FEB.y + dn - PH / 2) > L.H + 40 || v.wy(P_FEB.y + dn + PH / 2) < -40) return;
    if (v.wx(P_FEB.x + DX + PW / 2) < -40 || v.wx(P_FEB.x - DX - PW / 2) > L.W + 40) return;
    PAGES.forEach((p, i) => {
      const P = { x: P_FEB.x + p.x, y: P_FEB.y + dn };
      const lay = drawMonthPage(c, v, { P, w: PW, h: PH, rows: 5, head: 0.3, days: p.days, alpha: dk, seed: p.seed });
      const X = (x) => v.wx(x), Y = (y) => v.wy(y);
      c.save();
      c.globalAlpha *= dk;
      c.textAlign = 'center';
      c.textBaseline = 'alphabetic';
      // header: FEBRUARY (tracked) over a big year numeral
      c.fillStyle = L.rgba(INKC);
      c.font = serif(Math.max(1, 25 * s), 600);
      L.trackedText(c, 'FEBRUARY', X(P.x), Y(lay.y0 + 50), 5 * s, 'center');
      c.fillStyle = L.rgba(i === 0 ? RUBRIC : INKC);
      c.font = serif(Math.max(1, 62 * s), 700);
      c.fillText(p.yr, X(P.x), Y(lay.y0 + 116));
      // the 29 slot
      const q = cell29(p.days[0].col), cp = lay.cell(q.r, q.col);
      const cx = X(cp.x), cy = Y(cp.y), cw = lay.cw * s, ch = lay.ch * s;
      if (i === 0) {
        // 1900: a ghost 29 that is struck out
        const gk = L.enter(t, T.ghost, 0.4);
        if (gk > 0) {
          c.save();
          c.globalAlpha *= gk;
          c.fillStyle = L.rgba(RUBRIC, 0.1);
          c.fillRect(cx - cw / 2 + 1, cy - ch / 2 + 1, cw - 2, ch - 2);
          c.setLineDash([3 * s, 3 * s]);
          c.strokeStyle = L.rgba(RUBRIC, 0.55);
          c.lineWidth = Math.max(0.5, 1.2 * s);
          c.strokeRect(cx - cw / 2 + 3 * s, cy - ch / 2 + 3 * s, cw - 6 * s, ch - 6 * s);
          c.setLineDash([]);
          c.fillStyle = L.rgba(INKC, 0.28);
          c.font = serif(Math.max(1, ch * 0.48), 600);
          c.textBaseline = 'middle';
          c.fillText('29', cx, cy + ch * 0.03);
          c.restore();
        }
        const xk = L.ease.inOutCubic(L.prog(t, T.cross, 0.3));
        if (xk > 0) {
          c.strokeStyle = L.rgba(RUBRIC, 0.95);
          c.lineCap = 'round';
          c.lineWidth = Math.max(1, 5 * s);
          const a = Math.min(1, xk * 2), b = L.clamp(xk * 2 - 1);
          const r = Math.min(cw, ch) * 0.36;
          c.beginPath();
          c.moveTo(cx - r, cy - r); c.lineTo(cx - r + 2 * r * a, cy - r + 2 * r * a);
          if (b > 0) { c.moveTo(cx + r, cy - r); c.lineTo(cx + r - 2 * r * b, cy - r + 2 * r * b); }
          c.stroke();
        }
      } else {
        // 2000: the 29 is real — gold pen ring + warm glow
        const rk = L.ease.outCubic(L.prog(t, T.ring, 0.45));
        if (rk > 0) {
          L.lightBlob(c, cx, cy, ch * 1.3, ACCENT, 0.35 * rk);
          c.strokeStyle = L.rgba(GOLD_INK, 0.95);
          c.lineWidth = Math.max(1, 3.5 * s);
          c.lineCap = 'round';
          c.beginPath();
          const r = Math.min(cw, ch) * 0.44;
          for (let j = 0; j <= 40; j++) {
            const a = -2 + (Math.PI * 2.15 * rk * j) / 40;
            const px = cx + Math.cos(a) * r * 1.08, py = cy + Math.sin(a) * r - (j / 40) * 3 * s;
            if (j) c.lineTo(px, py); else c.moveTo(px, py);
          }
          c.stroke();
        }
        // veil while 1900 leads (phrase 0), lifted on "but 2000 did"
        const veil = 0.22 * L.enter(t, 0.7, 0.5) * (1 - L.enter(t, T.ring - 0.25, 0.35));
        if (veil > 0) {
          c.fillStyle = L.rgba(NAVY, veil);
          c.fillRect(X(lay.x0) - 2, Y(lay.y0) - 2, PW * s + 4, PH * s + 4);
        }
      }
      c.restore();
    });
  },
  drawOverlay(c, v) {
    if (v.k <= 0) return;
    // verdicts under each page (pages end ≈ y 1150; captions start 1380)
    const items = [
      { x: v.wx(P_FEB.x - DX), big: '28 DAYS', small: 'NO LEAP DAY', col: RED_NAVY, at: T.v1900 },
      { x: v.wx(P_FEB.x + DX), big: '29 DAYS', small: 'LEAP DAY KEPT', col: ACCENT, at: T.v2000 },
    ];
    const yb = Math.min(1250, v.wy(P_FEB.y + PH / 2) + 92);
    c.save();
    c.textAlign = 'center';
    c.textBaseline = 'alphabetic';
    const bs = Math.min(...items.map((it) => L.fitSize(c, it.big, 360, 76, 800, L.FONT.display, 40)));
    for (const it of items) {
      const k = v.k * L.enter(v.t, it.at, 0.45);
      if (k <= 0) continue;
      c.globalAlpha = k;
      c.shadowColor = 'rgba(0,0,0,0.55)';
      c.shadowBlur = 16;
      c.fillStyle = L.rgba(it.col);
      c.font = L.font(bs, 800, L.FONT.display);
      L.trackedText(c, it.big, it.x, yb + (1 - k) * 18, -1, 'center');
      c.shadowBlur = 6;
      c.fillStyle = 'rgba(214,220,232,0.95)';
      c.font = L.font(L.fitSize(c, it.small, 360, 26, 600, L.FONT.body, 16), 600, L.FONT.body);
      L.trackedText(c, it.small, it.x, yb + 44 + (1 - k) * 10, 3, 'center');
      c.fillStyle = L.rgba(it.col, 0.9);
      c.fillRect(it.x - 30 * k, yb - bs * 0.92 - 18, 60 * k, 4);
    }
    c.restore();
  },
};
