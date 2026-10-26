// Beat 4 — "But Earth returns to the equinox about eleven minutes sooner."
// The camera dives into the equinox: env draws the REAL Earth at the equinox and the CALENDAR Earth 11 min 15 s of
// orbit further on (left), both real-coastline globes. This beat names the two Earths and lays a measured ruler under
// them whose minute ticks (the same minutes env engraves on the orbit) count up as the gap opens: 11 of them.
//
// This file also owns the GAP METER shared by beats 4–7 (drawn from drawWorld with its own envelope, so it never
// dips at a beat boundary): a straight engraved ruler under the two Earths that follows drift(v) through the whole
// pull-out (minutes → hours → days), the Earth tags (beats 4–5) and the year counter (beats 6–7).
// s05–s07 import the helpers below.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, drift, arcScreen, R_EARTH_U, U_PER_DAY, G1, serif, band } from '../env.js';

const { W } = L;
export const BLUE = [205, 228, 255];
export const SOFT = [214, 220, 232];
const HALO = 'rgba(4,8,18,0.92)';
export const S = (v, i) => v.tl.scenes[i].start;
/** in/out envelope on film time */
export const envK = (gt, a, fin, b, fout) => L.ease.outCubic(L.prog(gt, a, fin)) * (1 - L.ease.inCubic(L.prog(gt, b, fout)));

/** Geometry of the gap meter at this frame: Earth screen points, ruler row, Earth radius (px). */
export function meterGeom(v) {
  const d = drift(v);
  const a = arcScreen(v, 0), b = arcScreen(v, d.u);
  const r = R_EARTH_U / v.cam.mpp;
  const off = Math.max(70, r + 50);                    // under the globes up close, 70 px under the markers far out
  return { d, a, b, r, ry: Math.max(a.y, b.y) + off };
}

/** One line of tracked caps, centred, fitted to maxW, with a dark halo. */
export function capsLine(c, text, x, y, { size = 26, weight = 700, family = L.FONT.body, color = SOFT, alpha = 1, track = 3, maxW = 360, min = 14, align = 'center' } = {}) {
  if (alpha <= 0) return 0;
  const s = L.fitSize(c, text, maxW - track * text.length, size, weight, family, min);
  c.save();
  c.globalAlpha *= alpha;
  c.font = L.font(s, weight, family);
  c.fillStyle = L.rgba(color);
  c.shadowColor = HALO;
  c.shadowBlur = 10;
  const w = L.trackedText(c, text, x, y, track, align);
  c.restore();
  return w;
}

/**
 * The house "big statement" block, centred: one big display line made of coloured parts (fitted ≤ maxW) and an
 * optional small tracked-caps line under it. Baseline of the big line at y. k: 0..1 entrance.
 */
export function bigBlock(c, { y, parts, small, k = 1, size = 96, maxW = 880, smallColor = SOFT }) {
  if (k <= 0) return;
  const e = L.ease.outCubic(L.clamp(k));
  const text = parts.map((p) => p[0]).join('');
  c.save();
  c.globalAlpha *= L.clamp(k * 1.3);
  c.textBaseline = 'alphabetic';
  c.textAlign = 'left';
  const s = L.fitSize(c, text, maxW, size, 800, L.FONT.display, 40);
  c.font = L.font(s, 800, L.FONT.display);
  c.letterSpacing = '-1px';
  let x = W / 2 - c.measureText(text).width / 2;
  const by = y + (1 - e) * 26;
  c.shadowColor = 'rgba(0,0,0,0.6)';
  c.shadowBlur = 18;
  for (const [t, col] of parts) {
    c.fillStyle = typeof col === 'string' ? col : L.rgba(col);
    c.fillText(t, x, by);
    x += c.measureText(t).width;
  }
  c.letterSpacing = '0px';
  c.restore();
  if (small) capsLine(c, small.toUpperCase(), W / 2, y + 50 + (1 - e) * 16, { size: 28, weight: 600, color: smallColor, alpha: L.clamp(k * 1.3) * L.clamp(k * 2 - 0.4), maxW: 860, track: 3 });
}

const MIN_U = U_PER_DAY / 1440, HOUR_U = U_PER_DAY / 24;

