// Beat 9 — "To stop the drift, | three leap days every four hundred years were cancelled."
// An engraved parchment plate at P_LEAP: THE CENTURY RULE. A 400-year timeline 1600 → 2000 with a hairline tick for every
// leap year (every 4th year) engraved in left to right as the camera lands (phrase 0), the century years as big
// numerals. On phrase 1 ("three") 1700, 1800 and 1900 are struck through in red rubric ink one after another (their
// century ticks turn red: NO LEAP DAY), then 1600 and 2000 get a gold pen ring (LEAP DAY), a bracket spans the 400
// years ("97 leap days, not 100") and 3 IN 400 lands above the plate on "cancelled".
// The plate fades out early in beat 10 (it sits just above February 1900/2000 and would fight the chapter card).
import * as L from '../../../../engine/runtime/lib.js';
import { P_LEAP, ACCENT, RUBRIC, INKC, paper, deskK, serif } from '../env.js';

const PW = 900, PH = 640;                                   // plate (u)
const NODES = [1600, 1700, 1800, 1900, 2000];
const SPAN = 680;                                           // 1600 → 2000 along the axis (u)
const xOf = (yr) => -SPAN / 2 + ((yr - 1600) / 400) * SPAN; // plate-relative x of a year
const GOLD_INK = [160, 112, 34];                            // gold ink that reads on parchment
const Y = { kick: -258, title: -200, rule: -168, num: -62, axis: 8, verdict: 66, brk: 112, brkTxt: 158, rule2: 214, law: 266 };
// beat-relative times (beat 9 starts 49.14; phrase 1 "three leap days…" 50.89 = +1.75)
const T = { ticks0: 0.35, ticks1: 1.55, strike: [1.78, 2.08, 2.38], ring: 2.85, brk: 3.15, label: 3.55 };

/** a hand-drawn rubric strike through a numeral (screen px), drawn in over k 0..1 */
function strike(c, x, y, w, s, k, seed) {
  if (k <= 0) return;
  const n = 18, pts = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    pts.push([x - w / 2 + w * f, y + (8 - 16 * f) * s + L.noise1(f * 3, seed) * 3 * s]);
  }
  const m = Math.max(1, Math.round(n * k));
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.strokeStyle = L.rgba(RUBRIC, 0.92);
  for (const [lw, dy] of [[7, 0], [2.4, 4]]) {
    c.lineWidth = Math.max(1, lw * s);
    c.beginPath();
    for (let i = 0; i <= m; i++) {
      const [px, py] = pts[i];
      if (i) c.lineTo(px, py + dy * s); else c.moveTo(px, py + dy * s);
    }
    c.stroke();
  }
  c.restore();
}

/** a gold pen ring around (x, y), drawn in over k (slight overshoot like a real pen stroke) */
function penRing(c, x, y, rx, ry, k, s) {
  if (k <= 0) return;
  c.save();
  c.strokeStyle = L.rgba(GOLD_INK, 0.95);
  c.lineCap = 'round';
  c.lineWidth = Math.max(1, 4 * s);
  c.beginPath();
  const a0 = -2.2, sweep = Math.PI * 2.15 * k;
  for (let i = 0; i <= 48; i++) {
    const a = a0 + (sweep * i) / 48, wob = 1 + 0.035 * Math.sin(a * 3 + 1);
    const px = x + Math.cos(a) * rx * wob, py = y + Math.sin(a) * ry * wob - (i / 48) * 4 * s * k;
    if (i) c.lineTo(px, py); else c.moveTo(px, py);
  }
  c.stroke();
  c.restore();
}

