// Beat 6 — "He survives that one too. | Japan only officially recognised him as a survivor of both bombs in 2009. |
// He lived to ninety-three."
// Camera 'both': both cities low in frame, both 3 km scars on the map, his marker in Nagasaki (env).
// Phrase 0: SURVIVES AGAIN stamp on "survives". Phrase 1: the recognition card grows a row per fact — OFFICIALLY
// RECOGNISED (on "officially"), THE ONLY OFFICIAL ‘NIJŪ HIBAKUSHA’ (on "both"; ≥ 160 people lived through both), 2009 · 24 MARCH (on "two thousand").
// Phrase 2: the lifespan strip 1916 —•1945— 2010: the age counts 29 → 93 (fast, eased) as the bar fills from 1945,
// landing on "ninety-three".
import * as L from '../../../../engine/runtime/lib.js';
import { ACC, EMBER, IVORY, MUTED, NAVY, kfont, moments, life, lifeXf, plate, txt, tw, PH, BE, gq } from '../env.js';

const REC = { x: 80, y: 372, w: 920, head: 74, pad: 26 };
const ROWS = [
  { h: 84, at: (m) => m.officially - 0.1 },
  { h: 108, at: (m) => m.both - 0.05 },   // kanji line → divider: 20 px
  { h: 128, at: (m) => m.y2009 - 0.05 },
];
const GAP = 44, LIFE_H = 164;

function stamp(c, str, cx, cy, t, t0, size = 92) {
  const sk = L.prog(t, t0 - 0.12, 0.34);
  if (sk <= 0) return;
  const e = L.ease.outBack(sk, 2.2);
  const f = L.font(size, 800, L.FONT.display);
  const sw = tw(c, str, f, 8) + 80, sh = size + 40;
  c.save();
  c.translate(cx, cy);
  c.rotate(-0.04);
  const s2 = L.lerp(1.5, 1, L.clamp(e));
  c.scale(s2, s2);
  c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 30;
  c.fillStyle = L.rgba(ACC);
  L.roundRect(c, -sw / 2, -sh / 2, sw, sh, 14); c.fill();
  c.shadowColor = 'transparent';
  c.strokeStyle = 'rgba(12,20,36,0.5)'; c.lineWidth = 2.5;
  L.roundRect(c, -sw / 2 + 9, -sh / 2 + 9, sw - 18, sh - 18, 8); c.stroke();
  txt(c, str, 0, 5, f, NAVY, { track: 8, align: 'center', base: 'middle' });
  c.restore();
  const fl = L.prog(t, t0 - 0.02, 0.8);
  if (fl > 0 && fl < 1) L.lightBlob(c, cx, cy, 260 + 200 * fl, ACC, 0.22 * (1 - fl));
}

