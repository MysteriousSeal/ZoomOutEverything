// Beat 0 — "In 1964, a seventeen-year-old stayed awake for eleven days. | No caffeine, no pills."
// FRAME 1: kicker 1964 · AGE 17, headline 11 DAYS / WITHOUT SLEEP (11 in violet) above the stage, where Randy's
// pictogram stands beside a wall clock (world space) whose hands spin through the days, fastest on "eleven days".
// Phrase 1: two ISO prohibition signs (a coffee cup, a pill capsule, drawn) with paper tags NO CAFFEINE / NO PILLS,
// each slash wiping on its word. Everything leaves just before the cut (the log strip wipes in on beat 1).
import * as L from '../../../../engine/runtime/lib.js';
import { VIOLET, TEXT, GREYT, STAMP, INKP, PAPER, B, Wd, tag, inWorld, win, subLine, exitK, collapse } from '../env.js';

const { W } = L;
const TAU = Math.PI * 2;
const CLK = { x: 760, y: 820, r: 135 };

function cup(c, s) {
  // coffee cup, side view: tapered body, ring handle, saucer, two steam curls
  c.save();
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(-0.33 * s, -0.16 * s); c.lineTo(0.2 * s, -0.16 * s); c.lineTo(0.16 * s, 0.2 * s);
  c.quadraticCurveTo(-0.065 * s, 0.27 * s, -0.29 * s, 0.2 * s); c.closePath(); c.fill();
  c.lineWidth = 0.06 * s;
  c.beginPath(); c.ellipse(0.25 * s, 0.0, 0.085 * s, 0.1 * s, 0, -Math.PI / 2, Math.PI / 2); c.stroke();
  c.beginPath(); c.roundRect(-0.42 * s, 0.25 * s, 0.7 * s, 0.05 * s, 0.025 * s); c.fill();
  c.lineWidth = 0.045 * s;
  for (const dx of [-0.17, -0.02]) {
    c.beginPath(); c.moveTo(dx * s, -0.22 * s);
    c.bezierCurveTo((dx - 0.07) * s, -0.3 * s, (dx + 0.07) * s, -0.36 * s, dx * s, -0.44 * s); c.stroke();
  }
  c.restore();
}
function pill(c, s) {
  // a two-tone capsule at 45° + a small round tablet
  c.save();
  c.rotate(-Math.PI / 4);
  const w = 0.62 * s, h = 0.24 * s;
  c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, h / 2); c.fill();
  c.fillStyle = 'rgb(246,244,238)';
  c.beginPath(); c.roundRect(0.01 * s, -h / 2 + 0.035 * s, w / 2 - 0.045 * s, h - 0.07 * s, (h - 0.07 * s) / 2); c.fill();
  c.restore();
}
function prohibition(c, cx, cy, r, k, slashK, glyph) {
  if (k <= 0) return;
  const s = L.ease.outBack(L.clamp(k), 1.6);
  c.save();
  c.translate(cx, cy);
  c.scale(Math.max(0.001, s), Math.max(0.001, s));
  const ring = r * 0.16;
  c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 20; c.shadowOffsetY = 6;
  c.fillStyle = 'rgb(246,244,238)';
  c.beginPath(); c.arc(0, 0, Math.max(0, r - ring * 0.5), 0, TAU); c.fill();
  c.shadowColor = 'transparent';
  c.fillStyle = 'rgb(12,12,16)'; c.strokeStyle = 'rgb(12,12,16)';
  glyph(c, r * 1.05);
  c.strokeStyle = L.rgba(STAMP);
  c.lineWidth = ring;
  c.beginPath(); c.arc(0, 0, Math.max(0, r - ring / 2), 0, TAU); c.stroke();
  const sk = L.ease.outCubic(L.clamp(slashK));
  if (sk > 0) {
    const a = Math.PI * 0.25, rr = r - ring * 0.6;
    c.lineCap = 'butt';
    c.beginPath();
    c.moveTo(-Math.cos(a) * rr, -Math.sin(a) * rr);
    c.lineTo(-Math.cos(a) * rr + 2 * Math.cos(a) * rr * sk, -Math.sin(a) * rr + 2 * Math.sin(a) * rr * sk);
    c.stroke();
  }
  c.restore();
}
/** a plain wall clock: paper face, 12 ticks, ink hands */
export function wallClock(c, x, y, r, hourA, minA, k = 1) {
  if (k <= 0) return;
  c.save();
  c.globalAlpha *= k;
  c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 26;
  c.fillStyle = 'rgb(52,58,92)';
  c.beginPath(); c.arc(x, y, r + 12, 0, TAU); c.fill();
  c.shadowColor = 'transparent';
  c.fillStyle = L.rgba(PAPER);
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.fillStyle = L.rgba(INKP);
  for (let i = 0; i < 60; i++) {
    const a = i / 60 * TAU, big = i % 5 === 0;
    c.save(); c.translate(x, y); c.rotate(a);
    c.fillRect(-(big ? 3.5 : 1.2), -r + 10, big ? 7 : 2.4, big ? 22 : 9);
    c.restore();
  }
  c.lineCap = 'round';
  c.strokeStyle = L.rgba(INKP);
  c.lineWidth = 11;
  c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.sin(hourA) * r * 0.5, y - Math.cos(hourA) * r * 0.5); c.stroke();
  c.lineWidth = 7;
  c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.sin(minA) * r * 0.76, y - Math.cos(minA) * r * 0.76); c.stroke();
  c.fillStyle = L.rgba(VIOLET);
  c.beginPath(); c.arc(x, y, 9, 0, TAU); c.fill();
  c.restore();
}