export default {
  beat: 9,
  chapter: { num: '08', title: 'The 400-year rule', sub: 'century years: leap only if divisible by 400' },
  layer: 1,
  cues(d) {
    return [
      { t: T.ticks0 + 0.1, name: 'shimmer', gain: 0.14, pitch: 1.2 },
      ...T.strike.map((t, i) => ({ t, name: 'swish', gain: 0.24, pitch: 0.9 + i * 0.12 })),
      { t: T.ring, name: 'ping', gain: 0.2, pitch: 1.0 },
      { t: T.label, name: 'impact', gain: 0.26, pitch: 1.0 },
    ];
  },
  drawWorld(c, v) {
    const dk = deskK(v);
    if (dk <= 0) return;
    // beat 10: the plate slides up and away (so it never sits behind the chapter card over February)
    const b10 = v.tl.scenes[10].start;
    const up = 360 * L.ease.inOutCubic(L.prog(v.gt, b10, 1.0));
    if (up >= 359.9) return;
    const s = 1 / v.cam.mpp;
    const X = (x) => v.wx(P_LEAP.x + x), Yp = (y) => v.wy(P_LEAP.y - up + y);
    const x0 = X(-PW / 2), y0 = Yp(-PH / 2);
    if (x0 > L.W || x0 + PW * s < 0 || y0 > L.H || y0 + PH * s < 0) return;
    const t = v.t;
    paper(c, x0, y0, PW * s, PH * s, { alpha: dk, seed: 11 });
    c.save();
    c.globalAlpha *= dk;
    c.textAlign = 'center';
    c.textBaseline = 'alphabetic';
    // ---- header: rubric kicker, title, fleuron rule
    c.fillStyle = L.rgba(RUBRIC, 0.9);
    c.font = serif(Math.max(1, 24 * s), 400, 'italic');
    L.trackedText(c, 'Inter gravissimas · Anno MDLXXXII', X(0), Yp(Y.kick), 1.5 * s, 'center');
    c.fillStyle = L.rgba(INKC);
    c.font = serif(Math.max(1, 48 * s), 600);
    c.letterSpacing = `${6 * s}px`;
    const tw = c.measureText('THE CENTURY RULE').width;
    c.letterSpacing = '0px';
    if (tw > 760 * s) c.font = serif(Math.max(1, (48 * 760 * s) / tw), 600);
    L.trackedText(c, 'THE CENTURY RULE', X(0), Yp(Y.title), 6 * s, 'center');
    c.strokeStyle = L.rgba(INKC, 0.6);
    c.lineWidth = Math.max(0.5, 1.2 * s);
    c.beginPath();
    for (const dy of [0, 6]) { c.moveTo(X(-300), Yp(Y.rule + dy)); c.lineTo(X(-22), Yp(Y.rule + dy)); c.moveTo(X(22), Yp(Y.rule + dy)); c.lineTo(X(300), Yp(Y.rule + dy)); }
    c.stroke();
    c.fillStyle = L.rgba(RUBRIC, 0.85);
    c.beginPath();
    c.moveTo(X(0), Yp(Y.rule - 8)); c.lineTo(X(12), Yp(Y.rule + 3)); c.lineTo(X(0), Yp(Y.rule + 14)); c.lineTo(X(-12), Yp(Y.rule + 3));
    c.closePath(); c.fill();

    // ---- the axis + a tick for every leap year (engraved in, left to right)
    const tk = L.ease.inOutCubic(L.prog(t, T.ticks0, T.ticks1 - T.ticks0));
    const xEnd = -SPAN / 2 - 30 + (SPAN + 60) * tk;
    c.strokeStyle = L.rgba(INKC, 0.75);
    c.lineWidth = Math.max(0.6, 1.6 * s);
    c.beginPath(); c.moveTo(X(-SPAN / 2 - 30), Yp(Y.axis)); c.lineTo(X(xEnd), Yp(Y.axis)); c.stroke();
    c.lineWidth = Math.max(0.5, 1.1 * s);
    c.beginPath();
    for (let yr = 1604; yr < 2000; yr += 4) {
      if (yr % 100 === 0) continue;
      const x = xOf(yr);
      if (x > xEnd) break;
      const l = yr % 20 === 0 ? 14 : 9;
      c.moveTo(X(x), Yp(Y.axis)); c.lineTo(X(x), Yp(Y.axis - l));
    }
    c.stroke();

    // ---- century nodes
    NODES.forEach((yr, i) => {
      const x = xOf(yr);
      const ak = L.enter(t, 0.2 + i * 0.12, 0.45);
      if (ak <= 0) return;
      const kept = yr % 400 === 0;
      const si = kept ? -1 : yr === 1700 ? 0 : yr === 1800 ? 1 : 2;
      const sk = si >= 0 ? L.ease.inOutCubic(L.prog(t, T.strike[si], 0.28)) : 0;
      const rk = kept ? L.ease.outCubic(L.prog(t, T.ring + (yr === 2000 ? 0.12 : 0), 0.45)) : 0;
      c.save();
      c.globalAlpha *= ak;
      // century tick (tall), red once struck
      c.strokeStyle = L.rgba(L.mix(INKC, RUBRIC, sk), 0.9);
      c.lineWidth = Math.max(0.8, 2.6 * s);
      c.beginPath(); c.moveTo(X(x), Yp(Y.axis + 10)); c.lineTo(X(x), Yp(Y.axis - 28)); c.stroke();
      c.fillStyle = L.rgba(kept && rk > 0 ? L.mix(INKC, GOLD_INK, rk) : L.mix(INKC, RUBRIC, sk));
      c.beginPath(); c.arc(X(x), Yp(Y.axis), Math.max(0, 5 * s), 0, Math.PI * 2); c.fill();
      // numeral
      c.fillStyle = L.rgba(INKC, si >= 0 ? L.lerp(1, 0.55, sk) : 1);
      c.font = serif(Math.max(1, 56 * s), 700);
      c.textBaseline = 'middle';
      c.fillText(String(yr), X(x), Yp(Y.num + (1 - ak) * 12));
      c.textBaseline = 'alphabetic';
      if (si >= 0) strike(c, X(x), Yp(Y.num), 150 * s, s, sk, 30 + i);
      if (kept) penRing(c, X(x), Yp(Y.num), 76 * s, 42 * s, rk, s);
      // verdict
      const vk = si >= 0 ? L.enter(t, T.strike[si] + 0.2, 0.35) : L.enter(t, T.ring + 0.25, 0.35);
      if (vk > 0) {
        c.globalAlpha *= vk;
        c.fillStyle = L.rgba(si >= 0 ? RUBRIC : GOLD_INK);
        c.font = serif(Math.max(1, 20 * s), 700);
        L.trackedText(c, si >= 0 ? 'NO LEAP DAY' : 'LEAP DAY', X(x), Yp(Y.verdict + (1 - vk) * 8), 1.6 * s, 'center');
      }
      c.restore();
    });

    // ---- the 400-year bracket and its sum
    const bk = L.ease.outCubic(L.prog(t, T.brk, 0.5));
    if (bk > 0) {
      const hw = (SPAN / 2) * bk;
      c.strokeStyle = L.rgba(INKC, 0.75);
      c.lineWidth = Math.max(0.6, 1.6 * s);
      c.beginPath();
      c.moveTo(X(-hw), Yp(Y.brk - 12)); c.lineTo(X(-hw), Yp(Y.brk)); c.lineTo(X(hw), Yp(Y.brk)); c.lineTo(X(hw), Yp(Y.brk - 12));
      c.moveTo(X(0), Yp(Y.brk)); c.lineTo(X(0), Yp(Y.brk + 10));
      c.stroke();
      const tk2 = L.enter(t, T.brk + 0.25, 0.4);
      c.save();
      c.globalAlpha *= tk2;
      c.fillStyle = L.rgba(INKC);
      const txt = 'every 400 years: 97 leap days, not 100';
      c.font = serif(Math.max(1, 30 * s), 600, 'italic');
      const w0 = c.measureText(txt).width;
      if (w0 > 700 * s) c.font = serif(Math.max(1, (30 * s * 700 * s) / w0), 600, 'italic');
      c.fillText(txt, X(0), Yp(Y.brkTxt + (1 - tk2) * 8));
      c.restore();
    }
    // ---- the law, in words, at the foot
    // legend for the hairlines (appears once they are engraved)
    c.fillStyle = L.rgba(INKC, 0.75 * L.enter(t, T.ticks1 - 0.2, 0.4));
    c.font = serif(Math.max(1, 21 * s), 400, 'italic');
    c.fillText('each hairline on the scale: a leap year, every 4th year', X(0), Yp(Y.rule2));
    c.fillStyle = L.rgba(RUBRIC, 0.95);
    const law = 'A century year is a leap year only if it divides by 400.';
    c.font = serif(Math.max(1, 26 * s), 400, 'italic');
    const lw = c.measureText(law).width;
    if (lw > 780 * s) c.font = serif(Math.max(1, (26 * s * 780 * s) / lw), 400, 'italic');
    c.fillText(law, X(0), Yp(Y.law));
    c.restore();
  },
  drawOverlay(c, v) {
    // above the plate (plate top ≈ y 575): the house big number on navy
    const k = v.k * L.enter(v.t, T.label, 0.5);
    if (k <= 0) return;
    c.save();
    c.font = L.font(100, 800, L.FONT.display);
    const size = L.fitSize(c, '3 IN 400', 700, 100, 800, L.FONT.display, 60);
    L.bigLabel(c, { x: 540, y: 462, align: 'center', big: '3 IN 400', small: 'leap days cancelled', k, accent: ACCENT, size });
    c.restore();
  },
};