export default {
  beat: 6,
  chapter: null,
  captions: true,
  overlayIn: false,
  layer: 5,
  drawOverlay(c, v) {
    const tl = v.tl, m = moments(tl), gt = v.gt, end = BE(tl, 6, -0.02);
    // ---- SURVIVES AGAIN (phrase 0)
    const sOut = m.officially - 0.5;
    if (gt < sOut) {
      const ex = L.prog(gt, sOut - 0.3, 0.3);
      c.save();
      c.globalAlpha *= 1 - L.ease.inCubic(ex);
      c.translate(540, 560); c.scale(L.lerp(1, 0.94, ex), L.lerp(1, 0.94, ex)); c.translate(-540, -560);
      stamp(c, 'SURVIVES AGAIN', 540, 560, gt, m.survives2);
      c.restore();
    }

    // ---- the recognition card (phrase 1)
    const lf = life(gt, ROWS[0].at(m) - 0.08, end);
    if (lf.on) {
      const { x, y, w, head, pad } = REC;
      let h = head + pad;
      ROWS.forEach((r) => { h += r.h * L.ease.inOutCubic(L.prog(gt, r.at(m) - 0.28, 0.28)); });
      c.save();
      lifeXf(c, lf, x + w / 2, y + 200);
      plate(c, x, y, w, h);
      c.save();
      L.roundRect(c, x, y, w, h, 22); c.clip();
      c.globalAlpha *= lf.ck;
      c.fillStyle = L.rgba(EMBER); c.fillRect(x + 44, y + 38, 44, 6);
      txt(c, 'JAPANESE GOVERNMENT', x + 104, y + 50, L.font(26, 700, L.FONT.body), MUTED, { track: 6 });
      let ry = y + head;
      const inner = w - 88;
      ROWS.forEach((r, i) => {
        const k = L.ease.outCubic(L.prog(gt, r.at(m), 0.4));
        if (k > 0) {
          c.save();
          c.globalAlpha *= k;
          c.translate((1 - k) * -24, 0);
          if (i === 0) {
            const fs = L.fitSize(c, 'OFFICIALLY RECOGNISED', inner, 76, 800, L.FONT.display, 40);
            txt(c, 'OFFICIALLY RECOGNISED', x + 44, ry + 66, L.font(fs, 800, L.FONT.display), IVORY);
          } else if (i === 1) {
            const s1 = 'THE ONLY OFFICIAL ‘NIJŪ HIBAKUSHA’';
            const fs = L.fitSize(c, s1, inner, 58, 800, L.FONT.display, 30);
            txt(c, s1, x + 44, ry + 52, L.font(fs, 800, L.FONT.display), ACC);
            const kj = '二重被爆者', kf = kfont(25, 600);
            txt(c, kj, x + 44, ry + 86, kf, IVORY, { alpha: 0.8 });
            const s2 = '· A SURVIVOR OF HIROSHIMA AND NAGASAKI';
            const ss = L.fitSize(c, s2, inner - tw(c, kj, kf) - 14, 23, 600, L.FONT.body, 14);
            txt(c, s2, x + 44 + tw(c, kj, kf) + 12, ry + 86, L.font(ss, 600, L.FONT.body), MUTED, { track: 2 });
          } else {
            txt(c, '2009', x + 44, ry + 112, L.font(128, 700, L.FONT.din), IVORY);
            const yw = tw(c, '2009', L.font(128, 700, L.FONT.din));
            txt(c, '24 MARCH', x + 44 + yw + 24, ry + 112, L.font(34, 700, L.FONT.body), MUTED, { track: 4 });
          }
          if (i > 0) { c.fillStyle = 'rgba(242,234,216,0.08)'; c.fillRect(x + 44, ry, w - 88, 1.5); }
          c.restore();
        }
        ry += r.h;
      });
      c.restore();
      c.restore();
    }

    // ---- the lifespan strip (phrase 2)
    const fullH = REC.head + REC.pad + ROWS.reduce((a, r) => a + r.h, 0);
    const ly = REC.y + fullH + GAP;
    const lf2 = life(gt, PH(tl, 6, 2, -0.3), end);
    if (lf2.on) {
      const x = REC.x, w = REC.w, h = LIFE_H;
      c.save();
      lifeXf(c, lf2, x + w / 2, ly + h / 2);
      plate(c, x, ly, w, h);
      c.globalAlpha *= lf2.ck;
      // the count: age 29 (1945) → 93, eased, landing on "ninety-three"
      const c0 = m.lived - 0.3, c1 = m.ninety + 0.12;
      const e = L.ease.outCubic(L.prog(gq(gt), c0, c1 - c0));
      const age = Math.round(L.lerp(29, 93, e));
      const landed = gq(gt) >= c1 - 1e-6;
      const nf = L.font(132, 700, L.FONT.din);
      const nw = tw(c, '93', nf);
      txt(c, String(age), x + 44 + nw, ly + h / 2 + 48, nf, landed ? ACC : IVORY, { align: 'right' });
      txt(c, 'YEARS', x + 44 + nw + 16, ly + h / 2 + 48, L.font(34, 700, L.FONT.body), MUTED, { track: 4 });
      if (landed) L.lightBlob(c, x + 44 + nw / 2, ly + h / 2, 150, ACC, 0.14 * (1 - L.prog(gt, c1, 1.2)));
      // the bar
      const bx0 = x + 44 + nw + 16 + tw(c, 'YEARS', L.font(34, 700, L.FONT.body), 4) + 52, bx1 = x + w - 48;
      const by = ly + h / 2 + 4;   // the bar group (labels above, 1945 below) centred in the strip
      const yr = (Y) => L.lerp(bx0, bx1, (Y - 1916) / (2010 - 1916));
      c.fillStyle = 'rgba(242,234,216,0.16)';
      L.roundRect(c, bx0, by - 4, bx1 - bx0, 8, 4); c.fill();
      const fillTo = L.lerp(1945, 2010, e);
      c.fillStyle = L.rgba(ACC);
      L.roundRect(c, bx0, by - 4, yr(fillTo) - bx0, 8, 4); c.fill();
      // end labels + the 1945 mark
      const lfnt = L.font(30, 700, L.FONT.din);
      txt(c, '1916', bx0, by - 26, lfnt, IVORY, { alpha: 0.9 });
      txt(c, '2010', bx1, by - 26, lfnt, IVORY, { align: 'right', alpha: 0.9 });
      const x45 = yr(1945);
      c.fillStyle = L.rgba(EMBER);
      c.beginPath(); c.arc(x45, by, 9, 0, Math.PI * 2); c.fill();
      c.strokeStyle = L.rgba(NAVY); c.lineWidth = 3; c.stroke();
      txt(c, '1945', x45, by + 40, L.font(24, 700, L.FONT.din), EMBER, { align: 'center' });
      // the head of the bar
      c.fillStyle = L.rgba(IVORY);
      c.beginPath(); c.arc(yr(fillTo), by, 7, 0, Math.PI * 2); c.fill();
      c.restore();
    }
  },
};