export default {
  beat: 0,
  chapter: null,
  captions: false,
  overlayIn: false,
  layer: 2,
  drawWorld(c, v) {
    const tl = v.tl, gt = v.gt;
    // exit: the clock shrinks (×0.85) and fades, finished by B1 − 0.05; beat 1's trifold only starts at B1 (no shared pixels)
    hookLayer(c, v);
    const q = L.ease.inCubic(L.prog(gt, B(tl, 1, -0.2), 0.15));
    const k = 1 - q;
    if (k <= 0) return;
    // the hands: a slow tick, then a time-lapse spin through the days on "eleven days" (≈ 5 turns of the hour hand),
    // easing back to a slow run
    const t0 = Wd(tl, 'eleven0', -0.15), t1 = Wd(tl, 'days0', 0.7);
    const spin = L.ease.inOutCubic(L.prog(gt, t0, t1 - t0));
    const hour = (gt * 0.02 + spin * 5) * TAU, min = hour * 12;
    inWorld(c, v, (g) => {
      const s = 1 - 0.15 * q;
      g.translate(CLK.x, CLK.y); g.scale(s, s); g.translate(-CLK.x, -CLK.y);
      wallClock(g, CLK.x, CLK.y, CLK.r, hour, min, k);
    });
  },
  // the screen-space layer (headline, calendar, prohibitions) is drawn from drawWorld, which also runs for the motion-
  // blur sub-frames just before t = 0 (an overlay would be missing from them and frame 1 would come out half faded);
  // it ends on the hard cut into beat 1
  drawOverlay() {},
};
function hookLayer(c, v) {
  {
    const tl = v.tl, gt = v.gt;
    if (gt >= B(tl, 1)) return;
    // the headline lifts out over the last 0.3 s; the lower-zone tags hold to the cut, where beat 1's opaque card
    // takes their place (no luminance dip between the beats)
    const kk = 1;   // holds to the hard cut (the log strip only wipes in from B1): no luminance dip
    c.save();
    c.globalAlpha = kk;
    // headline: readable on frame 1
    c.textBaseline = 'alphabetic';
    subLine(c, '1964  ·  AGE 17', W / 2, 330, { size: 30, color: TEXT, track: 7 });
    const s1 = L.fitSize(c, '11 DAYS', 900, 184, 800, L.FONT.display, 60);
    c.font = L.font(s1, 800, L.FONT.display);
    const w11 = c.measureText('11 ').width, wD = c.measureText('DAYS').width;
    let x = W / 2 - (w11 + wD) / 2;
    c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 24;
    c.fillStyle = L.rgba(VIOLET); c.fillText('11', x, 488);
    c.fillStyle = '#fff'; c.fillText('DAYS', x + w11, 488);
    const s2 = L.fitSize(c, 'WITHOUT SLEEP', 900, 100, 800, L.FONT.display, 40);
    c.font = L.font(s2, 800, L.FONT.display);
    c.letterSpacing = '6px';
    const w2 = c.measureText('WITHOUT SLEEP').width - 6;
    c.fillStyle = L.rgba(TEXT);
    c.fillText('WITHOUT SLEEP', W / 2 - w2 / 2, 590);
    c.letterSpacing = '0px';
    c.shadowBlur = 0;
    c.globalAlpha = 1;
    // phrase 0: a notebook row of 11 day boxes (on screen from frame 1), crossed off one by one through "stayed awake
    // for eleven days"; it hands the lower zone to the prohibitions before phrase 1
    const ex = exitK(gt, Wd(tl, 'noCaf', -0.14), 0.3);
    if (ex.u < 1) {
      // a two-row notebook calendar (days 1–6 / 7–11), x 195–885 (clear of the right-hand UI), y 1196–1412
      const bw = 100, gap = 18, rows = [[0, 6], [6, 11]], yR = [1196, 1196 + bw + gap];
      const c0 = Wd(tl, 'stayed'), c1 = Wd(tl, 'days0', 0.2), n = 11;
      c.save();
      collapse(c, W / 2, 1304, ex.pk);
      rows.forEach(([a, b], ri) => {
        const cnt = b - a, x0 = W / 2 - (cnt * bw + (cnt - 1) * gap) / 2, y0 = yR[ri];
        for (let i = a; i < b; i++) {
          const bx = x0 + (i - a) * (bw + gap);
          c.save();
          c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 14; c.shadowOffsetY = 5;
          c.fillStyle = L.rgba(PAPER);
          c.fillRect(bx, y0, bw, bw);
          c.restore();
          c.save();
          c.globalAlpha *= ex.ca;
          c.fillStyle = L.rgba(VIOLET.map((q) => q * 0.6), 0.85);
          c.fillRect(bx, y0, bw, 6);
          c.font = L.font(24, 700, L.FONT.body);
          c.fillStyle = L.rgba(INKP, 0.8);
          c.textAlign = 'left'; c.textBaseline = 'alphabetic';
          c.fillText(String(i + 1), bx + 10, y0 + 32);
          // the cross: two strokes drawing themselves
          const xk = L.prog(gt, c0 + (c1 - c0) * i / n, 0.16);
          if (xk > 0) {
            c.strokeStyle = L.rgba(VIOLET.map((q) => q * 0.8)); c.lineWidth = 8; c.lineCap = 'round';
            const p = 22, top = y0 + 42, a1 = L.clamp(xk * 2), b1 = L.clamp(xk * 2 - 1), sz = bw - 2 * p, hh = bw - 42 - 14;
            c.beginPath(); c.moveTo(bx + p, top); c.lineTo(bx + p + sz * a1, top + hh * a1); c.stroke();
            if (b1 > 0) { c.beginPath(); c.moveTo(bx + bw - p, top); c.lineTo(bx + bw - p - sz * b1, top + hh * b1); c.stroke(); }
          }
          c.restore();
        }
      });
      c.restore();
    }
    // phrase 1: the two prohibitions
    const items = [
      { x: 350, glyph: cup, label: 'NO CAFFEINE', tin: Wd(tl, 'noCaf', -0.12), slash: Wd(tl, 'caffeine', 0.05) },
      { x: 730, glyph: pill, label: 'NO PILLS', tin: Wd(tl, 'noPills', -0.12), slash: Wd(tl, 'pills', 0.05) },
    ];
    for (const it of items) {
      const k = L.prog(gt, it.tin, 0.4);
      if (k <= 0) continue;
      prohibition(c, it.x, 1250, 92, k, L.prog(gt, it.slash, 0.3), it.glyph);
      tag(c, it.label, it.x, 1412, { k: L.prog(gt, it.tin + 0.08, 0.4), size: 36, rot: it.x < 540 ? -0.02 : 0.018, seed: it.x });
    }
    c.restore();
  }
}