/** The gap meter (beats 4–7). */
function drawMeter(c, v) {
  const gt = v.gt;
  const k = envK(gt, S(v, 4) + 1.15, 0.5, S(v, 8) + 0.05, 0.35);
  if (k <= 0) return;
  const { d, a, b, ry } = meterGeom(v);
  if (d.mode !== 'julian' || d.u <= 1e-6) return;
  if (ry > L.H + 50 || ry < -50) return;
  const x0 = a.x, x1 = b.x;                           // real Earth (right) → calendar Earth (left)
  const xAt = (u) => arcScreen(v, u).x;
  // landing pulses: 11 min (beat 4), 1 day (beat 6), 10 days (beat 7)
  const pulse = Math.max(
    Math.exp(-Math.pow((gt - (S(v, 4) + 2.35)) / 0.25, 2)),
    Math.exp(-Math.pow((gt - landTime(v, 6)) / 0.3, 2)),
    Math.exp(-Math.pow((gt - landTime(v, 7)) / 0.3, 2)),
    // beat 5: a slow breathing pulse while the fact sinks in
    gt > S(v, 5) && gt < S(v, 6) ? 0.35 * (0.5 - 0.5 * Math.cos((gt - S(v, 5)) * 2.4)) : 0);
  c.save();
  c.globalAlpha *= k;
  c.lineCap = 'round';
  // soft gold glow under the bar on each landing
  if (pulse > 0.02) L.lightBlob(c, (x0 + x1) / 2, ry, Math.abs(x0 - x1) * 0.6 + 40, ACCENT, 0.16 * pulse);
  // the bar: an engraved double rule
  c.strokeStyle = L.rgba(ACCENT, 0.95);
  c.lineWidth = 2.4 + pulse * 1.2;
  c.beginPath(); c.moveTo(x0, ry); c.lineTo(x1, ry); c.stroke();
  c.strokeStyle = L.rgba(ACCENT, 0.35);
  c.lineWidth = 1;
  c.beginPath(); c.moveTo(x0, ry + 6); c.lineTo(x1, ry + 6); c.stroke();
  // end caps (taller at the real Earth: the reference)
  c.strokeStyle = L.rgba(ACCENT, 0.95);
  c.lineWidth = 2.4;
  c.beginPath();
  c.moveTo(x0, ry - 18); c.lineTo(x0, ry + 14);
  c.moveTo(x1, ry - 18); c.lineTo(x1, ry + 14);
  c.stroke();
  // graduations: minutes → hours → days, each faded in by its spacing on screen (like env's orbit ticks)
  const tiers = [
    { u: MIN_U, len: 9, big: 5, w: 1.4 },
    { u: HOUR_U, len: 11, big: 6, w: 1.4 },
    { u: U_PER_DAY, len: 15, big: 1, w: 2 },
  ];
  for (const t of tiers) {
    const px = (t.u / v.cam.mpp);
    const kk = band(px, 6, 16) * (t.u === U_PER_DAY ? 1 : 1 - band(px, 400, 900));
    if (kk <= 0) continue;
    const n = Math.floor(d.u / t.u + 1e-9);
    if (n > 600) continue;
    c.lineWidth = t.w;
    for (let i = 1; i <= n; i++) {
      const x = xAt(i * t.u);
      if (x < -20 || x > W + 20) continue;
      // each new tick pops in as the calendar Earth passes it
      const age = (d.u - i * t.u) / (t.u * 0.6);
      const pk = L.ease.outBack(L.clamp(age));
      const l = t.len * (i % t.big === 0 ? 1.5 : 1) * pk;
      c.strokeStyle = L.rgba(ACCENT, 0.85 * kk);
      c.beginPath(); c.moveTo(x, ry + 1); c.lineTo(x, ry + 1 + l); c.stroke();
    }
  }
  c.restore();
}

/** First film time in beat i (6 or 7) when the drift reaches its target (1 day / 9.82 days); memoised per timeline. */
const LAND = new WeakMap();
export function landTime(v, i) {
  let m = LAND.get(v.tl);
  if (!m) { m = {}; LAND.set(v.tl, m); }
  if (m[i] == null) {
    const a = S(v, i), b = v.tl.scenes[i].end;
    let t = b;
    let last = -1;
    for (let g = a; g < b; g += 1 / 60) {
      const u = drift({ ...v, gt: g }).u;
      if (Math.abs(u - last) < 1e-6 && g > a + 0.5) { t = g; break; }
      last = u;
    }
    m[i] = t;
  }
  return m[i];
}

/** Earth tags (beats 4–5): REAL EARTH over env's "SPRING EQUINOX", CALENDAR SAYS over a matching "MARCH 21". */
function drawTags(c, v) {
  const gt = v.gt;
  const k = envK(gt, S(v, 4) + 1.75, 0.55, S(v, 6) + 0.05, 0.4);
  if (k <= 0) return;
  const { d, a, b, r } = meterGeom(v);
  if (d.u <= 1e-6) return;
  const ext = Math.max(70, r + 60);
  const ly = a.y - ext - 18;                           // env's SPRING EQUINOX baseline
  const kc = k * L.ease.outCubic(L.prog(gt, S(v, 4) + 1.9, 0.5));
  const maxW = Math.min(380, Math.abs(a.x - b.x) - 20);
  // real Earth: "REAL EARTH" above env's gold "SPRING EQUINOX"
  capsLine(c, 'REAL EARTH', a.x, ly - 40 + (1 - k) * 10, { color: BLUE, alpha: k, maxW });
  // the calendar's Earth: "CALENDAR SAYS" above a serif gold "MARCH 21" that matches env's lettering
  capsLine(c, 'CALENDAR SAYS', b.x, ly - 40 + (1 - kc) * 10, { color: ACCENT, alpha: kc, maxW });
  c.save();
  c.globalAlpha *= kc;
  c.font = serif(L.fitSize(c, 'MARCH 21', maxW, 26, 600, '"Baskerville", serif', 14), 600);
  c.fillStyle = L.rgba(ACCENT, 0.95);
  c.shadowColor = HALO;
  c.shadowBlur = 10;
  L.trackedText(c, 'MARCH 21', b.x, ly + (1 - kc) * 10, 4, 'center');
  c.restore();
}

export default {
  beat: 4,
  chapter: { num: '04', title: 'Eleven minutes', sub: 'true year: 365.2422 days' },
  layer: 2,
  cues() {
    return [
      { t: 1.75, name: 'blip', gain: 0.18, pitch: 1.1 },
      { t: 1.9, name: 'blip', gain: 0.18, pitch: 1.25 },
      { t: 1.3, name: 'count', gain: 0.16, pitch: 1.2 },
      { t: 2.35, name: 'ping', gain: 0.24, pitch: 1.0 },
    ];
  },
  drawWorld(c, v) {
    const gt = v.gt;
    if (gt < S(v, 4) + 0.9 || gt > S(v, 8) + 0.5) return;
    drawMeter(c, v);
    drawTags(c, v);
  },
  drawOverlay(c, v) {
    // "11 MIN 15 S" lands as the gap completes (≈ "eleven minutes")
    const k = v.k * L.enter(v.t, 2.35, 0.5);
    bigBlock(c, { y: 1290, parts: [['11 MIN 15 S', ACCENT]], small: 'sooner, every year', k, size: 96 });
  },
};
export { G1 };
